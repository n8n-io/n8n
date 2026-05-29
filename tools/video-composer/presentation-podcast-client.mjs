#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { cleanSpokenTranscript, safePageName } from './presentation-utils.mjs';

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
	};
}

function copyFixturePage({ fixtureDir, name, audioPath, timingPath, transcriptPath }) {
	fs.copyFileSync(path.join(fixtureDir, `${name}.mp3`), audioPath);
	fs.copyFileSync(path.join(fixtureDir, `${name}.json`), timingPath);
	fs.copyFileSync(path.join(fixtureDir, `${name}.txt`), transcriptPath);
}

function runAiPodcastPage(job, page, paths) {
	const pageJobPath = path.join(job.audioDir, `${paths.name}-ai-podcast-job.json`);
	fs.writeFileSync(pageJobPath, JSON.stringify({
		jobId: `${job.jobId}-${paths.name}`,
		podcastInputText: page.speakerPrompt,
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
	const pages = script.pages.map((page) => {
		const name = safePageName(page.pageNumber);
		const paths = {
			name,
			audioPath: path.join(job.audioDir, `${name}.mp3`),
			timingPath: path.join(job.timingDir, `${name}.json`),
			transcriptPath: path.join(job.transcriptDir, `${name}.txt`),
			costPath: path.join(job.audioDir, `${name}-cost.json`),
			metadataPath: path.join(job.audioDir, `${name}-metadata.json`),
			rawResponsePath: path.join(job.audioDir, `${name}-response.binlog`),
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

		return {
			pageNumber: page.pageNumber,
			audioPath: paths.audioPath,
			timingPath: paths.timingPath,
			transcriptPath: paths.transcriptPath,
			costPath: paths.costPath,
			duration: timing.duration,
			transcript,
			subtitleEvents: timing.subtitleEvents,
			subtitleSource: timing.source,
		};
	});
	fs.writeFileSync(job.pageAudioManifestPath, JSON.stringify({ pages }, null, 2), 'utf8');
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
