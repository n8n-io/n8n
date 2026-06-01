#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildPageTiming, safePageName, validatePagesManifest } from './presentation-utils.mjs';
import { assEscape, toAssTime } from './compose-video.mjs';

const REQUIRED_JOB_FIELDS = [
	'backgroundVideoPath',
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

function optionalString(value, defaultValue) {
	const text = String(value ?? '').trim();

	return text || defaultValue;
}

function dimensionsForAspectRatio(aspectRatio) {
	if (aspectRatio === '16:9') return { width: 1920, height: 1080 };
	if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
	throw new Error(`Unsupported aspectRatio: ${aspectRatio}`);
}

export function validateScienceJob(raw) {
	if (!raw || typeof raw !== 'object') throw new Error('Science explainer composer job must be an object');
	for (const field of REQUIRED_JOB_FIELDS) {
		if (!String(raw[field] || '').trim()) {
			throw new Error(`Science explainer composer job missing field: ${field}`);
		}
	}

	const aspectRatio = String(raw.aspectRatio || '9:16').trim();
	const defaults = dimensionsForAspectRatio(aspectRatio);

	return {
		...raw,
		aspectRatio,
		pagePauseSeconds: optionalNumber(raw.pagePauseSeconds, 0.3, 0),
		bottomVideoHeightRatio: optionalNumber(raw.bottomVideoHeightRatio, 0.2, 0.05),
		width: optionalNumber(raw.width, defaults.width, 320),
		height: optionalNumber(raw.height, defaults.height, 320),
		fps: optionalNumber(raw.fps, 30, 1),
		encoderCodec: optionalString(raw.encoderCodec, 'libx264'),
		encoderPreset: optionalString(raw.encoderPreset, ''),
	};
}

export function calculateScienceLayout({
	width = 1080,
	height = 1920,
	bottomVideoHeightRatio = 0.2,
}) {
	const bottomVideoHeight = Math.round(height * bottomVideoHeightRatio);
	const bottomVideoY = height - bottomVideoHeight;

	return {
		width,
		height,
		bottomVideoHeight,
		bottomVideoY,
		subtitleMarginV: Math.max(72, Math.round(height * 0.05)),
	};
}

export function scalePdfPageToCanvasFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white${label}`;
}

export function scaleBackgroundVideoToOverlayFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=increase:force_divisible_by=2:reset_sar=1,crop=${width}:${height}:(iw-ow)/2:(ih-oh)/2${label}`;
}

