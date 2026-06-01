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
