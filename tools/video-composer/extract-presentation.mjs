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
	fs.mkdirSync(job.presentationDir, { recursive: true });
	runTool('PRESENTATION_SOFFICE_BIN', 'soffice', [
		'--headless',
		'--convert-to',
		'pdf',
		'--outdir',
		job.presentationDir,
		job.sourcePath,
	]);
	const baseName = path.basename(job.sourcePath, path.extname(job.sourcePath));
	const convertedPath = path.join(job.presentationDir, `${baseName}.pdf`);
	if (!fs.existsSync(convertedPath)) {
		throw new Error(`LibreOffice did not create converted PDF: ${convertedPath}`);
	}

	return convertedPath;
}

function extractPdf(job, pdfPath, sourceType) {
	fs.mkdirSync(job.pagesDir, { recursive: true });
	const prefix = path.join(job.pagesDir, 'page');
	runTool('PRESENTATION_PDFTOPPM_BIN', 'pdftoppm', ['-png', '-r', '180', pdfPath, prefix]);
	runTool('PRESENTATION_PDFTOTEXT_BIN', 'pdftotext', ['-layout', pdfPath, path.join(job.pagesDir, 'all-pages.txt')]);
	const images = fs.readdirSync(job.pagesDir)
		.filter((file) => /^page-\d+\.png$/.test(file))
		.sort();
	if (images.length === 0) throw new Error('PDF extraction produced no page images');
	const allTextPath = path.join(job.pagesDir, 'all-pages.txt');
	const allText = fs.existsSync(allTextPath) ? fs.readFileSync(allTextPath, 'utf8') : '';
	const textPages = allText.split(/\f/g);
	const pages = images.map((imageFile, index) => {
		const pageNumber = index + 1;
		const name = safePageName(pageNumber);
		const imagePath = path.join(job.pagesDir, `${name}.png`);
		fs.renameSync(path.join(job.pagesDir, imageFile), imagePath);
		const text = String(textPages[index] || '').trim();
		const textPath = path.join(job.pagesDir, `${name}.txt`);
		fs.writeFileSync(textPath, text, 'utf8');

		return { pageNumber, imagePath, textPath, text, isTextSparse: text.length < 20 };
	});

	return validatePagesManifest({ sourceType, pageCount: pages.length, pages });
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
