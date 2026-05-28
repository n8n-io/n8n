#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function splitScriptIntoSubtitleChunks(text, options = {}) {
	const maxChars = options.maxChars ?? 28;
	if (!Number.isFinite(maxChars) || maxChars <= 0) {
		throw new Error('maxChars must be a positive number');
	}

	const normalized = String(text)
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{2,}/g, '\n')
		.trim();

	if (!normalized) return [];

	const sentenceParts = normalized
		.split(/(?<=[。！？!?；;：:\n])/u)
		.map((part) => part.trim())
		.filter(Boolean);

	const chunks = [];
	for (const part of sentenceParts.length > 0 ? sentenceParts : [normalized]) {
		if (part.length <= maxChars) {
			chunks.push(part);
			continue;
		}

		for (let index = 0; index < part.length; index += maxChars) {
			chunks.push(part.slice(index, index + maxChars));
		}
	}

	return chunks;
}

export function assEscape(text) {
	return String(text).replace(/\\[nN]|\n|\\|[{}]/g, (match) => {
		if (match === '\\n' || match === '\\N' || match === '\n') return '\\N';
		if (match === '\\') return '\\\\';

		return `\\${match}`;
	});
}

export function toAssTime(seconds) {
	const safeSeconds = Math.max(0, Number(seconds) || 0);
	const totalCentiseconds = Math.round(safeSeconds * 100);
	const hours = Math.floor(totalCentiseconds / 360000);
	const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
	const wholeSeconds = Math.floor((totalCentiseconds % 6000) / 100);
	const centiseconds = totalCentiseconds % 100;

	return `${hours}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function buildTimeline(audioDuration, options = {}) {
	const coverDuration = Number(options.coverDuration ?? 3);
	const screenshotDuration = Number(options.screenshotDuration ?? 4);
	const introDuration = coverDuration + screenshotDuration;
	const totalDuration = Math.max(Number(audioDuration) || 0, introDuration);

	return {
		totalDuration,
		cover: { start: 0, end: coverDuration, duration: coverDuration },
		screenshot: {
			start: coverDuration,
			end: introDuration,
			duration: screenshotDuration,
		},
		body: {
			start: introDuration,
			end: totalDuration,
			duration: Math.max(0, totalDuration - introDuration),
		},
	};
}

export function normalizeJob(rawJob) {
	if (!rawJob || typeof rawJob !== 'object') {
		throw new Error('Job must be an object');
	}

	const job = {
		...rawJob,
		video: {
			width: 1920,
			height: 1080,
			fps: 30,
			coverDuration: 3,
			screenshotDuration: 4,
			...(rawJob.video ?? {}),
		},
		layout: {
			coverTop: {
				x: 80,
				y: 60,
				width: 560,
				...(rawJob.layout?.coverTop ?? {}),
			},
			screenshotTop: {
				x: 1280,
				y: 60,
				width: 560,
				...(rawJob.layout?.screenshotTop ?? {}),
			},
			subtitleBottomMargin: rawJob.layout?.subtitleBottomMargin ?? 90,
		},
	};

	for (const field of ['coverImage', 'screenshotImage', 'backgroundVideo', 'scriptText', 'ttsAudio']) {
		if (!job.inputs?.[field]) throw new Error(`Missing inputs.${field}`);
	}

	for (const field of ['video', 'subtitles', 'ffmpegLog']) {
		if (!job.output?.[field]) throw new Error(`Missing output.${field}`);
	}

	return job;
}

export function assertInputFiles(job) {
	for (const [name, filePath] of Object.entries(job.inputs)) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`Missing input file for ${name}: ${filePath}`);
		}
	}
}

export function createAssSubtitle({
	scriptText,
	outputPath,
	totalDuration,
	width,
	height,
	subtitleBottomMargin,
}) {
	const chunks = splitScriptIntoSubtitleChunks(scriptText);
	if (chunks.length === 0) throw new Error('Script text is empty');

	const eventDuration = Math.max(0, Number(totalDuration) || 0) / chunks.length;
	const events = chunks.map((chunk, index) => {
		const start = index * eventDuration;
		const end = index === chunks.length - 1 ? totalDuration : (index + 1) * eventDuration;

		return `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Default,,0,0,0,,${assEscape(chunk)}`;
	});

	const content = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00F7F7A0,&H000000FF,&H00000000,&HAA000000,-1,0,0,0,100,100,0,0,3,2,0,2,80,80,${subtitleBottomMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`;

	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, content);
}

