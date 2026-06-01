#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePagesManifest } from './presentation-utils.mjs';
import {
	buildScienceExplainerPrompt,
	normalizeScienceScript,
	normalizeVisualAnalysis,
} from './science-explainer-utils.mjs';

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

async function callLlm(prompt) {
	let url = process.env.DOUBAO_LLM_URL || process.env.ARK_API_BASE_URL || process.env.OPENAI_BASE_URL;
	const apiKey = process.env.DOUBAO_LLM_API_KEY || process.env.ARK_API_KEY || process.env.OPENAI_API_KEY;
	const model = process.env.DOUBAO_LLM_MODEL || process.env.ARK_MODEL_NAME || process.env.OPENAI_MODEL;
	if (!url || !apiKey || !model) {
		throw new Error('Missing LLM config: set DOUBAO_LLM_* or ARK_API_KEY, ARK_MODEL_NAME, and ARK_API_BASE_URL.');
	}
	url = String(url).trim();
	while (url.endsWith('/')) url = url.slice(0, -1);
	const isResponsesApi = url.endsWith('/responses');
	if (!isResponsesApi && !url.endsWith('/chat/completions')) url += '/chat/completions';
	const body = isResponsesApi
		? {
				model,
				input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
				temperature: Number(process.env.DOUBAO_LLM_TEMPERATURE || 0.4),
				max_output_tokens: 5000,
				thinking: { type: 'disabled' },
			}
		: {
				model,
				messages: [{ role: 'user', content: prompt }],
				temperature: Number(process.env.DOUBAO_LLM_TEMPERATURE || 0.4),
				response_format: { type: 'json_object' },
			};
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
		body: JSON.stringify(body),
	});
	if (!response.ok) throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
	const payload = await response.json();

	return payload.choices?.[0]?.message?.content ||
		payload.output_text ||
		payload.output?.[0]?.content?.[0]?.text ||
		JSON.stringify(payload);
}

async function main() {
	loadLocalEnv();
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/science-explainer-script-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const visualAnalysis = normalizeVisualAnalysis(
		fs.readFileSync(job.pageVisualAnalysisPath, 'utf8'),
		pagesManifest.pageCount,
	);
	const prompt = buildScienceExplainerPrompt({
		pagesManifest,
		visualAnalysis,
		viewpoint: job.viewpoint,
		narrationMode: job.narrationMode,
		aspectRatio: job.aspectRatio,
	});
	fs.writeFileSync(job.llmPromptPath, prompt, 'utf8');
	const rawResponse = process.env.SCIENCE_EXPLAINER_SCRIPT_FIXTURE_RESPONSE
		? fs.readFileSync(process.env.SCIENCE_EXPLAINER_SCRIPT_FIXTURE_RESPONSE, 'utf8')
		: await callLlm(prompt);
	fs.writeFileSync(job.llmResponsePath, rawResponse, 'utf8');
	const script = normalizeScienceScript(rawResponse, pagesManifest.pageCount);
	fs.writeFileSync(job.pageScriptPath, JSON.stringify(script, null, 2), 'utf8');
	console.log(JSON.stringify({
		ok: true,
		pageScriptPath: job.pageScriptPath,
		pageCount: Array.isArray(script.pageAnchors) ? script.pageAnchors.length : script.pages.length,
		mode: script.mode,
	}));
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
