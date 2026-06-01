import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname);
const videoComposerDir = path.join(repoRoot, 'tools', 'video-composer');

function commandExists(command) {
	const result = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });

	return result.status === 0;
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		encoding: 'utf8',
		maxBuffer: 1024 * 1024 * 20,
		...options,
	});
	assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);

	return result;
}

function makePdf(pdfPath) {
	run('python3', ['-c', `
import fitz
doc = fitz.open()
page = doc.new_page(width=720, height=1280)
page.insert_text((72, 120), "Nature Sleep Study")
page.insert_text((72, 180), "7 hours is the U-shaped low point.")
page.insert_text((72, 240), "Short sleep and long sleep both require careful interpretation.")
doc.save("${pdfPath}")
`]);
}

function makeMedia({ backgroundVideoPath, fixtureDir }) {
	run('ffmpeg', [
		'-y',
		'-f',
		'lavfi',
		'-i',
		'testsrc2=size=540x960:rate=12:duration=2',
		'-pix_fmt',
		'yuv420p',
		backgroundVideoPath,
	]);
	run('ffmpeg', [
		'-y',
		'-f',
		'lavfi',
		'-i',
		'sine=frequency=440:duration=1.2',
		'-ar',
		'44100',
		path.join(fixtureDir, 'page-001.mp3'),
	]);
	fs.writeFileSync(path.join(fixtureDir, 'page-001.json'), JSON.stringify({
		duration: 1.2,
		source: 'fixture',
		subtitles: [{ start: 0.05, end: 1, text: '这页的重点是七小时附近的低点。' }],
	}, null, 2));
	fs.writeFileSync(path.join(fixtureDir, 'page-001.txt'), '这页的重点是七小时附近的低点。', 'utf8');
}

