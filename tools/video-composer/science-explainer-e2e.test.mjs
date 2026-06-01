import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname);
const videoComposerDir = path.join(repoRoot, 'tools', 'video-composer');
const requireFromTest = createRequire(import.meta.url);
const workflow = JSON.parse(
	fs.readFileSync(path.join(repoRoot, 'workflows', 'pdf-science-explainer-video-workflow.json'), 'utf8'),
);

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
		'sine=frequency=440:duration=2.4',
		'-ar',
		'44100',
		path.join(fixtureDir, 'podcast.mp3'),
	]);
	fs.writeFileSync(path.join(fixtureDir, 'podcast.json'), JSON.stringify({
		duration: 2.4,
		source: 'fixture',
		subtitles: [
			{ start: 0.05, end: 1.2, text: '这项最新文献首先把问题指向睡眠时长。' },
			{ start: 1.2, end: 2.25, text: '七小时附近更像风险低点，而不是因果规则。' },
		],
	}, null, 2));
	fs.writeFileSync(
		path.join(fixtureDir, 'podcast.txt'),
		'这项最新文献首先把问题指向睡眠时长。\n七小时附近更像风险低点，而不是因果规则。',
		'utf8',
	);
}

function getNode(name) {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	assert.ok(node, `Expected workflow node: ${name}`);

	return node;
}

