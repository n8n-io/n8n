import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assEscape,
	buildTimeline,
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

test('assEscape escapes characters that are special in ASS dialogue text', () => {
	assert.equal(assEscape('第一行\\n{重点}'), '第一行\\\\N\\{重点\\}');
});

test('toAssTime formats seconds as ASS timestamp', () => {
	assert.equal(toAssTime(0), '0:00:00.00');
	assert.equal(toAssTime(65.348), '0:01:05.35');
	assert.equal(toAssTime(3661.2), '1:01:01.20');
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
