export function safePageName(pageNumber) {
	const number = Number(pageNumber);
	if (!Number.isInteger(number) || number <= 0) throw new Error(`Invalid page number: ${pageNumber}`);

	return `page-${String(number).padStart(3, '0')}`;
}

export function validatePagesManifest(raw) {
	if (!raw || typeof raw !== 'object') throw new Error('pages.json must be an object');
	if (!['pdf', 'pptx'].includes(raw.sourceType)) {
		throw new Error(`Unsupported sourceType: ${raw.sourceType || '(empty)'}`);
	}
	const pageCount = Number(raw.pageCount);
	if (!Number.isInteger(pageCount) || pageCount <= 0) {
		throw new Error('pages.json pageCount must be a positive integer');
	}
	if (!Array.isArray(raw.pages) || raw.pages.length !== pageCount) {
		throw new Error(`pages.json must contain exactly ${pageCount} pages`);
	}

	return {
		sourceType: raw.sourceType,
		pageCount,
		pages: raw.pages.map((page, index) => {
			const expectedNumber = index + 1;
			const pageNumber = Number(page?.pageNumber);
			if (pageNumber !== expectedNumber) {
				throw new Error(`Page ${expectedNumber} must have pageNumber ${expectedNumber}`);
			}
			const imagePath = String(page?.imagePath || '').trim();
			const textPath = String(page?.textPath || '').trim();
			if (!imagePath) throw new Error(`Page ${expectedNumber} imagePath is required`);
			if (!textPath) throw new Error(`Page ${expectedNumber} textPath is required`);
			const text = String(page?.text || '').trim();

			return {
				pageNumber,
				imagePath,
				textPath,
				text,
				isTextSparse: Boolean(page?.isTextSparse ?? text.length < 20),
			};
		}),
	};
}

export function extractJsonObject(text) {
	const raw = String(text ?? '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
	const start = raw.indexOf('{');
	if (start === -1) throw new Error('LLM response did not contain a JSON object');

	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < raw.length; index += 1) {
		const char = raw[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === '\\') escaped = true;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') inString = true;
		else if (char === '{') depth += 1;
		else if (char === '}') {
			depth -= 1;
			if (depth === 0) return raw.slice(start, index + 1);
		}
	}

	throw new Error('LLM response contained an incomplete JSON object');
}

export function compactSourceText(text, { maxChars = 1600 } = {}) {
	const normalized = String(text || '')
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	const limit = Number(maxChars);
	if (!normalized || !Number.isFinite(limit) || limit <= 0 || normalized.length <= limit) {
		return normalized;
	}

	const headLength = Math.max(200, Math.floor(limit * 0.7));
	const tailLength = Math.max(120, limit - headLength);
	const head = normalized.slice(0, headLength).trimEnd();
	const tail = normalized.slice(-tailLength).trimStart();

	return `${head}\n\n[中间内容已省略，脚本只应基于当前摘录和页面可见信息做克制讲解。]\n\n${tail}`;
}

function boundedTargetSeconds(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return 30;

	return Math.min(45, Math.max(12, Math.round(number)));
}

export function normalizePageScript(rawText, expectedPageCount) {
	const parsed = JSON.parse(extractJsonObject(rawText));
	if (!Array.isArray(parsed.pages)) throw new Error('Page script must contain pages array');
	if (parsed.pages.length !== expectedPageCount) {
		throw new Error(`Page script must contain exactly ${expectedPageCount} pages`);
	}

	return {
		title: String(parsed.title || '').trim(),
		summary: String(parsed.summary || '').trim(),
		audience: String(parsed.audience || '').trim(),
		pages: parsed.pages.map((page, index) => {
			const expectedNumber = index + 1;
			if (Number(page?.pageNumber) !== expectedNumber) {
				throw new Error(`Script page ${expectedNumber} must have pageNumber ${expectedNumber}`);
			}
			const speakerPrompt = String(page?.speakerPrompt || '').trim();
			if (!speakerPrompt) throw new Error(`Script page ${expectedNumber} speakerPrompt is required`);

			return {
				pageNumber: expectedNumber,
				pageTitle: String(page?.pageTitle || `Page ${expectedNumber}`).trim(),
				speakerPrompt,
				spokenSummary: String(page?.spokenSummary || '').trim(),
				targetSeconds: boundedTargetSeconds(page?.targetSeconds),
			};
		}),
	};
}

export function cleanSpokenTranscript(text) {
	const raw = String(text || '').trim();
	if (!raw) return '';
	try {
		const parsed = JSON.parse(extractJsonObject(raw));
		const value = parsed.text ?? parsed.transcript ?? parsed.spokenSummary;
		if (typeof value === 'string') return value.trim();
	} catch {}

	return raw
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.replace(/^speakerPrompt[:：].*$/gim, '')
		.replace(/^system[:：].*$/gim, '')
		.replace(/^prompt[:：].*$/gim, '')
		.trim();
}

export function offsetSubtitleEvents(events, offsetSeconds) {
	const offset = Number(offsetSeconds) || 0;

	return (Array.isArray(events) ? events : [])
		.map((event) => ({
			text: cleanSpokenTranscript(event?.text),
			start: Number(event?.start) + offset,
			end: Number(event?.end) + offset,
		}))
		.filter((event) => (
			event.text &&
			Number.isFinite(event.start) &&
			Number.isFinite(event.end) &&
			event.end > event.start
		));
}

export function buildPageTiming({ pages, audio, pagePauseSeconds = 0.3 }) {
	const audioByPage = new Map(audio.map((entry) => [Number(entry.pageNumber), entry]));
	const pause = Math.max(0, Number(pagePauseSeconds) || 0);
	let cursor = 0;
	const subtitles = [];
	const timedPages = pages.map((page, index) => {
		const pageNumber = Number(page.pageNumber);
		const item = audioByPage.get(pageNumber);
		if (!item) throw new Error(`Missing audio timing for page ${pageNumber}`);
		const duration = Number(item.duration);
		if (!Number.isFinite(duration) || duration <= 0) {
			throw new Error(`Invalid audio duration for page ${pageNumber}`);
		}

		const start = cursor;
		const end = start + duration;
		const pageSubtitles = offsetSubtitleEvents(item.subtitleEvents, start);
		subtitles.push(...pageSubtitles);
		cursor = end + (index === pages.length - 1 ? 0 : pause);

		return {
			pageNumber,
			pageImage: page.imagePath,
			audioPath: item.audioPath,
			start,
			end,
			duration,
			transcript: cleanSpokenTranscript(item.transcript),
			subtitleEvents: pageSubtitles,
		};
	});

	return {
		pagePauseSeconds: pause,
		totalDuration: Number(cursor.toFixed(3)),
		pages: timedPages,
		subtitles,
	};
}

export function aggregatePresentationCost({
	jobId,
	pageCosts = [],
	llmUsage = null,
	pageCount = 0,
	totalAudioDuration = 0,
}) {
	let totalTokens = 0;
	let totalEstimatedCostCny = 0;
	for (const cost of pageCosts) {
		totalTokens += Number(cost?.aiPodcast?.totalTokens || cost?.aiPodcast?.total_tokens || 0);
		totalEstimatedCostCny += Number(cost?.aiPodcast?.estimatedCostCny || 0);
	}

	return {
		jobId,
		pageCount,
		totalAudioDuration,
		llm: llmUsage || { usageUnavailable: true },
		pageCosts,
		totalTokens,
		totalEstimatedCostCny: Number(totalEstimatedCostCny.toFixed(6)),
	};
}
