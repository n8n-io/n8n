#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { aggregatePresentationCost, cleanSpokenTranscript, compactSourceText, safePageName } from './presentation-utils.mjs';

function ffprobeDuration(audioPath) {
	const result = spawnSync('ffprobe', [
		'-v',
		'error',
		'-show_entries',
		'format=duration',
		'-of',
		'default=nw=1:nk=1',
		audioPath,
	], { encoding: 'utf8' });
	const duration = Number(result.stdout.trim());

	return Number.isFinite(duration) ? duration : 0;
}

function readTiming(timingPath, fallbackDuration) {
	const timing = JSON.parse(fs.readFileSync(timingPath, 'utf8'));

	return {
		duration: Number(timing.duration) || fallbackDuration,
		subtitleEvents: Array.isArray(timing.subtitles) ? timing.subtitles : [],
		source: timing.source || 'unknown',
		raw: timing,
	};
}

function copyFixturePage({ fixtureDir, name, audioPath, timingPath, transcriptPath }) {
	fs.copyFileSync(path.join(fixtureDir, `${name}.mp3`), audioPath);
	fs.copyFileSync(path.join(fixtureDir, `${name}.json`), timingPath);
	fs.copyFileSync(path.join(fixtureDir, `${name}.txt`), transcriptPath);
}

function isClosingSpeech(text) {
	const compact = String(text || '').replace(/\s+/g, '');
	if (!compact) return false;

	return [
		/感谢.*(收听|观看|大家)/,
		/(下期|下次).*(再见|见)/,
		/(拜拜|再见吧|咱们下期)/,
		/(今天|本期|这期|这一期|节目|内容).*(到这里|到这|就到这里|就到这)/,
		/(以上就是|全部内容)/,
	].some((pattern) => pattern.test(compact));
}

