import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { buildAudioSliceArgs } from './continuous-podcast-client.mjs';

const scriptPath = new URL('./continuous-podcast-client.mjs', import.meta.url).pathname;

function commandExists(command) {
	const result = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });

	return result.status === 0;
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { encoding: 'utf8', ...options });
	assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);

	return result.stdout.trim();
}

test('continuous-podcast-client calls AI podcast once and slices audio by page anchors', (t) => {
	if (!commandExists('ffmpeg') || !commandExists('ffprobe')) {
		t.skip('ffmpeg and ffprobe are required for continuous podcast slicing');
		return;
	}

	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'continuous-podcast-'));
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	const fixtureDir = path.join(root, 'fixtures');
	for (const dir of [audioDir, timingDir, transcriptDir, fixtureDir]) fs.mkdirSync(dir);
	const researchScriptPath = path.join(root, 'research-podcast-script.json');
	fs.writeFileSync(researchScriptPath, JSON.stringify({
		title: '连续论文播客',
		summary: '整集讲清楚研究。',
		thesis: '先讲问题，再讲证据。',
		pageAnchors: [
			{ pageNumber: 1, topic: '问题' },
			{ pageNumber: 2, topic: '证据' },
		],
		segments: [
			{ role: 'A', text: '今天咱们先看研究问题。', pageNumber: 1, evidenceRefs: ['问题'], targetSeconds: 2 },
			{ role: 'B', text: '这页说明患者为什么需要新方案。', pageNumber: 1, evidenceRefs: ['需要新方案'], targetSeconds: 1.8 },
			{ role: 'A', text: '然后看核心数据，PFS 有明确延长。', pageNumber: 2, evidenceRefs: ['PFS'], targetSeconds: 2.2 },
		],
	}));
	run('ffmpeg', [
		'-y',
		'-f',
		'lavfi',
		'-i',
		'sine=frequency=440:duration=6',
		'-c:a',
		'libmp3lame',
		path.join(fixtureDir, 'podcast.mp3'),
	]);
	fs.writeFileSync(path.join(fixtureDir, 'podcast.json'), JSON.stringify({
		duration: 6,
		source: 'fixture',
		subtitles: [
			{ start: 0, end: 1.5, text: '今天咱们先看研究问题。' },
			{ start: 1.5, end: 4, text: '这页说明患者为什么需要新方案。' },
			{ start: 4, end: 6, text: '然后看核心数据，PFS 有明确延长。' },
		],
	}));
	fs.writeFileSync(
		path.join(fixtureDir, 'podcast.txt'),
		'今天咱们先看研究问题。\n这页说明患者为什么需要新方案。\n然后看核心数据，PFS 有明确延长。',
	);
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'continuous-podcast-test',
		researchScriptPath,
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
		env: { ...process.env, CONTINUOUS_PODCAST_FIXTURE_DIR: fixtureDir },
	});

	assert.equal(result.status, 0, result.stderr);
	const pageAudio = JSON.parse(fs.readFileSync(path.join(root, 'page-audio.json'), 'utf8'));
	assert.equal(pageAudio.pages.length, 2);
	assert.equal(pageAudio.pages[0].pageNumber, 1);
	assert.equal(pageAudio.pages[1].pageNumber, 2);
	assert.ok(Math.abs(pageAudio.pages[0].duration - 4) < 0.25);
	assert.ok(Math.abs(pageAudio.pages[1].duration - 2) < 0.25);
	assert.deepEqual(pageAudio.pages[0].subtitleEvents.map((event) => event.text), [
		'今天咱们先看研究问题。',
		'这页说明患者为什么需要新方案。',
	]);
	assert.equal(pageAudio.pages[1].subtitleEvents[0].start, 0);
	assert.equal(pageAudio.pages[1].subtitleEvents[0].text, '然后看核心数据，PFS 有明确延长。');
	assert.equal(fs.existsSync(path.join(audioDir, 'research-ai-podcast-job.json')), false);
	assert.equal(fs.existsSync(path.join(audioDir, 'page-001-ai-podcast-job.json')), false);
	assert.equal(fs.existsSync(path.join(audioDir, 'whole-podcast.mp3')), true);
	assert.ok(fs.statSync(pageAudio.pages[0].audioPath).size > 0);
	assert.ok(fs.statSync(pageAudio.pages[1].audioPath).size > 0);

	const cost = JSON.parse(fs.readFileSync(path.join(root, 'cost.json'), 'utf8'));
	assert.equal(cost.pageCount, 2);
	assert.ok(Math.abs(cost.totalAudioDuration - 6) < 0.5);
});