function escapeForFilterPath(filePath) {
	return String(filePath)
		.replace(/\\/g, '/')
		.replace(/([\\':,;\[\] ])/g, '\\$1');
}

function silentAudioInput() {
	return ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
}

export function createAssSubtitle({ width = 1080, height = 1920, events = [], marginV = 96 }) {
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

export function buildSubtitleEventsForSegment({ page }) {
	const pageStart = Number(page.start) || 0;

	return (Array.isArray(page.subtitleEvents) ? page.subtitleEvents : []).map((event) => ({
		...event,
		start: Number(event.start) - pageStart,
		end: Number(event.end) - pageStart,
	}));
}

export function buildScienceSegmentFfmpegArgs({
	pageImage,
	backgroundVideoPath,
	audioPath,
	subtitlePath,
	outputPath,
	width = 1080,
	height = 1920,
	fps = 30,
	bottomVideoHeightRatio = 0.2,
	encoderCodec = 'libx264',
	encoderPreset = '',
}) {
	const layout = calculateScienceLayout({ width, height, bottomVideoHeightRatio });
	const subtitles = `subtitles=filename=${escapeForFilterPath(subtitlePath)}`;
	const filter = [
		scalePdfPageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleBackgroundVideoToOverlayFilter('[1:v]', width, layout.bottomVideoHeight, '[bgv]'),
		`[pagev][bgv]overlay=0:${layout.bottomVideoY}[overlayv]`,
		`[overlayv]${subtitles}[vout]`,
	].join(';');

	const args = [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		'-stream_loop',
		'-1',
		'-i',
		backgroundVideoPath,
		'-i',
		audioPath,
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'2:a',
		'-r',
		String(fps),
		'-c:v',
		encoderCodec,
	];
	if (encoderCodec === 'libx264' && encoderPreset) args.push('-preset', encoderPreset);
	args.push(
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
		'-shortest',
		outputPath,
	);

	return args;
}

export function buildPauseSegmentFfmpegArgs({
	pageImage,
	backgroundVideoPath,
	outputPath,
	duration,
	width = 1080,
	height = 1920,
	fps = 30,
	bottomVideoHeightRatio = 0.2,
	encoderCodec = 'libx264',
	encoderPreset = '',
}) {
	const layout = calculateScienceLayout({ width, height, bottomVideoHeightRatio });
	const filter = [
		scalePdfPageToCanvasFilter('[0:v]', width, height, '[pagev]'),
		scaleBackgroundVideoToOverlayFilter('[1:v]', width, layout.bottomVideoHeight, '[bgv]'),
		`[pagev][bgv]overlay=0:${layout.bottomVideoY}[vout]`,
	].join(';');

	const args = [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		'-stream_loop',
		'-1',
		'-i',
		backgroundVideoPath,
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
		encoderCodec,
	];
	if (encoderCodec === 'libx264' && encoderPreset) args.push('-preset', encoderPreset);
	args.push(
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
		outputPath,
	);

	return args;
}

export function buildScienceConcatList({ segmentPaths = [], pausePaths = [] }) {
	const paths = [];
	for (const [index, segmentPath] of segmentPaths.entries()) {
		paths.push(segmentPath);
		if (index < segmentPaths.length - 1 && pausePaths[index]) paths.push(pausePaths[index]);
	}

	return paths.filter(Boolean);
}

function quoteConcatPath(filePath) {
	return `file '${String(filePath).replace(/'/g, "'\\''")}'`;
}

export function buildScienceFinalConcatFfmpegArgs({ concatListPath, outputVideoPath }) {
	return [
		'-y',
		'-f',
		'concat',
		'-safe',
		'0',
		'-i',
		concatListPath,
		'-c',
		'copy',
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
	return ['-y', '-i', inputVideoPath, '-vn', '-c:a', 'libmp3lame', '-ar', '48000', '-ac', '2', outputAudioPath];
}

function render() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/compose-science-explainer-video.mjs JOB_JSON_PATH');
	const job = validateScienceJob(JSON.parse(fs.readFileSync(jobPath, 'utf8')));
	fs.mkdirSync(job.renderDir, { recursive: true });

	const layout = calculateScienceLayout({
		width: job.width,
		height: job.height,
		bottomVideoHeightRatio: job.bottomVideoHeightRatio,
	});
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const audioManifest = JSON.parse(fs.readFileSync(job.pageAudioManifestPath, 'utf8'));
	const timing = buildPageTiming({
		pages: pagesManifest.pages,
		audio: audioManifest.pages,
		pagePauseSeconds: job.pagePauseSeconds,
	});
	fs.writeFileSync(job.pageTimingPath, JSON.stringify(timing, null, 2), 'utf8');
	fs.writeFileSync(job.subtitlePath, createAssSubtitle({
		width: job.width,
		height: job.height,
		marginV: layout.subtitleMarginV,
		events: timing.subtitles,
	}), 'utf8');

	const segmentPaths = [];
	const pausePaths = [];
	for (const [index, page] of timing.pages.entries()) {
		const name = safePageName(page.pageNumber);
		const pageSubtitlePath = path.join(job.renderDir, `${name}.ass`);
		fs.writeFileSync(pageSubtitlePath, createAssSubtitle({
			width: job.width,
			height: job.height,
			marginV: layout.subtitleMarginV,
			events: buildSubtitleEventsForSegment({ page }),
		}), 'utf8');

		const segmentPath = path.join(job.renderDir, `segment-${String(page.pageNumber).padStart(3, '0')}.mp4`);
		runFfmpeg(buildScienceSegmentFfmpegArgs({
			pageImage: page.pageImage,
			backgroundVideoPath: job.backgroundVideoPath,
			audioPath: page.audioPath,
			subtitlePath: pageSubtitlePath,
			outputPath: segmentPath,
			width: job.width,
			height: job.height,
			fps: job.fps,
			bottomVideoHeightRatio: job.bottomVideoHeightRatio,
			encoderCodec: job.encoderCodec,
			encoderPreset: job.encoderPreset,
		}), job.ffmpegLogPath);
		segmentPaths.push(segmentPath);

		if (index < timing.pages.length - 1 && timing.pagePauseSeconds > 0) {
			const pausePath = path.join(job.renderDir, `pause-${String(page.pageNumber).padStart(3, '0')}.mp4`);
			runFfmpeg(buildPauseSegmentFfmpegArgs({
				pageImage: page.pageImage,
				backgroundVideoPath: job.backgroundVideoPath,
				outputPath: pausePath,
				duration: timing.pagePauseSeconds,
				width: job.width,
				height: job.height,
				fps: job.fps,
				bottomVideoHeightRatio: job.bottomVideoHeightRatio,
				encoderCodec: job.encoderCodec,
				encoderPreset: job.encoderPreset,
			}), job.ffmpegLogPath);
			pausePaths.push(pausePath);
		}
	}

	const concatListPath = path.join(job.renderDir, 'segments.txt');
	const concatPaths = buildScienceConcatList({ segmentPaths, pausePaths });
	fs.writeFileSync(concatListPath, concatPaths.map(quoteConcatPath).join('\n'), 'utf8');
	runFfmpeg(buildScienceFinalConcatFfmpegArgs({ concatListPath, outputVideoPath: job.outputVideoPath }), job.ffmpegLogPath);
	runFfmpeg(buildExtractAudioArgs({ inputVideoPath: job.outputVideoPath, outputAudioPath: job.outputAudioPath }), job.ffmpegLogPath);

	console.log(JSON.stringify({
		ok: true,
		outputVideoPath: job.outputVideoPath,
		outputAudioPath: job.outputAudioPath,
		pageTimingPath: job.pageTimingPath,
		aspectRatio: job.aspectRatio,
		layout,
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
