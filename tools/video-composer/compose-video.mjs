#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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

function pickFirstString(object, keys) {
	for (const key of keys) {
		const value = object?.[key];
		if (typeof value === 'string' && value.trim()) return value.trim();
	}

	return '';
}

function pickFirstNumberWithKey(object, keys) {
	for (const key of keys) {
		const value = object?.[key];
		if (typeof value === 'number' && Number.isFinite(value)) return { key, value };
		if (typeof value === 'string' && value.trim()) {
			const parsed = Number(value);
			if (Number.isFinite(parsed)) return { key, value: parsed };
		}
	}

	return null;
}

function normalizeTimestamp(value, key = '') {
	if (!Number.isFinite(value)) return null;
	if (/_ms$|Ms$|millisecond/i.test(key) || value > 100) return value / 1000;

	return value;
}

function normalizeTimedWord(rawWord) {
	const text = pickFirstString(rawWord, ['text', 'word', 'token', 'content', 'char']);
	const startValue = pickFirstNumberWithKey(rawWord, [
		'start_time',
		'startTime',
		'start',
		'begin_time',
		'beginTime',
		'begin',
		'offset',
	]);
	const endValue = pickFirstNumberWithKey(rawWord, [
		'end_time',
		'endTime',
		'end',
		'stop_time',
		'stopTime',
		'stop',
	]);
	const durationValue = pickFirstNumberWithKey(rawWord, ['duration', 'duration_ms', 'durationMs']);
	const start = normalizeTimestamp(startValue?.value, startValue?.key);
	const explicitEnd = normalizeTimestamp(endValue?.value, endValue?.key);
	const duration = normalizeTimestamp(durationValue?.value, durationValue?.key);
	const end = explicitEnd ?? (start !== null && duration !== null ? start + duration : null);

	if (!text || start === null || end === null || end <= start) return null;

	return { text, start, end };
}

function flattenTimedWordsFromFrames(frames) {
	const words = [];
	for (const frame of Array.isArray(frames) ? frames : []) {
		const sentence = frame?.sentence ?? frame;
		const candidates = [sentence?.words, sentence?.word_timestamps, sentence?.timestamps, frame?.words]
			.filter(Array.isArray);
		for (const candidate of candidates) {
			for (const rawWord of candidate) {
				const word = normalizeTimedWord(rawWord);
				if (word) words.push(word);
			}
		}
	}

	return words.sort((left, right) => left.start - right.start);
}

export function buildSubtitleEventsFromTimedWords(words, options = {}) {
	const maxChars = options.maxChars ?? 34;
	const maxDuration = options.maxDuration ?? 4.5;
	const events = [];
	let current = null;

	for (const word of words) {
		const text = String(word.text ?? '').trim();
		if (!text) continue;
		const start = Number(word.start);
		const end = Number(word.end);
		if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

		const nextText = current ? `${current.text}${text}` : text;
		const tooLong = current && nextText.length > maxChars;
		const tooSlow = current && end - current.start > maxDuration;
		const punctuationBreak = current && /[。！？!?；;：:]$/u.test(current.text);
		if (tooLong || tooSlow || punctuationBreak) {
			events.push(current);
			current = null;
		}

		if (!current) {
			current = { text, start, end };
		} else {
			current.text += text;
			current.end = end;
		}
	}

	if (current) events.push(current);

	return events;
}

