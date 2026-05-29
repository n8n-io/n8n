import { TextDecoder } from 'node:util';
import { gunzipSync } from 'node:zlib';

const decoder = new TextDecoder();
const PODCAST_HEADER = Buffer.from([0x11, 0x14, 0x10, 0x00]);

export function buildEnvConfig(env = process.env) {
	const config = {
		url: env.DOUBAO_AI_PODCAST_URL || 'wss://openspeech.bytedance.com/api/v3/sami/podcasttts',
		apiKey: env.DOUBAO_AI_PODCAST_API_KEY || '',
		appId: env.DOUBAO_AI_PODCAST_APP_ID || '2152902662',
		appKey: env.DOUBAO_AI_PODCAST_APP_KEY || 'aGjiRDfUWi',
		accessKey: env.DOUBAO_AI_PODCAST_ACCESS_KEY || '',
		resourceId: env.DOUBAO_AI_PODCAST_RESOURCE_ID || 'volc.service_type.10050',
		speakerA: env.DOUBAO_AI_PODCAST_SPEAKER_A || 'zh_male_dayi_v2_saturn_bigtts',
		speakerB: env.DOUBAO_AI_PODCAST_SPEAKER_B || 'zh_female_mizai_v2_saturn_bigtts',
		subtitleFallback: env.VIDEO_CLIP_SUBTITLE_FALLBACK || 'estimated',
	};

	if (!config.apiKey && !(config.appId && config.accessKey)) {
		throw new Error(
			'Missing required AI podcast credential: set DOUBAO_AI_PODCAST_API_KEY for the new console, or DOUBAO_AI_PODCAST_APP_ID plus DOUBAO_AI_PODCAST_ACCESS_KEY for the old console.',
		);
	}

	return config;
}

export function buildAiPodcastRequest({
	jobId,
	inputText,
	speakerA,
	speakerB,
	useHeadMusic = false,
}) {
	return {
		input_id: String(jobId),
		input_text: String(inputText || '').trim(),
		action: 0,
		use_head_music: Boolean(useHeadMusic),
		audio_config: {
			format: 'mp3',
			sample_rate: 24000,
			speech_rate: 0,
		},
		speaker_info: {
			random_order: false,
			speakers: [speakerA, speakerB],
		},
	};
}

function encodeEventFrame({ eventType, payload = {}, sessionId = '' }) {
	const body = Buffer.from(JSON.stringify(payload));
	const event = Buffer.alloc(4);
	event.writeUInt32BE(eventType);
	const bodySize = Buffer.alloc(4);
	bodySize.writeUInt32BE(body.length);

	if (sessionId) {
		const sid = Buffer.from(sessionId);
		const sidSize = Buffer.alloc(4);
		sidSize.writeUInt32BE(sid.length);

		return Buffer.concat([PODCAST_HEADER, event, sidSize, sid, bodySize, body]);
	}

	return Buffer.concat([PODCAST_HEADER, event, bodySize, body]);
}

export function encodeStartConnectionFrame() {
	return encodeEventFrame({ eventType: 1, payload: {} });
}

export function encodeFinishConnectionFrame() {
	return encodeEventFrame({ eventType: 2, payload: {} });
}

export function encodePodcastRequestFrame(payload, sessionId = '') {
	return encodeEventFrame({ eventType: 100, payload, sessionId });
}

