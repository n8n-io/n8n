import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
	assEscape,
	buildFfmpegArgs,
	buildSubtitleEventsFromTimedWords,
	buildTimeline,
	createAssSubtitle,
	createSubtitleOverlayFrames,
	ffmpegHasFilter,
	normalizeJob,
	readTtsSubtitleEvents,
	render,
	splitScriptIntoSubtitleChunks,
	toAssTime,
} from './compose-video.mjs';

function commandExists(command) {
	const result = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });

	return result.status === 0;
}

function runFfmpeg(args) {
	const result = spawnSync('ffmpeg', args, { encoding: 'utf8' });
	if (result.status !== 0) {
		throw new Error(`ffmpeg failed: ${result.stderr || result.stdout}`);
	}
}

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

test('buildTimeline keeps visual intro duration when audio is shorter than the intro', () => {
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
	assert.match(content, /Style: Default,Arial,64,&H00FFFFFF,.*?,1,3,1,2,80,80,90,1/);
	assert.doesNotMatch(content, /,0,0,3,2,0,2,/);
	assert.match(content, /第一句。/);
	assert.match(content, /第二句。/);
});

test('buildSubtitleEventsFromTimedWords groups words while preserving real timing', () => {
	const events = buildSubtitleEventsFromTimedWords([
		{ text: '第一', start: 0.12, end: 0.42 },
		{ text: '句。', start: 0.42, end: 0.8 },
		{ text: '第二', start: 1.4, end: 1.8 },
		{ text: '句。', start: 1.8, end: 2.2 },
	]);

	assert.deepEqual(events, [
		{ text: '第一句。', start: 0.12, end: 0.8 },
		{ text: '第二句。', start: 1.4, end: 2.2 },
	]);
});

test('readTtsSubtitleEvents accepts Volcengine-style millisecond word timestamps', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-tts-timing-'));
	const timingPath = path.join(tmp, 'timing.json');
	fs.writeFileSync(
		timingPath,
		JSON.stringify({
			frames: [
				{
					sentence: {
						words: [
							{ text: '红茶', start_time: 0, end_time: 360 },
							{ text: '值得', start_time: 360, end_time: 720 },
							{ text: '关注。', start_time: 720, end_time: 900 },
						],
					},
				},
			],
		}),
	);

	assert.deepEqual(readTtsSubtitleEvents(timingPath), [
		{ text: '红茶值得关注。', start: 0, end: 0.9 },
	]);
});

test('readTtsSubtitleEvents preserves Doubao second-based camelCase word timestamps', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-tts-seconds-'));
	const timingPath = path.join(tmp, 'timing.json');
	fs.writeFileSync(
		timingPath,
		JSON.stringify({
			frames: [
				{
					sentence: {
						words: [
							{ word: '这', startTime: 0.885, endTime: 1.055 },
							{ word: '是', startTime: 1.055, endTime: 1.195 },
							{ word: '一句。', startTime: 1.195, endTime: 1.545 },
						],
					},
				},
			],
		}),
	);

	assert.deepEqual(readTtsSubtitleEvents(timingPath), [
		{ text: '这是一句。', start: 0.885, end: 1.545 },
	]);
});

test('readTtsSubtitleEvents accepts video-remix-demo timeline subtitles', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-remix-timeline-'));
	const timingPath = path.join(tmp, 'timeline.json');
	fs.writeFileSync(
		timingPath,
		JSON.stringify({
			subtitles: [
				{ start: 0.885, end: 3.545, text: '这是一张随机生成的背景图。' },
			],
		}),
	);

	assert.deepEqual(readTtsSubtitleEvents(timingPath), [
		{ text: '这是一张随机生成的背景图。', start: 0.885, end: 3.545 },
	]);
});

test('createAssSubtitle prefers timestamp events over duration splitting', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-timed-subtitles-'));
	const outputPath = path.join(tmp, 'subtitles.ass');

	createAssSubtitle({
		scriptText: '这段文本不会按平均时长切。',
		outputPath,
		totalDuration: 8,
		width: 1920,
		height: 1080,
		subtitleBottomMargin: 90,
		subtitleEvents: [
			{ text: '真实第一句。', start: 0.25, end: 1.75 },
			{ text: '真实第二句。', start: 3.1, end: 4.2 },
		],
	});

	const content = fs.readFileSync(outputPath, 'utf8');
	assert.match(content, /Dialogue: 0,0:00:00.25,0:00:01.75/);
	assert.match(content, /Dialogue: 0,0:00:03.10,0:00:04.20/);
	assert.match(content, /真实第一句。/);
	assert.doesNotMatch(content, /这段文本/);
});