function trimAudio({ audioPath, duration }) {
	const tempPath = `${audioPath}.trimmed-${process.pid}.mp3`;
	const result = spawnSync('ffmpeg', [
		'-y',
		'-i',
		audioPath,
		'-t',
		String(duration),
		'-c:a',
		'libmp3lame',
		tempPath,
	], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
	if (result.status !== 0) {
		fs.rmSync(tempPath, { force: true });
		throw new Error(`ffmpeg failed to trim AI podcast closing speech: ${result.stderr || result.stdout}`);
	}
	fs.renameSync(tempPath, audioPath);
}

function removeClosingSpeech({ paths, timing, transcript, duration }) {
	const subtitleEvents = Array.isArray(timing.subtitleEvents) ? timing.subtitleEvents : [];
	const closingIndex = subtitleEvents.findIndex((event) => isClosingSpeech(event.text));
	if (closingIndex < 0) {
		return { duration, transcript, subtitleEvents, trimmedClosingSpeech: false };
	}
	const cutAt = Number(subtitleEvents[closingIndex]?.start);
	if (!Number.isFinite(cutAt) || cutAt <= 0.1) {
		return { duration, transcript, subtitleEvents, trimmedClosingSpeech: false };
	}
	const keptEvents = subtitleEvents
		.slice(0, closingIndex)
		.map((event) => ({
			...event,
			end: Math.min(Number(event.end), cutAt),
		}))
		.filter((event) => event.text && Number(event.end) > Number(event.start));
	if (keptEvents.length === 0) {
		return { duration, transcript, subtitleEvents, trimmedClosingSpeech: false };
	}

	trimAudio({ audioPath: paths.audioPath, duration: cutAt });
	const cleanedTranscript = keptEvents.map((event) => event.text).join('\n');
	const cleanedTiming = {
		...timing.raw,
		duration: cutAt,
		subtitles: keptEvents,
		trimmedClosingSpeech: true,
		originalDuration: duration,
	};
	fs.writeFileSync(paths.timingPath, JSON.stringify(cleanedTiming, null, 2), 'utf8');
	fs.writeFileSync(paths.transcriptPath, cleanedTranscript, 'utf8');

	return {
		duration: cutAt,
		transcript: cleanedTranscript,
		subtitleEvents: keptEvents,
		trimmedClosingSpeech: true,
	};
}

function buildPagePodcastInput(page, { pageCount = 1, previousPage = null, nextPage = null } = {}) {
	const pageNumber = Number(page.pageNumber) || 1;
	const lines = [
		'请生成一段中文播客访谈式口播。',
		'必须严格围绕“本页页面内容”和“本页讲解稿”展开，不要引入页面没有出现的新主题、产品、API、公司案例或背景知识。',
		'如果页面信息较少，就解释页面本身的作用、目标和观看重点；不要扩写成其他选题。',
		`当前是第 ${pageNumber} 页，共 ${pageCount} 页。请把它当作同一个长视频播客中的一个连续段落。`,
		pageNumber === 1
			? '第 1 页可以自然开场，但不要提前总结整期节目。'
			: '除第 1 页外，不要重新说“今天我们要聊”“开始今天的话题”等新节目开场，直接承接上一页继续讲。',
		previousPage ? `上一页主题：${previousPage.pageTitle || previousPage.speakerPrompt || `第 ${pageNumber - 1} 页`}` : '上一页主题：无。',
		nextPage ? `下一页主题：${nextPage.pageTitle || nextPage.speakerPrompt || `第 ${pageNumber + 1} 页`}。本页结尾只做一句自然过渡，不要做节目收尾。` : '这是最后一页，也不要说感谢收听、下期再见或拜拜；只用一句观点收束即可。',
		'这一页只是完整视频中的连续片段，不要在每一页结尾加入播客结束语。',
		'不要说“感谢收听”“本期节目到这里”“我们下期再见”“以上就是本页全部内容”等收尾话术。',
		'输出应自然像播客，不要朗读这些规则。',
		'',
		'本页页面证据摘录：',
		compactSourceText(page.sourceText, { maxChars: 1200 }) || '(页面文字较少，请只围绕标题和上下文解释。)',
		'',
		'本页讲解稿：',
		[String(page.speakerPrompt || '').trim(), String(page.spokenSummary || '').trim()]
			.filter(Boolean)
			.join('\n'),
	];

	return lines.join('\n').trim();
}

function runAiPodcastPage(job, page, paths) {
	const pageJobPath = path.join(job.audioDir, `${paths.name}-ai-podcast-job.json`);
	fs.writeFileSync(pageJobPath, JSON.stringify({
		jobId: `${job.jobId}-${paths.name}`,
		podcastInputText: buildPagePodcastInput(page, paths.context),
		podcastSpeakerA: job.podcastSpeakerA,
		podcastSpeakerB: job.podcastSpeakerB,
		useHeadMusic: false,
		ttsDir: job.audioDir,
		audioPath: paths.audioPath,
		ttsTimingPath: paths.timingPath,
		transcriptPath: paths.transcriptPath,
		costPath: paths.costPath,
		podcastMetadataPath: paths.metadataPath,
		podcastRawResponsePath: paths.rawResponsePath,
	}, null, 2), 'utf8');
	const result = spawnSync('node', [new URL('./ai-podcast-client.mjs', import.meta.url).pathname, pageJobPath], {
		encoding: 'utf8',
		maxBuffer: 1024 * 1024 * 20,
	});
	if (result.status !== 0) {
		throw new Error(`AI podcast failed on page ${page.pageNumber}: ${result.stderr || result.stdout}`);
	}
}

function main() {
	const jobPath = process.argv[2];
	if (!jobPath) throw new Error('Usage: node tools/video-composer/presentation-podcast-client.mjs JOB_JSON_PATH');
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	for (const dir of [job.audioDir, job.timingDir, job.transcriptDir]) fs.mkdirSync(dir, { recursive: true });
	const script = JSON.parse(fs.readFileSync(job.pageScriptPath, 'utf8'));
	const pages = script.pages.map((page, index) => {
		const name = safePageName(page.pageNumber);
		const paths = {
			name,
			audioPath: path.join(job.audioDir, `${name}.mp3`),
			timingPath: path.join(job.timingDir, `${name}.json`),
			transcriptPath: path.join(job.transcriptDir, `${name}.txt`),
			costPath: path.join(job.audioDir, `${name}-cost.json`),
			metadataPath: path.join(job.audioDir, `${name}-metadata.json`),
			rawResponsePath: path.join(job.audioDir, `${name}-response.binlog`),
			context: {
				pageCount: script.pages.length,
				previousPage: script.pages[index - 1] || null,
				nextPage: script.pages[index + 1] || null,
			},
		};
		if (process.env.PRESENTATION_PODCAST_FIXTURE_DIR) {
			copyFixturePage({ fixtureDir: process.env.PRESENTATION_PODCAST_FIXTURE_DIR, ...paths });
		} else {
			runAiPodcastPage(job, page, paths);
		}
		const transcript = cleanSpokenTranscript(
			fs.existsSync(paths.transcriptPath) ? fs.readFileSync(paths.transcriptPath, 'utf8') : '',
		);
		if (!transcript) throw new Error(`AI podcast transcript is empty on page ${page.pageNumber}`);
		const duration = ffprobeDuration(paths.audioPath);
		const timing = readTiming(paths.timingPath, duration);
		const cleaned = removeClosingSpeech({ paths, timing, transcript, duration: timing.duration });

		return {
			pageNumber: page.pageNumber,
			audioPath: paths.audioPath,
			timingPath: paths.timingPath,
			transcriptPath: paths.transcriptPath,
			costPath: paths.costPath,
			duration: cleaned.duration,
			transcript: cleaned.transcript,
			subtitleEvents: cleaned.subtitleEvents,
			subtitleSource: timing.source,
			trimmedClosingSpeech: cleaned.trimmedClosingSpeech,
		};
	});
	fs.writeFileSync(job.pageAudioManifestPath, JSON.stringify({ pages }, null, 2), 'utf8');
	if (job.costPath) {
		const pageCosts = pages.map((page) => (
			page.costPath && fs.existsSync(page.costPath)
				? JSON.parse(fs.readFileSync(page.costPath, 'utf8'))
				: { aiPodcast: { usageUnavailable: true } }
		));
		fs.writeFileSync(job.costPath, JSON.stringify(aggregatePresentationCost({
			jobId: job.jobId,
			pageCosts,
			pageCount: pages.length,
			totalAudioDuration: pages.reduce((sum, page) => sum + Number(page.duration || 0), 0),
		}), null, 2), 'utf8');
	}
	console.log(JSON.stringify({
		ok: true,
		pageAudioManifestPath: job.pageAudioManifestPath,
		pageCount: pages.length,
	}));
}

try {
	main();
} catch (error) {
	console.error(error.stack || error.message);
	process.exit(1);
}
