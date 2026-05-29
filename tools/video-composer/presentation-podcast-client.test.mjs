import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./presentation-podcast-client.mjs', import.meta.url).pathname;

test('presentation-podcast-client builds page audio manifest from fixture page outputs', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-podcast-'));
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	fs.mkdirSync(audioDir);
	fs.mkdirSync(timingDir);
	fs.mkdirSync(transcriptDir);
	const pageScriptPath = path.join(root, 'page-script.json');
	fs.writeFileSync(pageScriptPath, JSON.stringify({
		title: '测试',
		pages: [
			{ pageNumber: 1, speakerPrompt: '今天我们要聊的话题是第一页。' },
			{ pageNumber: 2, speakerPrompt: '接下来这一页讲第二页。' },
		],
	}));
	const fixtureDir = path.join(root, 'fixtures');
	fs.mkdirSync(fixtureDir);
	for (const page of [1, 2]) {
		const name = `page-${String(page).padStart(3, '0')}`;
		fs.writeFileSync(path.join(fixtureDir, `${name}.mp3`), `audio-${page}`);
		fs.writeFileSync(path.join(fixtureDir, `${name}.json`), JSON.stringify({
			duration: page * 10,
			subtitles: [{ text: `第${page}页`, start: 0, end: 1 }],
			source: 'podcast_estimated',
		}));
		fs.writeFileSync(path.join(fixtureDir, `${name}.txt`), `第${page}页 transcript`);
	}
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'podcast-test',
		pageScriptPath,
		audioDir,
		timingDir,
		transcriptDir,
		pageAudioManifestPath: path.join(root, 'page-audio.json'),
		costPath: path.join(root, 'cost.json'),
		podcastSpeakerA: 'speaker-a',
		podcastSpeakerB: 'speaker-b',
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_PODCAST_FIXTURE_DIR: fixtureDir },
	});
	assert.equal(result.status, 0, result.stderr);
	const manifest = JSON.parse(fs.readFileSync(path.join(root, 'page-audio.json'), 'utf8'));
	assert.equal(manifest.pages.length, 2);
	assert.equal(manifest.pages[1].duration, 20);
	assert.equal(manifest.pages[0].transcript, '第1页 transcript');
	const cost = JSON.parse(fs.readFileSync(path.join(root, 'cost.json'), 'utf8'));
	assert.equal(cost.pageCount, 2);
	assert.equal(cost.totalAudioDuration, 30);
});

test('presentation-podcast-client sends page source text and full script to AI podcast', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-podcast-input-'));
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	fs.mkdirSync(audioDir);
	fs.mkdirSync(timingDir);
	fs.mkdirSync(transcriptDir);
	const pageScriptPath = path.join(root, 'page-script.json');
	fs.writeFileSync(pageScriptPath, JSON.stringify({
		title: '测试',
		pages: [
			{
				pageNumber: 1,
				speakerPrompt: '今天我们要聊的话题是 PDF 冒烟测试。',
				spokenSummary: '这一页验证 n8n 工作流能生成带字幕的视频。',
				sourceText: 'AI Podcast PDF Smoke Test\nGoal: generate white subtitles.',
			},
		],
	}));
	const fixtureFramesPath = path.join(root, 'frames.json');
	fs.writeFileSync(fixtureFramesPath, JSON.stringify([
		{ round_id: 0, text: '今天我们要聊的话题是 PDF 冒烟测试。' },
		{ start_time: 0, end_time: 2, audio_duration: 2 },
		{ audio: Buffer.from('audio').toString('base64') },
	]));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'podcast-input-test',
		pageScriptPath,
		audioDir,
		timingDir,
		transcriptDir,
		pageAudioManifestPath: path.join(root, 'page-audio.json'),
		podcastSpeakerA: 'speaker-a',
		podcastSpeakerB: 'speaker-b',
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: {
			...process.env,
			AI_PODCAST_FIXTURE_FRAMES: fixtureFramesPath,
			DOUBAO_AI_PODCAST_API_KEY: 'test-key',
		},
	});

	assert.equal(result.status, 0, result.stderr);
	const pageJob = JSON.parse(fs.readFileSync(path.join(audioDir, 'page-001-ai-podcast-job.json'), 'utf8'));
	assert.match(pageJob.podcastInputText, /本页页面内容/);
	assert.match(pageJob.podcastInputText, /AI Podcast PDF Smoke Test/);
	assert.match(pageJob.podcastInputText, /这一页验证 n8n 工作流能生成带字幕的视频/);
	assert.match(pageJob.podcastInputText, /不要引入页面没有出现的新主题/);
});
