#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { buildPageTiming, safePageName, validatePagesManifest } from './presentation-utils.mjs';
import { assEscape, toAssTime } from './compose-video.mjs';

export function scalePageFilter(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white${label}`;
}

export function createAssSubtitle({ width = 1920, height = 1080, events = [] }) {
	const lines = [
		'[Script Info]',
		'ScriptType: v4.00+',
		`PlayResX: ${width}`,
		`PlayResY: ${height}`,
		'',
		'[V4+ Styles]',
		'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
		'Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,1,2,80,80,90,1',
		'',
		'[Events]',
		'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
	];
	for (const event of events) {
		lines.push(`Dialogue: 0,${toAssTime(event.start)},${toAssTime(event.end)},Default,,0,0,0,,${assEscape(event.text)}`);
	}

	return `${lines.join('\n')}\n`;
}

function escapeForFilterPath(filePath) {
	return String(filePath)
		.replace(/\\/g, '/')
		.replace(/([\\':,;\[\] ])/g, '\\$1');
}

export function buildSegmentFfmpegArgs({
	pageImage,
	audioPath,
	subtitlePath,
	outputPath,
	width = 1920,
	height = 1080,
	fps = 30,
}) {
	const filter = `${scalePageFilter('[0:v]', width, height, '[pagev]')};[pagev]subtitles=filename=${escapeForFilterPath(subtitlePath)}[vout]`;

	return [
		'-y',
		'-loop',
		'1',
		'-i',
		pageImage,
		'-i',
		audioPath,
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

function runFfmpeg(args, logPath) {
	const result = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
	fs.appendFileSync(logPath, `$ ffmpeg ${args.join(' ')}\n${result.stdout}\n${result.stderr}\n`, 'utf8');
	if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}; see ${logPath}`);
}

function quoteConcatPath(filePath) {
	return `file '${String(filePath).replace(/'/g, "'\\''")}'`;
}

function render() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/compose-presentation-video.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	fs.mkdirSync(job.renderDir, { recursive: true });
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const audioManifest = JSON.parse(fs.readFileSync(job.pageAudioManifestPath, 'utf8'));
	const timing = buildPageTiming({
		pages: pagesManifest.pages,
		audio: audioManifest.pages,
		pagePauseSeconds: job.pagePauseSeconds ?? 0.3,
	});
	fs.writeFileSync(job.pageTimingPath, JSON.stringify(timing, null, 2), 'utf8');
	fs.writeFileSync(job.subtitlePath, createAssSubtitle({
		width: job.width ?? 1920,
		height: job.height ?? 1080,
		events: timing.subtitles,
	}), 'utf8');
	const concatListPath = path.join(job.renderDir, 'segments.txt');
	const concatLines = [];
	for (const page of timing.pages) {
		const name = safePageName(page.pageNumber);
		const pageSubtitlePath = path.join(job.renderDir, `${name}.ass`);
		fs.writeFileSync(pageSubtitlePath, createAssSubtitle({
			width: job.width ?? 1920,
			height: job.height ?? 1080,
			events: page.subtitleEvents.map((event) => ({
				...event,
				start: event.start - page.start,
				end: event.end - page.start,
			})),
		}), 'utf8');
		const segmentPath = path.join(job.renderDir, `segment-${String(page.pageNumber).padStart(3, '0')}.mp4`);
		runFfmpeg(buildSegmentFfmpegArgs({
			pageImage: page.pageImage,
			audioPath: page.audioPath,
			subtitlePath: pageSubtitlePath,
			outputPath: segmentPath,
			width: job.width ?? 1920,
			height: job.height ?? 1080,
			fps: job.fps ?? 30,
		}), job.ffmpegLogPath);
		concatLines.push(quoteConcatPath(segmentPath));
	}
	fs.writeFileSync(concatListPath, concatLines.join('\n'), 'utf8');
	runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', job.outputVideoPath], job.ffmpegLogPath);
	console.log(JSON.stringify({
		ok: true,
		outputVideoPath: job.outputVideoPath,
		pageTimingPath: job.pageTimingPath,
	}));
}

if (process.argv[1] && process.argv[1].endsWith('compose-presentation-video.mjs')) {
	try {
		render();
	} catch (error) {
		console.error(error.stack || error.message);
		process.exit(1);
	}
}