test('continuous-podcast-client builds a single AI podcast input for the whole research script', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'continuous-podcast-input-'));
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	for (const dir of [audioDir, timingDir, transcriptDir]) fs.mkdirSync(dir);
	const researchScriptPath = path.join(root, 'research-podcast-script.json');
	fs.writeFileSync(researchScriptPath, JSON.stringify({
		title: '连续论文播客',
		summary: '整集讲清楚研究。',
		thesis: '先讲问题，再讲证据。',
		segments: [
			{ role: 'A', text: '今天咱们先看研究问题。', pageNumber: 1, evidenceRefs: ['问题'], targetSeconds: 2 },
			{ role: 'B', text: '接着自然承接到证据。', pageNumber: 2, evidenceRefs: ['证据'], targetSeconds: 2 },
		],
	}));
	const fixtureFramesPath = path.join(root, 'frames.json');
	fs.writeFileSync(fixtureFramesPath, JSON.stringify([
		{ round_id: 0, text: '今天咱们先看研究问题。接着自然承接到证据。' },
		{ start_time: 0, end_time: 4, audio_duration: 4 },
		{ audio: Buffer.from('audio').toString('base64') },
	]));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'continuous-podcast-input-test',
		researchScriptPath,
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
			CONTINUOUS_PODCAST_SKIP_SLICE: '1',
		},
	});

	assert.equal(result.status, 0, result.stderr);
	const aiPodcastJob = JSON.parse(fs.readFileSync(path.join(audioDir, 'research-ai-podcast-job.json'), 'utf8'));
	assert.match(aiPodcastJob.podcastInputText, /整集论文播客脚本/);
	assert.match(aiPodcastJob.podcastInputText, /第 1 页视觉锚点/);
	assert.match(aiPodcastJob.podcastInputText, /第 2 页视觉锚点/);
	assert.match(aiPodcastJob.podcastInputText, /今天咱们先看研究问题/);
	assert.match(aiPodcastJob.podcastInputText, /接着自然承接到证据/);
	assert.doesNotMatch(aiPodcastJob.podcastInputText, /每一页生成一段/);
	assert.equal(aiPodcastJob.useHeadMusic, false);
});

test('continuous-podcast-client passes a job-level AI podcast timeout through to the WebSocket client', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'continuous-podcast-timeout-'));
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	for (const dir of [audioDir, timingDir, transcriptDir]) fs.mkdirSync(dir);
	const researchScriptPath = path.join(root, 'research-podcast-script.json');
	fs.writeFileSync(researchScriptPath, JSON.stringify({
		title: '长论文博客式讲解',
		summary: '整集讲解需要更长等待窗口。',
		thesis: '不能因为生成耗时就降低内容质量。',
		segments: [
			{ role: 'A', text: '先完整建立观点。', pageNumber: 1, targetSeconds: 2 },
			{ role: 'B', text: '再用 PDF 证据校验。', pageNumber: 2, targetSeconds: 2 },
		],
	}));
	const fixtureFramesPath = path.join(root, 'frames.json');
	fs.writeFileSync(fixtureFramesPath, JSON.stringify([
		{ round_id: 0, text: '先完整建立观点。再用 PDF 证据校验。' },
		{ start_time: 0, end_time: 4, audio_duration: 4 },
		{ audio: Buffer.from('audio').toString('base64') },
	]));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'continuous-podcast-timeout-test',
		researchScriptPath,
		audioDir,
		timingDir,
		transcriptDir,
		pageAudioManifestPath: path.join(root, 'page-audio.json'),
		podcastSpeakerA: 'speaker-a',
		podcastSpeakerB: 'speaker-b',
		aiPodcastTimeoutMs: 270000,
	}));

	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: {
			...process.env,
			AI_PODCAST_FIXTURE_FRAMES: fixtureFramesPath,
			DOUBAO_AI_PODCAST_API_KEY: 'test-key',
			CONTINUOUS_PODCAST_SKIP_SLICE: '1',
		},
	});

	assert.equal(result.status, 0, result.stderr);
	const aiPodcastJob = JSON.parse(fs.readFileSync(path.join(audioDir, 'research-ai-podcast-job.json'), 'utf8'));
	assert.equal(aiPodcastJob.aiPodcastTimeoutMs, 270000);
});

