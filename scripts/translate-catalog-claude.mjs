#!/usr/bin/env node
// Usage: node scripts/translate-catalog-claude.mjs <source.json> [targetLang]
// Requires: @anthropic-ai/sdk (installed at the workspace root — `pnpm add -D -w @anthropic-ai/sdk`)
// Requires: ANTHROPIC_API_KEY set in the environment (or an `ant auth login` profile)
// Translates every string value in an i18n JSON catalog (e.g. en.json) into
// <targetLang> via the Claude API, preserving keys/structure, and writes the
// result next to the source file as <targetLang>.json.
// Re-running after a crash resumes: leaves whose output value already
// differs from the source value are assumed already translated and skipped.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const BATCH_SIZE = 50;
const CONCURRENCY = 3;
const MAX_RETRY_DELAY_MS = 60_000;

const [, , inputPath, targetLang = 'es'] = process.argv;

if (!inputPath) {
	console.error('Usage: node translate-catalog-claude.mjs <source.json> [targetLang]');
	process.exit(1);
}

const client = new Anthropic();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TRANSLATION_SCHEMA = {
	type: 'object',
	properties: {
		translations: {
			type: 'array',
			items: { type: 'string' },
		},
	},
	required: ['translations'],
	additionalProperties: false,
};

function collectLeaves(node, pathPrefix, out) {
	for (const [key, value] of Object.entries(node)) {
		const leafPath = [...pathPrefix, key];
		if (typeof value === 'string') {
			out.push({ path: leafPath, value });
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			collectLeaves(value, leafPath, out);
		}
	}
	return out;
}

function getIn(obj, leafPath) {
	return leafPath.reduce((node, key) => (node == null ? undefined : node[key]), obj);
}

function setIn(obj, leafPath, value) {
	let node = obj;
	for (let i = 0; i < leafPath.length - 1; i++) {
		node = node[leafPath[i]];
	}
	node[leafPath[leafPath.length - 1]] = value;
}

async function translateBatch(texts) {
	const response = await client.messages.create({
		model: 'claude-opus-5',
		max_tokens: 8192,
		thinking: { type: 'disabled' },
		output_config: {
			effort: 'low',
			format: { type: 'json_schema', schema: TRANSLATION_SCHEMA },
		},
		system:
			`Translate each UI string in the provided JSON array to the language with ISO 639-1 code "${targetLang}". ` +
			'Return exactly one translation per input string, in the same order. ' +
			'Preserve placeholders and interpolation syntax exactly (e.g. {name}, {{count}}, %s, <b>...</b>). ' +
			'Keep translations concise, matching the tone of short UI labels/buttons/messages. ' +
			'Do not translate an empty string into anything other than an empty string.',
		messages: [{ role: 'user', content: JSON.stringify(texts) }],
	});

	const textBlock = response.content.find((block) => block.type === 'text');
	const parsed = JSON.parse(textBlock.text);

	if (parsed.translations.length !== texts.length) {
		throw new Error(`Expected ${texts.length} translations, got ${parsed.translations.length}`);
	}

	return parsed.translations;
}

async function translateBatchWithRetry(texts) {
	let attempt = 0;
	for (;;) {
		try {
			return await translateBatch(texts);
		} catch (err) {
			attempt++;
			const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempt);
			console.warn(`Batch failed (attempt ${attempt}): ${err.message}. Waiting ${delay}ms before retrying.`);
			await sleep(delay);
		}
	}
}

const source = JSON.parse(readFileSync(inputPath, 'utf8'));

const { dir, name, ext } = path.parse(inputPath);
const outputPath = path.join(dir, `${targetLang}${ext}`);

const existingOutput = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, 'utf8')) : {};

const output = structuredClone(source);
const leaves = collectLeaves(source, [], []);

const pending = [];
for (const leaf of leaves) {
	const existingValue = getIn(existingOutput, leaf.path);
	if (typeof existingValue === 'string' && existingValue !== leaf.value) {
		setIn(output, leaf.path, existingValue);
	} else {
		pending.push(leaf);
	}
}

console.log(`${leaves.length - pending.length}/${leaves.length} already translated; ${pending.length} remaining.`);

function makeBatches(items) {
	const batches = [];
	for (let i = 0; i < items.length; i += BATCH_SIZE) {
		batches.push(items.slice(i, i + BATCH_SIZE));
	}
	return batches;
}

const batches = makeBatches(pending);
let done = leaves.length - pending.length;

for (let i = 0; i < batches.length; i += CONCURRENCY) {
	const group = batches.slice(i, i + CONCURRENCY);
	const results = await Promise.all(
		group.map((batch) => translateBatchWithRetry(batch.map((leaf) => leaf.value))),
	);

	group.forEach((batch, batchIndex) => {
		batch.forEach((leaf, leafIndex) => {
			setIn(output, leaf.path, results[batchIndex][leafIndex]);
		});
		done += batch.length;
	});

	writeFileSync(outputPath, JSON.stringify(output, null, '\t') + '\n', 'utf8');
	console.log(`Translated ${done}/${leaves.length}`);
}

console.log(`Wrote ${leaves.length} translated strings to ${outputPath}`);
