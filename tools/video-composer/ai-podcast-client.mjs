#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	buildAiPodcastRequest,
	buildEnvConfig,
	decodePodcastFrame,
	encodeFinishConnectionFrame,
	encodePodcastRequestFrame,
	encodeStartConnectionFrame,
	estimatePodcastCost,
	extractPodcastTranscript,
	extractAudioChunks,
	normalizeNativeTiming,
	normalizePodcastRoundTiming,
	requireSubtitleTiming,
	summarizePodcastUsage,
} from './ai-podcast-utils.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnvFile(envFile) {
	const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const separator = trimmed.indexOf('=');
		if (separator <= 0) continue;
		const key = trimmed.slice(0, separator).trim();
		let value = trimmed.slice(separator + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = value;
	}
}

function loadLocalEnv() {
	const envFile = process.env.VIDEO_CLIP_ENV_FILE
		|| path.resolve(__dirname, '..', '..', '.env.video-clip');
	if (!fs.existsSync(envFile)) return;

	try {
		const dotenv = require('dotenv');
		dotenv.config({ path: envFile, quiet: true });
	} catch {
		parseEnvFile(envFile);
	}
}

function usage() {
	console.error('Usage: node tools/video-composer/ai-podcast-client.mjs JOB_JSON_PATH');
	process.exit(1);
}

function loadJob(jobPath) {
	if (!jobPath) usage();
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	for (const field of [
		'jobId',
		'podcastInputText',
		'ttsDir',
		'audioPath',
		'ttsTimingPath',
		'podcastMetadataPath',
		'podcastRawResponsePath',
	]) {
		if (!job[field]) throw new Error(`AI podcast job missing field: ${field}`);
	}

	return job;
}

function normalizeMessageData(data) {
	if (Buffer.isBuffer(data)) return data;
	if (data instanceof ArrayBuffer) return Buffer.from(data);
	if (Array.isArray(data)) return Buffer.concat(data.map(normalizeMessageData));
	if (typeof data === 'string') return Buffer.from(data);
	return Buffer.from(String(data ?? ''));
}

function getAudioDurationSeconds(audioPath) {
	const result = spawnSync('ffprobe', [
		'-v', 'error',
		'-show_entries', 'format=duration',
		'-of', 'default=nw=1:nk=1',
		audioPath,
	], { encoding: 'utf8' });
	const duration = Number(result.stdout.trim());
	return Number.isFinite(duration) ? duration : 0;
}

async function collectFramesWithWebSocket(config, request, job) {
	const WebSocket = require('ws');
	const frames = [];
	const rawChunks = [];
	const headers = {
		'X-Api-Resource-Id': config.resourceId,
		'X-Api-Request-Id': job.jobId,
	};
	if (config.apiKey) {
		headers['X-Api-Key'] = config.apiKey;
	} else {
		headers['X-Api-App-Id'] = config.appId;
		headers['X-Api-Access-Key'] = config.accessKey;
	}
	if (config.appKey) headers['X-Api-App-Key'] = config.appKey;

	await new Promise((resolve, reject) => {
		let settled = false;
		let sessionId = '';
		const socket = new WebSocket(config.url, { headers });
		const timeoutMs = Number(job.aiPodcastTimeoutMs || process.env.AI_PODCAST_TIMEOUT_MS || 180000);
		const timeout = setTimeout(() => {
			if (settled) return;
			settled = true;
			socket.terminate();
			reject(new Error('AI podcast WebSocket timed out'));
		}, timeoutMs);

		function finish(error) {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			if (error) reject(error);
			else resolve();
		}

		function sendFinishConnection() {
			if (socket.readyState === WebSocket.OPEN) socket.send(encodeFinishConnectionFrame());
		}

		socket.on('open', () => socket.send(encodeStartConnectionFrame()));
		socket.on('message', (data) => {
			const buffer = normalizeMessageData(data);
			rawChunks.push(buffer);
			let decoded;
			try {
				decoded = decodePodcastFrame(buffer);
			} catch (error) {
				finish(error);
				return;
			}
			if (decoded?.error) {
				finish(new Error(`AI podcast service error: ${JSON.stringify(decoded.error)}`));
				return;
			}
			if (decoded?.sessionId) sessionId = decoded.sessionId;
			if (decoded?.json) frames.push(decoded.json);
			if (decoded?.audio) frames.push({ binaryAudio: decoded.audio });
			if (decoded?.eventType === 50) {
				if (!sessionId) {
					finish(new Error('AI podcast connection started without a session id'));
					return;
				}
				socket.send(encodePodcastRequestFrame(request, sessionId));
				return;
			}
			if (decoded?.eventType === 363) {
				sendFinishConnection();
				socket.close();
				return;
			}
			const frame = decoded?.json;
			if (['done', 'completed', 'finish', 'finished', 'PodcastEnd'].includes(String(frame?.event || frame?.status))) {
				sendFinishConnection();
				socket.close();
			}
		});
		socket.on('error', (error) => finish(error));
		socket.on('close', () => finish());
	});

	return { frames, rawChunks };
}

