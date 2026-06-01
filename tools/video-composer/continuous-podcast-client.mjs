#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { aggregatePresentationCost, cleanSpokenTranscript, safePageName } from './presentation-utils.mjs';

function run(command, args, label) {
	const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
	if (result.status !== 0) throw new Error(`${label} failed: ${result.stderr || result.stdout}`);

	return result.stdout.trim();
}

function ffprobeDuration(audioPath) {
	const output = run('ffprobe', [
		'-v',
		'error',
		'-show_entries',
		'format=duration',
		'-of',
		'default=nw=1:nk=1',
		audioPath,
	], 'ffprobe');
	const duration = Number(output);

	return Number.isFinite(duration) ? duration : 0;
}

function copyFixturePodcast({ fixtureDir, wholeAudioPath, wholeTimingPath, wholeTranscriptPath }) {
	fs.copyFileSync(path.join(fixtureDir, 'podcast.mp3'), wholeAudioPath);
	fs.copyFileSync(path.join(fixtureDir, 'podcast.json'), wholeTimingPath);
	fs.copyFileSync(path.join(fixtureDir, 'podcast.txt'), wholeTranscriptPath);
}

function buildPodcastInput(script) {
	const isNewsScience = script.deliveryStyle === 'news_science_explainer';
	const pageAnchors = Array.isArray(script.pageAnchors) && script.pageAnchors.length > 0
		? script.pageAnchors
		: Array.from(new Set((Array.isArray(script.segments) ? script.segments : []).map((segment) => Number(segment.pageNumber))))
			.filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber > 0)
			.sort((a, b) => a - b)
			.map((pageNumber) => ({ pageNumber, topic: `第 ${pageNumber} 页`, visualRole: '根据本页证据承接讲解' }));
	const lines = [
		isNewsScience ? '请生成一段中文新闻联播式科普解说口播。' : '请生成一段中文双人播客访谈式口播。',
		isNewsScience ? '这是整集最新科普文献解读脚本，不是每页生成一段。' : '这是整集论文播客脚本，不是每页生成一段。',
		isNewsScience
			? '请保持正式、克制、短句、证据导向的连续解说；只有开头可以自然引入主题，后续不要重新开场。'
			: '请保持一整段连续录音的感觉：只有开头可以自然开场，后续不要重新说“今天我们要聊”或“那我们开始吧”。',
		'不要说感谢收听、下期再见、拜拜、本期到这里等结束语。',
		'不要朗读页码、视觉锚点、证据引用或这些规则。',
		isNewsScience ? '不要生成播客式互动、寒暄、感叹或博客式个人感想。' : '',
		'',
		`标题：${script.title || ''}`,
		`摘要：${script.summary || ''}`,
		`主论点：${script.thesis || ''}`,
		'',
		'视觉锚点：',
		...pageAnchors.map((anchor) => `第 ${anchor.pageNumber} 页视觉锚点：${anchor.topic || ''} ${anchor.visualRole || ''}`.trim()),
		'',
		isNewsScience ? '整集新闻式科普解说脚本：' : '整集论文播客脚本：',
		...(Array.isArray(script.segments) ? script.segments : [])
			.map((segment) => `${segment.role}：${segment.text}`),
	].filter((line) => line !== '');

	return lines.join('\n').trim();
}

function runAiPodcast(job, script, paths) {
	const aiPodcastJobPath = path.join(job.audioDir, 'research-ai-podcast-job.json');
	fs.writeFileSync(aiPodcastJobPath, JSON.stringify({
		jobId: `${job.jobId}-research-podcast`,
		podcastInputText: buildPodcastInput(script),
		podcastSpeakerA: job.podcastSpeakerA,
		podcastSpeakerB: job.podcastSpeakerB,
		useHeadMusic: false,
		ttsDir: job.audioDir,
		audioPath: paths.wholeAudioPath,
		ttsTimingPath: paths.wholeTimingPath,
		transcriptPath: paths.wholeTranscriptPath,
		costPath: paths.wholeCostPath,
		podcastMetadataPath: paths.metadataPath,
		podcastRawResponsePath: paths.rawResponsePath,
		aiPodcastTimeoutMs: job.aiPodcastTimeoutMs,
	}, null, 2), 'utf8');
	const result = spawnSync('node', [new URL('./ai-podcast-client.mjs', import.meta.url).pathname, aiPodcastJobPath], {
		encoding: 'utf8',
		maxBuffer: 1024 * 1024 * 20,
	});
	if (result.status !== 0) {
		throw new Error(`Continuous AI podcast failed: ${result.stderr || result.stdout}`);
	}
}

