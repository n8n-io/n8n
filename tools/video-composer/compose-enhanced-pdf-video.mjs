#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildPageTiming, safePageName, validatePagesManifest } from './presentation-utils.mjs';
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

export function scaleOverlayFilter(input, overlayWidth, maxHeight, label, { verticalAlign = 'center' } = {}) {
	const y = verticalAlign === 'bottom' ? 'oh-ih' : 'floor((oh-ih)/2)';
	return `${input}scale=${overlayWidth}:${maxHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,format=rgba,pad=${overlayWidth}:${maxHeight}:floor((ow-iw)/2):${y}:color=black@0${label}`;
}

function normalizeCanvasFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=disable:reset_sar=1${label}`;
}

function escapeForFilterPath(filePath) {
	return String(filePath)
		.replace(/\\/g, '/')
		.replace(/([\\':,;\[\] ])/g, '\\$1');
}

function silentAudioInput() {
	return ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
}

function aacOutputArgs() {
	return ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'];
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
		...aacOutputArgs(),
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
	const illustrationX = Math.floor((width - illustrationWidth) / 2);
	const illustrationY = Math.floor((height - illustrationMaxHeight) / 2);
	const filter = [
		scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleOverlayFilter('[1:v]', illustrationWidth, illustrationMaxHeight, '[illustrationv]'),
		`[pagev][illustrationv]overlay=${illustrationX}:${illustrationY}[overlayv]`,
		normalizeCanvasFilter('[overlayv]', width, height, '[vout]'),
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
		...aacOutputArgs(),
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
		const filter = [
			scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]'),
			`[pagev]${subtitles}[subtitlev]`,
			normalizeCanvasFilter('[subtitlev]', width, height, '[vout]'),
		].join(';');

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
			...aacOutputArgs(),
			'-shortest',
			outputPath,
		];
	}

	const overlayMaxHeight = Math.round(height * 0.3);
	const overlayY = height - overlayMaxHeight - 40;
	const illustrationX = width - overlayWidth - 40;
	const filter = [
		scaleImageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleOverlayFilter('[2:v]', overlayWidth, overlayMaxHeight, '[coverOverlay]', { verticalAlign: 'bottom' }),
		scaleOverlayFilter('[3:v]', overlayWidth, overlayMaxHeight, '[illustrationOverlay]', { verticalAlign: 'bottom' }),
		`[pagev][coverOverlay]overlay=40:${overlayY}[leftraw]`,
		normalizeCanvasFilter('[leftraw]', width, height, '[leftv]'),
		`[leftv][illustrationOverlay]overlay=${illustrationX}:${overlayY}[overlayraw]`,
		normalizeCanvasFilter('[overlayraw]', width, height, '[overlayv]'),
		`[overlayv]${subtitles}[subtitlev]`,
		normalizeCanvasFilter('[subtitlev]', width, height, '[vout]'),
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
		...aacOutputArgs(),
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
		...aacOutputArgs(),
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

function quoteConcatPath(filePath) {
	return `file '${String(filePath).replace(/'/g, "'\\''")}'`;
}

export function buildFinalConcatFfmpegArgs({ concatListPath, outputVideoPath }) {
	return [
		'-y',
		'-f',
		'concat',
		'-safe',
		'0',
		'-i',
		concatListPath,
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-b:a',
		'192k',
		'-ar',
		'48000',
		'-ac',
		'2',
		outputVideoPath,
	];
}

