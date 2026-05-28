import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
	assEscape,
	buildFfmpegArgs,
	buildTimeline,
	createAssSubtitle,
	normalizeJob,
	splitScriptIntoSubtitleChunks,
	toAssTime,
} from './compose-video.mjs';

test('splitScriptIntoSubtitleChunks keeps Chinese sentences readable', () => {
	const chunks = splitScriptIntoSubtitleChunks(
		'红茶中的茶黄素值得关注。它和现代生活方式对肝脏的影响有关！接下来我们看研究截图。',
	);

	assert.deepEqual(chunks, [
		'红茶中的茶黄素值得关注。',
		'它和现代生活方式对肝脏的影响有关！',
		'接下来我们看研究截图。',
	]);
});

test('splitScriptIntoSubtitleChunks breaks very long text into bounded chunks', () => {
	const chunks = splitScriptIntoSubtitleChunks(
		'这是一段没有明显标点但是很长很长需要被拆分成多条字幕否则画面底部会被文字撑满影响观看体验',
		{ maxChars: 18 },
	);

	assert.equal(chunks.every((chunk) => chunk.length <= 18), true);
	assert.equal(chunks.length > 1, true);
});

test('splitScriptIntoSubtitleChunks rejects invalid maxChars', () => {
	assert.throws(() => splitScriptIntoSubtitleChunks('abc', { maxChars: 0 }), /maxChars/);
	assert.throws(() => splitScriptIntoSubtitleChunks('abc', { maxChars: -1 }), /maxChars/);
});

test('assEscape escapes characters that are special in ASS dialogue text', () => {
	assert.equal(assEscape('第一行\n{重点}'), '第一行\\N\\{重点\\}');
	assert.equal(assEscape('第一行\\n{重点}'), '第一行\\N\\{重点\\}');
	assert.equal(assEscape('第一行\\N第二行'), '第一行\\N第二行');
	assert.equal(assEscape('C:\\素材\\片段'), 'C:\\\\素材\\\\片段');
});

test('toAssTime formats seconds as ASS timestamp', () => {
	assert.equal(toAssTime(0), '0:00:00.00');
	assert.equal(toAssTime(65.348), '0:01:05.35');
	assert.equal(toAssTime(3661.2), '1:01:01.20');
	assert.equal(toAssTime(59.999), '0:01:00.00');
	assert.equal(toAssTime(3599.999), '1:00:00.00');
});

test('buildTimeline creates three stages when audio is long enough', () => {
	assert.deepEqual(buildTimeline(20, { coverDuration: 3, screenshotDuration: 4 }), {
		totalDuration: 20,
		cover: { start: 0, end: 3, duration: 3 },
		screenshot: { start: 3, end: 7, duration: 4 },
		body: { start: 7, end: 20, duration: 13 },
	});
});

test('buildTimeline compresses body stage to zero when audio is short', () => {
	assert.deepEqual(buildTimeline(5, { coverDuration: 3, screenshotDuration: 4 }), {
		totalDuration: 7,
		cover: { start: 0, end: 3, duration: 3 },
		screenshot: { start: 3, end: 7, duration: 4 },
		body: { start: 7, end: 7, duration: 0 },
	});
});

test('normalizeJob applies defaults and preserves explicit paths', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-job-'));
	const inputs = {
		coverImage: path.join(tmp, 'cover.png'),
		screenshotImage: path.join(tmp, 'screenshot.png'),
		backgroundVideo: path.join(tmp, 'background.mp4'),
		scriptText: path.join(tmp, 'script.txt'),
		ttsAudio: path.join(tmp, 'audio.mp3'),
	};
	const output = {
		video: path.join(tmp, 'final.mp4'),
		subtitles: path.join(tmp, 'subtitles.ass'),
		ffmpegLog: path.join(tmp, 'ffmpeg.log'),
	};

	const job = normalizeJob({
		jobId: 'unit-test',
		inputs,
		output,
	});

	assert.equal(job.video.width, 1920);
	assert.equal(job.video.height, 1080);
	assert.equal(job.video.fps, 30);
	assert.equal(job.video.coverDuration, 3);
	assert.equal(job.video.screenshotDuration, 4);
	assert.equal(job.layout.coverTop.x, 80);
	assert.equal(job.layout.screenshotTop.x, 1280);
	assert.deepEqual(job.inputs, inputs);
	assert.deepEqual(job.output, output);
});

