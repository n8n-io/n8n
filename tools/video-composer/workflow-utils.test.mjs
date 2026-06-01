import assert from 'node:assert/strict';
import fs from 'node:fs';
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

const scriptWriterSkill = new URL('./script-writer/SKILL.md', import.meta.url);

test('resolveVoicePreset returns official speaker ids', () => {
	assert.equal(VOICE_PRESETS.guest_female_xiaohe.speaker, 'zh_female_xiaohe_uranus_bigtts');
	assert.equal(resolveVoicePreset('guest_female_xiaohe').speaker, 'zh_female_xiaohe_uranus_bigtts');
	assert.equal(resolveVoicePreset('', 'fallback_speaker').speaker, 'fallback_speaker');
	assert.throws(() => resolveVoicePreset('unknown_voice'), /Unknown voice preset/);
});

test('resolveVoicePreset supports MVP podcast voices and Chinese dropdown labels', () => {
	assert.equal(
		VOICE_PRESETS.host_male_wennuanahu.speaker,
		'zh_male_wennuanahu_uranus_bigtts',
	);
	assert.equal(resolveVoicePreset('host_male_liufei').speaker, 'zh_male_liufei_uranus_bigtts');
	assert.equal(
		resolveVoicePreset('guest_male_yuanboxiaoshu').speaker,
		'zh_male_yuanboxiaoshu_uranus_bigtts',
	);
	assert.equal(
		resolveVoicePreset('guest_female_tina').speaker,
		'zh_female_yingyujiaoxue_uranus_bigtts',
	);
	assert.equal(
		resolveVoicePreset('男主持 - 温柔阿虎｜host_male_wennuanahu').speaker,
		'zh_male_wennuanahu_uranus_bigtts',
	);
	assert.equal(
		resolveVoicePreset('女嘉宾 - Tina 老师｜guest_female_tina').speaker,
		'zh_female_yingyujiaoxue_uranus_bigtts',
	);
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

test('parseGeneratedScript removes repeated openings and closing boilerplate from segments', () => {
	const script = parseGeneratedScript(
		JSON.stringify({
			mode: 'dialogue',
			title: '标题',
			summary: '摘要',
			segments: [
				{ role: 'A', text: '今天我们要聊抗炎饮食，先看一个常见误区。' },
				{ role: 'B', text: '今天我们继续聊这个话题。真正关键的是搭配和长期习惯。' },
				{ role: 'A', text: '这个例子说明，不能把单一食物神化。好了，那今天的内容咱们就到这里了，感谢大家的收听。' },
				{ role: 'B', text: '最后可以记住一句话：稳定、均衡，比追逐神奇食物更重要。咱们下期再见拜拜。' },
			],
		}),
		'dialogue',
	);

	assert.equal(script.segments[0].text, '今天我们要聊抗炎饮食，先看一个常见误区。');
	assert.equal(script.segments[1].text, '真正关键的是搭配和长期习惯。');
	assert.equal(script.segments[2].text, '这个例子说明，不能把单一食物神化。');
	assert.equal(script.segments[3].text, '最后可以记住一句话：稳定、均衡，比追逐神奇食物更重要。');
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
		{ voiceSingle: 'host_male_wennuanahu' },
		{ segmentsDir: '/tmp/job/tts/segments', fallbackSpeaker: 'fallback' },
	);

	assert.deepEqual(segments, [
		{
			segmentIndex: 1,
			role: 'narrator',
			speaker: 'zh_male_wennuanahu_uranus_bigtts',
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
		{ voiceA: 'host_male_wennuanahu', voiceB: 'guest_female_tina' },
		{ segmentsDir: '/tmp/job/tts/segments' },
	);

	assert.equal(segments[0].speaker, 'zh_male_wennuanahu_uranus_bigtts');
	assert.equal(segments[1].speaker, 'zh_female_yingyujiaoxue_uranus_bigtts');
	assert.equal(segments[1].audioPath, '/tmp/job/tts/segments/002-B.mp3');
});

test('script writer skill treats segments as one continuous audio track', () => {
	const skill = fs.readFileSync(scriptWriterSkill, 'utf8');

	assert.match(skill, /连续/);
	assert.match(skill, /不是独立/);
	assert.match(skill, /不要在每个 segment/);
	assert.match(skill, /不要.*感谢收听/);
	assert.match(skill, /不要.*下期再见/);
});

test('video clip workflow embeds the continuity cleanup guard', () => {
	const workflowPath = new URL('../../workflows/video-clip-tts-workflow.json', import.meta.url);
	const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
	for (const name of ['Parse Generated Script', 'Synthesize And Merge TTS Segments']) {
		const node = workflow.nodes.find((item) => item.name === name);
		assert.ok(node, `${name} node should exist`);
		assert.match(node.parameters.jsCode, /cleanSegmentText/);
		assert.match(node.parameters.jsCode, /isClosingBoilerplate/);
		assert.match(node.parameters.jsCode, /isRepeatedOpening/);
	}
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
