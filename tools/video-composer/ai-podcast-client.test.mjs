import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const clientPath = new URL('./ai-podcast-client.mjs', import.meta.url).pathname;

function makeJob(extra = {}) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-podcast-client-'));
	const job = {
		jobId: 'job-1',
		podcastInputText: '今天我们要聊的话题是测试。',
		ttsDir: path.join(tmp, 'tts'),
		audioPath: path.join(tmp, 'tts', 'audio.mp3'),
		ttsTimingPath: path.join(tmp, 'tts', 'timing.json'),
		podcastMetadataPath: path.join(tmp, 'tts', 'ai-podcast-metadata.json'),
		podcastRawResponsePath: path.join(tmp, 'tts', 'ai-podcast-response.binlog'),
		costPath: path.join(tmp, 'tts', 'cost.json'),
		transcriptPath: path.join(tmp, 'tts', 'transcript.txt'),
		...extra,
	};
	const jobPath = path.join(tmp, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
	return { tmp, job, jobPath };
}

test('client fails clearly when credentials are missing', () => {
	const { jobPath } = makeJob();
	const result = spawnSync('node', [clientPath, jobPath], {
		encoding: 'utf8',
		env: {
			PATH: process.env.PATH,
			VIDEO_CLIP_ENV_FILE: path.join(path.dirname(jobPath), 'missing.env'),
		},
	});

	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Missing required AI podcast credential/);
});

test('client loads credentials from VIDEO_CLIP_ENV_FILE when process env is empty', () => {
	const { jobPath, job } = makeJob();
	const tmp = path.dirname(jobPath);
	const envFile = path.join(tmp, '.env.video-clip');
	const fixturePath = path.join(tmp, 'frames.json');
	fs.writeFileSync(envFile, 'DOUBAO_AI_PODCAST_API_KEY=key-from-file\n');
	fs.writeFileSync(fixturePath, JSON.stringify([
		{ audio: Buffer.from('audio').toString('base64') },
		{ sentence: { words: [{ word: '测', startTime: 0, endTime: 0.2 }] } },
	]));

	const result = spawnSync('node', [clientPath, jobPath], {
		encoding: 'utf8',
		env: {
			PATH: process.env.PATH,
			VIDEO_CLIP_ENV_FILE: envFile,
			AI_PODCAST_FIXTURE_FRAMES: fixturePath,
		},
	});

	assert.equal(result.status, 0, result.stderr);
	assert.equal(fs.existsSync(job.audioPath), true);
});

test('client can consume offline fixture frames and write audio plus timing', () => {
	const { jobPath, job } = makeJob();
	const fixturePath = path.join(path.dirname(jobPath), 'frames.json');
	fs.writeFileSync(fixturePath, JSON.stringify([
		{ audio: Buffer.from('audio').toString('base64') },
		{ round_id: 0, speaker: 'zh_male', text: '今天我们要聊真实口播。' },
		{ audio_duration: 2, start_time: 0, end_time: 2 },
		{ usage: { input_text_tokens: 10, output_audio_tokens: 20, total_tokens: 30 } },
	]));

	const result = spawnSync('node', [clientPath, jobPath], {
		encoding: 'utf8',
		env: {
			...process.env,
			DOUBAO_AI_PODCAST_API_KEY: 'key',
			AI_PODCAST_FIXTURE_FRAMES: fixturePath,
		},
	});

	assert.equal(result.status, 0, result.stderr);
	assert.equal(fs.readFileSync(job.audioPath, 'utf8'), 'audio');
	const timing = JSON.parse(fs.readFileSync(job.ttsTimingPath, 'utf8'));
	assert.equal(timing.source, 'podcast_round_native');
	assert.equal(timing.subtitles[0].text, '今天我们要聊真实口播。');
	assert.equal(fs.readFileSync(job.transcriptPath, 'utf8'), '今天我们要聊真实口播。');
	const cost = JSON.parse(fs.readFileSync(job.costPath, 'utf8'));
	assert.equal(cost.aiPodcast.totalTokens, 30);
	assert.equal(cost.aiPodcast.estimatedCostCny, 0.0021);
	assert.equal(cost.totalEstimatedCostCny, 0.0021);
});
