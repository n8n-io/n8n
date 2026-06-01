import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildSciencePromptPageBriefs,
	normalizeScienceScript,
	normalizeVisualAnalysis,
} from './science-explainer-utils.mjs';

test('normalizeVisualAnalysis validates page count and page numbers', () => {
	const analysis = normalizeVisualAnalysis(JSON.stringify({
		pages: [
			{
				pageNumber: 1,
				visualNotes: '页面有大标题和折线图。',
				layoutNotes: '信息图布局。',
				evidenceNotes: '图表只支持谨慎结论。',
				uncertaintyNotes: '缺少完整实验方法。',
			},
		],
	}), 1);

	assert.deepEqual(analysis.pages, [
		{
			pageNumber: 1,
			visualNotes: '页面有大标题和折线图。',
			layoutNotes: '信息图布局。',
			evidenceNotes: '图表只支持谨慎结论。',
			uncertaintyNotes: '缺少完整实验方法。',
		},
	]);
});

test('normalizeVisualAnalysis rejects mismatched page count', () => {
	assert.throws(
		() => normalizeVisualAnalysis(JSON.stringify({ pages: [] }), 1),
		/Visual analysis must contain exactly 1 pages/,
	);
});

test('normalizeScienceScript validates single-speaker script JSON', () => {
	const script = normalizeScienceScript(JSON.stringify({
		title: '睡眠研究怎么读',
		summary: '用 PDF 页面校验一个关于睡眠的观点。',
		mode: 'single_speaker',
		pages: [
			{
				pageNumber: 1,
				pageTitle: '第一页',
				visualNotes: 'U 型曲线。',
				evidenceNotes: '只能支持相关性表达。',
				speakerPrompt: '今天我们用这一页先看一个关键结论。',
				targetSeconds: 35,
			},
		],
	}), 1);

	assert.equal(script.title, '睡眠研究怎么读');
	assert.equal(script.mode, 'single_speaker');
	assert.equal(script.pages[0].targetSeconds, 35);
});

test('normalizeScienceScript validates two-speaker mode', () => {
	const script = normalizeScienceScript(JSON.stringify({
		title: '双人讲解',
		summary: '短问答解释 PDF。',
		mode: 'two_speaker',
		pages: [
			{
				pageNumber: 1,
				pageTitle: '第一页',
				visualNotes: '',
				evidenceNotes: '',
				speakerPrompt: 'A：先看这页。B：所以不能直接下结论，对吗？',
				targetSeconds: 20,
			},
		],
	}), 1);

	assert.equal(script.mode, 'two_speaker');
});

test('normalizeScienceScript rejects unsupported narration mode', () => {
	assert.throws(
		() => normalizeScienceScript(JSON.stringify({
			title: '错误模式',
			summary: '',
			mode: 'panel',
			pages: [{ pageNumber: 1, speakerPrompt: '文本' }],
		}), 1),
		/Unsupported narration mode: panel/,
	);
});

test('normalizeScienceScript bounds target seconds', () => {
	const script = normalizeScienceScript(JSON.stringify({
		title: '时长边界',
		summary: '',
		mode: 'single_speaker',
		pages: [
			{ pageNumber: 1, speakerPrompt: '第一页讲解。', targetSeconds: 5 },
			{ pageNumber: 2, speakerPrompt: '第二页讲解。', targetSeconds: 90 },
		],
	}), 2);

	assert.equal(script.pages[0].targetSeconds, 12);
	assert.equal(script.pages[1].targetSeconds, 60);
});

test('buildSciencePromptPageBriefs combines text and visual analysis by page', () => {
	const briefs = buildSciencePromptPageBriefs({
		pages: [
			{ pageNumber: 1, text: '正文内容', isTextSparse: false },
		],
		analysisPages: [
			{
				pageNumber: 1,
				visualNotes: '图表',
				layoutNotes: '标题层级',
				evidenceNotes: '支持有限',
				uncertaintyNotes: '方法缺失',
			},
		],
	});

	assert.match(briefs, /页码：1/);
	assert.match(briefs, /文本摘录：正文内容/);
	assert.match(briefs, /视觉信息：图表/);
	assert.match(briefs, /证据限制：支持有限/);
});