export function readTtsSubtitleEvents(timingPath, options = {}) {
	if (!timingPath || !fs.existsSync(timingPath)) return [];

	const payload = JSON.parse(fs.readFileSync(timingPath, 'utf8'));
	if (Array.isArray(payload?.subtitles)) {
		return payload.subtitles
			.map((subtitle) => ({
				text: String(subtitle.text ?? '').trim(),
				start: Number(subtitle.start),
				end: Number(subtitle.end),
			}))
			.filter((subtitle) => (
				subtitle.text &&
				Number.isFinite(subtitle.start) &&
				Number.isFinite(subtitle.end) &&
				subtitle.end > subtitle.start
			));
	}
	const frames = Array.isArray(payload) ? payload : payload.frames;
	const words = flattenTimedWordsFromFrames(frames);

	return buildSubtitleEventsFromTimedWords(words, options);
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
			cornerImageTreatment: {
				enabled: rawJob.layout?.cornerImageTreatment?.enabled ?? true,
				blur: rawJob.layout?.cornerImageTreatment?.blur ?? 2,
				opacity: rawJob.layout?.cornerImageTreatment?.opacity ?? 0.82,
				borderColor: rawJob.layout?.cornerImageTreatment?.borderColor ?? 'white',
				borderWidth: rawJob.layout?.cornerImageTreatment?.borderWidth ?? 6,
			},
			subtitleBottomMargin: rawJob.layout?.subtitleBottomMargin ?? 90,
		},
	};

	if (rawJob.inputs?.subtitleTiming) {
		job.inputs.subtitleTiming = rawJob.inputs.subtitleTiming;
	}

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
	subtitleEvents = [],
	subtitleStart = 0,
	subtitleDuration = null,
}) {
	const safeSubtitleStart = Math.max(0, Number(subtitleStart) || 0);
	const safeSubtitleDuration = Math.max(
		0,
		Number(subtitleDuration ?? (Number(totalDuration) || 0) - safeSubtitleStart) || 0,
	);
	const timedEvents = subtitleEvents
		.map((event) => ({
			text: String(event.text ?? '').trim(),
			start: safeSubtitleStart + Math.max(0, Number(event.start) || 0),
			end: Math.min(
				Number(totalDuration) || 0,
				safeSubtitleStart + Math.max(0, Number(event.end) || 0),
			),
		}))
		.filter((event) => event.text && event.end > event.start);

	let events = timedEvents;
	if (events.length === 0) {
		const chunks = splitScriptIntoSubtitleChunks(scriptText);
		if (chunks.length === 0) throw new Error('Script text is empty');

		const eventDuration = safeSubtitleDuration / chunks.length;
		events = chunks.map((chunk, index) => {
			const start = safeSubtitleStart + index * eventDuration;
			const end =
				index === chunks.length - 1
					? Math.min(Number(totalDuration) || 0, safeSubtitleStart + safeSubtitleDuration)
					: safeSubtitleStart + (index + 1) * eventDuration;

			return { text: chunk, start, end };
		});
	}

	const dialogueLines = events.map((event) => (
		`Dialogue: 0,${toAssTime(event.start)},${toAssTime(event.end)},Default,,0,0,0,,${assEscape(event.text)}`
	));

	const content = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,1,2,80,80,${subtitleBottomMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogueLines.join('\n')}
`;

	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, content);
}

function pythonCanRenderSubtitleImages() {
	const result = spawnSync(
		'python3',
		['-c', 'from PIL import Image, ImageDraw, ImageFont'],
		{ stdio: 'ignore' },
	);

	return result.status === 0;
}

export function createSubtitleOverlayFrames({
	scriptText,
	outputDir,
	totalDuration,
	width,
	frameRate = 3,
	subtitleEvents = [],
	subtitleStart = 0,
	subtitleDuration = null,
}) {
	const chunks = splitScriptIntoSubtitleChunks(scriptText, { maxChars: 34 });
	if (chunks.length === 0) throw new Error('Script text is empty');

	fs.mkdirSync(outputDir, { recursive: true });

	const safeSubtitleStart = Math.max(0, Number(subtitleStart) || 0);
	const safeSubtitleDuration = Math.max(
		0,
		Number(subtitleDuration ?? (Number(totalDuration) || 0) - safeSubtitleStart) || 0,
	);
	const timedEvents = subtitleEvents
		.map((event) => ({
			text: String(event.text ?? '').trim(),
			start: safeSubtitleStart + Math.max(0, Number(event.start) || 0),
			end: Math.min(
				Number(totalDuration) || 0,
				safeSubtitleStart + Math.max(0, Number(event.end) || 0),
			),
		}))
		.filter((event) => event.text && event.end > event.start);
	const eventDuration = safeSubtitleDuration / chunks.length;
	const fallbackEvents = chunks.map((text, index) => ({
		text,
		start: safeSubtitleStart + index * eventDuration,
		end:
			index === chunks.length - 1
				? Math.min(Number(totalDuration) || 0, safeSubtitleStart + safeSubtitleDuration)
				: safeSubtitleStart + (index + 1) * eventDuration,
	}));
	const events = timedEvents.length > 0 ? timedEvents : fallbackEvents;
	const safeFrameRate = Math.max(1, Math.round(Number(frameRate) || 3));
	const frameCount = Math.max(1, Math.ceil(totalDuration * safeFrameRate));
	const pattern = path.join(outputDir, 'subtitle-frame-%05d.png');

	const python = String.raw`
import json
import sys
from PIL import Image, ImageDraw, ImageFont

payload = json.load(sys.stdin)
font_candidates = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]
font = None
for candidate in font_candidates:
    try:
        font = ImageFont.truetype(candidate, payload["fontSize"])
        break
    except Exception:
        pass
