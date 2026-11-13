// Writes testdata/regex_cases.json: expected results of `RegExp.exec` of
// spec section 4.6, computed with the JavaScript engine of Node.js.
// Run: node src/core/gen_regex_cases.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** [source, flags, inputs] */
const patterns = [
	['abc', '', ['abc', 'xxabcxx', 'ab', '']],
	['a.c', '', ['abc', 'a\nc', 'a😀c', 'a\uD83Dc']],
	['a.c', 's', ['a\nc', 'a c']],
	['a.c', 'u', ['a😀c', 'a\uD83Dc']],
	['^\\d{3}-\\d{4}$', '', ['555-1234', '555-12345', 'x555-1234']],
	['\\w+@\\w+\\.\\w{2,}', '', ['mail me: jo.doe@example.com now', 'no mail', 'a@b.c']],
	['[A-Z][a-z]*', 'g', ['Hello World', 'hello', 'ÉCOLE']],
	['[^aeiou\\s]+', '', ['  rhythm and blues']],
	['\\s+', 'g', ['a \t\n  ﻿ b', 'nospace']],
	['\\S+', '', ['  　word　 ']],
	['\\bfoo\\b', '', ['a foo b', 'afoob', 'foo', 'foo_bar foo']],
	['\\Bo\\B', '', ['foo', 'o', 'boo k']],
	['(a)|(b)', '', ['b', 'ab', 'c']],
	['(a|ab)(c|bcd)(d*)', '', ['abcd']],
	['((a)|b)+', '', ['ab', 'ba', 'aab']],
	['(z)((a+)?(b+)?(c))*', '', ['zaacbbbcac']],
	['(a*)*', '', ['b', 'aaa']],
	['(a*)+', '', ['b']],
	['(?:a?)*?b', '', ['aab', 'b']],
	['(a?)??b', '', ['ab', 'b']],
	['a*?', '', ['aaa']],
	['a+?b', '', ['aaab']],
	['a{2,3}', 'g', ['aaaa', 'a']],
	['a{2,}?', '', ['aaaa']],
	['a{0}b', '', ['ab', 'b']],
	['(?:ab){2}', '', ['ababab', 'ab']],
	['x{1,2}?y', '', ['xxy']],
	['(\\d+)\\s\\1', '', ['42 42', '42 43', '1 11']],
	['\\1(a)', '', ['aa', 'a']],
	['(a)|\\1b', '', ['b', 'ab']],
	['(?<year>\\d{4})-(?<month>\\d{2})', '', ['on 2024-03-07']],
	['(?<w>\\w)\\k<w>', '', ['hello', 'abc']],
	['(?=(\\w+))\\1:', '', ['abc:', 'x']],
	['q(?!u)', '', ['quit qatar', 'qu']],
	['(?!(a))\\w', '', ['ab', 'ba']],
	['(?=a)', 'g', ['banana']],
	['^line', 'gm', ['line one\nline two\r\nline three', 'xline']],
	['end$', 'm', ['the end\nnext', 'the end']],
	['^$', 'm', ['a\n\nb', '']],
	['ABC', 'i', ['xabcx', 'xAbCx']],
	['straße', 'i', ['STRASSE', 'Straße', 'STRAẞE']],
	['σ', 'i', ['Σ', 'ς', 'σ']],
	['k', 'i', ['K', 'K', 'k']],
	['[a-z]+', 'i', ['ÄBC def', 'XYZ']],
	['[é]', 'i', ['É', 'e']],
	['[^a-z]', 'i', ['ABC1']],
	['\\u00e9', 'i', ['É']],
	['\\x41\\u0042\\cJ', '', ['AB\n']],
	['[\\b]', '', ['a\bb']],
	['[\\d.,]+', '', ['price: 1,234.50 EUR']],
	['[-a]', 'g', ['a-b']],
	['[a-]', 'g', ['-a']],
	['a]b}c{', '', ['a]b}c{']],
	['a{,2}', '', ['a{,2}']],
	['\\k', '', ['k']],
	['\\/\\*.*?\\*\\/', 'g', ['a /* one */ b /* two */']],
	['<[^>]+>', 'g', ['<p>Hi <b>there</b></p>']],
	['😀+', 'u', ['😀😀x']],
	['[😀-😂]', 'u', ['x😁']],
	['\\u{1F600}', 'u', ['😀']],
	['\\uD83D\\uDE00', 'u', ['😀']],
	['^.$', 'u', ['😀']],
	['^.$', '', ['😀']],
	['^..$', '', ['😀']],
	['foo', 'y', ['foofoo', 'xfoo']],
	['o', 'g', ['foo boo']],
	['', 'g', ['abc']],
	['(?:)', '', ['']],
	['a|', '', ['b']],
	['|a', '', ['a']],
	['(a|b|c|d|e|f)+?c', '', ['abfec']],
	['\\d+(?:\\.\\d+)?', 'g', ['v1.2.3 and 10']],
	['([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})', 'g', ['to: a.b@c.io, x_y@z.example.org']],
	['^\\s+|\\s+$', 'g', ['  padded  ']],
	['[\\u0300-\\u036f]', 'g', ['éà']],
	['(\\w+)\\s(\\w+)', '', ['John Smith']],
	['\\$(\\d+)', '', ['cost $42']],
	['[^\\x00-\\x7F]', 'g', ['naïve café']],
	['\\r?\\n', 'g', ['a\r\nb\nc']],
	['(["\'])(.*?)\\1', '', ['say "hi" or \'bye\'']],
	['^(?:\\+?1[-. ]?)?\\(?(\\d{3})\\)?[-. ]?(\\d{3})[-. ]?(\\d{4})$', '', ['+1 (555) 123-4567', '5551234567', '12345']],
	['(\\d{1,2})/(\\d{1,2})/(\\d{4})', '', ['due 3/7/2024']],
	['\\D+', '', ['abc123']],
	['\\W', 'g', ['a-b c']],
	['[\\s\\S]', '', ['\n']],
	['[\\w-]+', '', ['foo-bar baz']],
	['a(?=b)', '', ['ab', 'ac']],
	['(a)(?:b)(c)?', '', ['ab', 'abc']],
	['((((((((((a))))))))))\\10', '', ['aa']],
];

