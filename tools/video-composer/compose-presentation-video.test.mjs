import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildSegmentFfmpegArgs,
	createAssSubtitle,
	scalePageFilter,
} from './compose-presentation-video.mjs';

test('scalePageFilter preserves full page without cropping', () => {
	assert.equal(
		scalePageFilter('[0:v]', 1920, 1080, '[pagev]'),
		'[0:v]scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2:reset_sar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white[pagev]',
	);
});

test('createAssSubtitle writes white transparent subtitle events', () => {
	const ass = createAssSubtitle({
		width: 1920,
		height: 1080,
		events: [{ text: '今天我们要聊的话题是增长。', start: 0, end: 2 }],
	});
	assert.match(ass, /Style: Default,Arial,64,&H00FFFFFF/);
	assert.match(ass, /Dialogue: 0,0:00:00.00,0:00:02.00,Default/);
	assert.match(ass, /&H00000000/);
});

test('buildSegmentFfmpegArgs maps page image and audio into one segment', () => {
	const args = buildSegmentFfmpegArgs({
		pageImage: '/tmp/page-001.png',
		audioPath: '/tmp/page-001.mp3',
		subtitlePath: '/tmp/page-001.ass',
		outputPath: '/tmp/segment-001.mp4',
		width: 1920,
		height: 1080,
		fps: 30,
	});
	assert.deepEqual(args.slice(0, 5), ['-y', '-loop', '1', '-i', '/tmp/page-001.png']);
	assert.equal(args.includes('/tmp/page-001.mp3'), true);
	assert.equal(args.includes('/tmp/segment-001.mp4'), true);
	assert.equal(args.includes('-shortest'), true);
});
