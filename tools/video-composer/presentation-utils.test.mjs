import test from 'node:test';
import assert from 'node:assert/strict';

import {
	aggregatePresentationCost,
	buildPageTiming,
	cleanSpokenTranscript,
	compactSourceText,
	extractJsonObject,
	normalizePageScript,
	offsetSubtitleEvents,
	safePageName,
	validatePagesManifest,
} from './presentation-utils.mjs';

test('safePageName pads page numbers', () => {
	assert.equal(safePageName(1), 'page-001');
	assert.equal(safePageName(12), 'page-012');
});

test('validatePagesManifest accepts sequential extracted pages', () => {
	const manifest = validatePagesManifest({
		sourceType: 'pdf',
		pageCount: 2,
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt', text: '标题', isTextSparse: false },
			{ pageNumber: 2, imagePath: '/tmp/page-002.png', textPath: '/tmp/page-002.txt', text: '', isTextSparse: true },
		],
	});

	assert.equal(manifest.pageCount, 2);
	assert.equal(manifest.pages[1].isTextSparse, true);
});

test('validatePagesManifest rejects non-sequential page numbers', () => {
	assert.throws(
		() => validatePagesManifest({
			sourceType: 'pdf',
			pageCount: 2,
			pages: [
				{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt' },
				{ pageNumber: 3, imagePath: '/tmp/page-003.png', textPath: '/tmp/page-003.txt' },
			],
		}),
		/Page 2 must have pageNumber 2/,
	);
});

test('extractJsonObject removes markdown fences around strict JSON', () => {
	const raw = '```json\n{"title":"测试","pages":[]}\n```';
	assert.equal(extractJsonObject(raw), '{"title":"测试","pages":[]}');
});

test('compactSourceText limits dense page text while preserving evidence from both ends', () => {
	const text = `标题\n${'核心发现。'.repeat(300)}\n结论：需要克制解读。`;
	const compact = compactSourceText(text, { maxChars: 300 });

	assert.ok(compact.length < text.length);
	assert.match(compact, /^标题/);
	assert.match(compact, /中间内容已省略/);
	assert.match(compact, /结论：需要克制解读。$/);
});

test('normalizePageScript validates one script entry per page', () => {
	const script = normalizePageScript(JSON.stringify({
		title: '测试课件',
		summary: '简介',
		audience: '普通听众',
		pages: [
			{ pageNumber: 1, pageTitle: '第一页', speakerPrompt: '今天我们要聊的话题是第一页。', spokenSummary: '第一页', targetSeconds: 30 },
			{ pageNumber: 2, pageTitle: '第二页', speakerPrompt: '接下来这一页解释第二点。', spokenSummary: '第二页', targetSeconds: 25 },
		],
	}), 2);

	assert.equal(script.pages.length, 2);
	assert.match(script.pages[0].speakerPrompt, /今天我们要聊/);
});

test('normalizePageScript clamps overlong page targets for concise podcast reading', () => {
	const script = normalizePageScript(JSON.stringify({
		title: '讲解',
		summary: '摘要',
		audience: '普通听众',
		pages: [
			{ pageNumber: 1, pageTitle: '一', speakerPrompt: '今天我们要聊的话题是研究。', targetSeconds: 300 },
		],
	}), 1);

	assert.equal(script.pages[0].targetSeconds, 45);
});

test('cleanSpokenTranscript removes prompt and JSON wrappers', () => {
	const text = cleanSpokenTranscript('```json\n{"speakerPrompt":"请你生成播客","text":"今天我们要聊的话题是增长。"}\n```');
	assert.equal(text, '今天我们要聊的话题是增长。');
});

test('offsetSubtitleEvents shifts per-page events by cumulative start', () => {
	assert.deepEqual(offsetSubtitleEvents([{ text: '你好', start: 0.5, end: 1.5 }], 10), [
		{ text: '你好', start: 10.5, end: 11.5 },
	]);
});

test('buildPageTiming uses audio durations plus pauses as authoritative timeline', () => {
	const timing = buildPageTiming({
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png' },
			{ pageNumber: 2, imagePath: '/tmp/page-002.png' },
		],
		audio: [
			{ pageNumber: 1, audioPath: '/tmp/page-001.mp3', duration: 10, transcript: '一', subtitleEvents: [{ text: '一', start: 0, end: 1 }] },
			{ pageNumber: 2, audioPath: '/tmp/page-002.mp3', duration: 20, transcript: '二', subtitleEvents: [{ text: '二', start: 0, end: 2 }] },
		],
		pagePauseSeconds: 0.3,
	});

	assert.equal(timing.totalDuration, 30.3);
	assert.equal(timing.pages[1].start, 10.3);
	assert.deepEqual(timing.subtitles.map((event) => event.text), ['一', '二']);
	assert.equal(timing.subtitles[1].start, 10.3);
});

test('aggregatePresentationCost sums available page podcast usage', () => {
	const cost = aggregatePresentationCost({
		jobId: 'job-1',
		pageCosts: [
			{ aiPodcast: { totalTokens: 1000, estimatedCostCny: 0.07 } },
			{ aiPodcast: { totalTokens: 2000, estimatedCostCny: 0.14 } },
		],
		pageCount: 2,
		totalAudioDuration: 30,
	});

	assert.equal(cost.totalTokens, 3000);
	assert.equal(cost.totalEstimatedCostCny, 0.21);
});
