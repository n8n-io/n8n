#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function splitScriptIntoSubtitleChunks(text, options = {}) {
	const maxChars = options.maxChars ?? 28;
	if (!Number.isFinite(maxChars) || maxChars <= 0) {
		throw new Error('maxChars must be a positive number');
	}

	const normalized = String(text)
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{2,}/g, '\n')
		.trim();

	if (!normalized) return [];

	const sentenceParts = normalized
		.split(/(?<=[。！？!?；;：:\n])/u)
		.map((part) => part.trim())
		.filter(Boolean);

	const chunks = [];
	for (const part of sentenceParts.length > 0 ? sentenceParts : [normalized]) {
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

export function assEscape(text) {
	return String(text).replace(/\\[nN]|\n|\\|[{}]/g, (match) => {
		if (match === '\\n' || match === '\\N' || match === '\n') return '\\N';
		if (match === '\\') return '\\\\';

		return `\\${match}`;
	});
}

export function toAssTime(seconds) {
	const safeSeconds = Math.max(0, Number(seconds) || 0);
	const totalCentiseconds = Math.round(safeSeconds * 100);
	const hours = Math.floor(totalCentiseconds / 360000);
	const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
	const wholeSeconds = Math.floor((totalCentiseconds % 6000) / 100);
	const centiseconds = totalCentiseconds % 100;

	return `${hours}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function buildTimeline(audioDuration, options = {}) {
	const coverDuration = Number(options.coverDuration ?? 3);
	const screenshotDuration = Number(options.screenshotDuration ?? 4);
	const introDuration = coverDuration + screenshotDuration;
	const totalDuration = Math.max(Number(audioDuration) || 0, introDuration);

	return {
		totalDuration,
		cover: { start: 0, end: coverDuration, duration: coverDuration },
		screenshot: {
			start: coverDuration,
			end: introDuration,
			duration: screenshotDuration,
		},
		body: {
			start: introDuration,
			end: totalDuration,
			duration: Math.max(0, totalDuration - introDuration),
		},
	};
}

function main() {
	const jobPath = process.argv[2];
	if (!jobPath) {
		console.error('Usage: node tools/video-composer/compose-video.mjs JOB_JSON_PATH');
		process.exit(2);
	}

	const resolvedJobPath = path.resolve(jobPath);
	if (!fs.existsSync(resolvedJobPath)) {
		console.error(`Job file not found: ${resolvedJobPath}`);
		process.exit(2);
	}

	console.error('Rendering is unavailable in this helper-only milestone.');
	process.exit(2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
