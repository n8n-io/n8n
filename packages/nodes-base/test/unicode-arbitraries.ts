import nonspacingMarks from '@unicode/unicode-17.0.0/General_Category/Nonspacing_Mark/code-points';
import cyrillic from '@unicode/unicode-17.0.0/Script/Cyrillic/code-points';
import greek from '@unicode/unicode-17.0.0/Script/Greek/code-points';
import fc from 'fast-check';

/**
 * fast-check arbitraries for text that user data can contain but fixtures
 * rarely do: accents, other scripts, stacked combining marks, look-alike
 * characters. Node output that derives keys or file names from such text must
 * hold its shape for all of it. Character data comes from the pinned
 * `@unicode/unicode-*` package, so a Unicode version bump is a reviewable
 * dependency change, not a hidden behavior change.
 */

const ASCII_PRINTABLE = /^[\x20-\x7E]*$/;
const NON_ASCII = /[^\x20-\x7E]/;
const ANY_ASCII = /[\x20-\x7E]/;

const toLetters = (codePoints: number[]) =>
	codePoints.map((cp) => String.fromCodePoint(cp)).filter((ch) => /^\p{L}$/u.test(ch));

const cyrillicLetters = toLetters(cyrillic);
const greekLetters = toLetters(greek);
const combiningMarks = nonspacingMarks
	.filter((cp) => cp >= 0x0300 && cp <= 0x036f)
	.map((cp) => String.fromCodePoint(cp));

/**
 * Cyrillic and Greek letters that render like a Latin letter. A small, fixed
 * subset of the Unicode confusables table is enough to build look-alike names.
 */
const LOOK_ALIKES: Record<string, string[]> = {
	a: ['а', 'α'],
	c: ['с'],
	e: ['е', 'ё'],
	i: ['і', 'ι'],
	j: ['ј'],
	o: ['о', 'ο'],
	p: ['р', 'ρ'],
	s: ['ѕ'],
	v: ['ν'],
	x: ['х', 'χ'],
	y: ['у', 'γ'],
};

const knownLetters = new Set([...cyrillicLetters, ...greekLetters]);
for (const lookAlikes of Object.values(LOOK_ALIKES)) {
	for (const letter of lookAlikes) {
		if (!knownLetters.has(letter)) {
			throw new Error(
				`Look-alike ${letter} is not a Cyrillic or Greek letter in the pinned Unicode data`,
			);
		}
	}
}

/** Any Unicode text, one grapheme cluster at a time (accents, CJK, emoji, marks). */
export const unicodeText = (constraints: fc.StringConstraints = {}) =>
	fc.string({ unit: 'grapheme', minLength: 1, maxLength: 16, ...constraints });

/** Lowercase ASCII words, the shape most fixtures already use. */
export const asciiWord = fc.stringMatching(/^[a-z]{1,8}$/);

/**
 * A single grapheme with no ASCII code point in it. Excludes decomposed forms
 * such as `A` + combining grave, which keep their ASCII base letter.
 */
export const nonAsciiChar = unicodeText({ minLength: 1, maxLength: 1 }).filter(
	(ch) => !ANY_ASCII.test(ch),
);

/** A letter from the Cyrillic or Greek script, the usual source of look-alikes. */
export const nonLatinLetter = fc.constantFrom(...cyrillicLetters, ...greekLetters);

/** Words that mix Latin and non-Latin letters, like `Nаme` with a Cyrillic а. */
export const mixedScriptWord = fc
	.array(
		fc.oneof(
			{ weight: 3, arbitrary: fc.stringMatching(/^[a-z]$/) },
			{ weight: 1, arbitrary: nonLatinLetter },
		),
		{
			minLength: 2,
			maxLength: 10,
		},
	)
	.map((chars) => chars.join(''))
	.filter((word) => NON_ASCII.test(word));

/** ASCII text with one to six combining marks stacked on each character. */
export const zalgoText = (base: fc.Arbitrary<string> = asciiWord) =>
	fc
		.tuple(
			base,
			fc.infiniteStream(
				fc.array(fc.constantFrom(...combiningMarks), { minLength: 1, maxLength: 6 }),
			),
		)
		.map(([text, marks]) => {
			const iterator = marks[Symbol.iterator]();
			return Array.from(text, (ch) => ch + (iterator.next().value ?? []).join('')).join('');
		});

/**
 * The same ASCII text with at least one character swapped for a Unicode
 * look-alike. Characters without a look-alike (for example `m`) stay as is.
 */
export const homoglyphOf = (text: string) => {
	const swappable = Array.from(text).map((ch) => LOOK_ALIKES[ch.toLowerCase()] ?? []);
	if (swappable.every((options) => options.length === 0)) {
		return fc.constant(text);
	}
	return fc
		.tuple(
			...swappable.map((options) =>
				options.length ? fc.option(fc.constantFrom(...options)) : fc.constant(null),
			),
		)
		.map((picks) => Array.from(text, (ch, index) => picks[index] ?? ch).join(''))
		.filter((result) => result !== text);
};

/** A pair of an ASCII word and a look-alike variant of it. */
export const homoglyphPair = asciiWord
	.filter((word) => Array.from(word).some((ch) => (LOOK_ALIKES[ch] ?? []).length > 0))
	.chain((word) => fc.tuple(fc.constant(word), homoglyphOf(word)));

/** True when the text contains printable ASCII only. */
export const isAscii = (text: string) => ASCII_PRINTABLE.test(text);
