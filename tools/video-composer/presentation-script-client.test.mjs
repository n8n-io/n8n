import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./presentation-script-client.mjs', import.meta.url).pathname;

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
});
