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

	assert.match(prompt, /观点主导/);
	assert.match(prompt, /7 小时左右可能是更稳妥的睡眠时长/);
	assert.match(prompt, /narration_mode：single_speaker/);
	assert.match(prompt, /睡眠时长和衰老指标呈 U 型关系/);
	assert.match(prompt, /U 型曲线图/);
	assert.match(prompt, /不能证明因果/);
	assert.match(prompt, /连续页面/);
	assert.match(prompt, /不要.*感谢收听/);
	assert.match(prompt, /不要.*下期再见/);
	assert.match(prompt, /后续页面不要重新开场/);
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
		pages: [{
			pageNumber: 1,
			pageTitle: 'U 型曲线',
			visualNotes: visualAnalysis.pages[0].visualNotes,
			evidenceNotes: visualAnalysis.pages[0].evidenceNotes,
			speakerPrompt: '今天我们看这张图，重点不是越睡越好，而是区间可能更重要。',
			spokenSummary: '本页用 U 型关系提醒观众谨慎理解睡眠时长。',
			targetSeconds: 35,
		}],
	}), 1);

	assert.equal(script.pages[0].visualNotes, '标题和图表。');
	assert.equal(script.pages[0].evidenceNotes, '支持谨慎解读。');
});
