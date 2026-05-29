#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { safePageName, validatePagesManifest } from './presentation-utils.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
	'base64',
);

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
	console.error('Usage: node tools/video-composer/extract-presentation.mjs JOB_JSON_PATH');
	process.exit(1);
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { encoding: 'utf8', ...options });
	if (result.status !== 0) {
		throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
	}

	return result.stdout;
}

function runTool(envName, fallbackCommand, args, options = {}) {
	const command = process.env[envName] || fallbackCommand;

	return run(command, args, options);
}

function extensionOf(filePath) {
	return path.extname(String(filePath || '')).toLowerCase();
}

function writeFixturePages(job, fixturePath, sourceType) {
	const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
	const pages = fixture.pages.map((page, index) => {
		const pageNumber = index + 1;
		const name = safePageName(pageNumber);
		const imagePath = path.join(job.pagesDir, `${name}.png`);
		const textPath = path.join(job.pagesDir, `${name}.txt`);
		fs.writeFileSync(imagePath, FIXTURE_PNG);
		const text = String(page.text || '').trim();
		fs.writeFileSync(textPath, text, 'utf8');

		return { pageNumber, imagePath, textPath, text, isTextSparse: text.length < 20 };
	});

	return validatePagesManifest({ sourceType, pageCount: pages.length, pages });
}

function convertPptxToPdf(job) {
	throw new Error('PPTX input is not supported in the current MVP. Upload PDF for now.');
}

function extractPdf(job, pdfPath, sourceType) {
	fs.mkdirSync(job.pagesDir, { recursive: true });
	const helperPath = path.join(__dirname, 'extract-pdf-pymupdf.py');
	const outputPath = path.join(job.pagesDir, 'pages-pymupdf.json');
	runTool('PRESENTATION_PYTHON_BIN', 'python3', [helperPath, pdfPath, job.pagesDir, outputPath]);
	if (!fs.existsSync(outputPath)) throw new Error(`PyMuPDF extraction did not create output JSON: ${outputPath}`);
	const payload = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

	return validatePagesManifest({ ...payload, sourceType });
}

function main() {
	loadLocalEnv();
	const jobPath = process.argv[2];
	if (!jobPath) usage();
	const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
	for (const field of ['sourcePath', 'presentationDir', 'pagesDir', 'pagesManifestPath']) {
		if (!job[field]) throw new Error(`Presentation extract job missing field: ${field}`);
	}
	const extension = extensionOf(job.sourcePath);
	if (!['.pdf', '.pptx'].includes(extension)) {
		throw new Error('Only PDF and PPTX files are supported.');
	}
	fs.mkdirSync(job.presentationDir, { recursive: true });
	fs.mkdirSync(job.pagesDir, { recursive: true });
	const sourceType = extension.slice(1);
	const manifest = process.env.PRESENTATION_EXTRACT_FIXTURE
		? writeFixturePages(job, process.env.PRESENTATION_EXTRACT_FIXTURE, sourceType)
		: extractPdf(job, extension === '.pptx' ? convertPptxToPdf(job) : job.sourcePath, sourceType);
	fs.writeFileSync(job.pagesManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
	console.log(JSON.stringify({
		ok: true,
		pagesManifestPath: job.pagesManifestPath,
		pageCount: manifest.pageCount,
	}));
}

try {
	main();
} catch (error) {
	console.error(error.stack || error.message);
	process.exit(1);
}
