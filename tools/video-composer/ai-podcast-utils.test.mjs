import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildAiPodcastRequest,
	buildEnvConfig,
	decodeJsonFrame,
	decodePodcastFrame,
	encodeFinishConnectionFrame,
	encodePodcastRequestFrame,
	encodeStartConnectionFrame,
	estimateSubtitleTimingFromText,
	estimatePodcastCost,
	extractAudioChunks,
	extractPodcastTranscript,
	normalizeNativeTiming,
	normalizePodcastRoundTiming,
	requireSubtitleTiming,
	summarizePodcastUsage,
} from './ai-podcast-utils.mjs';

test('buildEnvConfig defaults to podcast speech resource', () => {
	const config = buildEnvConfig({
		DOUBAO_AI_PODCAST_API_KEY: 'key',
	});

	assert.equal(config.url, 'wss://openspeech.bytedance.com/api/v3/sami/podcasttts');
	assert.equal(config.appId, '2152902662');
	assert.equal(config.resourceId, 'volc.service_type.10050');
	assert.equal(config.apiKey, 'key');
	assert.equal(config.appKey, 'aGjiRDfUWi');
	assert.equal(config.accessKey, '');
});

test('buildEnvConfig rejects missing required credentials', () => {
	assert.throws(
		() => buildEnvConfig({}),
		/Missing required AI podcast credential/,
	);
});

test('buildEnvConfig accepts old AppID and AccessKey credentials', () => {
	const config = buildEnvConfig({
		DOUBAO_AI_PODCAST_APP_ID: '2152902662',
		DOUBAO_AI_PODCAST_ACCESS_KEY: 'access-key',
	});

	assert.equal(config.apiKey, '');
	assert.equal(config.appId, '2152902662');
	assert.equal(config.accessKey, 'access-key');
});

test('buildAiPodcastRequest keeps the podcast brief as input_text', () => {
	const request = buildAiPodcastRequest({
		jobId: 'job-1',
		inputText: '今天我们要聊的话题是 AI 播客。',
		speakerA: 'zh_male_dayi_v2_saturn_bigtts',
		speakerB: 'zh_female_mizai_v2_saturn_bigtts',
		useHeadMusic: false,
	});

	assert.equal(request.input_id, 'job-1');
	assert.equal(request.input_text, '今天我们要聊的话题是 AI 播客。');
	assert.equal(request.action, 0);
	assert.equal(request.use_head_music, false);
	assert.deepEqual(request.speaker_info, {
		random_order: false,
		speakers: ['zh_male_dayi_v2_saturn_bigtts', 'zh_female_mizai_v2_saturn_bigtts'],
	});
});

test('decodeJsonFrame supports text and binary JSON frames', () => {
	assert.deepEqual(decodeJsonFrame('{"event":"done"}'), { event: 'done' });
	assert.deepEqual(decodeJsonFrame(Buffer.from('{"event":"audio"}')), { event: 'audio' });
	assert.equal(decodeJsonFrame(Buffer.from([0, 1, 2])), null);
});

test('decodePodcastFrame extracts JSON and binary audio payloads from Volcengine frames', () => {
	function customFrame({ messageType = 0xb, serialization = 0, payload }) {
		const body = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
		const header = Buffer.from([0x11, messageType << 4, serialization << 4, 0]);
		const size = Buffer.alloc(4);
		size.writeUInt32BE(body.length);
		return Buffer.concat([header, size, body]);
	}

	assert.deepEqual(decodePodcastFrame(customFrame({
		messageType: 0x9,
		serialization: 1,
		payload: { event: 'PodcastEnd', audio_url: 'https://example.com/audio.mp3' },
	})), {
		json: { event: 'PodcastEnd', audio_url: 'https://example.com/audio.mp3' },
	});
	assert.deepEqual(decodePodcastFrame(customFrame({
		messageType: 0xb,
		serialization: 0,
		payload: Buffer.from('mp3'),
	})), {
		audio: Buffer.from('mp3'),
	});
});

test('encodePodcastRequestFrame wraps JSON in Volcengine websocket v3 header', () => {
	const frame = encodePodcastRequestFrame({ input_id: 'job-1' }, 'session-1');

	assert.equal(frame[0], 0x11);
	assert.equal(frame[1], 0x14);
	assert.equal(frame[2], 0x10);
	assert.deepEqual(decodePodcastFrame(frame), {
		eventType: 100,
		sessionId: 'session-1',
		json: { input_id: 'job-1' },
	});
});

test('encodeStartConnectionFrame and encodeFinishConnectionFrame use event frames', () => {
	assert.deepEqual(decodePodcastFrame(encodeStartConnectionFrame()), {
		eventType: 1,
		sessionId: '',
		json: {},
	});
	assert.deepEqual(decodePodcastFrame(encodeFinishConnectionFrame()), {
		eventType: 2,
		sessionId: '',
		json: {},
	});
});

test('extractAudioChunks accepts common base64 audio fields', () => {
	const chunks = extractAudioChunks([
		{ audio: 'YQ==' },
		{ data: { audio: 'Yg==' } },
		{ result: { audio: 'Yw==' } },
		{ binaryAudio: Buffer.from('d') },
	]);

	assert.deepEqual(chunks.map((chunk) => chunk.toString('utf8')), ['a', 'b', 'c', 'd']);
});