if font is None:
    font = ImageFont.load_default()

def measure(draw, text):
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=payload["strokeWidth"])
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def wrap_text(draw, text, max_width):
    lines = []
    current = ""
    for char in text:
        tentative = current + char
        if measure(draw, tentative)[0] <= max_width or not current:
            current = tentative
        else:
            lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines

def text_for_time(seconds):
    for event in payload["events"]:
        if seconds >= event["start"] and seconds < event["end"]:
            return event["text"]
    return ""

for frame_index in range(payload["frameCount"]):
    image = Image.new("RGBA", (payload["width"], payload["height"]), (0, 0, 0, 0))
    text = text_for_time(frame_index / payload["frameRate"])
    if text:
        draw = ImageDraw.Draw(image)
        lines = wrap_text(draw, text, payload["maxTextWidth"])
        line_heights = [measure(draw, line)[1] for line in lines]
        text_width = max([measure(draw, line)[0] for line in lines] or [0])
        line_gap = payload["lineGap"]
        text_height = sum(line_heights) + max(0, len(lines) - 1) * line_gap
        y = payload["height"] - text_height - payload["padY"]
        for line, line_h in zip(lines, line_heights):
            line_w = measure(draw, line)[0]
            x = (payload["width"] - line_w) // 2
            draw.text(
                (x, y),
                line,
                font=font,
				fill=(255, 255, 255, 255),
                stroke_width=payload["strokeWidth"],
                stroke_fill=(0, 0, 0, 255),
            )
            y += line_h + line_gap
    image.save(payload["pattern"] % frame_index)
`;

	const result = spawnSync(
		'python3',
		['-c', python],
		{
			input: JSON.stringify({
				events,
				width,
				height: 260,
				frameRate: safeFrameRate,
				frameCount,
				pattern: path.join(outputDir, 'subtitle-frame-%05d.png'),
				maxTextWidth: Math.min(1500, Math.round(width * 0.78)),
				fontSize: 68,
				strokeWidth: 2,
				padX: 34,
				padY: 22,
				lineGap: 14,
				radius: 14,
			}),
			encoding: 'utf8',
		},
	);

	if (result.status !== 0) {
		throw new Error(`Failed to render subtitle overlay frames: ${result.stderr || result.stdout}`);
	}

	return {
		pattern,
		frameRate: safeFrameRate,
		frameCount,
	};
}

function escapeForFilterPath(filePath) {
	return String(filePath)
		.replace(/\\/g, '/')
		.replace(/([\\':,;\[\] ])/g, '\\$1');
}

export function ffmpegHasFilter(name) {
	const result = spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' });
	if (result.status !== 0) return false;

	const filters = `${result.stdout}\n${result.stderr}`;

	return filters
		.split('\n')
		.some((line) => {
			const [, filterName] = line.trim().split(/\s+/);

			return filterName === name;
		});
}

function scaleAndPad(input, width, height, label) {
	return `${input}scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=white${label}`;
}

function scaleStaticOverlay(input, maxWidth, maxHeight, duration, fps, label, treatment = null) {
	const filters = [
		`scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1`,
		'setsar=1',
		`fps=${fps}`,
		`trim=duration=${duration}`,
		'setpts=PTS-STARTPTS',
	];

	if (treatment?.enabled) {
		const blur = Math.max(0, Number(treatment.blur) || 0);
		const opacity = Math.min(1, Math.max(0, Number(treatment.opacity) || 1));
		if (blur > 0) filters.push(`boxblur=${blur}`);
		if (opacity < 1) filters.push(`colorchannelmixer=aa=${opacity}`);
	}

	const borderColor = treatment?.borderColor ?? 'white';
	const borderWidth = Math.max(0, Number(treatment?.borderWidth ?? 6) || 0);
	if (borderWidth > 0) {
		filters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=${borderColor}:t=${borderWidth}`);
	}

	return `${input}${filters.join(',')}${label}`;
}

