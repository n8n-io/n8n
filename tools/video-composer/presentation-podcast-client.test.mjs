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
