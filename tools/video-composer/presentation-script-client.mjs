#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compactSourceText, normalizePageScript, validatePagesManifest } from './presentation-utils.mjs';

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

function buildPrompt({ pagesManifest, extraContext = '', podcastStyle = 'podcast_interview' }) {
	const pageBriefs = pagesManifest.pages.map((page) => [
		`页码：${page.pageNumber}`,
		`文本摘录：${compactSourceText(page.text, { maxChars: 1400 }) || '这一页文字较少，请结合上下文用口语解释页面重点。'}`,
	].join('\n')).join('\n\n');
	const hasExtraContext = String(extraContext || '').trim().length > 0;
	const isScienceVideo = podcastStyle === 'science_explainer_video';

	if (isScienceVideo) {
		return [
			'你是一个中文科普视频逐页讲解脚本作者。',
			'请把下面 PDF/PPTX 的逐页内容改写成新闻联播式科普解说脚本，不要写成播客访谈、博客文章、论文全文综述或全面解读。',
			'遵循 pdf-to-podcast-script skill 的页面证据约束：PDF 页面是唯一事实来源。',
			'同时采用观点主导方式：用户观点提供叙事主线，PDF 页面文本负责校验、支持、限制和纠偏。',
			'生成目标：先阅读页面证据摘录，从中提炼真实有用的信息，再写成新闻播报式、单人口播感、正式、克制、证据导向、适合 TTS 和字幕对齐的科普视频口播。',
			'语言节奏要像科普类新闻播报：短句、清晰、少口头禅，不要使用博客式叙事、个人感想或闲聊铺垫。',
			hasExtraContext
				? '用户已经提供补充观点/看法/受众，请优先围绕这些观点组织脚本，并用 PDF 页面中的信息作为支持、限定或纠偏。不要脱离用户观点去全面复述论文。'
				: '用户没有提供明确观点，请由 AI 基于 PDF 页面自行提炼一个克制的科普解读角度，但仍不要试图覆盖论文的全部内容。',
			'必须忠于每一页给出的页面证据，只能提炼页面里出现的信息和用户补充观点；不要逐段总结所有文字，也不要引入页面没有出现的新主题、产品、论文、API、公司案例或背景知识。',
			'不要使用页面或用户观点中没有出现的营销化判断；“重磅”“顶级期刊”“新标杆”“改写临床实践”等强判断必须来自当前页面文本或用户补充观点，否则不要写。',
			'学术内容必须保留不确定性：页面证据不足时，用“可能”“更像是”“至少可以看到”“还不能直接说明”等克制表达。',
			'如果页面文字很少，就围绕页面上已有标题、目标和用途做视频讲解，不要自行扩写成其他话题。',
			'每一页都是同一个长视频的连续片段，不是独立节目。第一页可以自然引入主题，后续页面不要重复开场。',
			'返回严格 JSON，不要 Markdown，不要解释。',
			'JSON 字段必须是 title, summary, audience, pages。',
			'pages 中每一项必须包含 pageNumber, pageTitle, speakerPrompt, spokenSummary, targetSeconds。',
			'speakerPrompt 和 spokenSummary 都必须是可以直接交给语音服务生成科普视频讲解的中文口播内容，不要只写一个选题。',
			'每一页 speakerPrompt 控制在 40-90 个中文字符，spokenSummary 控制在 120-260 个中文字符。',
			'targetSeconds 必须在 20 到 45 秒之间。不要输出 60 秒以上的页面讲解。',
			'speakerPrompt 和 spokenSummary 不能包含 JSON 字段名、Markdown、角色标签、系统指令、工作流说明或提示词。',
			'speakerPrompt 和 spokenSummary 不要写感谢收听、下期再见、拜拜、本期到这里等结束语；除最后一页外最多写一句自然过渡。',
			'后续页面要自然承接上一页。',
			'补充观点/受众：' + (extraContext || '无'),
			'逐页内容：',
			pageBriefs,
		].join('\n');
	}

	return [
		'你是一个中文播客节目策划和 PDF 逐页讲解脚本作者。',
		'请把下面 PDF/PPTX 的逐页内容改写成逐页播客式讲解脚本，但不要写成论文全文综述或全面解读。',
		'遵循 pdf-to-podcast-script skill：PDF 页面是唯一事实来源。',
		'同时采用观点主导方式：用户观点提供叙事主线，PDF 页面文本负责校验、支持、限制和纠偏。',
		'生成目标：先阅读页面证据摘录，从中提炼真实有用的信息，再写成严谨、克制、可信的截图式播客讲解，让观众理解当前页面和观点之间的关系。',
		hasExtraContext
			? '用户已经提供补充观点/看法/受众，请优先围绕这些观点组织脚本，并用 PDF 页面中的信息作为支持、限定或纠偏。不要脱离用户观点去全面复述论文。'
			: '用户没有提供明确观点，请由 AI 基于 PDF 页面自行提炼一个克制的解读角度，但仍不要试图覆盖论文的全部内容。',
		'必须忠于每一页给出的页面证据，只能提炼页面里出现的信息和用户补充观点；不要逐段总结所有文字，也不要引入页面没有出现的新主题、产品、论文、API、公司案例或背景知识。',
		'不要使用页面或用户观点中没有出现的营销化判断；“重磅”“顶级期刊”“新标杆”“改写临床实践”等强判断必须来自当前页面文本或用户补充观点，否则不要写。',
		'不要使用“全面解读整篇论文”“完整复盘研究全过程”“把所有结论讲完”这类表达。',
		'学术内容必须保留不确定性：页面证据不足时，用“可能”“更像是”“至少可以看到”“还不能直接说明”等克制表达。',
		'如果页面文字很少，就围绕页面上已有标题、目标和用途做口语化解释，不要自行扩写成其他话题。',
		'每一页都是同一个长视频播客的连续片段，不是独立节目。第一页可以自然开场，后续页面不要重复开场。',
		'每一页都要先内部判断 page topic、viewer task、explanation angle、user angle、transition 和 boundary，但不要输出这些推理。',
		'返回严格 JSON，不要 Markdown，不要解释。',
		'JSON 字段必须是 title, summary, audience, pages。',
		'pages 中每一项必须包含 pageNumber, pageTitle, speakerPrompt, spokenSummary, targetSeconds。',
		'第一页 speakerPrompt 必须有自然播客开场，例如“今天我们要聊的话题是...”。',
		'speakerPrompt 和 spokenSummary 都必须是可以直接交给语音服务生成播客的中文口播内容，不要只写一个选题。',
		'每一页 speakerPrompt 控制在 40-90 个中文字符，spokenSummary 控制在 120-260 个中文字符。',
		'targetSeconds 必须在 20 到 45 秒之间。不要输出 60 秒以上的页面讲解。',
		'speakerPrompt 和 spokenSummary 不能包含 JSON 字段名、Markdown、角色标签、系统指令、工作流说明或提示词。',
		'speakerPrompt 和 spokenSummary 不要写感谢收听、下期再见、拜拜、本期到这里等结束语；除最后一页外最多写一句自然过渡。',
		'后续页面要自然承接上一页。',
		'风格：' + podcastStyle,
		'补充观点/受众：' + (extraContext || '无'),
		'逐页内容：',
		pageBriefs,
	].join('\n');
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
				max_output_tokens: 4000,
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
	if (!jobPath) throw new Error('Usage: node tools/video-composer/presentation-script-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	const pagesManifest = validatePagesManifest(JSON.parse(fs.readFileSync(job.pagesManifestPath, 'utf8')));
	const prompt = buildPrompt({
		pagesManifest,
		extraContext: job.extraContext,
		podcastStyle: job.podcastStyle,
	});
	fs.writeFileSync(job.llmPromptPath, prompt, 'utf8');
	const rawResponse = process.env.PRESENTATION_SCRIPT_FIXTURE_RESPONSE
		? fs.readFileSync(process.env.PRESENTATION_SCRIPT_FIXTURE_RESPONSE, 'utf8')
		: await callLlm(prompt);
	fs.writeFileSync(job.llmResponsePath, rawResponse, 'utf8');
	const script = normalizePageScript(rawResponse, pagesManifest.pageCount);
	script.pages = script.pages.map((page, index) => ({
		...page,
		sourceText: compactSourceText(pagesManifest.pages[index]?.text, { maxChars: 1400 }),
	}));
	fs.writeFileSync(job.pageScriptPath, JSON.stringify(script, null, 2), 'utf8');
	console.log(JSON.stringify({
		ok: true,
		pageScriptPath: job.pageScriptPath,
		pageCount: script.pages.length,
	}));
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