async function main() {
	loadLocalEnv();
	const job = loadJob(process.argv[2]);
	fs.mkdirSync(job.ttsDir, { recursive: true });
	const config = buildEnvConfig(process.env);
	const request = buildAiPodcastRequest({
		jobId: job.jobId,
		inputText: job.podcastInputText,
		speakerA: job.podcastSpeakerA || config.speakerA,
		speakerB: job.podcastSpeakerB || config.speakerB,
		useHeadMusic: job.useHeadMusic,
	});

	let frames;
	let rawChunks;
	if (process.env.AI_PODCAST_FIXTURE_FRAMES) {
		frames = JSON.parse(fs.readFileSync(process.env.AI_PODCAST_FIXTURE_FRAMES, 'utf8'));
		rawChunks = frames.map((frame) => Buffer.from(JSON.stringify(frame)));
	} else {
		({ frames, rawChunks } = await collectFramesWithWebSocket(config, request, job));
	}

	fs.writeFileSync(job.podcastRawResponsePath, Buffer.concat(rawChunks));

	const audioChunks = extractAudioChunks(frames);
	if (audioChunks.length === 0) throw new Error('AI podcast service returned no audio chunks');
	fs.writeFileSync(job.audioPath, Buffer.concat(audioChunks));
	const audioDuration = getAudioDurationSeconds(job.audioPath);
	const transcript = extractPodcastTranscript(frames);
	if (job.transcriptPath && transcript) fs.writeFileSync(job.transcriptPath, transcript, 'utf8');
	const podcastUsage = summarizePodcastUsage(frames);
	const podcastCost = estimatePodcastCost(
		podcastUsage,
		process.env.DOUBAO_AI_PODCAST_PRICE_PER_MILLION_TOKENS || 70,
	);
	const cost = {
		jobId: job.jobId,
		aiPodcast: podcastCost,
		subtitle: {
			source: '',
			extraCostCny: 0,
		},
		totalEstimatedCostCny: podcastCost.estimatedCostCny,
	};

	const timing = requireSubtitleTiming(normalizeNativeTiming(frames), {
		fallback: config.subtitleFallback,
		inputText: transcript,
		audioDuration,
		roundTiming: normalizePodcastRoundTiming(frames),
	});
	cost.subtitle.source = timing.source;
	fs.writeFileSync(job.ttsTimingPath, JSON.stringify(timing, null, 2), 'utf8');
	if (job.costPath) fs.writeFileSync(job.costPath, JSON.stringify(cost, null, 2), 'utf8');
	fs.writeFileSync(job.podcastMetadataPath, JSON.stringify({
		request: { ...request, input_text: request.input_text.slice(0, 2000) },
		resourceId: config.resourceId,
		frameCount: frames.length,
		audioDuration,
		subtitleSource: timing.source,
		transcriptPath: job.transcriptPath || '',
		transcriptPreview: transcript.slice(0, 2000),
		cost,
		jsonFrames: frames
			.filter((frame) => !Buffer.isBuffer(frame?.binaryAudio))
			.slice(0, 20),
	}, null, 2));

	console.log(JSON.stringify({
		ok: true,
		audioPath: job.audioPath,
		ttsTimingPath: job.ttsTimingPath,
		subtitleSource: timing.source,
		transcriptPath: job.transcriptPath || '',
		costPath: job.costPath || '',
		cost,
	}));
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