test('science explainer workflow scripts run end-to-end with offline fixtures', (t) => {
	if (process.env.RUN_SCIENCE_EXPLAINER_E2E !== '1') {
		t.skip('Set RUN_SCIENCE_EXPLAINER_E2E=1 to run the full offline workflow render');
		return;
	}
	for (const command of ['ffmpeg', 'ffprobe', 'python3']) {
		if (!commandExists(command)) {
			t.skip(`${command} is not available; skipping full offline workflow render`);
			return;
		}
	}

	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'science-explainer-e2e-'));
	const inputDir = path.join(root, 'inputs');
	const presentationDir = path.join(root, 'presentation');
	const pagesDir = path.join(root, 'pages');
	const analysisDir = path.join(root, 'analysis');
	const scriptDir = path.join(root, 'script');
	const audioDir = path.join(root, 'audio');
	const timingDir = path.join(root, 'timing');
	const transcriptDir = path.join(root, 'transcript');
	const renderDir = path.join(root, 'render');
	const fixtureDir = path.join(root, 'fixtures');
	for (const dir of [
		inputDir,
		presentationDir,
		pagesDir,
		analysisDir,
		scriptDir,
		audioDir,
		timingDir,
		transcriptDir,
		renderDir,
		fixtureDir,
	]) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const pdfPath = path.join(presentationDir, 'source.pdf');
	const backgroundVideoPath = path.join(inputDir, 'background.mp4');
	makePdf(pdfPath);
	makeMedia({ backgroundVideoPath, fixtureDir });

	const paths = {
		pagesManifestPath: path.join(root, 'pages.json'),
		pageVisualAnalysisPath: path.join(analysisDir, 'page-visual-analysis.json'),
		pageScriptPath: path.join(scriptDir, 'science-explainer-script.json'),
		llmPromptPath: path.join(scriptDir, 'science-explainer-prompt.txt'),
		llmResponsePath: path.join(scriptDir, 'science-explainer-response.json'),
		pageAudioManifestPath: path.join(audioDir, 'page-audio.json'),
		pageTimingPath: path.join(timingDir, 'page-timing.json'),
		subtitlePath: path.join(renderDir, 'subtitles.ass'),
		outputVideoPath: path.join(renderDir, 'final.mp4'),
		outputAudioPath: path.join(audioDir, 'merged-audio.mp3'),
		ffmpegLogPath: path.join(renderDir, 'ffmpeg.log'),
	};
	const extractJobPath = path.join(root, 'extract-job.json');
	const visualAnalysisJobPath = path.join(root, 'visual-analysis-job.json');
	const scriptJobPath = path.join(root, 'science-script-job.json');
	const podcastJobPath = path.join(root, 'podcast-job.json');
	const composerJobPath = path.join(root, 'science-video-job.json');
	const visualFixturePath = path.join(root, 'visual-fixture.json');
	const scriptFixturePath = path.join(root, 'script-fixture.json');

	fs.writeFileSync(extractJobPath, JSON.stringify({
		jobId: 'science-e2e',
		sourcePath: pdfPath,
		presentationDir,
		pagesDir,
		pagesManifestPath: paths.pagesManifestPath,
	}, null, 2));
	run('node', [path.join(videoComposerDir, 'extract-presentation.mjs'), extractJobPath], {
		cwd: repoRoot,
	});

	fs.writeFileSync(visualFixturePath, JSON.stringify({
		pages: [{
			pageNumber: 1,
			visualNotes: '标题为 Nature Sleep Study，页面强调 7 小时附近低点。',
			layoutNotes: '竖版页面，上方标题，下方三行要点。',
			evidenceNotes: '能支持睡眠时长存在 U 型提示的谨慎讲解。',
			uncertaintyNotes: '不能证明因果关系。',
		}],
	}, null, 2));
	fs.writeFileSync(visualAnalysisJobPath, JSON.stringify({
		jobId: 'science-e2e',
		pagesManifestPath: paths.pagesManifestPath,
		pageVisualAnalysisPath: paths.pageVisualAnalysisPath,
		visualPromptPath: path.join(analysisDir, 'visual-analysis-prompt.txt'),
		visualResponsePath: path.join(analysisDir, 'visual-analysis-response.json'),
		viewpoint: '7 小时左右可能是更稳妥的睡眠时长。',
	}, null, 2));
	run('node', [path.join(videoComposerDir, 'science-visual-analysis-client.mjs'), visualAnalysisJobPath], {
		cwd: repoRoot,
		env: { ...process.env, SCIENCE_EXPLAINER_VISUAL_FIXTURE_RESPONSE: visualFixturePath },
	});

	fs.writeFileSync(scriptFixturePath, JSON.stringify({
		title: '睡眠时长怎么理解',
		summary: '用一页 PDF 讲清楚 7 小时低点的谨慎含义。',
		mode: 'single_speaker',
		pages: [{
			pageNumber: 1,
			pageTitle: '7 小时附近的低点',
			visualNotes: '标题和要点均指向 7 小时附近。',
			evidenceNotes: '页面支持趋势提示，不支持因果断言。',
			speakerPrompt: '这一页我们先看结论：七小时附近像是一个低点，但它更适合作为谨慎参考，而不是绝对规则。',
			spokenSummary: '七小时附近可以作为参考，但不能说它直接决定健康结果。',
			targetSeconds: 12,
		}],
	}, null, 2));
	fs.writeFileSync(scriptJobPath, JSON.stringify({
		jobId: 'science-e2e',
		pagesManifestPath: paths.pagesManifestPath,
		pageVisualAnalysisPath: paths.pageVisualAnalysisPath,
		pageScriptPath: paths.pageScriptPath,
		llmPromptPath: paths.llmPromptPath,
		llmResponsePath: paths.llmResponsePath,
		viewpoint: '7 小时左右可能是更稳妥的睡眠时长。',
		narrationMode: 'single_speaker',
		aspectRatio: '9:16',
	}, null, 2));
	run('node', [path.join(videoComposerDir, 'science-explainer-script-client.mjs'), scriptJobPath], {
		cwd: repoRoot,
		env: { ...process.env, SCIENCE_EXPLAINER_SCRIPT_FIXTURE_RESPONSE: scriptFixturePath },
	});

	fs.writeFileSync(podcastJobPath, JSON.stringify({
		jobId: 'science-e2e',
		pageScriptPath: paths.pageScriptPath,
		audioDir,
		timingDir,
		transcriptDir,
		pageAudioManifestPath: paths.pageAudioManifestPath,
		costPath: path.join(root, 'cost.json'),
		podcastSpeakerA: 'zh_male_wennuanahu_uranus_bigtts',
		podcastSpeakerB: 'zh_male_wennuanahu_uranus_bigtts',
		narrationMode: 'single_speaker',
		pageCount: 1,
	}, null, 2));
	run('node', [path.join(videoComposerDir, 'presentation-podcast-client.mjs'), podcastJobPath], {
		cwd: repoRoot,
		env: { ...process.env, PRESENTATION_PODCAST_FIXTURE_DIR: fixtureDir },
	});

	fs.writeFileSync(composerJobPath, JSON.stringify({
		jobId: 'science-e2e',
		aspectRatio: '9:16',
		backgroundVideoPath,
		pagesManifestPath: paths.pagesManifestPath,
		pageAudioManifestPath: paths.pageAudioManifestPath,
		pageTimingPath: paths.pageTimingPath,
		subtitlePath: paths.subtitlePath,
		renderDir,
		outputVideoPath: paths.outputVideoPath,
		outputAudioPath: paths.outputAudioPath,
		ffmpegLogPath: paths.ffmpegLogPath,
		pagePauseSeconds: 0,
		bottomVideoHeightRatio: 0.2,
		width: 360,
		height: 640,
		fps: 12,
	}, null, 2));
	run('node', [path.join(videoComposerDir, 'compose-science-explainer-video.mjs'), composerJobPath], {
		cwd: repoRoot,
	});

	for (const artifactPath of [
		paths.pagesManifestPath,
		paths.pageVisualAnalysisPath,
		paths.pageScriptPath,
		paths.pageAudioManifestPath,
		paths.pageTimingPath,
		paths.subtitlePath,
		paths.outputVideoPath,
		paths.outputAudioPath,
		paths.ffmpegLogPath,
	]) {
		assert.equal(fs.existsSync(artifactPath), true, `${artifactPath} should exist`);
		assert.ok(fs.statSync(artifactPath).size > 0, `${artifactPath} should be non-empty`);
	}
	const timing = JSON.parse(fs.readFileSync(paths.pageTimingPath, 'utf8'));
	assert.equal(timing.pages.length, 1);
	assert.equal(timing.subtitles[0].text, '这页的重点是七小时附近的低点。');
	const subtitle = fs.readFileSync(paths.subtitlePath, 'utf8');
	assert.match(subtitle, /,80,80,188,1/);
	assert.match(subtitle, /这页的重点是七小时附近的低点。/);
});
