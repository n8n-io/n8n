import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./presentation-script-client.mjs', import.meta.url).pathname;
const skillPath = new URL('./pdf-to-podcast-script/SKILL.md', import.meta.url).pathname;

test('presentation-script-client writes normalized page-script from fixture response', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-script-'));
	const pagesManifestPath = path.join(root, 'pages.json');
	const pageScriptPath = path.join(root, 'page-script.json');
	const llmPromptPath = path.join(root, 'prompt.txt');
	const llmResponsePath = path.join(root, 'response.json');
	fs.writeFileSync(pagesManifestPath, JSON.stringify({
		sourceType: 'pdf',
		pageCount: 2,
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt', text: '增长标题', isTextSparse: false },
			{ pageNumber: 2, imagePath: '/tmp/page-002.png', textPath: '/tmp/page-002.txt', text: '方法论', isTextSparse: false },
		],
	}));
	const fixtureResponse = path.join(root, 'fixture-response.txt');
	fs.writeFileSync(fixtureResponse, JSON.stringify({
		title: '增长课',
		summary: '讲增长',
		audience: '创业者',
		pages: [
			{ pageNumber: 1, pageTitle: '增长', speakerPrompt: '今天我们要聊的话题是增长。', spokenSummary: '增长', targetSeconds: 30 },
			{ pageNumber: 2, pageTitle: '方法', speakerPrompt: '接下来这一页讲方法论。', spokenSummary: '方法', targetSeconds: 25 },
		],
	}));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'script-test',
		pagesManifestPath,
		pageScriptPath,
		llmPromptPath,
		llmResponsePath,
		extraContext: '讲给创业者',
		podcastStyle: 'podcast_interview',
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_SCRIPT_FIXTURE_RESPONSE: fixtureResponse },
	});
	assert.equal(result.status, 0, result.stderr);
	const script = JSON.parse(fs.readFileSync(pageScriptPath, 'utf8'));
	assert.equal(script.pages.length, 2);
	assert.match(script.pages[0].speakerPrompt, /今天我们要聊/);
	assert.equal(fs.existsSync(llmPromptPath), true);
	const prompt = fs.readFileSync(llmPromptPath, 'utf8');
	assert.match(prompt, /pdf-to-podcast-script/);
	assert.match(prompt, /PDF 页面是唯一事实来源/);
	assert.match(prompt, /页面证据摘录/);
	assert.match(prompt, /提炼真实有用的信息/);
	assert.match(prompt, /不要逐段总结所有文字/);
	assert.match(prompt, /不要写成论文全文综述或全面解读/);
	assert.match(prompt, /采用观点主导方式/);
	assert.match(prompt, /优先围绕这些观点组织脚本/);
	assert.match(prompt, /作为支持、限定或纠偏/);
	assert.match(prompt, /不要脱离用户观点去全面复述论文/);
	assert.match(prompt, /重磅.*顶级期刊.*新标杆.*改写临床实践/);
	assert.match(prompt, /每一页都是同一个长视频播客的连续片段/);
	assert.match(prompt, /不要写感谢收听、下期再见、拜拜/);
	assert.match(prompt, /可能.*更像是.*至少可以看到.*还不能直接说明/);
});

test('presentation-script-client allows AI interpretation only when no viewpoint is provided', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-script-no-context-'));
	const pagesManifestPath = path.join(root, 'pages.json');
	const pageScriptPath = path.join(root, 'page-script.json');
	const llmPromptPath = path.join(root, 'prompt.txt');
	const llmResponsePath = path.join(root, 'response.json');
	fs.writeFileSync(pagesManifestPath, JSON.stringify({
		sourceType: 'pdf',
		pageCount: 1,
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt', text: '研究问题和核心发现', isTextSparse: false },
		],
	}));
	const fixtureResponse = path.join(root, 'fixture-response.txt');
	fs.writeFileSync(fixtureResponse, JSON.stringify({
		title: '论文解读',
		summary: '克制讲解研究页面',
		audience: '普通听众',
		pages: [
			{ pageNumber: 1, pageTitle: '研究问题', speakerPrompt: '今天我们要聊的话题是这篇研究到底在回答什么问题。', spokenSummary: '研究问题', targetSeconds: 30 },
		],
	}));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'script-no-context-test',
		pagesManifestPath,
		pageScriptPath,
		llmPromptPath,
		llmResponsePath,
		extraContext: '',
		podcastStyle: 'podcast_interview',
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_SCRIPT_FIXTURE_RESPONSE: fixtureResponse },
	});
	assert.equal(result.status, 0, result.stderr);
	const prompt = fs.readFileSync(llmPromptPath, 'utf8');
	assert.match(prompt, /用户没有提供明确观点/);
	assert.match(prompt, /自行提炼一个克制的解读角度/);
	assert.match(prompt, /不要试图覆盖论文的全部内容/);
	assert.doesNotMatch(prompt, /优先围绕这些观点组织脚本/);
});