test('continuous-podcast-client slices mp3 pages without re-encoding corrupt frames', () => {
	const args = buildAudioSliceArgs({
		inputPath: '/tmp/whole.mp3',
		outputPath: '/tmp/page-001.mp3',
		start: 12.5,
		duration: 30,
	});

	assert.deepEqual(args, [
		'-y',
		'-ss',
		'12.5',
		'-i',
		'/tmp/whole.mp3',
		'-t',
		'30',
		'-c:a',
		'copy',
		'/tmp/page-001.mp3',
	]);
	assert.equal(args.includes('libmp3lame'), false);
});

test('continuous-podcast-client preserves news-style science explainer instructions', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'continuous-science-input-'));
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	for (const dir of [audioDir, timingDir, transcriptDir]) fs.mkdirSync(dir);
	const researchScriptPath = path.join(root, 'science-script.json');
	fs.writeFileSync(researchScriptPath, JSON.stringify({
		title: '最新文献解读',
		summary: '新闻式讲解研究证据。',
		thesis: '结论需要回到 PDF 证据边界。',
		deliveryStyle: 'news_science_explainer',
		mode: 'single_speaker',
		pageAnchors: [{ pageNumber: 1, topic: '研究问题', visualRole: '标题页。' }],
		segments: [
			{ role: 'A', text: '这项最新文献首先明确了研究对象和治疗场景。', pageNumber: 1, evidenceRefs: ['page:1 title'], targetSeconds: 2 },
		],
	}));
	const fixtureFramesPath = path.join(root, 'frames.json');
	fs.writeFileSync(fixtureFramesPath, JSON.stringify([
		{ round_id: 0, text: '这项最新文献首先明确了研究对象和治疗场景。' },
		{ start_time: 0, end_time: 2, audio_duration: 2 },
		{ audio: Buffer.from('audio').toString('base64') },
	]));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'continuous-science-input-test',
		researchScriptPath,
		audioDir,
		timingDir,
		transcriptDir,
		pageAudioManifestPath: path.join(root, 'page-audio.json'),
		podcastSpeakerA: 'speaker-a',
		podcastSpeakerB: 'speaker-a',
	}));

	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: {
			...process.env,
			AI_PODCAST_FIXTURE_FRAMES: fixtureFramesPath,
			DOUBAO_AI_PODCAST_API_KEY: 'test-key',
			CONTINUOUS_PODCAST_SKIP_SLICE: '1',
		},
	});

	assert.equal(result.status, 0, result.stderr);
	const aiPodcastJob = JSON.parse(fs.readFileSync(path.join(audioDir, 'research-ai-podcast-job.json'), 'utf8'));
	assert.match(aiPodcastJob.podcastInputText, /新闻联播式科普解说/);
	assert.match(aiPodcastJob.podcastInputText, /短句/);
	assert.doesNotMatch(aiPodcastJob.podcastInputText, /双人播客访谈式/);
	assert.doesNotMatch(aiPodcastJob.podcastInputText, /整集论文播客脚本/);
});