async function runCodeNode({ name, item, uploadBuffers = {}, nodeResults = {} }) {
	const node = getNode(name);
	const jsCode = node.parameters?.jsCode;
	assert.ok(jsCode, `${name} must have jsCode`);
	const script = new vm.Script(`(async function(){\n${jsCode}\n}).call(contextThis)`);
	const context = vm.createContext({
		Buffer,
		console,
		Error,
		JSON,
		Math,
		Number,
		Promise,
		String,
		Date,
		require: requireFromTest,
		process,
		contextThis: {
			helpers: {
				getBinaryDataBuffer: async (_index, key) => {
					const buffer = uploadBuffers[key];
					if (!buffer) throw new Error(`Missing upload buffer for ${key}`);

					return buffer;
				},
			},
		},
		$env: process.env,
		$input: {
			first: () => item,
		},
		$: (nodeName) => ({
			first: () => nodeResults[nodeName],
		}),
	});
	const result = await script.runInContext(context, { timeout: 300000 });
	assert.ok(Array.isArray(result), `${name} must return n8n items`);
	assert.ok(result[0], `${name} must return at least one item`);

	return result[0];
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
		title: '最新睡眠文献解读',
		summary: '用一页 PDF 讲清楚 7 小时低点的谨慎含义。',
		mode: 'single_speaker',
		thesis: '七小时附近更像风险低点，而不是因果规则。',
		audience: '关注健康研究的普通观众',
		deliveryStyle: 'news_science_explainer',
		pageAnchors: [{
			pageNumber: 1,
			topic: '7 小时附近的低点',
			visualRole: '显示标题和核心要点。',
		}],
		segments: [{
			role: 'A',
			text: '这项最新文献首先把问题指向睡眠时长。七小时附近更像风险低点，而不是因果规则。',
			pageNumber: 1,
			evidenceRefs: ['page:1 title', 'page:1 text'],
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
		researchScriptPath: paths.pageScriptPath,
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
	run('node', [path.join(videoComposerDir, 'continuous-podcast-client.mjs'), podcastJobPath], {
		cwd: repoRoot,
		env: { ...process.env, CONTINUOUS_PODCAST_FIXTURE_DIR: fixtureDir },
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
	assert.equal(timing.subtitles[0].text, '这项最新文献首先把问题指向睡眠时长。');
	const subtitle = fs.readFileSync(paths.subtitlePath, 'utf8');
	assert.match(subtitle, /,80,80,72,1/);
	assert.match(subtitle, /七小时附近更像风险低点/);
});

test('science explainer workflow code nodes generate a final video end-to-end', async (t) => {
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

	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'science-explainer-workflow-e2e-'));
	const sourcePdfPath = path.join(root, 'upload.pdf');
	const sourceBackgroundPath = path.join(root, 'upload-background.mp4');
	const fixtureDir = path.join(root, 'fixtures');
	fs.mkdirSync(fixtureDir, { recursive: true });
	makePdf(sourcePdfPath);
	makeMedia({ backgroundVideoPath: sourceBackgroundPath, fixtureDir });

	const visualFixturePath = path.join(root, 'visual-fixture.json');
	const scriptFixturePath = path.join(root, 'script-fixture.json');
	fs.writeFileSync(visualFixturePath, JSON.stringify({
		pages: [{
			pageNumber: 1,
			visualNotes: '标题为 Nature Sleep Study，页面强调 7 小时附近低点。',
			layoutNotes: '竖版页面，上方标题，下方三行要点。',
			evidenceNotes: '能支持睡眠时长存在 U 型提示的谨慎讲解。',
			uncertaintyNotes: '不能证明因果关系。',
		}],
	}, null, 2));
	fs.writeFileSync(scriptFixturePath, JSON.stringify({
		title: '最新睡眠文献解读',
		summary: '用一页 PDF 讲清楚 7 小时低点的谨慎含义。',
		mode: 'single_speaker',
		thesis: '七小时附近更像风险低点，而不是因果规则。',
		audience: '关注健康研究的普通观众',
		deliveryStyle: 'news_science_explainer',
		pageAnchors: [{
			pageNumber: 1,
			topic: '7 小时附近的低点',
			visualRole: '显示标题和核心要点。',
		}],
		segments: [{
			role: 'A',
			text: '这项最新文献首先把问题指向睡眠时长。七小时附近更像风险低点，而不是因果规则。',
			pageNumber: 1,
			evidenceRefs: ['page:1 title', 'page:1 text'],
			targetSeconds: 12,
		}],
	}, null, 2));

	const previousEnv = {
		SCIENCE_EXPLAINER_VISUAL_FIXTURE_RESPONSE: process.env.SCIENCE_EXPLAINER_VISUAL_FIXTURE_RESPONSE,
		SCIENCE_EXPLAINER_SCRIPT_FIXTURE_RESPONSE: process.env.SCIENCE_EXPLAINER_SCRIPT_FIXTURE_RESPONSE,
		CONTINUOUS_PODCAST_FIXTURE_DIR: process.env.CONTINUOUS_PODCAST_FIXTURE_DIR,
		VIDEO_COMPOSER_JOBS_DIR: process.env.VIDEO_COMPOSER_JOBS_DIR,
	};
	process.env.SCIENCE_EXPLAINER_VISUAL_FIXTURE_RESPONSE = visualFixturePath;
	process.env.SCIENCE_EXPLAINER_SCRIPT_FIXTURE_RESPONSE = scriptFixturePath;
	process.env.CONTINUOUS_PODCAST_FIXTURE_DIR = fixtureDir;
	process.env.VIDEO_COMPOSER_JOBS_DIR = path.join(root, 'jobs');
	try {
		const uploadItem = {
			json: {
				viewpoint: '7 小时左右可能是更稳妥的睡眠时长。',
				narration_mode: 'single_speaker',
				voice: '男主持 - 温柔阿虎｜zh_male_wennuanahu_uranus_bigtts',
				voice_a: '男主持 - 温柔阿虎｜zh_male_wennuanahu_uranus_bigtts',
				voice_b: '女嘉宾 - Tina 老师｜zh_female_yingyujiaoxue_uranus_bigtts',
				aspect_ratio: '9:16',
				repo_dir: repoRoot,
				jobs_dir: path.join(root, 'jobs'),
				video_width: 360,
				video_height: 640,
				video_fps: 12,
				page_pause_seconds: 0,
			},
			binary: {
				background_video: {
					fileName: 'background.mp4',
					mimeType: 'video/mp4',
				},
				pdf_file: {
					fileName: 'source.pdf',
					mimeType: 'application/pdf',
				},
			},
		};
		const uploadBuffers = {
			background_video: fs.readFileSync(sourceBackgroundPath),
			pdf_file: fs.readFileSync(sourcePdfPath),
		};
		const nodeResults = {};
		let item = await runCodeNode({
			name: 'Prepare Science Explainer Job',
			item: uploadItem,
			uploadBuffers,
			nodeResults,
		});
		nodeResults['Prepare Science Explainer Job'] = item;
		for (const name of [
			'Extract PDF Pages',
			'Analyze PDF Page Visuals',
			'Generate Science Explainer Script',
			'Run Continuous Science Narration',
			'Build Science Explainer Video Job',
			'Run Science Explainer Composer',
		]) {
			item = await runCodeNode({ name, item, uploadBuffers, nodeResults });
			nodeResults[name] = item;
		}
		item = await runCodeNode({ name: 'Prepare Response', item, uploadBuffers, nodeResults });
		nodeResults['Prepare Response'] = item;

		const finalVideo = item.json.finalVideo;
		assert.equal(fs.existsSync(finalVideo), true, `${finalVideo} should exist`);
		assert.ok(fs.statSync(finalVideo).size > 0, `${finalVideo} should be non-empty`);
		assert.equal(fs.existsSync(item.json.audioPath), true);
		assert.equal(fs.existsSync(item.json.subtitlePath), true);
		const ffprobe = run('ffprobe', [
			'-v',
			'error',
			'-show_entries',
			'format=duration',
			'-of',
			'default=nw=1:nk=1',
			finalVideo,
		]);
		assert.ok(Number(ffprobe.stdout.trim()) > 0, 'final video must have duration');
		console.log(JSON.stringify({ finalVideo, reviewDir: item.json.reviewDir }));
	} finally {
		for (const [name, value] of Object.entries(previousEnv)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	}
});
