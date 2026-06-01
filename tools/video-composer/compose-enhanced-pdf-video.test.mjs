import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
	buildCoverIntroFfmpegArgs,
	buildEnhancedSegmentFfmpegArgs,
	buildFinalConcatFfmpegArgs,
	buildIllustrationIntroFfmpegArgs,
	buildSubtitleEventsForSegment,
	buildEnhancedConcatList,
	scaleImageToCanvasFilter,
	scaleOverlayFilter,
	validateEnhancedJob,
} from './compose-enhanced-pdf-video.mjs';

const baseJob = {
	jobId: 'job-1',
	coverImagePath: '/tmp/cover.png',
	illustrationImagePath: '/tmp/illustration.png',
	pagesManifestPath: '/tmp/pages.json',
	pageAudioManifestPath: '/tmp/page-audio.json',
	pageTimingPath: '/tmp/page-timing.json',
	subtitlePath: '/tmp/subtitles.ass',
	renderDir: '/tmp/render',
	outputVideoPath: '/tmp/final.mp4',
	outputAudioPath: '/tmp/merged-audio.mp3',
	ffmpegLogPath: '/tmp/ffmpeg.log',
	introCoverSeconds: 4,
	introIllustrationSeconds: 4,
	pagePauseSeconds: 0.3,
	overlayWidth: 260,
	width: 1920,
	height: 1080,
	fps: 30,
};

test('validateEnhancedJob returns defaults and required fields', () => {
	const {
		introCoverSeconds,
		introIllustrationSeconds,
		pagePauseSeconds,
		overlayWidth,
		width,
		height,
		fps,
		...jobWithoutOptionalDefaults
	} = baseJob;
	const job = validateEnhancedJob(jobWithoutOptionalDefaults);

	assert.equal(job.introCoverSeconds, 4);
	assert.equal(job.introIllustrationSeconds, 4);
	assert.equal(job.pagePauseSeconds, 0.3);
	assert.equal(job.overlayWidth, 260);
	assert.equal(job.width, 1920);
	assert.equal(job.height, 1080);
	assert.equal(job.fps, 30);
});

test('validateEnhancedJob falls back to defaults for invalid optional numbers', () => {
	const job = validateEnhancedJob({
		...baseJob,
		introCoverSeconds: 'nope',
		introIllustrationSeconds: Number.NaN,
		pagePauseSeconds: Number.POSITIVE_INFINITY,
		overlayWidth: 'bad',
		width: undefined,
		height: null,
		fps: 0,
	});

	assert.equal(job.introCoverSeconds, 4);
	assert.equal(job.introIllustrationSeconds, 4);
	assert.equal(job.pagePauseSeconds, 0.3);
	assert.equal(job.overlayWidth, 260);
	assert.equal(job.width, 1920);
	assert.equal(job.height, 1080);
	assert.equal(job.fps, 30);
});

test('validateEnhancedJob rejects missing cover and illustration paths', () => {
	assert.throws(
		() => validateEnhancedJob({ ...baseJob, coverImagePath: '' }),
		/Enhanced PDF composer job missing field: coverImagePath/,
	);
	assert.throws(
		() => validateEnhancedJob({ ...baseJob, illustrationImagePath: '' }),
		/Enhanced PDF composer job missing field: illustrationImagePath/,
	);
});

test('scaleImageToCanvasFilter centers images on white canvas without cropping', () => {
	assert.equal(
		scaleImageToCanvasFilter('[0:v]', 1920, 1080, '[coverv]'),
		'[0:v]scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white[coverv]',
	);
});

test('scaleOverlayFilter creates a stable lower-corner overlay image', () => {
	assert.equal(
		scaleOverlayFilter('[1:v]', 260, 324, '[coverOverlay]'),
		'[1:v]scale=260:324:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,format=rgba,pad=260:324:floor((ow-iw)/2):floor((oh-ih)/2):color=black@0[coverOverlay]',
	);
});

test('buildCoverIntroFfmpegArgs maps the cover image into a silent intro segment', () => {
	const args = buildCoverIntroFfmpegArgs({
		coverImagePath: '/tmp/cover.png',
		outputPath: '/tmp/render/intro-cover.mp4',
		duration: 4,
		width: 1920,
		height: 1080,
		fps: 30,
	});

	assert.deepEqual(args.slice(0, 5), ['-y', '-loop', '1', '-i', '/tmp/cover.png']);
	assert.equal(args.includes('anullsrc=channel_layout=stereo:sample_rate=48000'), true);
	assert.equal(args.includes('/tmp/render/intro-cover.mp4'), true);
	assert.equal(args[args.indexOf('-t') + 1], '4');
	assert.equal(args[args.indexOf('-ar') + 1], '48000');
	assert.equal(args[args.indexOf('-ac') + 1], '2');
});

