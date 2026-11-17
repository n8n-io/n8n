#!/usr/bin/env node
// Builds ../index.html from the .feature files in the parent folder.
// Run: node spec/viewer/build.mjs
// No dependencies. The page parses the Gherkin text in the browser.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const specDir = join(here, '..');
const solutionMd = join(specDir, '..', 'review', 'final', 'solution.md');
const explorerHtml = join(specDir, '..', 'visual', 'solution.html');

// Reading order. A file that is not listed goes to the last group.
const GROUPS = [
	['Gaps and exits', ['dependency-report', 'allow-incomplete', 'ask-the-owner', 'selection-across-projects']],
	['Promote', ['promote-dependencies', 'promote-credentials', 'instance-promote', 'promote-deletions']],
	['Apply', ['apply-dependencies', 'apply-credentials', 'apply-deletions']],
	['Both sides', ['existing-branches', 'moves', 'scope', 'permissions']],
];

const files = readdirSync(specDir).filter((f) => f.endsWith('.feature')).sort();
const listed = new Set(GROUPS.flatMap(([, names]) => names.map((n) => `${n}.feature`)));
const features = [];
for (const [group, names] of GROUPS) {
	for (const name of names) {
		const file = `${name}.feature`;
		if (files.includes(file)) features.push({ file, group, text: readFileSync(join(specDir, file), 'utf8') });
	}
}
for (const file of files.filter((f) => !listed.has(f))) {
	features.push({ file, group: GROUPS.at(-1)[0], text: readFileSync(join(specDir, file), 'utf8') });
}

// Open decisions: the question and the recommendation, from section 9 of solution.md.
const decisions = {};
if (existsSync(solutionMd)) {
	const blocks = readFileSync(solutionMd, 'utf8').split(/^\*\*Decision (?=\d+\.)/m).slice(1);
	for (const block of blocks) {
		const head = /^(\d+)\.\s+(.+?)\*\*/s.exec(block);
		if (!head) continue;
		const body = block.split(/^## /m)[0];
		const rec = /^- Recommendation:\s*(.+)$/m.exec(body);
		decisions[head[1]] = { question: head[2].replace(/\s+/g, ' '), recommendation: rec ? rec[1] : null };
	}
}

// Links from a Gherkin scenario to the animated scenario of the explorer page.
const links = {};
if (existsSync(explorerHtml)) {
	const html = readFileSync(explorerHtml, 'utf8');
	const fileOf = {};
	const map = /const F = \{([^}]*)\}/.exec(html);
	if (map) for (const m of map[1].matchAll(/(\w+):\s*'([^']+)'/g)) fileOf[m[1]] = m[2];
	for (const chunk of html.split(/\n\{ id: '/).slice(1)) {
		const id = chunk.slice(0, chunk.indexOf("'"));
		const title = /title: '((?:[^'\\]|\\.)*)'/.exec(chunk);
		for (const m of chunk.matchAll(/\[F\.(\w+), '((?:[^'\\]|\\.)*)'\]/g)) {
			const key = `${fileOf[m[1]]}::${m[2].replace(/\\'/g, "'")}`;
			(links[key] ??= []).push({ id, title: title ? title[1].replace(/\\'/g, "'") : id });
		}
	}
}

const data = { generated: new Date().toISOString(), features, decisions, links, explorer: '../visual/solution.html' };
const template = readFileSync(join(here, 'template.html'), 'utf8');
const marker = '/*__DATA__*/null';
if (!template.includes(marker)) throw new Error('template.html has no data marker');
const out = template.replace(marker, () => JSON.stringify(data).replace(/</g, '\\u003c'));
writeFileSync(join(specDir, 'index.html'), out);
console.log(`index.html: ${features.length} feature files, ${Object.keys(decisions).length} decisions, ${Object.keys(links).length} linked scenarios`);