function readTiming(timingPath, fallbackDuration) {
	const timing = JSON.parse(fs.readFileSync(timingPath, 'utf8'));

	return {
		duration: Number(timing.duration) || fallbackDuration,
		subtitles: Array.isArray(timing.subtitles) ? timing.subtitles : [],
		source: timing.source || 'unknown',
	};
}

function buildSegmentTimeline(segments, totalDuration) {
	const totalTarget = segments.reduce((sum, segment) => sum + Math.max(0.1, Number(segment.targetSeconds) || 0), 0);
	const scale = totalTarget > 0 && totalDuration > 0 ? totalDuration / totalTarget : 1;
	let cursor = 0;

	return segments.map((segment) => {
		const duration = Math.max(0.1, Number(segment.targetSeconds) || 0) * scale;
		const timed = {
			...segment,
			start: cursor,
			end: cursor + duration,
		};
		cursor += duration;

		return timed;
	});
}

function nearestSubtitleBoundary(events, value, maxDistance = 2) {
	let best = value;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const event of Array.isArray(events) ? events : []) {
		for (const candidate of [Number(event.start), Number(event.end)]) {
			if (!Number.isFinite(candidate) || candidate <= 0) continue;
			const distance = Math.abs(candidate - value);
			if (distance <= maxDistance && distance < bestDistance) {
				best = candidate;
				bestDistance = distance;
			}
		}
	}

	return best;
}

function buildPageWindows(segments, totalDuration, subtitleEvents = []) {
	const windows = [];
	for (const segment of segments) {
		let window = windows.find((candidate) => candidate.pageNumber === Number(segment.pageNumber));
		if (!window) {
			window = {
				pageNumber: Number(segment.pageNumber),
				start: segment.start,
				end: segment.end,
				segmentTexts: [],
			};
			windows.push(window);
		}
		window.start = Math.min(window.start, segment.start);
		window.end = Math.max(window.end, segment.end);
		window.segmentTexts.push(segment.text);
	}
	windows.sort((a, b) => a.pageNumber - b.pageNumber);
	if (windows.length > 0) {
		windows[0].start = 0;
		windows[windows.length - 1].end = totalDuration;
		for (let index = 0; index < windows.length - 1; index += 1) {
			const boundary = nearestSubtitleBoundary(subtitleEvents, windows[index + 1].start);
			windows[index].end = boundary;
			windows[index + 1].start = boundary;
		}
	}

	return windows.map((window) => ({
		...window,
		duration: Math.max(0.1, window.end - window.start),
	}));
}

function subtitleEventsForWindow(events, window) {
	return events
		.filter((event) => Number(event.end) > window.start && Number(event.start) < window.end)
		.map((event) => ({
			text: cleanSpokenTranscript(event.text),
			start: Number(Math.max(0, Number(event.start) - window.start).toFixed(3)),
			end: Number(Math.min(window.duration, Number(event.end) - window.start).toFixed(3)),
		}))
		.filter((event) => event.text && event.end > event.start);
}

export function buildAudioSliceArgs({ inputPath, outputPath, start, duration }) {
	return [
		'-y',
		'-ss',
		String(Math.max(0, start)),
		'-i',
		inputPath,
		'-t',
		String(duration),
		'-c:a',
		'copy',
		outputPath,
	];
}

function sliceAudio({ inputPath, outputPath, start, duration }) {
	run('ffmpeg', buildAudioSliceArgs({ inputPath, outputPath, start, duration }), 'ffmpeg audio slice');
}

