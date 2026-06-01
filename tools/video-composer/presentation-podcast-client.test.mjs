import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./presentation-podcast-client.mjs', import.meta.url).pathname;

function commandExists(command) {
	const result = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });

	return result.status === 0;
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { encoding: 'utf8', ...options });
	assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);

	return result.stdout.trim();
}

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
			{
				pageNumber: 2,
				pageTitle: '第二页',
				speakerPrompt: '接下来解释第二页。',
				spokenSummary: '第二页继续说明视频合成结果。',
				sourceText: 'Second page evidence.',
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
	const pageTwoJob = JSON.parse(fs.readFileSync(path.join(audioDir, 'page-002-ai-podcast-job.json'), 'utf8'));
	assert.match(pageJob.podcastInputText, /当前是第 1 页，共 2 页/);
	assert.match(pageJob.podcastInputText, /第 1 页可以自然开场/);
	assert.match(pageTwoJob.podcastInputText, /当前是第 2 页，共 2 页/);
	assert.match(pageTwoJob.podcastInputText, /除第 1 页外，不要重新说“今天我们要聊”/);
	assert.match(pageJob.podcastInputText, /本页页面证据摘录/);
	assert.match(pageJob.podcastInputText, /AI Podcast PDF Smoke Test/);
	assert.match(pageJob.podcastInputText, /这一页验证 n8n 工作流能生成带字幕的视频/);
	assert.match(pageJob.podcastInputText, /不要引入页面没有出现的新主题/);
	assert.match(pageJob.podcastInputText, /不要在每一页结尾加入播客结束语/);
	assert.match(pageJob.podcastInputText, /不要说“感谢收听”/);
});

test('presentation-podcast-client compacts long page source text before AI podcast generation', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-podcast-compact-'));
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
				speakerPrompt: '今天我们要聊的话题是 PDF 长文本。',
				spokenSummary: '这一页只提炼重点。',
				sourceText: `TITLE\n${'dense page text. '.repeat(400)}\nLAST LINE`,
			},
		],
	}));
	const fixtureFramesPath = path.join(root, 'frames.json');
	fs.writeFileSync(fixtureFramesPath, JSON.stringify([
		{ round_id: 0, text: '今天我们要聊的话题是 PDF 长文本。' },
		{ start_time: 0, end_time: 2, audio_duration: 2 },
		{ audio: Buffer.from('audio').toString('base64') },
	]));
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'podcast-compact-test',
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
	assert.match(pageJob.podcastInputText, /中间内容已省略/);
	assert.ok(pageJob.podcastInputText.length < 1800);
});

test('presentation-podcast-client trims AI podcast closing speech from page fixtures', (t) => {
	if (!commandExists('ffmpeg') || !commandExists('ffprobe')) {
		t.skip('ffmpeg and ffprobe are required for audio trimming');
		return;
	}
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-podcast-trim-'));
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	const fixtureDir = path.join(root, 'fixtures');
	for (const dir of [audioDir, timingDir, transcriptDir, fixtureDir]) fs.mkdirSync(dir);
	const pageScriptPath = path.join(root, 'page-script.json');
	fs.writeFileSync(pageScriptPath, JSON.stringify({
		title: '测试',
		pages: [
			{
				pageNumber: 1,
				speakerPrompt: '今天我们只解释第一页。',
				spokenSummary: '第一页的有效讲解。',
				sourceText: '第一页证据。',
			},
		],
	}));
	run('ffmpeg', [
		'-y',
		'-f',
		'lavfi',
		'-i',
		'sine=frequency=440:duration=4',
		'-c:a',
		'libmp3lame',
		path.join(fixtureDir, 'page-001.mp3'),
	]);
	fs.writeFileSync(path.join(fixtureDir, 'page-001.json'), JSON.stringify({
		duration: 4,
		source: 'fixture',
		subtitles: [
			{ start: 0, end: 1.5, text: '第一页的有效讲解。' },
			{ start: 1.5, end: 2.2, text: '这里补充一个关键限制。' },
			{ start: 2.2, end: 3.3, text: '好的，那今天的内容咱们就到这里了，感谢大家的收听。' },
			{ start: 3.3, end: 4, text: '咱们下期再见拜拜。' },
		],
	}));
	fs.writeFileSync(
		path.join(fixtureDir, 'page-001.txt'),
		'第一页的有效讲解。\n这里补充一个关键限制。\n好的，那今天的内容咱们就到这里了，感谢大家的收听。\n咱们下期再见拜拜。',
	);
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'podcast-trim-test',
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
		env: { ...process.env, PRESENTATION_PODCAST_FIXTURE_DIR: fixtureDir },
	});
	assert.equal(result.status, 0, result.stderr);
	const manifest = JSON.parse(fs.readFileSync(path.join(root, 'page-audio.json'), 'utf8'));
	assert.equal(manifest.pages[0].transcript, '第一页的有效讲解。\n这里补充一个关键限制。');
	assert.equal(manifest.pages[0].duration, 2.2);
	assert.doesNotMatch(manifest.pages[0].transcript, /感谢大家|下期再见|拜拜/);
	assert.deepEqual(manifest.pages[0].subtitleEvents, [
		{ start: 0, end: 1.5, text: '第一页的有效讲解。' },
		{ start: 1.5, end: 2.2, text: '这里补充一个关键限制。' },
	]);
	const rewrittenTiming = JSON.parse(fs.readFileSync(path.join(timingDir, 'page-001.json'), 'utf8'));
	assert.equal(rewrittenTiming.duration, 2.2);
	assert.equal(rewrittenTiming.subtitles.length, 2);
	assert.ok(fs.statSync(path.join(audioDir, 'page-001.mp3')).size > 0);
});
