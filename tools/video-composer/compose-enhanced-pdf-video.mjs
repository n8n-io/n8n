#!/usr/bin/env node
import { assEscape, toAssTime } from './compose-video.mjs';

const REQUIRED_JOB_FIELDS = [
	'coverImagePath',
	'illustrationImagePath',
	'pagesManifestPath',
	'pageAudioManifestPath',
	'pageTimingPath',
	'subtitlePath',
	'renderDir',
	'outputVideoPath',
	'outputAudioPath',
	'ffmpegLogPath',
];

function optionalNumber(value, defaultValue, minimum) {
	if (value === undefined || value === null || value === '') return defaultValue;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < minimum) return defaultValue;

	return parsed;
}

export function validateEnhancedJob(raw) {
	if (!raw || typeof raw !== 'object') throw new Error('Enhanced PDF composer job must be an object');
	for (const field of REQUIRED_JOB_FIELDS) {
		if (!String(raw[field] || '').trim()) {
			throw new Error(`Enhanced PDF composer job missing field: ${field}`);
		}
	}

	return {
		...raw,
		introCoverSeconds: optionalNumber(raw.introCoverSeconds, 4, 0),
		introIllustrationSeconds: optionalNumber(raw.introIllustrationSeconds, 4, 0),
		pagePauseSeconds: optionalNumber(raw.pagePauseSeconds, 0.3, 0),
		overlayWidth: optionalNumber(raw.overlayWidth, 260, 80),
		width: optionalNumber(raw.width, 1920, 320),
		height: optionalNumber(raw.height, 1080, 240),
		fps: optionalNumber(raw.fps, 30, 1),
	};
}

export function scaleImageToCanvasFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white${label}`;
}

export function scaleOverlayFilter(input, overlayWidth, maxHeight, label) {
	return `${input}scale=${overlayWidth}:${maxHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1${label}`;
}

function escapeForFilterPath(filePath) {
	return String(filePath)
		.replace(/\\/g, '/')
		.replace(/([\\':,;\[\] ])/g, '\\$1');
}

function silentAudioInput() {
	return ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=24000'];
}

export function createAssSubtitle({ width = 1920, height = 1080, events = [], marginV = 90 }) {
	const lines = [
		'[Script Info]',
		'ScriptType: v4.00+',
		`PlayResX: ${width}`,
		`PlayResY: ${height}`,
		'',
		'[V4+ Styles]',
		'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
		`Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,1,2,80,80,${marginV},1`,
		'',
		'[Events]',
		'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
	];
	for (const event of events) {
		lines.push(`Dialogue: 0,${toAssTime(event.start)},${toAssTime(event.end)},Default,,0,0,0,,${assEscape(event.text)}`);
	}

	return `${lines.join('\n')}\n`;
}

export function buildCoverIntroFfmpegArgs({
	coverImagePath,
	outputPath,
	duration,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const filter = scaleImageToCanvasFilter('[0:v]', width, height, '[vout]');

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		coverImagePath,
		...silentAudioInput(),
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'1:a',
		'-t',
		String(duration),
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		outputPath,
	];
}

export function buildIllustrationIntroFfmpegArgs({
	pageImage,
	illustrationImagePath,
	outputPath,
	duration,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const illustrationWidth = Math.round(width * 0.55);
	const illustrationMaxHeight = Math.round(height * 0.65);
	const filter = [
		scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleOverlayFilter('[1:v]', illustrationWidth, illustrationMaxHeight, '[illustrationv]'),
		'[pagev][illustrationv]overlay=(W-w)/2:(H-h)/2[vout]',
	].join(';');

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		'-loop',
		'1',
		'-i',
		illustrationImagePath,
		...silentAudioInput(),
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'2:a',
		'-t',
		String(duration),
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		outputPath,
	];
}

export function buildEnhancedSegmentFfmpegArgs({
	pageNumber,
	pageImage,
	audioPath,
	subtitlePath,
	outputPath,
	coverImagePath,
	illustrationImagePath,
	overlayWidth = 260,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const subtitles = `subtitles=filename=${escapeForFilterPath(subtitlePath)}`;
	const baseInputs = ['-y', '-loop', '1', '-i', pageImage, '-i', audioPath];
	if (Number(pageNumber) === 1) {
		const filter = `${scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]')};[pagev]${subtitles}[vout]`;

		return [
			...baseInputs,
			'-filter_complex',
			filter,
			'-map',
			'[vout]',
			'-map',
			'1:a',
			'-r',
			String(fps),
			'-c:v',
			'libx264',
			'-pix_fmt',
			'yuv420p',
			'-c:a',
			'aac',
			'-shortest',
			outputPath,
		];
	}

	const overlayMaxHeight = Math.round(height * 0.3);
	const filter = [
		scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleOverlayFilter('[2:v]', overlayWidth, overlayMaxHeight, '[coverOverlay]'),
		scaleOverlayFilter('[3:v]', overlayWidth, overlayMaxHeight, '[illustrationOverlay]'),
		'[pagev][coverOverlay]overlay=40:H-h-40[leftv]',
		'[leftv][illustrationOverlay]overlay=W-w-40:H-h-40[overlayv]',
		`[overlayv]${subtitles}[vout]`,
	].join(';');

	return [
		...baseInputs,
		'-loop',
		'1',
		'-i',
		coverImagePath,
		'-loop',
		'1',
		'-i',
		illustrationImagePath,
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'1:a',
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-shortest',
		outputPath,
	];
}

export function buildPauseSegmentFfmpegArgs({
	pageImage,
	outputPath,
	duration,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const filter = scaleImageToCanvasFilter('[0:v]', width, height, '[vout]');

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		...silentAudioInput(),
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'1:a',
		'-t',
		String(duration),
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		outputPath,
	];
}

export function buildSubtitleEventsForSegment({ page }) {
	const pageStart = Number(page.start) || 0;

	return (Array.isArray(page.subtitleEvents) ? page.subtitleEvents : []).map((event) => ({
		...event,
		start: Number(event.start) - pageStart,
		end: Number(event.end) - pageStart,
	}));
}

export function buildEnhancedConcatList({
	introCoverPath,
	introIllustrationPath,
	segmentPaths = [],
	pausePaths = [],
}) {
	const paths = [introCoverPath, introIllustrationPath];
	for (const [index, segmentPath] of segmentPaths.entries()) {
		paths.push(segmentPath);
		if (index < segmentPaths.length - 1 && pausePaths[index]) paths.push(pausePaths[index]);
	}

	return paths.filter(Boolean);
}