function writePageOutputs({ job, script, timing, wholeAudioPath }) {
	const timedSegments = buildSegmentTimeline(script.segments, timing.duration);
	const windows = buildPageWindows(timedSegments, timing.duration, timing.subtitles);
	const pages = windows.map((window) => {
		const name = safePageName(window.pageNumber);
		const audioPath = path.join(job.audioDir, `${name}.mp3`);
		const timingPath = path.join(job.timingDir, `${name}.json`);
		const transcriptPath = path.join(job.transcriptDir, `${name}.txt`);
		const subtitleEvents = subtitleEventsForWindow(timing.subtitles, window);
		const transcript = subtitleEvents.length > 0
			? subtitleEvents.map((event) => event.text).join('\n')
			: window.segmentTexts.join('\n');
		sliceAudio({
			inputPath: wholeAudioPath,
			outputPath: audioPath,
			start: window.start,
			duration: window.duration,
		});
		const pageTiming = {
			duration: window.duration,
			source: timing.source,
			subtitles: subtitleEvents,
			globalStart: window.start,
			globalEnd: window.end,
		};
		fs.writeFileSync(timingPath, JSON.stringify(pageTiming, null, 2), 'utf8');
		fs.writeFileSync(transcriptPath, transcript, 'utf8');

		return {
			pageNumber: window.pageNumber,
			audioPath,
			timingPath,
			transcriptPath,
			duration: window.duration,
			transcript,
			subtitleEvents,
			subtitleSource: timing.source,
			continuousPodcast: true,
		};
	});
	fs.writeFileSync(job.pageAudioManifestPath, JSON.stringify({ pages }, null, 2), 'utf8');

	return pages;
}

function main() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/continuous-podcast-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	for (const dir of [job.audioDir, job.timingDir, job.transcriptDir]) fs.mkdirSync(dir, { recursive: true });
	const script = JSON.parse(fs.readFileSync(job.researchScriptPath, 'utf8'));
	const paths = {
		wholeAudioPath: path.join(job.audioDir, 'whole-podcast.mp3'),
		wholeTimingPath: path.join(job.timingDir, 'whole-podcast.json'),
		wholeTranscriptPath: path.join(job.transcriptDir, 'whole-podcast.txt'),
		wholeCostPath: path.join(job.audioDir, 'whole-podcast-cost.json'),
		metadataPath: path.join(job.audioDir, 'whole-podcast-metadata.json'),
		rawResponsePath: path.join(job.audioDir, 'whole-podcast-response.binlog'),
	};
	if (process.env.CONTINUOUS_PODCAST_FIXTURE_DIR) {
		copyFixturePodcast({ fixtureDir: process.env.CONTINUOUS_PODCAST_FIXTURE_DIR, ...paths });
	} else {
		runAiPodcast(job, script, paths);
	}
	if (process.env.CONTINUOUS_PODCAST_SKIP_SLICE === '1') {
		console.log(JSON.stringify({ ok: true, skippedSlice: true, audioPath: paths.wholeAudioPath }));
		return;
	}
	const duration = ffprobeDuration(paths.wholeAudioPath);
	const timing = readTiming(paths.wholeTimingPath, duration);
	const pages = writePageOutputs({ job, script, timing, wholeAudioPath: paths.wholeAudioPath });
	if (job.costPath) {
		let wholeCost = null;
		if (fs.existsSync(paths.wholeCostPath)) wholeCost = JSON.parse(fs.readFileSync(paths.wholeCostPath, 'utf8'));
		fs.writeFileSync(job.costPath, JSON.stringify(aggregatePresentationCost({
			jobId: job.jobId,
			pageCosts: wholeCost ? [wholeCost] : [],
			pageCount: pages.length,
			totalAudioDuration: pages.reduce((sum, page) => sum + Number(page.duration || 0), 0),
		}), null, 2), 'utf8');
	}
	console.log(JSON.stringify({
		ok: true,
		pageAudioManifestPath: job.pageAudioManifestPath,
		pageCount: pages.length,
		audioPath: paths.wholeAudioPath,
	}));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		main();
	} catch (error) {
		console.error(error.stack || error.message);
		process.exit(1);
	}
}