export function decodeJsonFrame(frame) {
	try {
		const text = typeof frame === 'string' ? frame : decoder.decode(frame);
		const start = text.indexOf('{');
		const end = text.lastIndexOf('}');
		if (start < 0 || end < start) return null;

		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
}

function readSizePrefixedPayload(buffer, offset) {
	if (buffer.length - offset < 4) return buffer.subarray(offset);
	const declaredSize = buffer.readUInt32BE(offset);
	const start = offset + 4;
	if (declaredSize >= 0 && start + declaredSize <= buffer.length) {
		return buffer.subarray(start, start + declaredSize);
	}

	return buffer.subarray(offset);
}

function decodePodcastEventPayload(frame, eventType, offset, serialization, compression) {
	let sessionId = '';
	let payloadOffset = offset;

	if (frame.length - payloadOffset >= 4) {
		const firstSize = frame.readUInt32BE(payloadOffset);
		const firstBodyStart = payloadOffset + 4;
		const firstBodyEnd = firstBodyStart + firstSize;
		const looksLikeDirectPayload = firstBodyEnd <= frame.length
			&& (eventType === 1 || (serialization === 1 && frame[firstBodyStart] === 0x7b));

		if (!looksLikeDirectPayload && firstBodyEnd <= frame.length && frame.length - firstBodyEnd >= 4) {
			sessionId = frame.subarray(firstBodyStart, firstBodyEnd).toString();
			payloadOffset = firstBodyEnd;
		}
	}

	let payload = readSizePrefixedPayload(frame, payloadOffset);
	if (compression === 1 && payload.length > 0) payload = gunzipSync(payload);

	if (serialization === 1) {
		const json = decodeJsonFrame(payload) ?? {};
		return { eventType, sessionId, json };
	}

	return payload.length > 0 ? { eventType, sessionId, audio: payload } : { eventType, sessionId };
}

export function decodePodcastFrame(frame) {
	if (!Buffer.isBuffer(frame)) {
		const json = decodeJsonFrame(frame);
		return json ? { json } : null;
	}
	if (frame.length < 4) return null;

	const headerSize = (frame[0] & 0x0f) * 4 || 4;
	const messageType = (frame[1] >> 4) & 0x0f;
	const flags = frame[1] & 0x0f;
	const serialization = (frame[2] >> 4) & 0x0f;
	const compression = frame[2] & 0x0f;
	let offset = Math.min(headerSize, frame.length);

	if ((flags & 0x04) && frame.length - offset >= 4) {
		const eventType = frame.readUInt32BE(offset);
		if (eventType > 0 && eventType < 10000) {
			return decodePodcastEventPayload(frame, eventType, offset + 4, serialization, compression);
		}
	}

	if (flags & 0x04) {
		if (frame.length - offset < 4) return null;
		const sessionIdSize = frame.readUInt32BE(offset);
		offset += 4 + sessionIdSize;
		if (offset > frame.length) return null;
	}

	let payload = readSizePrefixedPayload(frame, offset);
	if (compression === 1 && payload.length > 0) payload = gunzipSync(payload);
	if (messageType === 0x0f) {
		const error = decodeJsonFrame(payload) ?? { message: decoder.decode(payload) };
		return { error };
	}
	if (serialization === 1) {
		const json = decodeJsonFrame(payload);
		return json ? { json } : null;
	}

	return payload.length > 0 ? { audio: payload } : null;
}

function pickAudioBase64(frame) {
	if (Buffer.isBuffer(frame?.binaryAudio)) return frame.binaryAudio;
	for (const value of [
		frame?.audio,
		frame?.data,
		frame?.data?.audio,
		frame?.result?.audio,
		frame?.result?.data,
	]) {
		if (typeof value === 'string' && value.trim()) return value.trim();
	}

	return '';
}

export function extractAudioChunks(frames) {
	return frames
		.map(pickAudioBase64)
		.filter(Boolean)
		.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'base64')));
}

function normalizeTokenCount(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : 0;
}

export function summarizePodcastUsage(frames) {
	const summary = {
		inputTextTokens: 0,
		outputAudioTokens: 0,
		totalTokens: 0,
		usageFrameCount: 0,
	};

	for (const frame of Array.isArray(frames) ? frames : []) {
		const usage = frame?.usage ?? frame?.data?.usage ?? frame?.result?.usage;
		if (!usage) continue;
		summary.inputTextTokens += normalizeTokenCount(usage.input_text_tokens ?? usage.inputTextTokens);
		summary.outputAudioTokens += normalizeTokenCount(usage.output_audio_tokens ?? usage.outputAudioTokens);
		summary.totalTokens += normalizeTokenCount(usage.total_tokens ?? usage.totalTokens);
		summary.usageFrameCount += 1;
	}

	if (summary.totalTokens === 0) {
		summary.totalTokens = summary.inputTextTokens + summary.outputAudioTokens;
	}

	return summary;
}

export function estimatePodcastCost(usage, unitPricePerMillionTokens = 70) {
	const totalTokens = normalizeTokenCount(usage?.totalTokens);
	const price = normalizeTokenCount(unitPricePerMillionTokens);

	return {
		currency: 'CNY',
		unitPricePerMillionTokens: price,
		inputTextTokens: normalizeTokenCount(usage?.inputTextTokens),
		outputAudioTokens: normalizeTokenCount(usage?.outputAudioTokens),
		totalTokens,
		usageFrameCount: normalizeTokenCount(usage?.usageFrameCount),
		estimatedCostCny: Number(((totalTokens / 1_000_000) * price).toFixed(6)),
	};
}

function normalizeNumberTimestamp(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	return number > 100 ? number / 1000 : number;
}

function normalizeWord(raw) {
	const text = raw?.word ?? raw?.text ?? raw?.token ?? raw?.content;
	const start = raw?.startTime ?? raw?.start_time ?? raw?.start ?? raw?.beginTime ?? raw?.begin_time;
	const end = raw?.endTime ?? raw?.end_time ?? raw?.end ?? raw?.stopTime ?? raw?.stop_time;
	const startTime = normalizeNumberTimestamp(start);
	const endTime = normalizeNumberTimestamp(end);
	if (!text || startTime === null || endTime === null || endTime <= startTime) return null;

	return {
		word: String(text),
		startTime,
		endTime,
	};
}

export function normalizeNativeTiming(frames) {
	const normalizedFrames = [];
	for (const frame of Array.isArray(frames) ? frames : []) {
		const sentence = frame?.sentence ?? frame?.data?.sentence ?? frame?.result?.sentence ?? frame;
		const words = [sentence?.words, sentence?.word_timestamps, sentence?.timestamps]
			.find(Array.isArray);
		if (!words) continue;
		const normalizedWords = words.map(normalizeWord).filter(Boolean);
		if (normalizedWords.length > 0) {
			normalizedFrames.push({ sentence: { words: normalizedWords } });
		}
	}

	return {
		source: 'podcast_native',
		frames: normalizedFrames,
	};
}