test('createAssSubtitle offsets timestamp events to the body stage', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-offset-subtitles-'));
	const outputPath = path.join(tmp, 'subtitles.ass');

	createAssSubtitle({
		scriptText: '这段文本不会按平均时长切。',
		outputPath,
		totalDuration: 10,
		width: 1920,
		height: 1080,
		subtitleBottomMargin: 90,
		subtitleStart: 7,
		subtitleDuration: 3,
		subtitleEvents: [
			{ text: '真实第一句。', start: 0.25, end: 1.75 },
		],
	});

	const content = fs.readFileSync(outputPath, 'utf8');
	assert.match(content, /Dialogue: 0,0:00:07.25,0:00:08.75/);
});

test('createSubtitleOverlayFrames writes a compact transparent frame sequence', (t) => {
	if (!commandExists('python3')) {
		t.skip('python3 is not available; skipping subtitle frame generation test');
		return;
	}

	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-subtitle-frames-'));
	const overlay = createSubtitleOverlayFrames({
		scriptText: '第一句硬字幕。第二句继续显示。',
		outputDir: tmp,
		totalDuration: 2,
		width: 640,
		frameRate: 2,
	});

	assert.equal(overlay.frameRate, 2);
	assert.equal(overlay.frameCount, 4);
	assert.equal(overlay.pattern, path.join(tmp, 'subtitle-frame-%05d.png'));
	assert.equal(fs.existsSync(path.join(tmp, 'subtitle-frame-00000.png')), true);
	assert.equal(fs.existsSync(path.join(tmp, 'subtitle-frame-00003.png')), true);
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
	assert.match(filter, /\[0:v\]trim=start=0:duration=3/);
	assert.match(filter, /\[0:v\]trim=start=3:duration=4/);
	assert.doesNotMatch(filter, /\[0:v\]trim=start=7:duration=5/);
	assert.match(filter, /\[1:v\]scale=1920:1080:force_original_aspect_ratio=increase.*crop=1920:1080\[covermain\]/);
	assert.match(filter, /\[coverbg\]\[covermain\]overlay=0:0:shortest=1\[cover\]/);
	assert.match(filter, /\[2:v\]scale=.*reset_sar=1/);
});

