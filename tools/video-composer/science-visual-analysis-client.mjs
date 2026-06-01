#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePagesManifest } from './presentation-utils.mjs';
import { normalizeVisualAnalysis } from './science-explainer-utils.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnvFile(envFile) {
	const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const separator = trimmed.indexOf('=');
		if (separator <= 0) continue;
		const key = trimmed.slice(0, separator).trim();
		let value = trimmed.slice(separator + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = value;
	}
}

function loadLocalEnv() {
	const envFile = process.env.VIDEO_CLIP_ENV_FILE
		|| path.resolve(__dirname, '..', '..', '.env.video-clip');
	if (!fs.existsSync(envFile)) return;
	try {
		const dotenv = require('dotenv');
		dotenv.config({ path: envFile, quiet: true });
	} catch {
		parseEnvFile(envFile);
	}
}

function imageDataUrl(imagePath) {
	const extension = path.extname(imagePath).toLowerCase();
	const mime = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
	const data = fs.readFileSync(imagePath).toString('base64');

	return `data:${mime};base64,${data}`;
}

function buildPrompt({ pagesManifest, viewpoint = '' }) {
	return [
		'你是 PDF 页面截图视觉分析助手。',
		'请逐页分析截图中可见的标题层级、重点框、图表、表格、示意图、标签、趋势和版式结构。',
		'视觉分析只描述页面可见内容，不要编造页面外事实、研究结论或精确数值。',
		'如果用户观点和页面视觉内容有关，请说明这一页能支持、限制或修正什么。',
		'返回严格 JSON，不要 Markdown。',
		'JSON 字段必须是 pages；每页包含 pageNumber, visualNotes, layoutNotes, evidenceNotes, uncertaintyNotes。',
		`用户观点：${viewpoint || '无'}`,
		`页数：${pagesManifest.pageCount}`,
	].join('\n');
}

async function callVisionLlm({ prompt, pagesManifest }) {
	let url = process.env.DOUBAO_VISION_URL ||
		process.env.DOUBAO_LLM_URL ||
		process.env.ARK_API_BASE_URL ||
		process.env.OPENAI_BASE_URL;
	const apiKey = process.env.DOUBAO_VISION_API_KEY ||
		process.env.DOUBAO_LLM_API_KEY ||
		process.env.ARK_API_KEY ||
		process.env.OPENAI_API_KEY;
	const model = process.env.DOUBAO_VISION_MODEL ||
		process.env.DOUBAO_LLM_MODEL ||
		process.env.ARK_MODEL_NAME ||
		process.env.OPENAI_MODEL;
	if (!url || !apiKey || !model) {
		throw new Error('Missing vision LLM config: set DOUBAO_VISION_* or OpenAI/Ark-compatible LLM env vars.');
	}

	url = String(url).trim();
	while (url.endsWith('/')) url = url.slice(0, -1);
	const isResponsesApi = url.endsWith('/responses');
	if (!isResponsesApi && !url.endsWith('/chat/completions')) url += '/chat/completions';

	const content = [
		{ type: isResponsesApi ? 'input_text' : 'text', text: prompt },
		...pagesManifest.pages.map((page) => (
			isResponsesApi
				? { type: 'input_image', image_url: imageDataUrl(page.imagePath) }
				: { type: 'image_url', image_url: { url: imageDataUrl(page.imagePath) } }
		)),
	];
	const body = isResponsesApi
		? {
				model,
				input: [{ role: 'user', content }],
				temperature: Number(process.env.DOUBAO_LLM_TEMPERATURE || 0.2),
				max_output_tokens: 5000,
				thinking: { type: 'disabled' },
			}
		: {
				model,
				messages: [{ role: 'user', content }],
				temperature: Number(process.env.DOUBAO_LLM_TEMPERATURE || 0.2),
				response_format: { type: 'json_object' },
			};
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
		body: JSON.stringify(body),
	});
	if (!response.ok) throw new Error(`Vision LLM request failed: ${response.status} ${await response.text()}`);
	const payload = await response.json();

	return payload.choices?.[0]?.message?.content ||
		payload.output_text ||
		payload.output?.[0]?.content?.[0]?.text ||
		JSON.stringify(payload);
}

async function main() {
	loadLocalEnv();
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/science-visual-analysis-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const prompt = buildPrompt({ pagesManifest, viewpoint: job.viewpoint });
	fs.writeFileSync(job.visualPromptPath, prompt, 'utf8');
	const rawResponse = process.env.SCIENCE_EXPLAINER_VISUAL_FIXTURE_RESPONSE
		? fs.readFileSync(process.env.SCIENCE_EXPLAINER_VISUAL_FIXTURE_RESPONSE, 'utf8')
		: await callVisionLlm({ prompt, pagesManifest });
	fs.writeFileSync(job.visualResponsePath, rawResponse, 'utf8');
	const analysis = normalizeVisualAnalysis(rawResponse, pagesManifest.pageCount);
	fs.writeFileSync(job.pageVisualAnalysisPath, JSON.stringify(analysis, null, 2), 'utf8');
	console.log(JSON.stringify({
		ok: true,
		pageVisualAnalysisPath: job.pageVisualAnalysisPath,
		pageCount: analysis.pages.length,
	}));
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