function pickRoundTextFrame(frame) {
	const roundId = frame?.round_id ?? frame?.roundId;
	const text = typeof frame?.text === 'string' ? frame.text.trim() : '';
	if (!text || roundId === undefined || roundId === null) return null;

	return {
		roundId,
		speaker: String(frame?.speaker ?? ''),
		text,
	};
}

function pickRoundTimeFrame(frame) {
	const start = normalizeNumberTimestamp(frame?.start_time ?? frame?.startTime);
	const end = normalizeNumberTimestamp(frame?.end_time ?? frame?.endTime);
	const duration = normalizeNumberTimestamp(frame?.audio_duration ?? frame?.audioDuration);
	if (start === null || end === null || end <= start) return null;

	return { start, end, duration: duration ?? end - start };
}

function distributeTextAcrossTime(text, start, end) {
	const chunks = splitTextIntoSubtitleChunks(text);
	const duration = end - start;
	if (chunks.length === 0 || duration <= 0) return [];
	const weights = chunks.map((chunk) => Math.max(1, chunk.length));
	const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
	let cursor = start;

	return chunks.map((chunk, index) => {
		const isLast = index === chunks.length - 1;
		const span = isLast ? end - cursor : duration * (weights[index] / totalWeight);
		const subtitle = {
			text: chunk,
			start: cursor,
			end: Math.min(end, cursor + Math.max(0.6, span)),
		};
		cursor = subtitle.end;

		return subtitle;
	}).filter((subtitle) => subtitle.end > subtitle.start);
}

export function normalizePodcastRoundTiming(frames) {
	const rounds = [];
	const pendingRounds = [];
	for (const frame of Array.isArray(frames) ? frames : []) {
		const round = pickRoundTextFrame(frame);
		if (round) {
			pendingRounds.push(round);
			continue;
		}

		const time = pickRoundTimeFrame(frame);
		if (!time || pendingRounds.length === 0) continue;
		const nextRound = pendingRounds.shift();
		rounds.push({ ...nextRound, ...time });
	}

	return {
		source: 'podcast_round_native',
		rounds,
		subtitles: rounds.flatMap((round) => (
			distributeTextAcrossTime(round.text, round.start, round.end)
		)),
	};
}

export function extractPodcastTranscript(frames) {
	return (Array.isArray(frames) ? frames : [])
		.map(pickRoundTextFrame)
		.filter(Boolean)
		.map((round) => round.text)
		.join('\n');
}

function splitTextIntoSubtitleChunks(text, maxChars = 24) {
	const normalized = String(text || '')
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{2,}/g, '\n')
		.trim();
	if (!normalized) return [];

	const parts = normalized
		.split(/(?<=[。！？!?；;：:\n])/u)
		.map((part) => part.trim())
		.filter(Boolean);
	const chunks = [];
	for (const part of parts.length > 0 ? parts : [normalized]) {
		if (part.length <= maxChars) {
			chunks.push(part);
			continue;
		}
		for (let index = 0; index < part.length; index += maxChars) {
			chunks.push(part.slice(index, index + maxChars));
		}
	}

	return chunks;
}

export function estimateSubtitleTimingFromText(text, audioDuration) {
	const duration = Number(audioDuration);
	const chunks = splitTextIntoSubtitleChunks(text);
	if (!Number.isFinite(duration) || duration <= 0 || chunks.length === 0) {
		return { source: 'podcast_estimated', subtitles: [] };
	}

	const weights = chunks.map((chunk) => Math.max(1, chunk.length));
	const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
	let cursor = 0;
	const subtitles = chunks.map((chunk, index) => {
		const isLast = index === chunks.length - 1;
		const span = isLast ? duration - cursor : duration * (weights[index] / totalWeight);
		const start = cursor;
		const end = Math.min(duration, cursor + Math.max(1, span));
		cursor = end;

		return { text: chunk, start, end };
	}).filter((subtitle) => subtitle.end > subtitle.start);

	return { source: 'podcast_estimated', subtitles };
}

export function requireSubtitleTiming(timing, {
	fallback = 'estimated',
	inputText = '',
	audioDuration = 0,
	roundTiming = null,
} = {}) {
	if (Array.isArray(timing?.frames) && timing.frames.length > 0) return timing;
	if (Array.isArray(roundTiming?.subtitles) && roundTiming.subtitles.length > 0) return roundTiming;
	if (fallback && fallback !== 'none') {
		const estimated = estimateSubtitleTimingFromText(inputText, audioDuration);
		if (estimated.subtitles.length > 0) return estimated;
	}

	throw new Error(
		'AI podcast service did not return usable timestamps and no subtitle alignment fallback is configured.',
	);
}
