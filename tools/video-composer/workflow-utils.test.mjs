import assert from 'node:assert/strict';
import test from 'node:test';

import {
	VOICE_PRESETS,
	buildGeneratedScriptText,
	buildTtsSegments,
	extractAudioAndTiming,
	extractJsonObject,
	mergeTimingEvents,
	parseGeneratedScript,
	parseTtsResponseFrames,
	resolveVoicePreset,
} from './workflow-utils.mjs';

test('resolveVoicePreset returns official speaker ids', () => {
	assert.equal(VOICE_PRESETS.cancan_v2.speaker, 'BV700_V2_streaming');
	assert.equal(resolveVoicePreset('cancan_v2').speaker, 'BV700_V2_streaming');
	assert.equal(resolveVoicePreset('', 'fallback_speaker').speaker, 'fallback_speaker');
	assert.throws(() => resolveVoicePreset('unknown_voice'), /Unknown voice preset/);
});

test('extractJsonObject extracts the first balanced JSON object', () => {
	const raw = 'prefix {"mode":"single","segments":[{"role":"narrator","text":"你好"}]} suffix';

	assert.equal(
		extractJsonObject(raw),
		'{"mode":"single","segments":[{"role":"narrator","text":"你好"}]}',
	);
});

test('parseGeneratedScript validates single narration schema', () => {
	const script = parseGeneratedScript(
		JSON.stringify({
			mode: 'single',
			title: '标题',
			summary: '摘要',
			segments: [
				{ role: 'narrator', text: '第一段。' },
				{ role: 'narrator', text: '第二段。' },
			],
		}),
		'single',
	);

	assert.equal(script.mode, 'single');
	assert.equal(script.segments.length, 2);
	assert.throws(
		() => parseGeneratedScript(
			JSON.stringify({ mode: 'single', segments: [{ role: 'A', text: '错。' }] }),
			'single',
		),
		/single mode only allows narrator/,
	);
});

test('parseGeneratedScript validates dialogue schema', () => {
	const script = parseGeneratedScript(
		JSON.stringify({
			mode: 'dialogue',
			title: '标题',
			summary: '摘要',
			segments: [
				{ role: 'A', text: '我先说。' },
				{ role: 'B', text: '我回应。' },
			],
		}),
		'dialogue',
	);

	assert.equal(script.mode, 'dialogue');
	assert.equal(script.segments[1].role, 'B');
	assert.throws(
		() => parseGeneratedScript(
			JSON.stringify({ mode: 'dialogue', segments: [{ role: 'C', text: '错。' }] }),
			'dialogue',
		),
		/dialogue mode only allows roles A and B/,
	);
});

test('buildGeneratedScriptText prefixes dialogue roles and merges narrator text', () => {
	assert.equal(
		buildGeneratedScriptText({
			mode: 'single',
			segments: [
				{ role: 'narrator', text: '第一段。' },
				{ role: 'narrator', text: '第二段。' },
			],
		}),
		'第一段。\n第二段。',
	);
	assert.equal(
		buildGeneratedScriptText({
			mode: 'dialogue',
			segments: [
				{ role: 'A', text: '第一句。' },
				{ role: 'B', text: '第二句。' },
			],
		}),
		'A：第一句。\nB：第二句。',
	);
});

test('buildTtsSegments merges single narration into one request', () => {
	const segments = buildTtsSegments(
		{
			mode: 'single',
			segments: [
				{ role: 'narrator', text: '第一段。' },
				{ role: 'narrator', text: '第二段。' },
			],
		},
		{ voiceSingle: 'cancan_v2' },
		{ segmentsDir: '/tmp/job/tts/segments', fallbackSpeaker: 'fallback' },
	);

	assert.deepEqual(segments, [
		{
			segmentIndex: 1,
			role: 'narrator',
			speaker: 'BV700_V2_streaming',
			text: '第一段。\n第二段。',
			audioPath: '/tmp/job/tts/segments/001-narrator.mp3',
			timingPath: '/tmp/job/tts/segments/001-narrator-timing.json',
			responsePath: '/tmp/job/tts/segments/001-narrator-response.jsonstream',
		},
	]);
});

test('buildTtsSegments keeps dialogue turns with role-specific speakers', () => {
	const segments = buildTtsSegments(
		{
			mode: 'dialogue',
			segments: [
				{ role: 'A', text: '第一句。' },
				{ role: 'B', text: '第二句。' },
			],
		},
		{ voiceA: 'qingcang_v2', voiceB: 'female_general_v2' },
		{ segmentsDir: '/tmp/job/tts/segments' },
	);

	assert.equal(segments[0].speaker, 'BV701_V2_streaming');
	assert.equal(segments[1].speaker, 'BV001_V2_streaming');
	assert.equal(segments[1].audioPath, '/tmp/job/tts/segments/002-B.mp3');
});

test('parseTtsResponseFrames parses JSON stream and SSE data frames', () => {
	const jsonStream = '{"data":"YQ=="}{"sentence":{"words":[{"word":"你","startTime":0,"endTime":0.2}]}}';
	const sse = 'event: message\ndata: {"data":"Yg=="}\n\nevent: message\ndata: {"sentence":{"words":[{"word":"好","startTime":0.2,"endTime":0.4}]}}\n\n';

	assert.equal(parseTtsResponseFrames(jsonStream).length, 2);
	assert.equal(parseTtsResponseFrames(sse).length, 2);
});

test('extractAudioAndTiming returns audio chunks and timing frames', () => {
	const result = extractAudioAndTiming([
		{ data: 'YQ==' },
		{ sentence: { words: [{ word: '你', startTime: 0, endTime: 0.2 }] } },
	]);

	assert.deepEqual(result.audioBase64Chunks, ['YQ==']);
	assert.deepEqual(result.timingFrames, [
		{ sentence: { words: [{ word: '你', startTime: 0, endTime: 0.2 }] } },
	]);
});

test('mergeTimingEvents offsets segment timings and dialogue pauses', () => {
	const merged = mergeTimingEvents(
		[
			{
				duration: 1,
				timingFrames: [
					{ sentence: { words: [{ word: '你', startTime: 0, endTime: 0.4 }] } },
				],
			},
			{
				duration: 2,
				timingFrames: [
					{ sentence: { words: [{ word: '好', startTime: 0.1, endTime: 0.5 }] } },
				],
			},
		],
		{ pauseSeconds: 0.2 },
	);

	assert.equal(merged.duration, 3.2);
	assert.deepEqual(merged.frames[0].sentence.words[0], { word: '你', startTime: 0, endTime: 0.4 });
	assert.deepEqual(merged.frames[1].sentence.words[0], { word: '好', startTime: 1.3, endTime: 1.7 });
});
