import { compactSourceText, extractJsonObject } from './presentation-utils.mjs';

const SUPPORTED_MODES = new Set(['single_speaker']);
const CLOSING_PATTERN = /感谢收听|下期再见|拜拜|本期到这里|今天的内容.*到这里/;
const OPENING_PATTERN = /今天(我们|咱们)?(来|要)?(聊|看|讲|解读)|欢迎(大家|收看)|那我们开始|我们先来/;

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
	const mode = String(parsed.mode || 'single_speaker').trim();
	if (!SUPPORTED_MODES.has(mode)) throw new Error(`Unsupported narration mode: ${mode}`);

	if (Array.isArray(parsed.segments)) {
		if (!Array.isArray(parsed.pageAnchors)) throw new Error('Science script must contain pageAnchors array');
		if (parsed.pageAnchors.length !== expectedPageCount) {
			throw new Error(`Science script must contain exactly ${expectedPageCount} page anchors`);
		}
		if (parsed.segments.length === 0) throw new Error('Science script must contain at least one segment');
		const pageAnchors = parsed.pageAnchors.map((anchor, index) => {
			const expectedNumber = index + 1;
			if (Number(anchor?.pageNumber) !== expectedNumber) {
				throw new Error(`Science script page anchor ${expectedNumber} must have pageNumber ${expectedNumber}`);
			}

			return {
				pageNumber: expectedNumber,
				topic: String(anchor?.topic || `第 ${expectedNumber} 页`).trim(),
				visualRole: String(anchor?.visualRole || '').trim(),
			};
		});
		let openingCount = 0;
		const segments = parsed.segments.map((segment, index) => {
			const pageNumber = Number(segment?.pageNumber);
			if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > expectedPageCount) {
				throw new Error(`Science script segment ${index + 1} has invalid pageNumber`);
			}
			const role = String(segment?.role || 'A').trim() || 'A';
			if (role !== 'A') throw new Error('Single-speaker science script only allows role A');
			const text = String(segment?.text || '').trim();
			if (!text) throw new Error(`Science script segment ${index + 1} text is required`);
			if (CLOSING_PATTERN.test(text) || (index > 0 && OPENING_PATTERN.test(text))) {
				throw new Error('Science script must not contain repeated openings or closing phrases');
			}
			if (OPENING_PATTERN.test(text)) openingCount += 1;
			if (openingCount > 1) {
				throw new Error('Science script must not contain repeated openings or closing phrases');
			}

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

		return {
			title: String(parsed.title || '').trim(),
			summary: String(parsed.summary || '').trim(),
			mode,
			thesis: String(parsed.thesis || '').trim(),
			audience: String(parsed.audience || '').trim(),
			deliveryStyle: String(parsed.deliveryStyle || 'news_science_explainer').trim(),
			pageAnchors,
			segments,
		};
	}

	if (!Array.isArray(parsed.pages)) throw new Error('Science script must contain pages array');
	if (parsed.pages.length !== expectedPageCount) {
		throw new Error(`Science script must contain exactly ${expectedPageCount} pages`);
	}

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

export function scienceScriptToPageScript(script) {
	const pageAnchors = Array.isArray(script?.pageAnchors) ? script.pageAnchors : [];
	const segments = Array.isArray(script?.segments) ? script.segments : [];
	const pages = pageAnchors.map((anchor) => {
		const pageNumber = Number(anchor.pageNumber);
		const pageSegments = segments.filter((segment) => Number(segment.pageNumber) === pageNumber);
		const [firstSegment, ...remainingSegments] = pageSegments;
		const speakerPrompt = String(firstSegment?.text || '').trim();
		if (!speakerPrompt) throw new Error(`Science script page ${pageNumber} has no TTS segment`);

		return {
			pageNumber,
			pageTitle: String(anchor.topic || `第 ${pageNumber} 页`).trim(),
			speakerPrompt,
			spokenSummary: remainingSegments.map((segment) => String(segment.text || '').trim()).filter(Boolean).join('\n'),
			targetSeconds: pageSegments.reduce((sum, segment) => sum + (Number(segment.targetSeconds) || 0), 0) || 35,
			visualNotes: String(anchor.visualRole || '').trim(),
		};
	});

	return {
		title: String(script?.title || '').trim(),
		summary: String(script?.summary || '').trim(),
		audience: String(script?.audience || '').trim(),
		mode: 'single_speaker',
		deliveryStyle: 'single_tts_science_explainer',
		thesis: String(script?.thesis || '').trim(),
		pages,
	};
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
		'你是中文最新科普文献的新闻联播式科普解说作者。',
		'这是单人 TTS 科普解说，不是博客，不是播客访谈。以最新科普文献为核心，先提炼研究问题、证据链、关键结论、限制和听众价值，再组织成整集连续解说。',
		hasViewpoint
			? '用户已经提供观点/看法。脚本可以围绕这个观点组织，但每个结论都必须被当前 PDF 页面文本或页面截图视觉信息约束，观点不能盖过文献证据。'
			: '用户没有提供明确观点。请从 PDF 页面中提炼一个克制、适合短视频的文献解读主线。',
		'不要把 PDF 逐字读出来。每页只选择 1 到 3 个最适合口播的重点。',
		'视觉理解只能描述页面可见的标题层级、重点框、图表、表格、示意图、标签或趋势。不要编造页面外数据和科学结论。',
		'如果页面证据不足，必须用“这一页只能说明”“还不能直接证明”“更像是在提示”等谨慎表达。',
		'表达风格要接近新闻联播式科普解说：正式、克制、短句、信息密度高，有文献解读感，不要播客式互动，不要博客式段落或个人感想。',
		'为提高字幕和音频时间轴对齐度，请把每个 segment 写成 1 到 2 个短句，不要写超长复句。',
		'所有页面只是同一个长视频的视觉锚点，不是彼此独立的小节目；整集脚本必须连续推进。',
		'只允许第一段自然开场，后续 segment 不要重新开场，不要重复说“今天我们要聊”“欢迎大家”“我们来看”。',
		'segments 不要写感谢收听、下期再见、拜拜、本期到这里等结束语；最后也只做观点收束。',
		'返回严格 JSON，不要 Markdown，不要解释。',
		'JSON 字段必须是 title, summary, mode, thesis, audience, deliveryStyle, pageAnchors, segments；不要输出 pages。',
		'pageAnchors 中每一项必须包含 pageNumber, topic, visualRole，页码必须从 1 连续到 PDF 页数。',
		'segments 中每一项必须包含 role, text, pageNumber, evidenceRefs, targetSeconds。',
		'所有 segment 的 role 都必须使用 A，写成同一个讲述者的单人 TTS 科普口播。',
		'targetSeconds 必须在 12 到 60 秒之间，按信息量分配；pageNumber 表示这段话讲到时画面显示哪一页。',
		`输出比例：${aspectRatio}`,
		`narration_mode：${narrationMode}`,
		`用户观点：${viewpoint || '无'}`,
		'逐页材料：',
		pageBriefs,
	].join('\n');
}
