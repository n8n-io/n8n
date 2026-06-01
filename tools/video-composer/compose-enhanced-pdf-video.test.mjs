import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildCoverIntroFfmpegArgs,
	buildEnhancedSegmentFfmpegArgs,
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
		'[1:v]scale=260:324:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1[coverOverlay]',
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
	assert.equal(args.includes('anullsrc=channel_layout=stereo:sample_rate=24000'), true);
	assert.equal(args.includes('/tmp/render/intro-cover.mp4'), true);
	assert.equal(args[args.indexOf('-t') + 1], '4');
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
	assert.match(args[args.indexOf('-filter_complex') + 1], /overlay=\(W-w\)\/2:\(H-h\)\/2/);
});

test('buildEnhancedSegmentFfmpegArgs omits overlays for page 1', () => {
	const args = buildEnhancedSegmentFfmpegArgs({
		pageNumber: 1,
		pageImage: '/tmp/page-001.png',
		audioPath: '/tmp/page-001.mp3',
		subtitlePath: '/tmp/page-001.ass',
		outputPath: '/tmp/render/segment-001.mp4',
		coverImagePath: '/tmp/cover.png',
		illustrationImagePath: '/tmp/illustration.png',
		overlayWidth: 260,
		width: 1920,
		height: 1080,
		fps: 30,
	});

	assert.equal(args.includes('/tmp/cover.png'), false);
	assert.equal(args.includes('/tmp/illustration.png'), false);
	assert.match(args[args.indexOf('-filter_complex') + 1], /subtitles=filename=/);
});

test('buildEnhancedSegmentFfmpegArgs adds lower-corner overlays for page 2', () => {
	const args = buildEnhancedSegmentFfmpegArgs({
		pageNumber: 2,
		pageImage: '/tmp/page-002.png',
		audioPath: '/tmp/page-002.mp3',
		subtitlePath: '/tmp/page-002.ass',
		outputPath: '/tmp/render/segment-002.mp4',
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
	assert.match(filter, /overlay=40:H-h-40/);
	assert.match(filter, /overlay=W-w-40:H-h-40/);
});

test('buildSubtitleEventsForSegment returns segment-relative subtitle times', () => {
	const events = buildSubtitleEventsForSegment({
		page: {
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

test('buildEnhancedConcatList orders intro segments before page segments and pauses', () => {
	assert.deepEqual(
		buildEnhancedConcatList({
			introCoverPath: '/tmp/render/intro-cover.mp4',
			introIllustrationPath: '/tmp/render/intro-illustration.mp4',
			segmentPaths: ['/tmp/render/segment-001.mp4', '/tmp/render/segment-002.mp4'],
			pausePaths: ['/tmp/render/pause-001.mp4'],
		}),
		[
			'/tmp/render/intro-cover.mp4',
			'/tmp/render/intro-illustration.mp4',
			'/tmp/render/segment-001.mp4',
			'/tmp/render/pause-001.mp4',
			'/tmp/render/segment-002.mp4',
		],
	);
});

test('buildEnhancedConcatList ignores extra pauses after the final segment', () => {
	assert.deepEqual(
		buildEnhancedConcatList({
			introCoverPath: '/tmp/render/intro-cover.mp4',
			introIllustrationPath: '/tmp/render/intro-illustration.mp4',
			segmentPaths: ['/tmp/render/segment-001.mp4', '/tmp/render/segment-002.mp4'],
			pausePaths: ['/tmp/render/pause-001.mp4', '/tmp/render/pause-002.mp4'],
		}),
		[
			'/tmp/render/intro-cover.mp4',
			'/tmp/render/intro-illustration.mp4',
			'/tmp/render/segment-001.mp4',
			'/tmp/render/pause-001.mp4',
			'/tmp/render/segment-002.mp4',
		],
	);
});
