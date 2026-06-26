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

/** Tokenize a label into lowercased words. Mirrors the runtime emoji search. */
function labelWords(label) {
	if (!label) return new Set();
	return new Set(
		label
			.toLowerCase()
			.split(/[\s\-:,]+/)
			.filter((w) => w.length > 0),
	);
}

/**
 * Build the extra-keyword list: tags that are NOT already derivable from the
 * label. The runtime search matches the label string directly, so re-storing
 * label words as keywords would be redundant.
 */
function buildKeywords(emoji) {
	if (!emoji.tags) return [];
	const fromLabel = labelWords(emoji.label);
	const extra = new Set();
	for (const tag of emoji.tags) {
		const normalized = tag.toLowerCase();
		if (!fromLabel.has(normalized)) extra.add(normalized);
	}
	return [...extra];
}

// Fitzpatrick skin-tone modifiers (tones 1–5) and the emoji variation selector.
const SKIN_TONE_MODIFIERS = ['\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'];
const VARIATION_SELECTOR_16 = '\u{FE0F}';

/**
 * Apply a skin-tone modifier (tone 1–5) to a single-person base emoji by
 * inserting the modifier after the first code point, replacing a trailing
 * variation selector. Keep in sync with `applySkinTone` in
 * packages/frontend/@n8n/design-system/src/components/N8nIconPicker/skinTone.ts.
 */
function applySkinTone(unicode, toneIndex) {
	const modifier = SKIN_TONE_MODIFIERS[toneIndex - 1];
	if (!modifier) return unicode;
	const codePoints = [...unicode];
	let rest = codePoints.slice(1);
	if (rest[0] === VARIATION_SELECTOR_16) rest = rest.slice(1);
	return codePoints[0] + modifier + rest.join('');
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
	let derivableSkins = 0;
	let explicitSkins = 0;

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

		const entry = {
			u: emoji.unicode,
			l: titleCase(emoji.label || ''),
		};
		if (keywords.length > 0) {
			entry.k = keywords;
		}
		if (skins) {
			// If runtime derivation reproduces all five variants, store only a
			// capability flag; otherwise keep the explicit variants (multi-person
			// sequences and any future emoji the rule can't derive).
			const derivable = skins.every(
				(variant, index) => applySkinTone(emoji.unicode, index + 1) === variant,
			);
			if (derivable) {
				entry.t = 1;
				derivableSkins++;
			} else {
				entry.s = skins;
				explicitSkins++;
			}
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
	console.log(`Skin tones: ${derivableSkins} derivable (t), ${explicitSkins} explicit (s)`);

	// Generate TypeScript
	let output = `// AUTO-GENERATED by scripts/generate-emoji-data.mjs — DO NOT EDIT
// Source: emojibase-data/en/compact.json
// Emojis: ${totalEmojis} | Sections: ${sectionOutputs.length} | Skin tones: ${derivableSkins} derivable, ${explicitSkins} explicit

export interface EmojiEntry {
\t/** Emoji unicode character */
\tu: string;
\t/** Human-readable CLDR label (e.g. "Grinning Face") */
\tl: string;
\t/** Extra keywords (tags not already in the label, lowercased); omitted when none */
\tk?: string[];
\t/** Skin-tone capable — the five variants are derived at runtime via applySkinTone() */
\tt?: 1;
\t/** Explicit skin-tone variants [light, medium-light, medium, medium-dark, dark] for sequences runtime derivation can't produce */
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
			const parts = [`u: '${emoji.u}'`, `l: ${JSON.stringify(emoji.l)}`];
			if (emoji.k) parts.push(`k: ${JSON.stringify(emoji.k)}`);
			if (emoji.t) parts.push('t: 1');
			if (emoji.s) parts.push(`s: ${JSON.stringify(emoji.s)}`);
			output += `\t\t\t{ ${parts.join(', ')} },\n`;
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
