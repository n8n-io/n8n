#!/usr/bin/env node
/**
 * Generates emojiData.ts from emojibase-data compact English dataset.
 *
 * Usage: node scripts/generate-emoji-data.mjs
 *
 * Output: packages/frontend/@n8n/design-system/src/components/N8nIconPicker/emojiData.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const OUTPUT_PATH = resolve(
	ROOT,
	'packages/frontend/@n8n/design-system/src/components/N8nIconPicker/emojiData.ts',
);

// Emojibase group IDs to section keys and i18n label keys
const GROUP_MAP = {
	0: { key: 'people', labelKey: 'iconPicker.emojiSection.people' },
	1: { key: 'people', labelKey: 'iconPicker.emojiSection.people' }, // People & Body merged into People
	3: { key: 'animalsNature', labelKey: 'iconPicker.emojiSection.animalsNature' },
	4: { key: 'foodDrink', labelKey: 'iconPicker.emojiSection.foodDrink' },
	5: { key: 'travelPlaces', labelKey: 'iconPicker.emojiSection.travelPlaces' },
	6: { key: 'activity', labelKey: 'iconPicker.emojiSection.activity' },
	7: { key: 'objects', labelKey: 'iconPicker.emojiSection.objects' },
	8: { key: 'symbols', labelKey: 'iconPicker.emojiSection.symbols' },
	9: { key: 'flags', labelKey: 'iconPicker.emojiSection.flags' },
};

// Ordered section keys for output
const SECTION_ORDER = [
	'people',
	'animalsNature',
	'foodDrink',
	'activity',
	'travelPlaces',
	'objects',
	'symbols',
	'flags',
];

function buildKeywords(emoji) {
	const words = new Set();
	// Add label words
	if (emoji.label) {
		emoji.label
			.toLowerCase()
			.split(/[\s\-:,]+/)
			.filter((w) => w.length > 0)
			.forEach((w) => words.add(w));
	}
	// Add tags
	if (emoji.tags) {
		emoji.tags.forEach((t) => words.add(t.toLowerCase()));
	}
	return [...words];
}

/** Title-case an emoji label: "grinning face" → "Grinning Face" */
function titleCase(str) {
	return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Whether a skin tone represents a uniform variation.
 *
 * Single-person emojis use a scalar tone (1–5). Multi-person emojis use one tone
 * per person: emojibase collapses uniform combinations to a scalar but could also
 * represent them as an array whose entries are all equal (e.g. [3, 3]). Mixed
 * combinations such as [1, 2] are not uniform.
 */
function isUniformTone(tone) {
	if (typeof tone === 'number') {
		return true;
	}
	if (Array.isArray(tone) && tone.length > 0) {
		return tone.every((value) => value === tone[0]);
	}
	return false;
}

/** Build a hexcode → tone lookup from the full dataset's skin variations. */
function buildToneByHexcode(fullData) {
	const toneByHexcode = new Map();
	for (const emoji of fullData) {
		if (Array.isArray(emoji.skins)) {
			for (const skin of emoji.skins) {
				toneByHexcode.set(skin.hexcode, skin.tone);
			}
		}
	}
	return toneByHexcode;
}

function extractSkinTones(emoji, toneByHexcode) {
	if (!emoji.skins || !Array.isArray(emoji.skins) || emoji.skins.length === 0) {
		return undefined;
	}
	// Single-person emojis expose exactly five uniform tones. Multi-person emojis
	// expose every tone combination, ordered with the first person fixed at the
	// light tone — so the first five would be mixed pairs (light+light,
	// light+medium-light, …). Keep only the uniform variations so the five swatches
	// map cleanly onto [light, medium-light, medium, medium-dark, dark].
	const tones = [];
	for (const skin of emoji.skins) {
		if (tones.length >= 5) break;
		if (skin.unicode && isUniformTone(toneByHexcode.get(skin.hexcode))) {
			tones.push(skin.unicode);
		}
	}
	return tones.length === 5 ? tones : undefined;
}

function main() {
	console.log('Reading emojibase-data compact English dataset...');

	// Resolve from the design-system package where it's installed
	const compactDataPath = require.resolve('emojibase-data/en/compact.json');
	const rawData = JSON.parse(readFileSync(compactDataPath, 'utf-8'));

	console.log(`Loaded ${rawData.length} emoji entries`);

	// The compact dataset omits skin `tone` metadata, so load the full dataset to
	// tell uniform skin-tone variations apart from mixed multi-person combinations.
	const fullDataPath = require.resolve('emojibase-data/en/data.json');
	const fullData = JSON.parse(readFileSync(fullDataPath, 'utf-8'));
	const toneByHexcode = buildToneByHexcode(fullData);

	// Group emojis into sections
	const sections = {};
	for (const sectionKey of SECTION_ORDER) {
		sections[sectionKey] = [];
	}

	let skipped = 0;
	let totalWithSkins = 0;

	for (const emoji of rawData) {
		// Skip entries without a group (e.g. component characters, regional indicators without group)
		if (emoji.group === undefined || emoji.group === null) {
			skipped++;
			continue;
		}

		const groupInfo = GROUP_MAP[emoji.group];
		if (!groupInfo) {
			skipped++;
			continue;
		}

		const keywords = buildKeywords(emoji);
		const skins = extractSkinTones(emoji, toneByHexcode);
		if (skins) totalWithSkins++;

		const entry = {
			u: emoji.unicode,
			l: titleCase(emoji.label || ''),
			k: keywords,
		};
		if (skins) {
			entry.s = skins;
		}

		sections[groupInfo.key].push(entry);
	}

	// Build output
	let totalEmojis = 0;
	const sectionOutputs = [];

	for (const sectionKey of SECTION_ORDER) {
		const emojis = sections[sectionKey];
		if (emojis.length === 0) continue;
		totalEmojis += emojis.length;

		const groupInfo = Object.values(GROUP_MAP).find((g) => g.key === sectionKey);

		sectionOutputs.push({
			key: sectionKey,
			labelKey: groupInfo.labelKey,
			emojis,
		});
	}

	console.log(`Processed ${totalEmojis} emojis into ${sectionOutputs.length} sections (skipped ${skipped})`);
	console.log(`${totalWithSkins} emojis have skin tone variants`);

	// Generate TypeScript
	let output = `// AUTO-GENERATED by scripts/generate-emoji-data.mjs — DO NOT EDIT
// Source: emojibase-data/en/compact.json
// Emojis: ${totalEmojis} | Sections: ${sectionOutputs.length} | With skin tones: ${totalWithSkins}

export interface EmojiEntry {
\t/** Emoji unicode character */
\tu: string;
\t/** Human-readable CLDR label (e.g. "Grinning Face") */
\tl: string;
\t/** Searchable keywords (label words + tags, lowercased) */
\tk: string[];
\t/** Skin tone variants [light, medium-light, medium, medium-dark, dark] */
\ts?: [string, string, string, string, string];
}

export interface EmojiSection {
\tkey: string;
\tlabelKey: string;
\temojis: EmojiEntry[];
}

export const emojiSections: EmojiSection[] = [\n`;

	for (const section of sectionOutputs) {
		output += `\t{\n`;
		output += `\t\tkey: '${section.key}',\n`;
		output += `\t\tlabelKey: '${section.labelKey}',\n`;
		output += `\t\temojis: [\n`;
		for (const emoji of section.emojis) {
			const l = JSON.stringify(emoji.l);
			const k = JSON.stringify(emoji.k);
			if (emoji.s) {
				const s = JSON.stringify(emoji.s);
				output += `\t\t\t{ u: '${emoji.u}', l: ${l}, k: ${k}, s: ${s} },\n`;
			} else {
				output += `\t\t\t{ u: '${emoji.u}', l: ${l}, k: ${k} },\n`;
			}
		}
		output += `\t\t],\n`;
		output += `\t},\n`;
	}

	output += `];\n`;

	writeFileSync(OUTPUT_PATH, output);

	const sizeKB = Math.round(Buffer.byteLength(output) / 1024);
	console.log(`\nDone! Written to: ${OUTPUT_PATH}`);
	console.log(`File size: ${sizeKB} KB`);
}

main();