test('buildIllustrationIntroFfmpegArgs uses PDF page 1 as background', () => {
	const args = buildIllustrationIntroFfmpegArgs({
		pageImage: '/tmp/page-001.png',
		illustrationImagePath: '/tmp/illustration.png',
		outputPath: '/tmp/render/intro-illustration.mp4',
		duration: 4,
		width: 1920,
		height: 1080,
		fps: 30,
	});

	assert.deepEqual(args.slice(0, 5), ['-y', '-loop', '1', '-i', '/tmp/page-001.png']);
	assert.equal(args.includes('/tmp/illustration.png'), true);
	assert.equal(args.includes('/tmp/render/intro-illustration.mp4'), true);
	assert.match(args[args.indexOf('-filter_complex') + 1], /scale=1056:702/);
	assert.match(args[args.indexOf('-filter_complex') + 1], /overlay=432:189/);
	assert.match(args[args.indexOf('-filter_complex') + 1], /scale=1920:1080:force_original_aspect_ratio=disable:reset_sar=1\[vout\]/);
	assert.equal(args[args.indexOf('-ar') + 1], '48000');
	assert.equal(args[args.indexOf('-ac') + 1], '2');
});

test('buildEnhancedSegmentFfmpegArgs starts page 1 audio while showing cover and illustration stages', () => {
	const args = buildEnhancedSegmentFfmpegArgs({
		pageNumber: 1,
		pageImage: '/tmp/page-001.png',
		audioPath: '/tmp/page-001.mp3',
		subtitlePath: '/tmp/page-001.ass',
		outputPath: '/tmp/render/segment-001.mp4',
		duration: 32.5,
		coverImagePath: '/tmp/cover.png',
		illustrationImagePath: '/tmp/illustration.png',
		overlayWidth: 260,
		width: 1920,
		height: 1080,
		fps: 30,
		introCoverSeconds: 4,
		introIllustrationSeconds: 4,
	});

	assert.equal(args.includes('/tmp/cover.png'), true);
	assert.equal(args.includes('/tmp/illustration.png'), true);
	const filter = args[args.indexOf('-filter_complex') + 1];
	assert.match(filter, /enable='lt\(t,4\)'/);
	assert.match(filter, /enable='between\(t,4,8\)'/);
	assert.match(filter, /subtitles=filename=/);
	assert.match(filter, /scale=1920:1080:force_original_aspect_ratio=disable:reset_sar=1\[vout\]/);
	assert.equal(args[args.indexOf('-t') + 1], '32.5');
	assert.equal(args[args.indexOf('-preset') + 1], 'veryfast');
	assert.equal(args[args.indexOf('-crf') + 1], '23');
	assert.equal(args[args.indexOf('-ar') + 1], '48000');
	assert.equal(args[args.indexOf('-ac') + 1], '2');
});

test('buildEnhancedSegmentFfmpegArgs adds lower-corner overlays for page 2', () => {
	const args = buildEnhancedSegmentFfmpegArgs({
		pageNumber: 2,
		pageImage: '/tmp/page-002.png',
		audioPath: '/tmp/page-002.mp3',
		subtitlePath: '/tmp/page-002.ass',
		outputPath: '/tmp/render/segment-002.mp4',
		duration: 41.25,
		coverImagePath: '/tmp/cover.png',
		illustrationImagePath: '/tmp/illustration.png',
		overlayWidth: 260,
		width: 1920,
		height: 1080,
		fps: 30,
	});

	assert.equal(args.includes('/tmp/cover.png'), true);
	assert.equal(args.includes('/tmp/illustration.png'), true);
	const filter = args[args.indexOf('-filter_complex') + 1];
	assert.match(filter, /scale=260:324/);
	assert.match(filter, /pad=260:324:floor\(\(ow-iw\)\/2\):oh-ih:color=black@0\[coverOverlay\]/);
	assert.match(filter, /overlay=40:716/);
	assert.match(filter, /overlay=1620:716/);
	assert.match(filter, /scale=1920:1080:force_original_aspect_ratio=disable:reset_sar=1\[vout\]/);
	assert.equal(args[args.indexOf('-t') + 1], '41.25');
	assert.equal(args[args.indexOf('-preset') + 1], 'veryfast');
	assert.equal(args[args.indexOf('-crf') + 1], '23');
	assert.equal(args[args.indexOf('-ar') + 1], '48000');
	assert.equal(args[args.indexOf('-ac') + 1], '2');
});