function backgroundSegment(input, start, duration, width, height, label) {
	return `${input}trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1${label}`;
}

export function buildFfmpegArgs(
	job,
	{ audioDuration, subtitlePath = job.output.subtitles, subtitleMode = 'burn', subtitleOverlay = null },
) {
	const timeline = buildTimeline(audioDuration, job.video);
	const { width, height, fps } = job.video;
	const coverTopHeight = Math.round((job.layout.coverTop.width * 9) / 16);
	const screenshotTopHeight = Math.round((job.layout.screenshotTop.width * 9) / 16);
	const escapedSubtitlePath = escapeForFilterPath(subtitlePath);
	const burnSubtitles = subtitleMode === 'burn';
	const imageSubtitles = subtitleMode === 'image' && subtitleOverlay;
	const softSubtitles = subtitleMode === 'soft' && !imageSubtitles;
	const hasBodyStage = timeline.body.duration > 0;
	const coverMainInput = hasBodyStage ? '[covermainsrc]' : '[1:v]';
	const screenshotMainInput = hasBodyStage ? '[screenmainsrc]' : '[2:v]';

	const bodyFilters =
		hasBodyStage
			? [
					backgroundSegment(
						'[0:v]',
						timeline.body.start,
						timeline.body.duration,
						width,
						height,
						'[bodybg]',
					),
					scaleStaticOverlay(
						'[covertopsrc]',
						job.layout.coverTop.width,
						coverTopHeight,
						timeline.body.duration,
						fps,
						'[covertop]',
						job.layout.cornerImageTreatment,
					),
					scaleStaticOverlay(
						'[screentopsrc]',
						job.layout.screenshotTop.width,
						screenshotTopHeight,
						timeline.body.duration,
						fps,
						'[screentop]',
						job.layout.cornerImageTreatment,
					),
					`[bodybg][covertop]overlay=${job.layout.coverTop.x}:${job.layout.coverTop.y}:eof_action=pass[body1]`,
					`[body1][screentop]overlay=${job.layout.screenshotTop.x}:${job.layout.screenshotTop.y}:eof_action=pass[body]`,
				]
			: [`color=c=black:s=${width}x${height}:d=0.01[body]`];

	const visualFilters = [
		...(hasBodyStage
			? [
					'[1:v]split=2[covermainsrc][covertopsrc]',
					'[2:v]split=2[screenmainsrc][screentopsrc]',
				]
			: []),
		backgroundSegment('[0:v]', timeline.cover.start, timeline.cover.duration, width, height, '[coverbg]'),
		scaleAndPad(coverMainInput, 1500, 820, '[covermain]'),
		'[coverbg][covermain]overlay=(W-w)/2:(H-h)/2:shortest=1[cover]',
		backgroundSegment(
			'[0:v]',
			timeline.screenshot.start,
			timeline.screenshot.duration,
			width,
			height,
			'[screenbg]',
		),
		scaleAndPad(screenshotMainInput, 1600, 780, '[screenmain]'),
		'[screenbg][screenmain]overlay=(W-w)/2:(H-h)/2:shortest=1[screen]',
		...bodyFilters,
		`[cover][screen][body]concat=n=3:v=1:a=0${burnSubtitles ? `,subtitles=filename=${escapedSubtitlePath}` : ''}[basev]`,
	];

	if (imageSubtitles) {
		visualFilters.push(
			'[4:v]format=rgba[subtitles]',
			`[basev][subtitles]overlay=0:H-h-${job.layout.subtitleBottomMargin}:eof_action=pass:format=auto[vout]`,
		);
	} else {
		visualFilters.push('[basev]copy[vout]');
	}

	const filter = [
		...visualFilters,
		`[3:a]apad,atrim=0:${timeline.totalDuration},asetpts=PTS-STARTPTS[aout]`,
	].join(';');

	const args = [
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
	];

	if (softSubtitles) {
		args.push('-i', subtitlePath);
	}

	if (imageSubtitles) {
		args.push(
			'-framerate',
			String(subtitleOverlay.frameRate),
			'-start_number',
			'0',
			'-i',
			subtitleOverlay.pattern,
		);
	}

	args.push(
		'-filter_complex',
		filter,
		'-map',
		'[vout]',
		'-map',
		'[aout]',
	);

	if (softSubtitles) {
		args.push('-map', '4:0');
	}

	args.push(
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
	);

	if (softSubtitles) {
		args.push('-c:s', 'mov_text');
	}

	args.push(
		job.output.video,
	);

	return args;
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
	const ffmpegSubtitlePath = path.join(
		os.tmpdir(),
		`n8n-video-composer-subtitles-${process.pid}-${Date.now()}.ass`,
	);

	createAssSubtitle({
		scriptText,
		outputPath: job.output.subtitles,
		totalDuration: timeline.totalDuration,
		width: job.video.width,
		height: job.video.height,
		subtitleBottomMargin: job.layout.subtitleBottomMargin,
		subtitleEvents: readTtsSubtitleEvents(job.inputs.subtitleTiming),
		subtitleStart: 0,
		subtitleDuration: audioDuration,
	});
	fs.copyFileSync(job.output.subtitles, ffmpegSubtitlePath);
	const canBurnSubtitles = ffmpegHasFilter('subtitles');
	const subtitleOverlay = !canBurnSubtitles && pythonCanRenderSubtitleImages()
		? createSubtitleOverlayFrames({
				scriptText,
				outputDir: path.join(path.dirname(job.output.subtitles), 'subtitle-frames'),
				totalDuration: timeline.totalDuration,
				width: job.video.width,
				subtitleEvents: readTtsSubtitleEvents(job.inputs.subtitleTiming),
				subtitleStart: 0,
				subtitleDuration: audioDuration,
			})
		: null;
	const subtitleMode = canBurnSubtitles ? 'burn' : subtitleOverlay ? 'image' : 'soft';

	fs.mkdirSync(path.dirname(job.output.video), { recursive: true });
	fs.mkdirSync(path.dirname(job.output.ffmpegLog), { recursive: true });

	try {
		const result = spawnSync(
			'ffmpeg',
			buildFfmpegArgs(job, {
				audioDuration,
				subtitlePath: ffmpegSubtitlePath,
				subtitleMode,
				subtitleOverlay,
			}),
			{
				encoding: 'utf8',
			},
		);
		fs.writeFileSync(job.output.ffmpegLog, `${result.stdout}\n${result.stderr}`);

		if (result.status !== 0) {
			throw new Error(`ffmpeg failed with exit code ${result.status}; see ${job.output.ffmpegLog}`);
		}

		if (fs.statSync(job.output.video).size === 0) {
			throw new Error(`Output video is empty: ${job.output.video}`);
		}
	} finally {
		fs.rmSync(ffmpegSubtitlePath, { force: true });
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