test('summarizePodcastUsage totals token usage frames', () => {
	const usage = summarizePodcastUsage([
		{ usage: { input_text_tokens: 10, output_audio_tokens: 20, total_tokens: 30 } },
		{ usage: { input_text_tokens: 5, output_audio_tokens: 8, total_tokens: 13 } },
		{ event: 'ignore-me' },
	]);

	assert.deepEqual(usage, {
		inputTextTokens: 15,
		outputAudioTokens: 28,
		totalTokens: 43,
		usageFrameCount: 2,
	});
});

test('estimatePodcastCost returns per-video CNY estimate from token total', () => {
	const cost = estimatePodcastCost(
		{ inputTextTokens: 15, outputAudioTokens: 28, totalTokens: 43, usageFrameCount: 2 },
		70,
	);

	assert.deepEqual(cost, {
		currency: 'CNY',
		unitPricePerMillionTokens: 70,
		inputTextTokens: 15,
		outputAudioTokens: 28,
		totalTokens: 43,
		usageFrameCount: 2,
		estimatedCostCny: 0.00301,
	});
});

test('normalizeNativeTiming turns words into composer timing frames', () => {
	const timing = normalizeNativeTiming([
		{
			sentence: {
				words: [
					{ word: '今', startTime: 0, endTime: 0.2 },
					{ word: '天', startTime: 0.2, endTime: 0.4 },
				],
			},
		},
	]);

	assert.equal(timing.source, 'podcast_native');
	assert.deepEqual(timing.frames[0].sentence.words[0], {
		word: '今',
		startTime: 0,
		endTime: 0.2,
	});
});

test('normalizePodcastRoundTiming builds subtitles from spoken round text and native round time', () => {
	const timing = normalizePodcastRoundTiming([
		{
			round_id: 0,
			speaker: 'zh_male',
			text: '今天我们要聊的是成本统计。它应该只显示真实说出来的话。',
		},
		{ usage: { total_tokens: 12 } },
		{ audio_duration: 4, start_time: 0, end_time: 4 },
		{
			round_id: 1,
			speaker: 'zh_female',
			text: '对，不能把给模型看的提示词放进字幕里。',
		},
		{ audio_duration: 3, start_time: 4, end_time: 7 },
	]);

	assert.equal(timing.source, 'podcast_round_native');
	assert.equal(timing.rounds.length, 2);
	assert.equal(timing.subtitles[0].start, 0);
	assert.equal(timing.subtitles.at(-1).end, 7);
	assert.match(timing.subtitles.map((subtitle) => subtitle.text).join(''), /真实说出来的话/);
	assert.doesNotMatch(timing.subtitles.map((subtitle) => subtitle.text).join(''), /请把下面观点/);
});

test('extractPodcastTranscript joins only spoken round text', () => {
	const transcript = extractPodcastTranscript([
		{ round_id: 0, text: '今天我们要聊真实文本。' },
		{ audio_duration: 2, start_time: 0, end_time: 2 },
		{ usage: { total_tokens: 8 } },
		{ round_id: 1, text: '提示词不能进入这里。' },
	]);

	assert.equal(transcript, '今天我们要聊真实文本。\n提示词不能进入这里。');
});

test('requireSubtitleTiming prefers podcast round timing before estimated prompt timing', () => {
	const timing = requireSubtitleTiming(
		{ frames: [], source: 'podcast_native' },
		{
			fallback: 'estimated',
			inputText: '请把下面观点制作成一个自然的双人中文 AI 播客。',
			audioDuration: 10,
			roundTiming: {
				source: 'podcast_round_native',
				subtitles: [{ text: '今天我们要聊真实口播。', start: 0, end: 3 }],
			},
		},
	);

	assert.equal(timing.source, 'podcast_round_native');
	assert.equal(timing.subtitles[0].text, '今天我们要聊真实口播。');
});

test('estimateSubtitleTimingFromText builds timeline subtitles across audio duration', () => {
	const timing = estimateSubtitleTimingFromText('今天我们要聊的话题是测试。第二句继续。', 10);

	assert.equal(timing.source, 'podcast_estimated');
	assert.equal(timing.subtitles[0].start, 0);
	assert.equal(timing.subtitles.at(-1).end, 10);
	assert.match(timing.subtitles.map((subtitle) => subtitle.text).join(''), /今天我们要聊的话题是测试/);
});

test('requireSubtitleTiming can fall back to estimated subtitles', () => {
	const timing = requireSubtitleTiming(
		{ frames: [], source: 'podcast_native' },
		{ fallback: 'estimated', inputText: '今天我们要聊的话题是测试。', audioDuration: 3 },
	);

	assert.equal(timing.source, 'podcast_estimated');
	assert.equal(timing.subtitles.length, 1);
});

test('requireSubtitleTiming fails clearly without native timing or fallback', () => {
	assert.throws(
		() => requireSubtitleTiming({ frames: [], source: 'podcast_native' }, { fallback: 'none' }),
		/AI podcast service did not return usable timestamps/,
	);
});