test('buildSubtitleEventsForSegment returns segment-relative subtitle times', () => {
	const events = buildSubtitleEventsForSegment({
		page: {
			pageNumber: 2,
			start: 5,
			subtitleEvents: [
				{ start: 5.5, end: 7, text: '第二页开始。' },
			],
		},
		introDuration: 8,
	});

	assert.deepEqual(events, [
		{ start: 0.5, end: 2, text: '第二页开始。' },
	]);
});

test('buildEnhancedConcatList starts directly with page segments because page 1 contains the visual intro stages', () => {
	assert.deepEqual(
		buildEnhancedConcatList({
			segmentPaths: ['/tmp/render/segment-001.mp4', '/tmp/render/segment-002.mp4'],
			pausePaths: ['/tmp/render/pause-001.mp4'],
		}),
		[
			'/tmp/render/segment-001.mp4',
			'/tmp/render/pause-001.mp4',
			'/tmp/render/segment-002.mp4',
		],
	);
});

test('buildEnhancedConcatList ignores extra pauses after the final segment', () => {
	assert.deepEqual(
		buildEnhancedConcatList({
			segmentPaths: ['/tmp/render/segment-001.mp4', '/tmp/render/segment-002.mp4'],
			pausePaths: ['/tmp/render/pause-001.mp4', '/tmp/render/pause-002.mp4'],
		}),
		[
			'/tmp/render/segment-001.mp4',
			'/tmp/render/pause-001.mp4',
			'/tmp/render/segment-002.mp4',
		],
	);
});

test('buildEnhancedConcatList places page pause only between page segments', () => {
	assert.deepEqual(
		buildEnhancedConcatList({
			segmentPaths: [
				'/tmp/render/segment-001.mp4',
				'/tmp/render/segment-002.mp4',
				'/tmp/render/segment-003.mp4',
			],
			pausePaths: [
				'/tmp/render/pause-001.mp4',
				'/tmp/render/pause-002.mp4',
			],
		}),
		[
			'/tmp/render/segment-001.mp4',
			'/tmp/render/pause-001.mp4',
			'/tmp/render/segment-002.mp4',
			'/tmp/render/pause-002.mp4',
			'/tmp/render/segment-003.mp4',
		],
	);
});

test('buildFinalConcatFfmpegArgs stream-copies pre-rendered segments like the presentation composer', () => {
	const args = buildFinalConcatFfmpegArgs({
		concatListPath: '/tmp/render/segments.txt',
		outputVideoPath: '/tmp/final.mp4',
	});

	assert.deepEqual(args.slice(0, 7), ['-y', '-f', 'concat', '-safe', '0', '-i', '/tmp/render/segments.txt']);
	assert.equal(args[args.indexOf('-c') + 1], 'copy');
	assert.equal(args.includes('-c:v'), false);
	assert.equal(args.includes('-c:a'), false);
	assert.equal(args.at(-1), '/tmp/final.mp4');
});

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { encoding: 'utf8', ...options });
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
	}
	return result.stdout.trim();
}

function makePng(filePath, size, color) {
	run('ffmpeg', [
		'-y',
		'-f',
		'lavfi',
		'-i',
		`color=c=${color}:s=${size}:d=0.1`,
		'-frames:v',
		'1',
		filePath,
	]);
}