test('createAssSubtitle writes readable subtitle events', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-subtitles-'));
	const outputPath = path.join(tmp, 'subtitles.ass');

	createAssSubtitle({
		scriptText: '第一句。第二句。',
		outputPath,
		totalDuration: 8,
		width: 1920,
		height: 1080,
		subtitleBottomMargin: 90,
	});

	const content = fs.readFileSync(outputPath, 'utf8');
	assert.match(content, /\[Script Info\]/);
	assert.match(content, /PlayResX: 1920/);
	assert.match(content, /Dialogue: 0,0:00:00.00,0:00:04.00/);
	assert.match(content, /第一句。/);
	assert.match(content, /第二句。/);
});

test('buildFfmpegArgs includes expected media inputs and output settings', () => {
	const job = normalizeJob({
		jobId: 'unit-test',
		inputs: {
			coverImage: '/tmp/job/inputs/cover.png',
			screenshotImage: '/tmp/job/inputs/screenshot.png',
			backgroundVideo: '/tmp/job/inputs/background.mp4',
			scriptText: '/tmp/job/inputs/script.txt',
			ttsAudio: '/tmp/job/tts/audio.mp3',
		},
		output: {
			video: '/tmp/job/render/final.mp4',
			subtitles: '/tmp/job/render/subtitles.ass',
			ffmpegLog: '/tmp/job/render/ffmpeg.log',
		},
	});

	const args = buildFfmpegArgs(job, { audioDuration: 12 });
	assert.deepEqual(args.slice(0, 4), ['-y', '-stream_loop', '-1', '-i']);
	assert.equal(args.includes('/tmp/job/inputs/background.mp4'), true);
	assert.equal(args.includes('/tmp/job/inputs/cover.png'), true);
	assert.equal(args.includes('/tmp/job/inputs/screenshot.png'), true);
	assert.equal(args.includes('/tmp/job/tts/audio.mp3'), true);
	assert.equal(args.includes('/tmp/job/render/final.mp4'), true);
	assert.equal(args.includes('-filter_complex'), true);
	assert.equal(args.includes('-c:v'), true);
	assert.equal(args.includes('libx264'), true);
});

test('buildFfmpegArgs pads short audio instead of stopping at audio length', () => {
	const job = normalizeJob({
		jobId: 'short-audio',
		inputs: {
			coverImage: '/tmp/job/inputs/cover.png',
			screenshotImage: '/tmp/job/inputs/screenshot.png',
			backgroundVideo: '/tmp/job/inputs/background.mp4',
			scriptText: '/tmp/job/inputs/script.txt',
			ttsAudio: '/tmp/job/tts/audio.mp3',
		},
		output: {
			video: '/tmp/job/render/final.mp4',
			subtitles: '/tmp/job/render/subtitles.ass',
			ffmpegLog: '/tmp/job/render/ffmpeg.log',
		},
	});

	const args = buildFfmpegArgs(job, { audioDuration: 5 });
	const filter = args[args.indexOf('-filter_complex') + 1];

	assert.equal(args.includes('-shortest'), false);
	assert.equal(args[args.indexOf('-map') + 3], '[aout]');
	assert.match(filter, /\[3:a\]apad,atrim=0:7,asetpts=PTS-STARTPTS\[aout\]/);
	assert.match(filter, /concat=n=3:v=1:a=0/);
	assert.match(filter, /color=c=black:s=1920x1080:d=0\.01\[body\]/);
});

test('buildFfmpegArgs can use a safe temporary subtitle path for ffmpeg parsing', () => {
	const job = normalizeJob({
		jobId: 'safe-subtitle-path',
		inputs: {
			coverImage: '/tmp/job/inputs/cover.png',
			screenshotImage: '/tmp/job/inputs/screenshot.png',
			backgroundVideo: '/tmp/job/inputs/background.mp4',
			scriptText: '/tmp/job/inputs/script.txt',
			ttsAudio: '/tmp/job/tts/audio.mp3',
		},
		output: {
			video: '/tmp/job/render/final.mp4',
			subtitles: "/tmp/job/quote'dir/sub:title file.ass",
			ffmpegLog: '/tmp/job/render/ffmpeg.log',
		},
	});

	const args = buildFfmpegArgs(job, {
		audioDuration: 12,
		subtitlePath: '/tmp/n8n-video-composer-safe-subtitles.ass',
	});
	const filter = args[args.indexOf('-filter_complex') + 1];

	assert.match(filter, /subtitles=filename=\/tmp\/n8n-video-composer-safe-subtitles\.ass/);
	assert.doesNotMatch(filter, /quote'dir/);
	assert.doesNotMatch(filter, /subtitles='/);
});
