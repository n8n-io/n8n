// Writes synthetic JSON payloads at the sizes of the real mix
// (mix/mix-sizes.json: vendor response p50 359 B, mean 762 B, p90 1,352 B,
// p99 4,399 B, max 214 KB). The shape is that of vendor API answers:
// nested objects, ids, short strings, numbers, booleans, rows of cells and
// some escaped text. No real data is used.
//   node bench/floor/gen-json.mjs <out-dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2];
mkdirSync(outDir, { recursive: true });

// A small deterministic generator, so every run writes the same bytes.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const word = () => ['alpha', 'order', 'status', 'Sales Q1', 'user', 'done', 'open', 'invoice', 'note'][Math.floor(rnd() * 9)];

function record(i) {
	return {
		id: `rec_${(1e9 + i * 7919).toString(36)}`,
		createdTime: new Date(1.7e12 + i * 6e4).toISOString(),
		fields: {
			Name: `${word()} ${i}`,
			Email: `user${i}@example.com`,
			Amount: Math.round(rnd() * 1e5) / 100,
			Count: Math.floor(rnd() * 50),
			Done: rnd() > 0.5,
			Tags: [word(), word()],
			Notes: `Line one "quoted"\nline two ${word()} été`,
		},
	};
}

function payload(target) {
	const doc = { kind: 'list', nextPageToken: null, resultSizeEstimate: 0, items: [] };
	let i = 0;
	while (JSON.stringify(doc).length < target) doc.items.push(record(i++));
	if (doc.items.length > 1) doc.items.pop();
	doc.resultSizeEstimate = doc.items.length;
	return JSON.stringify(doc);
}

for (const [name, size] of [
	['p50-360', 360],
	['mean-760', 760],
	['p90-1350', 1350],
	['p99-4400', 4400],
	['64k', 65536],
	['max-214k', 214000],
]) {
	const text = payload(size);
	writeFileSync(join(outDir, `${name}.json`), text);
	console.log(name, text.length);
}
