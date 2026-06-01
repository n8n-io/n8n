import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildScienceExplainerPrompt,
	buildSciencePromptPageBriefs,
	normalizeScienceScript,
	normalizeVisualAnalysis,
	scienceScriptToPageScript,
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

test('normalizeScienceScript rejects two-speaker science scripts', () => {
	assert.throws(
		() => normalizeScienceScript(JSON.stringify({
			title: '双人讲解',
			summary: '短问答解释 PDF。',
			mode: 'two_speaker',
			pages: [{ pageNumber: 1, speakerPrompt: 'A：先看这页。B：所以不能直接下结论，对吗？' }],
		}), 1),
		/Unsupported narration mode: two_speaker/,
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

test('normalizeScienceScript accepts continuous news-style science narration', () => {
	const script = normalizeScienceScript(JSON.stringify({
		title: '最新睡眠文献解读',
		summary: '用整篇 PDF 梳理睡眠时长研究的证据边界。',
		mode: 'single_speaker',
		thesis: '7 小时附近可以作为风险提示，但不能被解读成因果规则。',
		pageAnchors: [
			{ pageNumber: 1, topic: '研究问题', visualRole: '显示研究标题和核心问题。' },
			{ pageNumber: 2, topic: '关键结果', visualRole: '显示 U 型趋势图。' },
		],
		segments: [
			{
				role: 'A',
				text: '一项最新睡眠研究把问题指向同一个核心：睡眠时长和健康风险之间，可能不是越多越好。',
				pageNumber: 1,
				evidenceRefs: ['page:1 title'],
				targetSeconds: 14,
			},
			{
				role: 'A',
				text: '第二页给出的图形更像是在提示 U 型关系，七小时附近是观察到的低点，但这仍然不是因果证明。',
				pageNumber: 2,
				evidenceRefs: ['page:2 chart'],
				targetSeconds: 18,
			},
		],
	}), 2);

	assert.equal(script.mode, 'single_speaker');
	assert.equal(script.pageAnchors.length, 2);
	assert.equal(script.segments.length, 2);
	assert.equal(script.segments[1].pageNumber, 2);
	assert.equal(script.segments[1].targetSeconds, 18);
	assert.doesNotMatch(script.segments.map((segment) => segment.text).join('\n'), /感谢收听|下期再见|拜拜/);
});

test('scienceScriptToPageScript converts continuous science segments into page TTS input', () => {
	const script = normalizeScienceScript(JSON.stringify({
		title: '最新睡眠文献解读',
		summary: '用整篇 PDF 梳理睡眠时长研究的证据边界。',
		mode: 'single_speaker',
		thesis: '7 小时附近可以作为风险提示。',
		pageAnchors: [
			{ pageNumber: 1, topic: '研究问题', visualRole: '显示标题。' },
			{ pageNumber: 2, topic: '关键结果', visualRole: '显示图表。' },
		],
		segments: [
			{ role: 'A', text: '这项研究先把问题放在睡眠时长和健康风险之间的关系。', pageNumber: 1, evidenceRefs: ['page:1'], targetSeconds: 14 },
			{ role: 'A', text: '第二页进一步提示，七小时附近更像观察到的风险低点。', pageNumber: 2, evidenceRefs: ['page:2'], targetSeconds: 18 },
			{ role: 'A', text: '但这仍然不能被讲成因果规则。', pageNumber: 2, evidenceRefs: ['page:2'], targetSeconds: 12 },
		],
	}), 2);

	const pageScript = scienceScriptToPageScript(script);

	assert.equal(pageScript.mode, 'single_speaker');
	assert.equal(pageScript.deliveryStyle, 'single_tts_science_explainer');
	assert.equal(pageScript.pages.length, 2);
	assert.equal(pageScript.pages[0].speakerPrompt, '这项研究先把问题放在睡眠时长和健康风险之间的关系。');
	assert.equal(pageScript.pages[0].spokenSummary, '');
	assert.equal(pageScript.pages[1].speakerPrompt, '第二页进一步提示，七小时附近更像观察到的风险低点。');
	assert.equal(pageScript.pages[1].spokenSummary, '但这仍然不能被讲成因果规则。');
	assert.doesNotMatch(JSON.stringify(pageScript), /博客|播客|A：|B：/);
});

test('normalizeScienceScript rejects continuous scripts with repeated openings or closings', () => {
	assert.throws(
		() => normalizeScienceScript(JSON.stringify({
			title: '错误脚本',
			summary: '',
			mode: 'single_speaker',
			pageAnchors: [
				{ pageNumber: 1, topic: '第一页', visualRole: '标题。' },
				{ pageNumber: 2, topic: '第二页', visualRole: '图表。' },
			],
			segments: [
				{ role: 'A', text: '今天我们聊一项研究。', pageNumber: 1, evidenceRefs: ['page:1'], targetSeconds: 12 },
				{ role: 'A', text: '今天我们继续聊第二页。感谢收听。', pageNumber: 2, evidenceRefs: ['page:2'], targetSeconds: 12 },
			],
		}), 2),
		/Science script must not contain repeated openings or closing phrases/,
	);
});

test('buildScienceExplainerPrompt asks for latest-literature news explainer segments', () => {
	const prompt = buildScienceExplainerPrompt({
		pagesManifest: {
			pages: [
				{ pageNumber: 1, text: 'Anti-PD-1 antibody penpulimab plus chemotherapy for recurrent or metastatic nasopharyngeal carcinoma.' },
				{ pageNumber: 2, text: 'Progression-free survival improved in the treatment arm.' },
			],
		},
		visualAnalysis: {
			pages: [
				{ pageNumber: 1, visualNotes: '论文标题页。', layoutNotes: '期刊信息。', evidenceNotes: '可说明研究对象。', uncertaintyNotes: '不能扩展到所有癌种。' },
				{ pageNumber: 2, visualNotes: '结果图表。', layoutNotes: '左右分栏。', evidenceNotes: '可说明主要结果。', uncertaintyNotes: '需要谨慎表达。' },
			],
		},
		viewpoint: '关注鼻咽癌一线治疗新证据。',
		narrationMode: 'single_speaker',
		aspectRatio: '9:16',
	});

	assert.match(prompt, /最新科普文献/);
	assert.match(prompt, /新闻联播式科普解说/);
	assert.match(prompt, /segments/);
	assert.match(prompt, /pageAnchors/);
	assert.match(prompt, /不要输出 pages/);
	assert.match(prompt, /不要播客式互动/);
	assert.match(prompt, /单人 TTS/);
	assert.doesNotMatch(prompt, /two_speaker/);
	assert.match(prompt, /短句/);
	assert.match(prompt, /字幕/);
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
