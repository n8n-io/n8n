#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compactSourceText, extractJsonObject, validatePagesManifest } from './presentation-utils.mjs';

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

function splitSpokenSentences(text) {
	return String(text || '').match(/[^。！？!?]+[。！？!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
}

function compactSpeech(text) {
	return String(text || '').replace(/\s+/g, '');
}

function isRepeatedOpening(text) {
	const compact = compactSpeech(text);
	return [
		/^今天(我们|咱们)?(继续)?(要|来)?聊/,
		/^接下来(我们|咱们)?(继续)?(要|来)?聊/,
		/^欢迎(大家|各位)?(来到|收听|观看)/,
		/^大家好/,
	].some((pattern) => pattern.test(compact));
}

function isClosingBoilerplate(text) {
	const compact = compactSpeech(text);
	return [
		/感谢.*(收听|观看|大家)/,
		/(下期|下次).*(再见|见)/,
		/(拜拜|再见吧|咱们下期)/,
		/(今天|本期|这期|这一期|节目|内容).*(到这里|到这|就到这里|就到这)/,
		/(以上就是|全部内容)/,
	].some((pattern) => pattern.test(compact));
}

function cleanSegmentText(text, index) {
	const sentences = splitSpokenSentences(text);
	const cleaned = sentences
		.filter((sentence) => !isClosingBoilerplate(sentence))
		.filter((sentence) => index === 0 || !isRepeatedOpening(sentence))
		.join('');

	return cleaned.trim();
}

function boundedTargetSeconds(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 24;

	return Math.min(60, Math.max(8, Math.round(number)));
}

function buildPrompt({ pagesManifest, extraContext = '', podcastStyle = 'podcast_interview' }) {
	const pageBriefs = pagesManifest.pages.map((page) => [
		`页码：${page.pageNumber}`,
		`页面证据摘录：${compactSourceText(page.text, { maxChars: 1600 }) || '这一页文字较少，请只使用标题、视觉目的和上下文做谨慎解释。'}`,
	].join('\n')).join('\n\n');
	const hasExtraContext = String(extraContext || '').trim().length > 0;

	return [
		'你是中文科学播客策划、论文解读作者和严谨科普编辑。',
		'请遵循 pdf-research-podcast-script skill：整篇 PDF 生成一整集连续双人播客，PDF 页面只是视觉锚点，不是每页一段独立节目。',
		'生成前先内部梳理研究问题、证据链、关键结论、限制、听众价值，然后写成连续对话。不要输出内部推理。',
		hasExtraContext
			? '用户提供了观点/受众/角度，请把它作为整集叙事主线，并用 PDF 页面证据支持、限定或纠偏。'
			: '用户没有提供明确观点，请从 PDF 中提炼一个克制、可信、适合科普播客的主线。',
		'必须加入有用观点：为什么这个问题重要、数据应该怎么看、结论边界在哪里、普通听众或临床读者应该带走什么。',
		'严禁编造 PDF 页面或用户观点中没有的信息；“重磅”“顶级期刊”“新标杆”“改写临床实践”等强判断必须来自页面文本或用户补充观点，否则不要写。',
		'只有第一段可以自然开场，例如“今天咱们聊...”。后续 segment 不要重新开场，不要说“那我们开始吧”。',
		'任何 segment 都不要写感谢收听、下期再见、拜拜、本期到这里等结束语。',
		'页面切换规则：每个 segment 必须给出 pageNumber，表示这段音频播放时视频显示哪一页。',
		'返回严格 JSON，不要 Markdown，不要解释。',
		'JSON 字段必须是 title, summary, audience, thesis, pageAnchors, segments。',
		'pageAnchors 每一项必须包含 pageNumber, topic, visualRole。',
		'segments 每一项必须包含 role, text, pageNumber, evidenceRefs, targetSeconds。',
		'role 只能是 A 或 B；A 负责推进结构和解释，B 代表听众追问、确认价值或提出合理疑问。',
		'segments 必须是同一段连续录音中的相邻话轮，不是页面摘要列表。',
		'每页至少有一个 segment；总 segment 数量建议为页面数的 2 到 3 倍。',
		'风格：' + podcastStyle,
		'补充观点/受众：' + (extraContext || '无'),
		'逐页 PDF 证据：',
		pageBriefs,
	].join('\n');
}

function normalizeResearchScript(rawText, pagesManifest) {
	const parsed = JSON.parse(extractJsonObject(rawText));
	if (!Array.isArray(parsed.segments) || parsed.segments.length === 0) {
		throw new Error('Research podcast script must contain a non-empty segments array');
	}
	const validPages = new Set(pagesManifest.pages.map((page) => page.pageNumber));
	const pageAnchors = Array.isArray(parsed.pageAnchors) ? parsed.pageAnchors : pagesManifest.pages.map((page) => ({
		pageNumber: page.pageNumber,
		topic: `Page ${page.pageNumber}`,
		visualRole: 'visual anchor',
	}));

	const segments = parsed.segments.map((segment, index) => {
		const role = String(segment?.role || '').trim();
		if (!['A', 'B'].includes(role)) throw new Error(`Research segment ${index + 1} role must be A or B`);
		const pageNumber = Number(segment?.pageNumber);
		if (!validPages.has(pageNumber)) throw new Error(`Research segment ${index + 1} has invalid pageNumber: ${segment?.pageNumber}`);
		const text = cleanSegmentText(segment?.text, index);
		if (!text) throw new Error(`Research segment ${index + 1} text is empty`);

		return {
			role,
			text,
			pageNumber,
			evidenceRefs: Array.isArray(segment?.evidenceRefs)
				? segment.evidenceRefs.map((ref) => String(ref).trim()).filter(Boolean)
				: [],
			targetSeconds: boundedTargetSeconds(segment?.targetSeconds),
		};
	});
	for (const page of pagesManifest.pages) {
		if (!segments.some((segment) => segment.pageNumber === page.pageNumber)) {
			throw new Error(`Research podcast script must include at least one segment for page ${page.pageNumber}`);
		}
	}

	return {
		title: String(parsed.title || '').trim(),
		summary: String(parsed.summary || '').trim(),
		audience: String(parsed.audience || '').trim(),
		thesis: String(parsed.thesis || '').trim(),
		pageAnchors: pageAnchors.map((anchor) => {
			const pageNumber = Number(anchor?.pageNumber);
			if (!validPages.has(pageNumber)) throw new Error(`Invalid page anchor pageNumber: ${anchor?.pageNumber}`);

			return {
				pageNumber,
				topic: String(anchor?.topic || `Page ${pageNumber}`).trim(),
				visualRole: String(anchor?.visualRole || '').trim(),
			};
		}),
		segments,
	};
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
				temperature: Number(process.env.DOUBAO_LLM_TEMPERATURE || 0.5),
				max_output_tokens: 6000,
				thinking: { type: 'disabled' },
			}
		: {
				model,
				messages: [{ role: 'user', content: prompt }],
				temperature: Number(process.env.DOUBAO_LLM_TEMPERATURE || 0.5),
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
	if (!jobPath) throw new Error('Usage: node tools/video-composer/research-podcast-script-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const prompt = buildPrompt({
		pagesManifest,
		extraContext: job.extraContext,
		podcastStyle: job.podcastStyle,
	});
	fs.writeFileSync(job.llmPromptPath, prompt, 'utf8');
	const rawResponse = process.env.RESEARCH_PODCAST_SCRIPT_FIXTURE_RESPONSE
		? fs.readFileSync(process.env.RESEARCH_PODCAST_SCRIPT_FIXTURE_RESPONSE, 'utf8')
		: await callLlm(prompt);
	fs.writeFileSync(job.llmResponsePath, rawResponse, 'utf8');
	const script = normalizeResearchScript(rawResponse, pagesManifest);
	fs.writeFileSync(job.researchScriptPath, JSON.stringify(script, null, 2), 'utf8');
	console.log(JSON.stringify({
		ok: true,
		researchScriptPath: job.researchScriptPath,
		segmentCount: script.segments.length,
		pageCount: pagesManifest.pageCount,
	}));
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
