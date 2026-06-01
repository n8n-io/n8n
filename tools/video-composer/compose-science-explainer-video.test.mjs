import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildScienceConcatList,
	buildScienceFinalConcatFfmpegArgs,
	buildScienceSegmentFfmpegArgs,
	buildSubtitleEventsForSegment,
	calculateScienceLayout,
	createAssSubtitle,
	scaleBackgroundVideoToOverlayFilter,
	scalePdfPageToCanvasFilter,
	validateScienceJob,
} from './compose-science-explainer-video.mjs';

const baseJob = {
	jobId: 'job-1',
	aspectRatio: '9:16',
	backgroundVideoPath: '/tmp/background.mp4',
	pagesManifestPath: '/tmp/pages.json',
	pageAudioManifestPath: '/tmp/page-audio.json',
	pageTimingPath: '/tmp/page-timing.json',
	subtitlePath: '/tmp/subtitles.ass',
	renderDir: '/tmp/render',
	outputVideoPath: '/tmp/final.mp4',
	outputAudioPath: '/tmp/merged-audio.mp3',
	ffmpegLogPath: '/tmp/ffmpeg.log',
	pagePauseSeconds: 0.3,
	bottomVideoHeightRatio: 0.2,
	width: 1080,
	height: 1920,
	fps: 30,
};

test('validateScienceJob defaults to vertical 9:16 output', () => {
	const {
		aspectRatio,
		pagePauseSeconds,
		bottomVideoHeightRatio,
		width,
		height,
		fps,
		...minimalJob
	} = baseJob;
	const job = validateScienceJob(minimalJob);

	assert.equal(job.aspectRatio, '9:16');
	assert.equal(job.width, 1080);
	assert.equal(job.height, 1920);
	assert.equal(job.fps, 30);
	assert.equal(job.pagePauseSeconds, 0.3);
	assert.equal(job.bottomVideoHeightRatio, 0.2);
});

test('validateScienceJob derives horizontal 16:9 dimensions', () => {
	const job = validateScienceJob({
		...baseJob,
		aspectRatio: '16:9',
		width: undefined,
		height: undefined,
	});

	assert.equal(job.aspectRatio, '16:9');
	assert.equal(job.width, 1920);
	assert.equal(job.height, 1080);
});

test('validateScienceJob rejects missing background and page paths', () => {
	assert.throws(
		() => validateScienceJob({ ...baseJob, backgroundVideoPath: '' }),
		/Science explainer composer job missing field: backgroundVideoPath/,
	);
	assert.throws(
		() => validateScienceJob({ ...baseJob, pagesManifestPath: '' }),
		/Science explainer composer job missing field: pagesManifestPath/,
	);
});

test('validateScienceJob rejects unsupported aspect ratios', () => {
	assert.throws(
		() => validateScienceJob({ ...baseJob, aspectRatio: '1:1' }),
		/Unsupported aspectRatio: 1:1/,
	);
});

test('calculateScienceLayout computes bottom video overlay and subtitle safe area', () => {
	assert.deepEqual(
		calculateScienceLayout({ width: 1080, height: 1920, bottomVideoHeightRatio: 0.2 }),
		{
			width: 1080,
			height: 1920,
			bottomVideoHeight: 384,
			bottomVideoY: 1536,
			subtitleMarginV: 444,
		},
	);
});

test('scalePdfPageToCanvasFilter centers the PDF page on a white canvas', () => {
	assert.equal(
		scalePdfPageToCanvasFilter('[0:v]', 1080, 1920, '[pagev]'),
		'[0:v]scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white[pagev]',
	);
});

test('scaleBackgroundVideoToOverlayFilter crops video to the bottom overlay area', () => {
	assert.equal(
		scaleBackgroundVideoToOverlayFilter('[1:v]', 1080, 384, '[bgv]'),
		'[1:v]scale=1080:384:force_original_aspect_ratio=increase:force_divisible_by=2:reset_sar=1,crop=1080:384:(iw-ow)/2:(ih-oh)/2[bgv]',
	);
});