test('buildFfmpegArgs starts audio immediately while the body stage continues the background video', () => {
	const job = normalizeJob({
		jobId: 'long-audio',
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

	const args = buildFfmpegArgs(job, { audioDuration: 20 });
	const filter = args[args.indexOf('-filter_complex') + 1];

	assert.match(filter, /\[0:v\]trim=start=0:duration=3/);
	assert.match(filter, /\[0:v\]trim=start=3:duration=4/);
	assert.match(filter, /\[0:v\]trim=start=7:duration=13/);
	assert.match(filter, /\[3:a\]apad,atrim=0:20,asetpts=PTS-STARTPTS\[aout\]/);
	assert.doesNotMatch(filter, /adelay=/);
	assert.match(
		filter,
		/\[covermainsrc\]scale=1920:1080:force_original_aspect_ratio=increase.*crop=1920:1080\[covermain\]/,
	);
	assert.match(filter, /\[screenmainsrc\]scale=.*reset_sar=1/);
});

test('buildFfmpegArgs makes only body-stage corner images transparent when treatment is enabled', () => {
	const job = normalizeJob({
		jobId: 'corner-treatment',
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
		layout: {
			cornerImageTreatment: {
				enabled: true,
				blur: 0,
				opacity: 0.72,
				borderColor: 'white',
				borderWidth: 6,
			},
		},
	});

	const args = buildFfmpegArgs(job, { audioDuration: 20 });
	const filter = args[args.indexOf('-filter_complex') + 1];
	const parts = filter.split(';');
	const coverMainPart = parts.find((part) => part.startsWith('[covermainsrc]'));
	const screenMainPart = parts.find((part) => part.startsWith('[screenmainsrc]'));
	const coverTopPart = parts.find((part) => part.startsWith('[covertopsrc]'));
	const screenTopPart = parts.find((part) => part.startsWith('[screentopsrc]'));

	assert.doesNotMatch(coverTopPart, /boxblur=/);
	assert.match(coverTopPart, /colorchannelmixer=aa=0\.72/);
	assert.doesNotMatch(screenTopPart, /boxblur=/);
	assert.match(screenTopPart, /colorchannelmixer=aa=0\.72/);
	assert.doesNotMatch(coverMainPart, /colorchannelmixer=/);
	assert.doesNotMatch(screenMainPart, /colorchannelmixer=/);
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

test('buildFfmpegArgs can mux subtitles as a soft subtitle track', () => {
	const job = normalizeJob({
		jobId: 'soft-subtitle-path',
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

	const args = buildFfmpegArgs(job, {
		audioDuration: 12,
		subtitlePath: '/tmp/n8n-video-composer-safe-subtitles.ass',
		subtitleMode: 'soft',
	});
	const filter = args[args.indexOf('-filter_complex') + 1];

	assert.doesNotMatch(filter, /subtitles=filename=/);
	assert.equal(args.includes('/tmp/n8n-video-composer-safe-subtitles.ass'), true);
	assert.equal(args.includes('-c:s'), true);
	assert.equal(args.includes('mov_text'), true);
});

test('buildFfmpegArgs can burn subtitles via one overlay frame sequence', () => {
	const job = normalizeJob({
		jobId: 'image-subtitle-path',
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

	const args = buildFfmpegArgs(job, {
		audioDuration: 12,
		subtitleMode: 'image',
		subtitleOverlay: {
			pattern: '/tmp/job/render/subtitle-frames/subtitle-frame-%05d.png',
			frameRate: 3,
			frameCount: 36,
		},
	});
	const filter = args[args.indexOf('-filter_complex') + 1];

	assert.equal(args.includes('-framerate'), true);
	assert.equal(args.includes('-start_number'), true);
	assert.equal(args.includes('/tmp/job/render/subtitle-frames/subtitle-frame-%05d.png'), true);
	assert.match(filter, /\[4:v\]format=rgba\[subtitles\]/);
	assert.match(filter, /\[basev\]\[subtitles\]overlay=0:H-h-90:eof_action=pass:format=auto\[vout\]/);
	assert.equal(args.includes('-c:s'), false);
});

test('render creates final video and render artifacts', (t) => {
	if (process.env.RUN_VIDEO_COMPOSER_SMOKE !== '1') {
		t.skip('Set RUN_VIDEO_COMPOSER_SMOKE=1 to run the ffmpeg render smoke test');
		return;
	}

	if (!commandExists('ffmpeg')) {
		t.skip('ffmpeg is not available; skipping video composer smoke render');
		return;
	}

	if (!commandExists('ffprobe')) {
		t.skip('ffprobe is not available; skipping video composer smoke render');
		return;
	}

	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-composer-smoke-'));
	const inputDir = path.join(tmp, 'inputs');
	const outputDir = path.join(tmp, 'render');
	fs.mkdirSync(inputDir, { recursive: true });
	fs.mkdirSync(outputDir, { recursive: true });

	const coverImage = path.join(inputDir, 'cover.png');
	const screenshotImage = path.join(inputDir, 'screenshot.png');
	const backgroundVideo = path.join(inputDir, 'background.mp4');
	const scriptText = path.join(inputDir, 'script.txt');
	const ttsAudio = path.join(inputDir, 'audio.wav');
	const finalVideo = path.join(outputDir, 'final.mp4');
	const subtitles = path.join(outputDir, 'subtitles.ass');
	const ffmpegLog = path.join(outputDir, 'ffmpeg.log');

	runFfmpeg([
		'-y',
		'-f',
		'lavfi',
		'-i',
		'color=c=0x1f77b4:s=640x360:d=1',
		'-frames:v',
		'1',
		coverImage,
	]);
	runFfmpeg([
		'-y',
		'-f',
		'lavfi',
		'-i',
		'testsrc2=size=640x360:rate=1:duration=1',
		'-frames:v',
		'1',
		screenshotImage,
	]);
	runFfmpeg([
		'-y',
		'-f',
		'lavfi',
		'-i',
		'testsrc2=size=640x360:rate=12:duration=3',
		'-pix_fmt',
		'yuv420p',
		backgroundVideo,
	]);
	runFfmpeg([
		'-y',
		'-f',
		'lavfi',
		'-i',
		'sine=frequency=440:duration=2',
		'-ar',
		'44100',
		ttsAudio,
	]);
	fs.writeFileSync(scriptText, '第一句烟测字幕。第二句确认渲染产物。');

	render(
		normalizeJob({
			jobId: 'smoke-test',
			inputs: {
				coverImage,
				screenshotImage,
				backgroundVideo,
				scriptText,
				ttsAudio,
			},
			output: {
				video: finalVideo,
				subtitles,
				ffmpegLog,
			},
			video: {
				width: 320,
				height: 180,
				fps: 12,
				coverDuration: 1,
				screenshotDuration: 1,
			},
			layout: {
				coverTop: {
					x: 12,
					y: 12,
					width: 80,
				},
				screenshotTop: {
					x: 228,
					y: 12,
					width: 80,
				},
				subtitleBottomMargin: 18,
			},
		}),
	);

	assert.equal(fs.existsSync(finalVideo), true);
	assert.equal(fs.statSync(finalVideo).size > 0, true);
	assert.equal(fs.existsSync(subtitles), true);
	assert.equal(fs.existsSync(ffmpegLog), true);
});