test('presentation-script-client can switch the page script prompt to science video narration', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-script-science-'));
	const pagesManifestPath = path.join(root, 'pages.json');
	const pageScriptPath = path.join(root, 'page-script.json');
	const llmPromptPath = path.join(root, 'prompt.txt');
	const llmResponsePath = path.join(root, 'response.json');
	fs.writeFileSync(pagesManifestPath, JSON.stringify({
		sourceType: 'pdf',
		pageCount: 1,
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt', text: '研究显示睡眠时长与风险呈 U 型关系。', isTextSparse: false },
		],
	}));
	const fixtureResponse = path.join(root, 'fixture-response.txt');
	fs.writeFileSync(fixtureResponse, JSON.stringify({
		title: '睡眠研究科普',
		summary: '克制解释研究页面',
		audience: '普通观众',
		pages: [
			{ pageNumber: 1, pageTitle: 'U 型关系', speakerPrompt: '这页研究提示睡眠时长和风险可能存在 U 型关系。', spokenSummary: '这里需要强调相关性和不确定性。', targetSeconds: 30 },
		],
	}));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'script-science-test',
		pagesManifestPath,
		pageScriptPath,
		llmPromptPath,
		llmResponsePath,
		extraContext: '讲给普通健康科普观众',
		podcastStyle: 'science_explainer_video',
	}));

	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_SCRIPT_FIXTURE_RESPONSE: fixtureResponse },
	});

	assert.equal(result.status, 0, result.stderr);
	const prompt = fs.readFileSync(llmPromptPath, 'utf8');
	assert.match(prompt, /中文科普视频逐页讲解脚本作者/);
	assert.match(prompt, /新闻联播式科普解说/);
	assert.match(prompt, /新闻播报式、单人口播感/);
	assert.match(prompt, /正式、克制、证据导向/);
	assert.match(prompt, /不要写成播客访谈/);
	assert.match(prompt, /不要使用博客式叙事/);
	assert.doesNotMatch(prompt, /播客节目策划/);
});

test('presentation-script-client compacts dense page text before sending it to the LLM and podcast step', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-script-dense-'));
	const pagesManifestPath = path.join(root, 'pages.json');
	const pageScriptPath = path.join(root, 'page-script.json');
	const llmPromptPath = path.join(root, 'prompt.txt');
	const llmResponsePath = path.join(root, 'response.json');
	const denseText = `ARTICLE TITLE\n${'dense clinical trial paragraph with many endpoints and table values. '.repeat(200)}\nCONCLUSION LINE`;
	fs.writeFileSync(pagesManifestPath, JSON.stringify({
		sourceType: 'pdf',
		pageCount: 1,
		pages: [
			{ pageNumber: 1, imagePath: '/tmp/page-001.png', textPath: '/tmp/page-001.txt', text: denseText, isTextSparse: false },
		],
	}));
	const fixtureResponse = path.join(root, 'fixture-response.txt');
	fs.writeFileSync(fixtureResponse, JSON.stringify({
		title: '论文解读',
		summary: '克制讲解研究页面',
		audience: '普通听众',
		pages: [
			{ pageNumber: 1, pageTitle: '研究', speakerPrompt: '今天我们要聊的话题是这页研究信息。', spokenSummary: '这里提炼一个重点。', targetSeconds: 300 },
		],
	}));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'script-dense-test',
		pagesManifestPath,
		pageScriptPath,
		llmPromptPath,
		llmResponsePath,
		extraContext: '讲给普通用户',
		podcastStyle: 'podcast_interview',
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_SCRIPT_FIXTURE_RESPONSE: fixtureResponse },
	});
	assert.equal(result.status, 0, result.stderr);
	const prompt = fs.readFileSync(llmPromptPath, 'utf8');
	const script = JSON.parse(fs.readFileSync(pageScriptPath, 'utf8'));
	assert.ok(prompt.length < denseText.length);
	assert.match(prompt, /中间内容已省略/);
	assert.match(script.pages[0].sourceText, /中间内容已省略/);
	assert.equal(script.pages[0].targetSeconds, 45);
});

test('pdf-to-podcast-script skill documents page-grounded podcast rules', () => {
	const skill = fs.readFileSync(skillPath, 'utf8');

	assert.match(skill, /name: pdf-to-podcast-script/);
	assert.match(skill, /The PDF page is the source of truth/);
	assert.match(skill, /not a comprehensive paper review/);
	assert.match(skill, /If the user provides a viewpoint/);
	assert.match(skill, /If the user does not provide a viewpoint/);
	assert.match(skill, /concise podcast commentary over selected evidence/);
	assert.match(skill, /must not summarize all text on every page/);
	assert.match(skill, /speakerPrompt/);
	assert.match(skill, /spokenSummary/);
	assert.match(skill, /continuous segments of one long video podcast/);
	assert.match(skill, /Do not write repeated episode endings/);
	assert.match(skill, /Subtitles must come from the actual TTS or AI Podcast transcript/);
});