test('buildScienceSegmentFfmpegArgs overlays looping background video at the bottom', () => {
	const args = buildScienceSegmentFfmpegArgs({
		pageImage: '/tmp/page-001.png',
		backgroundVideoPath: '/tmp/background.mp4',
		audioPath: '/tmp/page-001.mp3',
		subtitlePath: '/tmp/page-001.ass',
		outputPath: '/tmp/render/segment-001.mp4',
		width: 1080,
		height: 1920,
		fps: 30,
		bottomVideoHeightRatio: 0.2,
	});

	assert.deepEqual(args.slice(0, 5), ['-y', '-loop', '1', '-i', '/tmp/page-001.png']);
	assert.equal(args.includes('-stream_loop'), true);
	assert.equal(args.includes('/tmp/background.mp4'), true);
	assert.equal(args.includes('/tmp/page-001.mp3'), true);
	const filter = args[args.indexOf('-filter_complex') + 1];
	assert.match(filter, /overlay=0:1536/);
	assert.match(filter, /subtitles=filename=/);
	assert.equal(args[args.indexOf('-c:v') + 1], 'libx264');
	assert.equal(args[args.indexOf('-pix_fmt') + 1], 'yuv420p');
	assert.equal(args[args.indexOf('-c:a') + 1], 'aac');
	assert.equal(args[args.indexOf('-ar') + 1], '48000');
	assert.equal(args[args.indexOf('-ac') + 1], '2');
	assert.equal(args.at(-1), '/tmp/render/segment-001.mp4');
});

test('buildSubtitleEventsForSegment returns segment-relative subtitle times', () => {
	const events = buildSubtitleEventsForSegment({
		page: {
			start: 12,
			subtitleEvents: [{ start: 12.5, end: 14, text: '这一页先看结论。' }],
		},
	});

	assert.deepEqual(events, [{ start: 0.5, end: 2, text: '这一页先看结论。' }]);
});

test('createAssSubtitle uses the computed subtitle margin', () => {
	const subtitle = createAssSubtitle({
		width: 1080,
		height: 1920,
		marginV: 444,
		events: [{ start: 0, end: 1.5, text: '字幕在视频浮层上方。' }],
	});

	assert.match(subtitle, /PlayResX: 1080/);
	assert.match(subtitle, /PlayResY: 1920/);
	assert.match(subtitle, /Style: Default,Arial,64,/);
	assert.match(subtitle, /,80,80,444,1/);
	assert.match(
		subtitle,
		/Dialogue: 0,0:00:00.00,0:00:01.50,Default,,0,0,0,,字幕在视频浮层上方。/,
	);
});

test('buildScienceConcatList places pauses only between page segments', () => {
	assert.deepEqual(
		buildScienceConcatList({
			segmentPaths: [
				'/tmp/render/segment-001.mp4',
				'/tmp/render/segment-002.mp4',
				'/tmp/render/segment-003.mp4',
			],
			pausePaths: [
				'/tmp/render/pause-001.mp4',
				'/tmp/render/pause-002.mp4',
				'/tmp/render/pause-003.mp4',
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

test('buildScienceFinalConcatFfmpegArgs re-encodes the final video', () => {
	const args = buildScienceFinalConcatFfmpegArgs({
		concatListPath: '/tmp/render/segments.txt',
		outputVideoPath: '/tmp/final.mp4',
	});

	assert.deepEqual(args.slice(0, 7), ['-y', '-f', 'concat', '-safe', '0', '-i', '/tmp/render/segments.txt']);
	assert.equal(args.includes('copy'), false);
	assert.equal(args[args.indexOf('-c:v') + 1], 'libx264');
	assert.equal(args[args.indexOf('-pix_fmt') + 1], 'yuv420p');
	assert.equal(args[args.indexOf('-c:a') + 1], 'aac');
	assert.equal(args[args.indexOf('-b:a') + 1], '192k');
	assert.equal(args[args.indexOf('-ar') + 1], '48000');
	assert.equal(args[args.indexOf('-ac') + 1], '2');
	assert.equal(args.at(-1), '/tmp/final.mp4');
});
