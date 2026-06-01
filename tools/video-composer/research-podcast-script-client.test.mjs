import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./research-podcast-script-client.mjs', import.meta.url).pathname;
const skillPath = new URL('./pdf-research-podcast-script/SKILL.md', import.meta.url).pathname;

test('research-podcast-script-client writes one continuous research podcast script', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-podcast-script-'));
	const pagesManifestPath = path.join(root, 'pages.json');
	const researchScriptPath = path.join(root, 'research-podcast-script.json');
	const llmPromptPath = path.join(root, 'prompt.txt');
	const llmResponsePath = path.join(root, 'response.json');
	fs.writeFileSync(pagesManifestPath, JSON.stringify({
		sourceType: 'pdf',
		pageCount: 2,
		pages: [
			{
				pageNumber: 1,
				imagePath: '/tmp/page-001.png',
				textPath: '/tmp/page-001.txt',
				text: '研究背景：复发/转移性鼻咽癌缺少更有效的一线治疗。',
			},
			{
				pageNumber: 2,
				imagePath: '/tmp/page-002.png',
				textPath: '/tmp/page-002.txt',
				text: '核心结果：中位 PFS 从 7.0 个月延长到 9.63 个月，疾病进展风险降低 55%。',
			},
		],
	}));
	const fixtureResponse = path.join(root, 'fixture-response.json');
	fs.writeFileSync(fixtureResponse, JSON.stringify({
		title: '鼻咽癌一线治疗研究解读',
		summary: '用连续播客解释研究背景和核心数据。',
		audience: '普通科普听众',
		thesis: '这项研究的价值在于把疗效增益放回一线治疗困境中理解。',
		pageAnchors: [
			{ pageNumber: 1, topic: '治疗困境', visualRole: '建立问题' },
			{ pageNumber: 2, topic: 'PFS 获益', visualRole: '解释证据' },
		],
		segments: [
			{
				role: 'A',
				text: '今天咱们不只是看一个药名，而是看鼻咽癌一线治疗为什么需要新证据。',
				pageNumber: 1,
				evidenceRefs: ['复发/转移性鼻咽癌缺少更有效的一线治疗'],
				targetSeconds: 18,
			},
			{
				role: 'B',
				text: '也就是说，第一页先把问题摆出来：临床上真正难的是复发和转移之后该怎么延缓进展。',
				pageNumber: 1,
				evidenceRefs: ['研究背景'],
				targetSeconds: 20,
			},
			{
				role: 'A',
				text: '接着看第二页，关键不是喊突破，而是 PFS 从七个月到九点六三个月，以及风险降低百分之五十五。',
				pageNumber: 2,
				evidenceRefs: ['PFS 7.0 个月', 'PFS 9.63 个月', '风险降低 55%'],
				targetSeconds: 24,
			},
		],
	}));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'research-script-test',
		pagesManifestPath,
		researchScriptPath,
		llmPromptPath,
		llmResponsePath,
		extraContext: '讲给患者家属，强调数据边界',
		podcastStyle: 'podcast_interview',
	}));

	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, RESEARCH_PODCAST_SCRIPT_FIXTURE_RESPONSE: fixtureResponse },
	});

	assert.equal(result.status, 0, result.stderr);
	const prompt = fs.readFileSync(llmPromptPath, 'utf8');
	assert.match(prompt, /pdf-research-podcast-script/);
	assert.match(prompt, /整篇 PDF 生成一整集连续双人播客/);
	assert.match(prompt, /PDF 页面只是视觉锚点/);
	assert.match(prompt, /研究问题、证据链、关键结论、限制、听众价值/);
	assert.match(prompt, /讲给患者家属/);
	assert.match(prompt, /重磅.*顶级期刊.*新标杆.*改写临床实践/);
	assert.match(prompt, /只有第一段可以自然开场/);
	assert.match(prompt, /后续 segment 不要重新开场/);

	const script = JSON.parse(fs.readFileSync(researchScriptPath, 'utf8'));
	assert.equal(script.segments.length, 3);
	assert.equal(script.pageAnchors.length, 2);
	assert.equal(script.segments[0].pageNumber, 1);
	assert.equal(script.segments[2].pageNumber, 2);
	assert.doesNotMatch(script.segments[1].text, /今天.*聊|感谢收听|下期再见|拜拜/);
	assert.deepEqual(script.segments[2].evidenceRefs, ['PFS 7.0 个月', 'PFS 9.63 个月', '风险降低 55%']);
});

test('pdf-research-podcast-script skill documents continuous research podcast rules', () => {
	const skill = fs.readFileSync(skillPath, 'utf8');

	assert.match(skill, /name: pdf-research-podcast-script/);
	assert.match(skill, /one continuous two-person podcast/);
	assert.match(skill, /visual anchors/);
	assert.match(skill, /research question, evidence chain, key findings, limitations, and listener value/);
	assert.match(skill, /Do not restart the episode on each page/);
	assert.match(skill, /Do not invent claims that are absent from the PDF/);
});

test('research-podcast-script-client rejects scripts that do not anchor every page', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-podcast-script-missing-page-'));
	const pagesManifestPath = path.join(root, 'pages.json');
	fs.writeFileSync(pagesManifestPath, JSON.stringify({
		sourceType: 'pdf',
		pageCount: 2,
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt', text: '第一页' },
			{ pageNumber: 2, imagePath: '/tmp/page-002.png', textPath: '/tmp/page-002.txt', text: '第二页' },
		],
	}));
	const fixtureResponse = path.join(root, 'fixture-response.json');
	fs.writeFileSync(fixtureResponse, JSON.stringify({
		title: '缺页脚本',
		summary: '只覆盖第一页',
		audience: '测试',
		thesis: '测试',
		pageAnchors: [{ pageNumber: 1, topic: '第一页', visualRole: '开场' }],
		segments: [
			{ role: 'A', text: '今天咱们先看第一页。', pageNumber: 1, evidenceRefs: ['第一页'], targetSeconds: 12 },
		],
	}));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'research-script-missing-page-test',
		pagesManifestPath,
		researchScriptPath: path.join(root, 'research-podcast-script.json'),
		llmPromptPath: path.join(root, 'prompt.txt'),
		llmResponsePath: path.join(root, 'response.json'),
		extraContext: '',
		podcastStyle: 'podcast_interview',
	}));

	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, RESEARCH_PODCAST_SCRIPT_FIXTURE_RESPONSE: fixtureResponse },
	});

	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /must include at least one segment for page 2/);
});