test('enhanced PDF composer renders a real video with portrait PDF page and wide illustration', { timeout: 120_000 }, () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'enhanced-pdf-composer-smoke-'));
	const inputsDir = path.join(root, 'inputs');
	const pagesDir = path.join(root, 'pages');
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const renderDir = path.join(root, 'render');
	for (const dir of [inputsDir, pagesDir, audioDir, timingDir, renderDir]) fs.mkdirSync(dir, { recursive: true });

	const coverImagePath = path.join(inputsDir, 'cover.png');
	const illustrationImagePath = path.join(inputsDir, 'illustration.png');
	const pageImagePath = path.join(pagesDir, 'page-001.png');
	const pageTwoImagePath = path.join(pagesDir, 'page-002.png');
	const audioPath = path.join(audioDir, 'page-001.mp3');
	const pageTwoAudioPath = path.join(audioDir, 'page-002.mp3');
	makePng(coverImagePath, '2730x1535', 'red');
	makePng(pageImagePath, '1191x1582', 'green');
	makePng(pageTwoImagePath, '1191x1582', 'yellow');
	makePng(illustrationImagePath, '1792x918', 'blue');
	for (const outputAudioPath of [audioPath, pageTwoAudioPath]) {
		run('ffmpeg', [
			'-y',
			'-f',
			'lavfi',
			'-i',
			'anullsrc=channel_layout=stereo:sample_rate=48000',
			'-t',
			'0.5',
			'-c:a',
			'libmp3lame',
			outputAudioPath,
		]);
	}

	const pagesManifestPath = path.join(root, 'pages.json');
	const pageAudioManifestPath = path.join(audioDir, 'page-audio.json');
	const pageTimingPath = path.join(timingDir, 'page-timing.json');
	const jobPath = path.join(root, 'composer-job.json');
	const outputVideoPath = path.join(renderDir, 'final.mp4');
	fs.writeFileSync(pagesManifestPath, JSON.stringify({
		sourceType: 'pdf',
		pageCount: 2,
		pages: [
			{ pageNumber: 1, imagePath: pageImagePath, textPath: path.join(pagesDir, 'page-001.txt'), text: '第一页', isTextSparse: false },
			{ pageNumber: 2, imagePath: pageTwoImagePath, textPath: path.join(pagesDir, 'page-002.txt'), text: '第二页', isTextSparse: false },
		],
	}, null, 2));
	fs.writeFileSync(pageAudioManifestPath, JSON.stringify({
		pages: [
			{ pageNumber: 1, audioPath, duration: 0.5, transcript: '第一页', subtitleEvents: [{ start: 0, end: 0.5, text: '第一页' }] },
			{ pageNumber: 2, audioPath: pageTwoAudioPath, duration: 0.5, transcript: '第二页', subtitleEvents: [{ start: 0, end: 0.5, text: '第二页' }] },
		],
	}, null, 2));
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'smoke',
		coverImagePath,
		illustrationImagePath,
		pagesManifestPath,
		pageAudioManifestPath,
		pageTimingPath,
		subtitlePath: path.join(renderDir, 'subtitles.ass'),
		renderDir,
		outputVideoPath,
		outputAudioPath: path.join(audioDir, 'merged-audio.mp3'),
		ffmpegLogPath: path.join(renderDir, 'ffmpeg.log'),
		introCoverSeconds: 0.2,
		introIllustrationSeconds: 0.2,
		pagePauseSeconds: 0.1,
		width: 1920,
		height: 1080,
		fps: 30,
	}, null, 2));

	run('node', ['tools/video-composer/compose-enhanced-pdf-video.mjs', jobPath], {
		cwd: process.cwd(),
	});

	const dimensions = run('ffprobe', [
		'-v',
		'error',
		'-select_streams',
		'v:0',
		'-show_entries',
		'stream=width,height',
		'-of',
		'csv=p=0:s=x',
		outputVideoPath,
	]);
	assert.equal(dimensions, '1920x1080');
	assert.equal(fs.existsSync(path.join(renderDir, 'intro-cover.mp4')), false);
	assert.equal(fs.existsSync(path.join(renderDir, 'intro-illustration.mp4')), false);
	assert.equal(fs.readFileSync(path.join(renderDir, 'segments.txt'), 'utf8').includes('intro-'), false);
	assert.equal(fs.existsSync(path.join(renderDir, 'segment-002.mp4')), true);
	assert.equal(fs.existsSync(path.join(renderDir, 'pause-001.mp4')), true);
	for (const subtitleFile of ['subtitles.ass', 'page-001.ass', 'page-002.ass']) {
		const subtitle = fs.readFileSync(path.join(renderDir, subtitleFile), 'utf8');
		assert.match(subtitle, /Style: Default,[^\n]*,2,80,80,90,1/);
	}
	assert.match(fs.readFileSync(path.join(renderDir, 'subtitles.ass'), 'utf8'), /Dialogue: 0,0:00:00\.00,0:00:00\.50,Default,,0,0,0,,第一页/);
	assert.match(fs.readFileSync(path.join(renderDir, 'page-001.ass'), 'utf8'), /Dialogue: 0,0:00:00\.00,0:00:00\.50,Default,,0,0,0,,第一页/);
	assert.match(fs.readFileSync(path.join(renderDir, 'page-002.ass'), 'utf8'), /Dialogue: 0,0:00:00\.00,0:00:00\.50,Default,,0,0,0,,第二页/);
	const segmentOneDuration = Number(run('ffprobe', [
		'-v',
		'error',
		'-show_entries',
		'format=duration',
		'-of',
		'default=nw=1:nk=1',
		path.join(renderDir, 'segment-001.mp4'),
	]));
	assert.ok(Math.abs(segmentOneDuration - 0.5) < 0.08, `segment duration ${segmentOneDuration} should match page audio duration`);
	assert.ok(fs.statSync(outputVideoPath).size > 0);
});
