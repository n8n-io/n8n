// Writes testdata/json_error_cases.json: the messages of `JSON.parse` errors
// that the JavaScript engine of Node.js gives for generated texts, for
// `json_error.zig`. A null message means that the text parses.
// Run: node src/core/gen_json_error_cases.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixed = [
	'', ' ', '\t', '{', '[', '-', '1.', '1e', '1e+', '01', '"abc', '"a\\x"', '"a\\u12"', '"a\nb"',
	'tru', 'trux', 'nul', '{"a"', '{"a":', '{"a":1', '{"a":1,', '{"a":1,}', '[1,]', '[1 2]',
	'{"a" 1}', '{a:1}', '1 2', 'undefined', 'NaN', 'Infinity', '[object Object]',
	'abcdefghijklmnopqrstuvwxyz', '{"aaaaaaaaaaaaaaaaaaaa": x}', '\r\n\r\nx', '\n\rx',
	'["a" ,\n x]', '"\\u', '-x', '1.x', '[-]', '{"a":1 "b":2}', '{,}', '"😀" x', 'x😀',
	'[1,"😀😀😀😀😀😀😀😀😀😀😀" x]', '}', ']', ':', ',', ' ', '{"a":[1,{"b":null}]}',
	'<html><body>Error 502</body></html>', '```json\n{"a":1}\n```', "{'a': 1}", '{"a":1}}',
	'[1,2,3,]', '{"text":"line1\nline2"}', 'True', 'None', '"\\uD83D\\uDE00"', '123abc',
];

const atoms = ['{', '}', '[', ']', ',', ':', '"', '\\', 'u', '0', '1', '9', '-', '+', '.', 'e', 'E', 't',
	'r', 'ue', 'true', 'false', 'null', 'nul', 'a', 'x', ' ', '\n', '\r', '\t', '\r\n', '"a"', '"key"',
	'12.5', '😀', 'é', '\u0001', ' ', 'abcdefghijklmnop', '"aaaaaaaaaaaaaaaaaaaa"', '\\u00',
	'\\uD83D', '1e5', '01'];

let seed = 20261112;
const rnd = (k) => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed % k;
};
const valid = (d) => {
	const k = rnd(d > 3 ? 4 : 7);
	if (k === 0) return `"${'ab😀\\n'.slice(0, rnd(6))}"`;
	if (k === 1) return String(rnd(1000) - 500) + (rnd(2) ? '.5' : '');
	if (k === 2) return ['true', 'false', 'null'][rnd(3)];
	if (k === 3) return '"x"';
	if (k === 4) return `[${Array.from({ length: rnd(4) }, () => valid(d + 1)).join(rnd(3) ? ',' : ' , ')}]`;
	return `{${Array.from({ length: rnd(4) }, (_, j) => `"k${j}"${rnd(4) ? ':' : ' : '}${valid(d + 1)}`).join(',')}}`;
};
const generated = [];
while (generated.length < 6000) {
	let s;
	const mode = rnd(3);
	if (mode === 0) s = Array.from({ length: rnd(12) }, () => atoms[rnd(atoms.length)]).join('');
	else {
		s = valid(0);
		const edits = 1 + rnd(3);
		for (let e = 0; e < edits; e++) {
			const p = rnd(s.length + 1);
			const op = rnd(3);
			if (op === 0) s = s.slice(0, p) + atoms[rnd(atoms.length)] + s.slice(p);
			else if (op === 1) s = s.slice(0, p) + s.slice(p + 1 + rnd(3));
			else s = s.slice(0, p);
		}
		if (mode === 2) s = ' '.repeat(rnd(15)) + s + 'z'.repeat(rnd(2) * 30);
	}
	generated.push(s);
}

// JSON files cannot hold lone surrogates as text; `json_error.zig` tests those cuts itself.
const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const cases = [];
for (const text of [...fixed, ...generated]) {
	let message = null;
	try {
		JSON.parse(text);
	} catch (e) {
		message = e.message;
	}
	if (lone.test(text) || (message !== null && lone.test(message))) continue;
	cases.push({ text, message });
}
const out = join(dirname(fileURLToPath(import.meta.url)), 'testdata', 'json_error_cases.json');
writeFileSync(out, `[\n${cases.map((c) => JSON.stringify(c)).join(',\n')}\n]\n`);
console.log(`${cases.length} cases`);