function runFfmpeg(args, logPath) {
	const result = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
	const spawnError = result.error ? `${result.error.name}: ${result.error.message}` : '';
	fs.appendFileSync(logPath, `$ ffmpeg ${args.join(' ')}\n${result.stdout}\n${result.stderr}\n${spawnError}\n`, 'utf8');
	if (result.error) throw new Error(`ffmpeg failed to start: ${result.error.message}; see ${logPath}`);
	if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}; see ${logPath}`);
}

function buildExtractAudioArgs({ inputVideoPath, outputAudioPath }) {
	return ['-y', '-i', inputVideoPath, '-vn', '-c:a', 'libmp3lame', outputAudioPath];
}

function render() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/compose-enhanced-pdf-video.mjs JOB_JSON_PATH');
	const job = validateEnhancedJob(JSON.parse(fs.readFileSync(jobPath, 'utf8')));
	fs.mkdirSync(job.renderDir, { recursive: true });

	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const audioManifest = JSON.parse(fs.readFileSync(job.pageAudioManifestPath, 'utf8'));
	const timing = buildPageTiming({
		pages: pagesManifest.pages,
		audio: audioManifest.pages,
		pagePauseSeconds: job.pagePauseSeconds,
	});
	fs.writeFileSync(job.pageTimingPath, JSON.stringify(timing, null, 2), 'utf8');

	const introDuration = job.introCoverSeconds + job.introIllustrationSeconds;
	fs.writeFileSync(job.subtitlePath, createAssSubtitle({
		width: job.width,
		height: job.height,
		marginV: job.overlayWidth + 80,
		events: timing.subtitles.map((event) => ({
			...event,
			start: Number(event.start) + introDuration,
			end: Number(event.end) + introDuration,
		})),
	}), 'utf8');

	const introCoverPath = path.join(job.renderDir, 'intro-cover.mp4');
	runFfmpeg(buildCoverIntroFfmpegArgs({
		coverImagePath: job.coverImagePath,
		outputPath: introCoverPath,
		duration: job.introCoverSeconds,
		width: job.width,
		height: job.height,
		fps: job.fps,
	}), job.ffmpegLogPath);

	const firstPage = pagesManifest.pages[0];
	if (!firstPage) throw new Error('Enhanced PDF composer requires at least one PDF page');
	const introIllustrationPath = path.join(job.renderDir, 'intro-illustration.mp4');
	runFfmpeg(buildIllustrationIntroFfmpegArgs({
		pageImage: firstPage.imagePath,
		illustrationImagePath: job.illustrationImagePath,
		outputPath: introIllustrationPath,
		duration: job.introIllustrationSeconds,
		width: job.width,
		height: job.height,
		fps: job.fps,
	}), job.ffmpegLogPath);

	const segmentPaths = [];
	const pausePaths = [];
	for (const [index, page] of timing.pages.entries()) {
		const name = safePageName(page.pageNumber);
		const pageSubtitlePath = path.join(job.renderDir, `${name}.ass`);
		fs.writeFileSync(pageSubtitlePath, createAssSubtitle({
			width: job.width,
			height: job.height,
			marginV: page.pageNumber === 1 ? 90 : job.overlayWidth + 80,
			events: buildSubtitleEventsForSegment({ page }),
		}), 'utf8');

		const segmentPath = path.join(job.renderDir, `segment-${String(page.pageNumber).padStart(3, '0')}.mp4`);
		runFfmpeg(buildEnhancedSegmentFfmpegArgs({
			pageNumber: page.pageNumber,
			pageImage: page.pageImage,
			audioPath: page.audioPath,
			subtitlePath: pageSubtitlePath,
			outputPath: segmentPath,
			coverImagePath: job.coverImagePath,
			illustrationImagePath: job.illustrationImagePath,
			overlayWidth: job.overlayWidth,
			width: job.width,
			height: job.height,
			fps: job.fps,
		}), job.ffmpegLogPath);
		segmentPaths.push(segmentPath);

		if (index < timing.pages.length - 1 && timing.pagePauseSeconds > 0) {
			const pausePath = path.join(job.renderDir, `pause-${String(page.pageNumber).padStart(3, '0')}.mp4`);
			runFfmpeg(buildPauseSegmentFfmpegArgs({
				pageImage: page.pageImage,
				outputPath: pausePath,
				duration: timing.pagePauseSeconds,
				width: job.width,
				height: job.height,
				fps: job.fps,
			}), job.ffmpegLogPath);
			pausePaths.push(pausePath);
		}
	}

	const concatListPath = path.join(job.renderDir, 'segments.txt');
	const concatPaths = buildEnhancedConcatList({ introCoverPath, introIllustrationPath, segmentPaths, pausePaths });
	fs.writeFileSync(concatListPath, concatPaths.map(quoteConcatPath).join('\n'), 'utf8');
	runFfmpeg(buildFinalConcatFfmpegArgs({ concatListPath, outputVideoPath: job.outputVideoPath }), job.ffmpegLogPath);
	runFfmpeg(buildExtractAudioArgs({ inputVideoPath: job.outputVideoPath, outputAudioPath: job.outputAudioPath }), job.ffmpegLogPath);

	console.log(JSON.stringify({
		ok: true,
		outputVideoPath: job.outputVideoPath,
		outputAudioPath: job.outputAudioPath,
		pageTimingPath: job.pageTimingPath,
		introDuration,
	}));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		render();
	} catch (error) {
		console.error(error.stack || error.message);
		process.exit(1);
	}
}