// Random patterns over a small alphabet, from a seeded generator, so the
// file is the same on each run.
let seed = 12345;
const rand = (n) => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed % n;
};
const pick = (list) => list[rand(list.length)];
let groupCount = 0;
function atom(depth) {
	const r = rand(depth > 2 ? 6 : 10);
	if (r < 3) return pick(['a', 'b', 'c', '.', 'A', 'é']);
	if (r === 3) return pick(['[ab]', '[^a]', '[a-c]', '\\d', '\\w', '\\s', '[\\w-]']);
	if (r === 4) return pick(['^', '$', '\\b', '\\B']);
	if (r === 5 && groupCount > 0) return `\\${1 + rand(groupCount)}`;
	if (r === 6) {
		groupCount++;
		return `(${alt(depth + 1)})`;
	}
	if (r === 7) return `(?:${alt(depth + 1)})`;
	if (r === 8) return `(?${pick(['=', '!'])}${alt(depth + 1)})`;
	return pick(['a', 'b']);
}
function term(depth) {
	const a = atom(depth);
	if (/^(\^|\$|\\b|\\B|\(\?[=!])/.test(a)) return a;
	const q = pick(['', '', '', '*', '+', '?', '{1,2}', '{2}', '{0,1}', '*?', '+?', '??', '{1,3}?']);
	return a + q;
}
function seq(depth) {
	let s = '';
	const n = 1 + rand(3);
	for (let k = 0; k < n; k++) s += term(depth);
	return s;
}
function alt(depth) {
	return rand(4) === 0 ? `${seq(depth)}|${seq(depth)}` : seq(depth);
}
for (let k = 0; k < 600; k++) {
	groupCount = 0;
	const source = alt(0);
	const flags = pick(['', '', 'i', 'm', 's', 'g']);
	const inputs = [0, 1, 2].map(() => {
		let t = '';
		const n = rand(9);
		for (let j = 0; j < n; j++) t += pick(['a', 'b', 'c', 'A', ' ', '\n', 'é', 'É', '1']);
		return t;
	});
	try {
		new RegExp(source, flags);
	} catch {
		continue;
	}
	patterns.push([source, flags, inputs]);
}

const out = [];
for (const [source, flags, inputs] of patterns) {
	for (const input of inputs) {
		for (const lastIndex of [0, 1, 3]) {
			if (lastIndex > 0 && !flags.includes('g') && !flags.includes('y') && lastIndex !== 1) continue;
			const re = new RegExp(source, flags.includes('y') ? `${flags}d` : `${flags.replace('g', '')}gd`);
			re.lastIndex = lastIndex;
			const m = re.exec(input);
			const expected = m === null ? null : m.indices.flatMap((p) => (p === undefined ? [-1, -1] : p));
			// Inputs as UTF-16 units: JSON parsers reject lone surrogates.
			const units = Array.from({ length: input.length }, (_, k) => input.charCodeAt(k));
			out.push({ source, flags, input: units, lastIndex, expected });
		}
	}
}
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'testdata', 'regex_cases.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`${out.length} cases`);
