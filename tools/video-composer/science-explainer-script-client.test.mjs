import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildScienceExplainerPrompt,
	normalizeScienceScript,
	normalizeVisualAnalysis,
} from './science-explainer-utils.mjs';

test('buildScienceExplainerPrompt includes viewpoint, mode, text, and visual analysis', () => {
	const prompt = buildScienceExplainerPrompt({
		pagesManifest: {
			pages: [{ pageNumber: 1, text: '睡眠时长和衰老指标呈 U 型关系。' }],
		},
		visualAnalysis: {
			pages: [{
				pageNumber: 1,
				visualNotes: 'U 型曲线图。',
				layoutNotes: '左侧要点，右侧图表。',
				evidenceNotes: '支持最佳区间的谨慎表达。',
				uncertaintyNotes: '不能证明因果。',
			}],
		},
		viewpoint: '7 小时左右可能是更稳妥的睡眠时长。',
		narrationMode: 'single_speaker',
		aspectRatio: '9:16',
	});

	assert.match(prompt, /最新科普文献/);
	assert.match(prompt, /新闻联播式科普解说/);
	assert.match(prompt, /7 小时左右可能是更稳妥的睡眠时长/);
	assert.match(prompt, /narration_mode：single_speaker/);
	assert.match(prompt, /睡眠时长和衰老指标呈 U 型关系/);
	assert.match(prompt, /U 型曲线图/);
	assert.match(prompt, /不能证明因果/);
	assert.match(prompt, /视觉锚点/);
	assert.match(prompt, /segments/);
	assert.match(prompt, /不要输出 pages/);
	assert.match(prompt, /不要.*感谢收听/);
	assert.match(prompt, /不要.*下期再见/);
	assert.match(prompt, /后续 segment 不要重新开场/);
});

test('normalizers accept a fixture-like science script and visual analysis pair', () => {
	const visualAnalysis = normalizeVisualAnalysis(JSON.stringify({
		pages: [{
			pageNumber: 1,
			visualNotes: '标题和图表。',
			layoutNotes: '上下分区。',
			evidenceNotes: '支持谨慎解读。',
			uncertaintyNotes: '不能证明因果。',
		}],
	}), 1);
	const script = normalizeScienceScript(JSON.stringify({
		title: '睡眠时长怎么理解',
		summary: '用一页图解释睡眠观点。',
		mode: 'single_speaker',
		thesis: '七小时附近只能作为谨慎参考。',
		audience: '普通科普观众',
		deliveryStyle: 'news_science_explainer',
		pageAnchors: [{
			pageNumber: 1,
			topic: 'U 型曲线',
			visualRole: visualAnalysis.pages[0].visualNotes,
		}],
		segments: [{
			role: 'A',
			text: '这张图的重点不是越睡越好，而是区间可能更重要。',
			pageNumber: 1,
			evidenceRefs: [visualAnalysis.pages[0].evidenceNotes],
			targetSeconds: 35,
		}],
	}), 1);

	assert.equal(script.pageAnchors[0].visualRole, '标题和图表。');
	assert.equal(script.segments[0].evidenceRefs[0], '支持谨慎解读。');
});
