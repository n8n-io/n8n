#!/usr/bin/env node
/**
 * Reads a leaf `eslint.config.mjs` as text and returns its own config blocks:
 * whether each one is scoped to `files`, and which rules it sets to what.
 *
 * Text, not `import`, on purpose. Importing gives the fully expanded array with
 * the shared layer's blocks mixed in, and the question here is always "what does
 * THIS package decide", which is a property of the file.
 *
 * ponytail: a block assembled at runtime (spread of a computed array, a rule id
 * held in a variable) is invisible. `verify.mjs` cross-checks the totals against
 * `--print-config`, which would catch a package hiding decisions that way.
 */
import { readFileSync } from 'node:fs';

/** Blank out comments and string bodies so brace counting is not fooled by them. */
function mask(text) {
	const out = text.split('');
	let i = 0;
	const n = text.length;
	while (i < n) {
		const c = text[i];
		if (c === '/' && text[i + 1] === '/') {
			while (i < n && text[i] !== '\n') out[i++] = ' ';
			continue;
		}
		if (c === '/' && text[i + 1] === '*') {
			out[i++] = ' ';
			out[i++] = ' ';
			while (i < n && !(text[i] === '*' && text[i + 1] === '/')) out[i++] = ' ';
			if (i < n) {
				out[i++] = ' ';
				out[i++] = ' ';
			}
			continue;
		}
		if (c === "'" || c === '"' || c === '`') {
			i++;
			while (i < n && text[i] !== c) {
				if (text[i] === '\\') out[i++] = ' ';
				if (i < n) out[i++] = ' ';
			}
			if (i < n) i++;
			continue;
		}
		i++;
	}
	return out.join('');
}

/** Index of the brace closing the one at `open`, using the masked copy. */
function matchBrace(masked, open) {
	let depth = 0;
	for (let i = open; i < masked.length; i++) {
		const c = masked[i];
		if (c === '{' || c === '[') depth++;
		else if (c === '}' || c === ']') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

const SEVERITY = { error: 'error', warn: 'warn', off: 'off', 2: 'error', 1: 'warn', 0: 'off' };

/** Rule entries declared directly in this `rules: { ... }` body. */
function readRules(text, masked, open) {
	const end = matchBrace(masked, open);
	if (end === -1) return [];
	const rules = [];
	let i = open + 1;
	while (i < end) {
		// locate the next key on the masked copy, then read its name from the real
		// text at the same offset: mask() preserves offsets but empties string bodies
		const m = /(?:'[^']*'|"[^"]*"|[A-Za-z$_][\w$-]*)\s*:/.exec(masked.slice(i, end + 1));
		if (!m) break;
		const abs = i + m.index;
		const idMatch = /^(?:'([^']+)'|"([^"]+)"|([A-Za-z$_][\w$-]*))/.exec(text.slice(abs));
		const id = idMatch ? (idMatch[1] ?? idMatch[2] ?? idMatch[3]) : undefined;
		let v = abs + m[0].length;
		while (v < end && /\s/.test(masked[v])) v++;
		let severity;
		let hasOptions = false;
		if (masked[v] === '[') {
			const close = matchBrace(masked, v);
			const inner = text.slice(v + 1, close);
			const innerMasked = masked.slice(v + 1, close);
			const first = /^\s*(?:'([^']+)'|"([^"]+)"|(\d))/.exec(inner);
			severity = first ? SEVERITY[first[1] ?? first[2] ?? Number(first[3])] : undefined;
			// options exist only if a comma sits at this array's own depth
			let d = 0;
			for (let k = 0; k < innerMasked.length; k++) {
				const c = innerMasked[k];
				if (c === '[' || c === '{') d++;
				else if (c === ']' || c === '}') d--;
				else if (c === ',' && d === 0) hasOptions = true;
			}
			i = close + 1;
		} else {
			const lit = /^(?:'([^']+)'|"([^"]+)"|(\d))/.exec(text.slice(v, end + 1));
			severity = lit ? SEVERITY[lit[1] ?? lit[2] ?? Number(lit[3])] : undefined;
			const nested = masked[v] === '{' ? matchBrace(masked, v) : -1;
			i = nested === -1 ? v + (lit ? lit[0].length : 1) : nested + 1;
		}
		if (!id || severity === undefined) continue;
		rules.push({ id, severity, hasOptions, start: abs, end: i });
	}
	return rules;
}

/** @returns {{scoped: boolean, files: string[], rules: {id,severity,hasOptions}[]}[]} */
export function readConfigBlocks(configPath) {
	const text = readFileSync(configPath, 'utf8');
	const masked = mask(text);
	const blocks = [];

	// every `rules:` in the file belongs to exactly one enclosing object literal
	for (let i = masked.indexOf('rules:'); i !== -1; i = masked.indexOf('rules:', i + 1)) {
		const brace = masked.indexOf('{', i);
		if (brace === -1) continue;

		// find the object that owns this `rules:` key
		let depth = 0;
		let owner = -1;
		for (let j = i; j >= 0; j--) {
			const c = masked[j];
			if (c === '}' || c === ']') depth++;
			else if (c === '{' || c === '[') {
				if (depth === 0) {
					owner = j;
					break;
				}
				depth--;
			}
		}
		const ownerEnd = owner === -1 ? text.length : matchBrace(masked, owner);
		const ownerText = owner === -1 ? '' : text.slice(owner, ownerEnd);
		const ownerMasked = owner === -1 ? '' : masked.slice(owner, ownerEnd);
		const filesKey = /(^|[{,\s])files\s*:/.exec(ownerMasked);
		const files = [];
		if (filesKey) {
			const arr = ownerText.indexOf('[', filesKey.index);
			const close = matchBrace(mask(ownerText), arr);
			for (const g of ownerText.slice(arr, close).matchAll(/'([^']+)'|"([^"]+)"/g)) {
				files.push(g[1] ?? g[2]);
			}
		}
		blocks.push({
			scoped: Boolean(filesKey),
			files,
			rules: readRules(text, masked, brace),
			rulesStart: brace,
			rulesEnd: matchBrace(masked, brace),
		});
		i = brace;
	}
	return blocks;
}
