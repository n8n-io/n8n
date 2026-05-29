import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = new URL('./extract-presentation.mjs', import.meta.url).pathname;

function makeTmpJob(inputName) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-extract-'));
	const presentationDir = path.join(root, 'presentation');
	const pagesDir = path.join(root, 'pages');
	fs.mkdirSync(presentationDir, { recursive: true });
	fs.mkdirSync(pagesDir, { recursive: true });
	const sourcePath = path.join(presentationDir, inputName);
	fs.writeFileSync(sourcePath, 'fixture');
	const jobPath = path.join(root, 'job.json');
	fs.writeFileSync(jobPath, JSON.stringify({
		jobId: 'extract-test',
		sourcePath,
		presentationDir,
		pagesDir,
		pagesManifestPath: path.join(root, 'pages.json'),
	}, null, 2));

	return { root, jobPath };
}

test('extract-presentation rejects unsupported file types', () => {
	const { jobPath } = makeTmpJob('source.txt');
	const result = spawnSync('node', [scriptPath, jobPath], { encoding: 'utf8' });
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Only PDF and PPTX files are supported/);
});

test('extract-presentation can run with fixture pages for offline tests', () => {
	const { root, jobPath } = makeTmpJob('source.pdf');
	const fixturePath = path.join(root, 'fixture-pages.json');
	fs.writeFileSync(fixturePath, JSON.stringify({
		sourceType: 'pdf',
		pages: [
			{ text: '第一页标题' },
			{ text: '' },
		],
	}));
	const result = spawnSync('node', [scriptPath, jobPath], {
		encoding: 'utf8',
		env: { ...process.env, PRESENTATION_EXTRACT_FIXTURE: fixturePath },
	});
	assert.equal(result.status, 0, result.stderr);
	const manifest = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf8'));
	assert.equal(manifest.pageCount, 2);
	assert.equal(manifest.pages[0].text, '第一页标题');
	assert.equal(manifest.pages[1].isTextSparse, true);
	assert.equal(fs.existsSync(manifest.pages[0].imagePath), true);
	assert.equal(fs.existsSync(manifest.pages[0].textPath), true);
});

test('extract-presentation extracts a real PDF with PyMuPDF', () => {
	const { root, jobPath } = makeTmpJob('source.pdf');
	const sourcePath = path.join(root, 'presentation', 'source.pdf');
	const createPdf = spawnSync('python3', ['-c', `
import fitz
doc = fitz.open()
page = doc.new_page(width=640, height=360)
page.insert_text((72, 120), "Hello PDF page one")
page = doc.new_page(width=640, height=360)
page.insert_text((72, 120), "Hello PDF page two")
doc.save("${sourcePath}")
`], { encoding: 'utf8' });
	if (createPdf.status !== 0) {
		assert.fail(createPdf.stderr || createPdf.stdout);
	}
	const result = spawnSync('node', [scriptPath, jobPath], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	const manifest = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf8'));
	assert.equal(manifest.pageCount, 2);
	assert.match(manifest.pages[0].text, /Hello PDF page one/);
	assert.equal(fs.existsSync(manifest.pages[1].imagePath), true);
});
