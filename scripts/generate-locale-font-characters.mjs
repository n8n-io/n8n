#!/usr/bin/env node
/**
 * Walks locale JSON files, collects every character used in string values, and
 * writes a Storybook-friendly module grouped by Unicode block.
 *
 * Usage: node scripts/generate-locale-font-characters.mjs
 *
 * Output: packages/frontend/@n8n/design-system/src/styleguide/locale-characters.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT_PATH = resolve(
	ROOT,
	'packages/frontend/@n8n/design-system/src/styleguide/locale-characters.ts',
);

const LOCALE_DIRS = [
	'packages/frontend/@n8n/i18n/src/locales',
	'packages/@n8n/mcp-apps/src/locales',
];

/**
 * Named ranges used to group glyphs the way type foundry specimen pages do.
 * Characters outside these ranges land in "Other".
 */
const UNICODE_BLOCKS = [
	{ name: 'Basic Latin', start: 0x0020, end: 0x007e },
	{ name: 'Latin-1 Supplement', start: 0x00a0, end: 0x00ff },
	{ name: 'Latin Extended-A', start: 0x0100, end: 0x017f },
	{ name: 'Latin Extended-B', start: 0x0180, end: 0x024f },
	{ name: 'IPA Extensions', start: 0x0250, end: 0x02af },
	{ name: 'Spacing Modifier Letters', start: 0x02b0, end: 0x02ff },
	{ name: 'Combining Diacritical Marks', start: 0x0300, end: 0x036f },
	{ name: 'Greek and Coptic', start: 0x0370, end: 0x03ff },
	{ name: 'Cyrillic', start: 0x0400, end: 0x04ff },
	{ name: 'Cyrillic Supplement', start: 0x0500, end: 0x052f },
	{ name: 'Armenian', start: 0x0530, end: 0x058f },
	{ name: 'Hebrew', start: 0x0590, end: 0x05ff },
	{ name: 'Arabic', start: 0x0600, end: 0x06ff },
	{ name: 'General Punctuation', start: 0x2000, end: 0x206f },
	{ name: 'Superscripts and Subscripts', start: 0x2070, end: 0x209f },
	{ name: 'Currency Symbols', start: 0x20a0, end: 0x20cf },
	{ name: 'Letterlike Symbols', start: 0x2100, end: 0x214f },
	{ name: 'Number Forms', start: 0x2150, end: 0x218f },
	{ name: 'Arrows', start: 0x2190, end: 0x21ff },
	{ name: 'Mathematical Operators', start: 0x2200, end: 0x22ff },
	{ name: 'Miscellaneous Technical', start: 0x2300, end: 0x23ff },
	{ name: 'Box Drawing', start: 0x2500, end: 0x257f },
	{ name: 'Geometric Shapes', start: 0x25a0, end: 0x25ff },
	{ name: 'Miscellaneous Symbols', start: 0x2600, end: 0x26ff },
	{ name: 'Dingbats', start: 0x2700, end: 0x27bf },
	{ name: 'CJK Symbols and Punctuation', start: 0x3000, end: 0x303f },
	{ name: 'Hiragana', start: 0x3040, end: 0x309f },
	{ name: 'Katakana', start: 0x30a0, end: 0x30ff },
	{ name: 'CJK Unified Ideographs', start: 0x4e00, end: 0x9fff },
	{ name: 'Latin Extended Additional', start: 0x1e00, end: 0x1eff },
	{ name: 'Latin Extended-C', start: 0x2c60, end: 0x2c7f },
	{ name: 'Latin Extended-D', start: 0xa720, end: 0xa7ff },
	{ name: 'Latin Extended-E', start: 0xab30, end: 0xab6f },
];

function collectJsonFiles(dir) {
	const abs = resolve(ROOT, dir);
	try {
		return readdirSync(abs, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
			.map((entry) => join(abs, entry.name));
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return [];
		}
		throw error;
	}
}

function collectStrings(value, out) {
	if (typeof value === 'string') {
		out.push(value);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			collectStrings(item, out);
		}
		return;
	}
	if (value && typeof value === 'object') {
		for (const nested of Object.values(value)) {
			collectStrings(nested, out);
		}
	}
}

function shouldKeepCodePoint(codePoint) {
	if (codePoint <= 0x20 || codePoint === 0x7f) {
		return false;
	}
	if (codePoint >= 0x80 && codePoint <= 0x9f) {
		return false;
	}
	if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
		return false;
	}
	if (codePoint === 0xfeff) {
		return false;
	}
	return true;
}

function blockNameFor(codePoint) {
	for (const block of UNICODE_BLOCKS) {
		if (codePoint >= block.start && codePoint <= block.end) {
			return block.name;
		}
	}
	return 'Other';
}

function main() {
	const localeFiles = LOCALE_DIRS.flatMap(collectJsonFiles);
	if (localeFiles.length === 0) {
		throw new Error(
			`No locale JSON files found in:\n${LOCALE_DIRS.map((dir) => `  - ${dir}`).join('\n')}`,
		);
	}

	const characters = new Set();
	for (const file of localeFiles) {
		const strings = [];
		collectStrings(JSON.parse(readFileSync(file, 'utf8')), strings);
		for (const text of strings) {
			for (const char of text) {
				const codePoint = char.codePointAt(0);
				if (codePoint !== undefined && shouldKeepCodePoint(codePoint)) {
					characters.add(char);
				}
			}
		}
	}

	const grouped = new Map();
	for (const char of characters) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			continue;
		}
		const name = blockNameFor(codePoint);
		const list = grouped.get(name) ?? [];
		list.push(char);
		grouped.set(name, list);
	}

	const blockOrder = [...UNICODE_BLOCKS.map((block) => block.name), 'Other'];
	const blocks = blockOrder
		.filter((name) => grouped.has(name))
		.map((name) => ({
			name,
			characters: (grouped.get(name) ?? []).sort(
				(a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0),
			),
		}));

	const scanned = localeFiles.map((file) => relative(ROOT, file).replaceAll('\\', '/'));
	const output = `// AUTO-GENERATED by scripts/generate-locale-font-characters.mjs — DO NOT EDIT

export type LocaleCharacterBlock = {
	name: string;
	characters: string[];
};

export const localeFilesScanned: string[] = ${JSON.stringify(scanned, null, '\t')};

export const localeCharacterCount = ${characters.size};

export const localeCharacterBlocks: LocaleCharacterBlock[] = ${JSON.stringify(blocks, null, '\t')};
`;

	writeFileSync(OUTPUT_PATH, `${output}\n`);
	console.log(
		`Wrote ${characters.size} characters from ${localeFiles.length} locale file(s) to ${relative(ROOT, OUTPUT_PATH)}`,
	);
}

main();