function escapeForFilterPath(filePath) {
	return String(filePath).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function scaleAndPad(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white${label}`;
}

function backgroundSegment(input, start, duration, width, height, label) {
	return `${input}trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1${label}`;
}

export function buildFfmpegArgs(job, { audioDuration }) {
	const timeline = buildTimeline(audioDuration, job.video);
	const { width, height, fps } = job.video;
	const coverTopHeight = Math.round((job.layout.coverTop.width * 9) / 16);
	const screenshotTopHeight = Math.round((job.layout.screenshotTop.width * 9) / 16);
	const subtitlePath = escapeForFilterPath(job.output.subtitles);

	const bodyFilters =
		timeline.body.duration > 0
			? [
					backgroundSegment(
						'[0:v]',
						timeline.body.start,
						timeline.body.duration,
						width,
						height,
						'[bodybg]',
					),
					scaleAndPad(
						'[1:v]',
						job.layout.coverTop.width,
						coverTopHeight,
						'[covertop]',
					),
					scaleAndPad(
						'[2:v]',
						job.layout.screenshotTop.width,
						screenshotTopHeight,
						'[screentop]',
					),
					`[bodybg][covertop]overlay=${job.layout.coverTop.x}:${job.layout.coverTop.y}[body1]`,
					`[body1][screentop]overlay=${job.layout.screenshotTop.x}:${job.layout.screenshotTop.y}[body]`,
				]
			: [`color=c=black:s=${width}x${height}:d=0.01[body]`];

	const filter = [
		backgroundSegment('[0:v]', timeline.cover.start, timeline.cover.duration, width, height, '[coverbg]'),
		scaleAndPad('[1:v]', 1500, 820, '[covermain]'),
		'[coverbg][covermain]overlay=(W-w)/2:(H-h)/2[cover]',
		backgroundSegment(
			'[0:v]',
			timeline.screenshot.start,
			timeline.screenshot.duration,
			width,
			height,
			'[screenbg]',
		),
		scaleAndPad('[2:v]', 1600, 780, '[screenmain]'),
		'[screenbg][screenmain]overlay=(W-w)/2:(H-h)/2[screen]',
		...bodyFilters,
		`[cover][screen][body]concat=n=3:v=1:a=0,subtitles='${subtitlePath}'[vout]`,
	].join(';');

	return [
		'-y',
		'-stream_loop',
		'-1',
		'-i',
		job.inputs.backgroundVideo,
		'-loop',
		'1',
		'-i',
		job.inputs.coverImage,
		'-loop',
		'1',
		'-i',
		job.inputs.screenshotImage,
		'-i',
		job.inputs.ttsAudio,
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'3:a',
		'-t',
		String(timeline.totalDuration),
		'-r',
		String(fps),
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-shortest',
		job.output.video,
	];
}

export function getAudioDuration(audioPath) {
	const result = spawnSync(
		'ffprobe',
		[
			'-v',
			'error',
			'-show_entries',
			'format=duration',
			'-of',
			'default=noprint_wrappers=1:nokey=1',
			audioPath,
		],
		{ encoding: 'utf8' },
	);

	if (result.status !== 0) {
		throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`);
	}

	const duration = Number.parseFloat(result.stdout.trim());
	if (!Number.isFinite(duration) || duration <= 0) {
		throw new Error(`Invalid audio duration from ffprobe: ${result.stdout}`);
	}

	return duration;
}

export function render(job) {
	assertInputFiles(job);
	const scriptText = fs.readFileSync(job.inputs.scriptText, 'utf8');
	const audioDuration = getAudioDuration(job.inputs.ttsAudio);
	const timeline = buildTimeline(audioDuration, job.video);

	createAssSubtitle({
		scriptText,
		outputPath: job.output.subtitles,
		totalDuration: timeline.totalDuration,
		width: job.video.width,
		height: job.video.height,
		subtitleBottomMargin: job.layout.subtitleBottomMargin,
	});

	fs.mkdirSync(path.dirname(job.output.video), { recursive: true });
	fs.mkdirSync(path.dirname(job.output.ffmpegLog), { recursive: true });

	const result = spawnSync('ffmpeg', buildFfmpegArgs(job, { audioDuration }), { encoding: 'utf8' });
	fs.writeFileSync(job.output.ffmpegLog, `${result.stdout}\n${result.stderr}`);

	if (result.status !== 0) {
		throw new Error(`ffmpeg failed with exit code ${result.status}; see ${job.output.ffmpegLog}`);
	}

	if (fs.statSync(job.output.video).size === 0) {
		throw new Error(`Output video is empty: ${job.output.video}`);
	}
}

function main() {
	const jobPath = process.argv[2];
	if (!jobPath) {
		console.error('Usage: node tools/video-composer/compose-video.mjs JOB_JSON_PATH');
		process.exit(1);
	}

	try {
		const rawJob = JSON.parse(fs.readFileSync(path.resolve(jobPath), 'utf8'));
		render(normalizeJob(rawJob));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
