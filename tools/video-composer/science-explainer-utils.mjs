import { compactSourceText, extractJsonObject } from './presentation-utils.mjs';

const SUPPORTED_MODES = new Set(['single_speaker', 'two_speaker']);

function boundedTargetSeconds(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 35;

	return Math.min(60, Math.max(12, Math.round(number)));
}

export function normalizeVisualAnalysis(rawText, expectedPageCount) {
	const parsed = JSON.parse(extractJsonObject(rawText));
	if (!Array.isArray(parsed.pages)) throw new Error('Visual analysis must contain pages array');
	if (parsed.pages.length !== expectedPageCount) {
		throw new Error(`Visual analysis must contain exactly ${expectedPageCount} pages`);
	}

	return {
		pages: parsed.pages.map((page, index) => {
			const expectedNumber = index + 1;
			if (Number(page?.pageNumber) !== expectedNumber) {
				throw new Error(`Visual analysis page ${expectedNumber} must have pageNumber ${expectedNumber}`);
			}

			return {
				pageNumber: expectedNumber,
				visualNotes: String(page?.visualNotes || '').trim(),
				layoutNotes: String(page?.layoutNotes || '').trim(),
				evidenceNotes: String(page?.evidenceNotes || '').trim(),
				uncertaintyNotes: String(page?.uncertaintyNotes || '').trim(),
			};
		}),
	};
}

export function normalizeScienceScript(rawText, expectedPageCount) {
	const parsed = JSON.parse(extractJsonObject(rawText));
	if (!Array.isArray(parsed.pages)) throw new Error('Science script must contain pages array');
	if (parsed.pages.length !== expectedPageCount) {
		throw new Error(`Science script must contain exactly ${expectedPageCount} pages`);
	}

	const mode = String(parsed.mode || 'single_speaker').trim();
	if (!SUPPORTED_MODES.has(mode)) throw new Error(`Unsupported narration mode: ${mode}`);

	return {
		title: String(parsed.title || '').trim(),
		summary: String(parsed.summary || '').trim(),
		mode,
		pages: parsed.pages.map((page, index) => {
			const expectedNumber = index + 1;
			if (Number(page?.pageNumber) !== expectedNumber) {
				throw new Error(`Science script page ${expectedNumber} must have pageNumber ${expectedNumber}`);
			}
			const speakerPrompt = String(page?.speakerPrompt || '').trim();
			if (!speakerPrompt) throw new Error(`Science script page ${expectedNumber} speakerPrompt is required`);

			return {
				pageNumber: expectedNumber,
				pageTitle: String(page?.pageTitle || `Page ${expectedNumber}`).trim(),
				visualNotes: String(page?.visualNotes || '').trim(),
				evidenceNotes: String(page?.evidenceNotes || '').trim(),
				speakerPrompt,
				spokenSummary: String(page?.spokenSummary || speakerPrompt).trim(),
				targetSeconds: boundedTargetSeconds(page?.targetSeconds),
			};
		}),
	};
}

export function buildSciencePromptPageBriefs({ pages, analysisPages }) {
	const analysisByPage = new Map(analysisPages.map((page) => [Number(page.pageNumber), page]));

	return pages.map((page) => {
		const analysis = analysisByPage.get(Number(page.pageNumber)) || {};

		return [
			`页码：${page.pageNumber}`,
			`文本摘录：${compactSourceText(page.text, { maxChars: 1400 }) || '这一页文字较少，请结合页面截图和上下文谨慎讲解。'}`,
			`视觉信息：${analysis.visualNotes || '无额外视觉信息。'}`,
			`版式结构：${analysis.layoutNotes || '无额外版式信息。'}`,
			`证据限制：${analysis.evidenceNotes || '仅能依据页面文本和截图做克制表达。'}`,
			`不确定性：${analysis.uncertaintyNotes || '不要补充页面外结论。'}`,
		].join('\n');
	}).join('\n\n');
}

export function buildScienceExplainerPrompt({
	pagesManifest,
	visualAnalysis,
	viewpoint = '',
	narrationMode = 'single_speaker',
	aspectRatio = '9:16',
}) {
	const pageBriefs = buildSciencePromptPageBriefs({
		pages: pagesManifest.pages,
		analysisPages: visualAnalysis.pages,
	});
	const hasViewpoint = String(viewpoint || '').trim().length > 0;

	return [
		'你是中文科普短视频脚本作者。',
		'请遵循 pdf-science-explainer-script skill：观点主导，PDF 文本和页面截图视觉信息负责校验、支持、限制和纠偏。',
		hasViewpoint
			? '用户已经提供观点/看法。脚本要围绕这个观点组织，但每个结论都必须被当前 PDF 页面文本或页面截图视觉信息约束。'
			: '用户没有提供明确观点。请从 PDF 页面中提炼一个克制、适合短视频的科普主线。',
		'不要把 PDF 逐字读出来。每页只选择 1 到 3 个最适合口播的重点。',
		'视觉理解只能描述页面可见的标题层级、重点框、图表、表格、示意图、标签或趋势。不要编造页面外数据和科学结论。',
		'如果页面证据不足，必须用“这一页只能说明”“还不能直接证明”“更像是在提示”等谨慎表达。',
		'所有页面是同一个长视频中的连续页面，不是彼此独立的小节目。',
		'第一页可以自然开场，后续页面不要重新开场，不要重复说“今天我们要聊”“欢迎大家”。',
		'speakerPrompt 和 spokenSummary 都不要写感谢收听、下期再见、拜拜、本期到这里等结束语；除最后一页外只做自然过渡。',
		'返回严格 JSON，不要 Markdown，不要解释。',
		'JSON 字段必须是 title, summary, mode, pages。',
		'pages 中每一项必须包含 pageNumber, pageTitle, visualNotes, evidenceNotes, speakerPrompt, spokenSummary, targetSeconds。',
		'narration_mode 为 single_speaker 时，speakerPrompt 写成单人口播，不要角色标签。',
		'narration_mode 为 two_speaker 时，speakerPrompt 可以写成短问答，但必须保持短视频节奏。',
		'targetSeconds 必须在 12 到 60 秒之间。',
		`输出比例：${aspectRatio}`,
		`narration_mode：${narrationMode}`,
		`用户观点：${viewpoint || '无'}`,
		'逐页材料：',
		pageBriefs,
	].join('\n');
}
