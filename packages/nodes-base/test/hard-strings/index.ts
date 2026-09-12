import { alphabetMap } from 'confusables';
import fc from 'fast-check';

import {
	ARABIC,
	BIDI_CONTROLS,
	CASE_EDGE,
	chars,
	CYRILLIC,
	DEVANAGARI_CONSONANTS,
	DEVANAGARI_VOWEL_SIGNS,
	DIACRITICAL_MARKS,
	DIGITS,
	FULLWIDTH,
	GREEK,
	HAN,
	HANGUL,
	HEBREW,
	HIRAGANA,
	INVISIBLE,
	isAscii,
	KATAKANA,
	LATIN_ACCENTED,
	PICTOGRAPHS,
	REGIONAL_INDICATORS,
	SKIN_TONES,
	SPACES,
} from './characters';

export { isAscii } from './characters';

/**
 * Families of strings that user data contains and fixtures rarely do: other
 * scripts, combining marks, look-alike characters, invisible characters and
 * hostile ASCII. Each family is a fast-check generator plus hand-picked
 * examples. Use them in property-based tests of code that turns user text
 * into keys, file names, identifiers or labels.
 */
export interface Family {
	/** Kebab-case identifier. */
	readonly name: string;
	/** What the strings are and what they tend to break. */
	readonly description: string;
	/** Named cases worth reading, passed as fast-check examples by callers. */
	readonly examples: readonly string[];
	readonly arbitrary: fc.Arbitrary<string>;
}

/** An ASCII word with an optional capital, the shape most fixtures already use. */
export const asciiWord = fc.stringMatching(/^[A-Za-z][a-z]{0,7}$/);

const wordOf = (characters: readonly string[]) =>
	fc.array(fc.constantFrom(...characters), { minLength: 1, maxLength: 8 }).map((c) => c.join(''));

/** An ASCII word with at least one letter replaced by one of the given characters. */
const mixedWord = (characters: readonly string[]) =>
	fc
		.array(
			fc.oneof(
				{ weight: 2, arbitrary: fc.stringMatching(/^[a-z]$/) },
				{ weight: 1, arbitrary: fc.constantFrom(...characters) },
			),
			{ minLength: 2, maxLength: 10 },
		)
		.map((c) => c.join(''))
		.filter((word) => !isAscii(word));

/** One to three words joined by a space, the shape of a property name or a label. */
const phrase = (word: fc.Arbitrary<string>) =>
	fc.array(word, { minLength: 1, maxLength: 3 }).map((words) => words.join(' '));

/** ASCII words and the given separators in random order, with at least one separator. */
const interleaved = (separators: readonly string[]) =>
	fc
		.array(fc.oneof(asciiWord, fc.constantFrom(...separators)), { minLength: 2, maxLength: 6 })
		.map((parts) => parts.join(''))
		.filter((text) => separators.some((separator) => text.includes(separator)));

/** One of the words as is, upper-cased, capitalized or padded with spaces. */
const withCasing = (words: readonly string[]) =>
	fc
		.tuple(
			fc.constantFrom(...words),
			fc.constantFrom<(word: string) => string>(
				(word) => word,
				(word) => word.toUpperCase(),
				(word) => word.charAt(0).toUpperCase() + word.slice(1),
				(word) => ` ${word} `,
			),
		)
		.map(([word, transform]) => transform(word));

const repeatToLength = (unit: string, length: number) =>
	Array.from(unit.repeat(Math.ceil(length / unit.length)))
		.slice(0, length)
		.join('');

const UNSAFE_KEYS =
	'__proto__ constructor prototype toString valueOf hasOwnProperty __defineGetter__ length'.split(
		' ',
	);
const RESERVED_WORDS =
	'undefined null NaN true false Infinity nil None NULL CON PRN AUX NUL COM1 LPT1'.split(' ');
const PUNCTUATION = [...'.-/[]()$"\'\\=:,;#@', ' ', '\n', '\t', '{{', '}}'];

/** Non-ASCII characters that render like the given ASCII letter or digit, per Unicode UTS #39. */
export const lookAlikesOf = (character: string): readonly string[] =>
	(alphabetMap.get(character) ?? []).filter((lookAlike) => !isAscii(lookAlike));

/** The same ASCII word with at least one letter swapped for a look-alike. */
const lookAlikeOf = (word: string): fc.Arbitrary<string> =>
	fc
		.tuple(
			...Array.from(word, (character) => {
				const options = lookAlikesOf(character);
				return options.length > 0
					? fc.option(fc.constantFrom(...options), { nil: undefined })
					: fc.constant(undefined);
			}),
		)
		.map((picks) => Array.from(word, (character, index) => picks[index] ?? character).join(''))
		.filter((result) => result !== word);

/** An ASCII word and a look-alike of it, for tests that compare the two. */
export const lookAlikePair: fc.Arbitrary<readonly [word: string, lookAlike: string]> = asciiWord
	.filter((word) => Array.from(word).some((character) => lookAlikesOf(character).length > 0))
	.chain((word) => fc.tuple(fc.constant(word), lookAlikeOf(word)));

const latinAccented: Family = {
	name: 'latin-accented',
	description: 'ASCII words with accented Latin letters or ligatures, which ASCII folding drops.',
	examples: ['Prénom', 'Straße', 'Größe', 'naïve', 'café', 'Ærø', 'Łódź', 'Ñandú'],
	arbitrary: phrase(mixedWord(LATIN_ACCENTED)),
};

export const families = [
	latinAccented,
	{
		name: 'greek',
		description: 'Greek words. ASCII folding removes every letter, so all of them share one key.',
		examples: ['κόσμος', 'Όνομα', 'ΟΔΥΣΣΕΥΣ', 'Τιμή (€)'],
		arbitrary: phrase(wordOf(GREEK)),
	},
	{
		name: 'cyrillic',
		description:
			'Cyrillic words. ASCII folding removes every letter, so all of them share one key.',
		examples: ['Имя', 'Фамилия', 'Ёлка', 'Дата рождения'],
		arbitrary: phrase(wordOf(CYRILLIC)),
	},
	{
		name: 'right-to-left',
		description:
			'Hebrew and Arabic words, which render right to left and reorder ASCII around them.',
		examples: ['שלום', 'مرحبا', 'اسم Name', 'שם: Value'],
		arbitrary: phrase(fc.oneof(wordOf(HEBREW), wordOf(ARABIC))),
	},
	{
		name: 'devanagari',
		description:
			'Devanagari words, where vowel signs are combining marks on the consonant before them.',
		examples: ['नाम', 'हिन्दी', 'जन्म तिथि'],
		arbitrary: phrase(
			fc
				.array(
					fc
						.tuple(
							fc.constantFrom(...DEVANAGARI_CONSONANTS),
							fc.option(fc.constantFrom(...DEVANAGARI_VOWEL_SIGNS), { nil: '' }),
						)
						.map(([consonant, vowelSign]) => consonant + vowelSign),
					{ minLength: 1, maxLength: 5 },
				)
				.map((syllables) => syllables.join('')),
		),
	},
	{
		name: 'cjk',
		description:
			'Han, Hiragana, Katakana and Hangul text, with no letter case and no word separators.',
		examples: ['日本語 名前', '中文 字段', '이름', 'カタカナ', 'ひらがな'],
		arbitrary: phrase(fc.oneof(wordOf(HAN), wordOf(HIRAGANA), wordOf(KATAKANA), wordOf(HANGUL))),
	},
	{
		name: 'decomposed',
		description:
			'Accented words in NFD form: base letter plus combining mark, equal to NFC only after normalization.',
		examples: ['Prénom', 'naïve', 'Größe', 'Ångström'].map((text) => text.normalize('NFD')),
		arbitrary: latinAccented.arbitrary
			.map((text) => text.normalize('NFD'))
			.filter((text) => text !== text.normalize('NFC')),
	},
	{
		name: 'combining-marks',
		description: 'ASCII words with one to six combining marks stacked on each letter.',
		examples: [
			'nãm̈ë'.normalize('NFD'),
			chars('T', 0x338, 0x359, 'o', 0x337, 0x34b, 't', 0x335, 0x33c, 'a', 0x336, 0x351, 'l', 0x337),
		],
		arbitrary: fc
			.tuple(
				asciiWord,
				fc.array(fc.array(fc.constantFrom(...DIACRITICAL_MARKS), { minLength: 1, maxLength: 6 }), {
					minLength: 8,
					maxLength: 8,
				}),
			)
			.map(([word, stacks]) =>
				Array.from(word, (letter, index) => letter + (stacks[index] ?? []).join('')).join(''),
			),
	},
	{
		name: 'fullwidth',
		description: 'Fullwidth ASCII letters and digits. They read as ASCII and are not.',
		examples: ['ＮＡＭＥ', 'Ｐｒｉｃｅ', 'ｎａｍｅ１', 'Ｓtatus'],
		arbitrary: phrase(fc.oneof(wordOf(FULLWIDTH), mixedWord(FULLWIDTH))),
	},
	{
		name: 'case-mapping',
		description: 'Letters whose case mapping changes the length or does not round-trip: ß, ﬁ, İ.',
		examples: ['Straße', 'İstanbul', 'ﬁle', 'ΟΔΥΣΣΕΥΣ', 'ŉ'],
		arbitrary: phrase(mixedWord(CASE_EDGE)),
	},
	{
		name: 'emoji',
		description:
			'Emoji with skin tones, joiner sequences, flags and keycaps: one symbol, several code points.',
		examples: ['😀 Mood', '🚀 Launch date', '👨‍👩‍👧', '🇩🇪', '👍🏽', '1️⃣'],
		arbitrary: phrase(
			fc.oneof(
				fc.constantFrom(...PICTOGRAPHS),
				fc
					.tuple(fc.constantFrom('👍', '👋', '🙏', '✋', '👶'), fc.constantFrom(...SKIN_TONES))
					.map(([base, tone]) => base + tone),
				fc
					.tuple(fc.constantFrom(...REGIONAL_INDICATORS), fc.constantFrom(...REGIONAL_INDICATORS))
					.map(([a, b]) => a + b),
				fc.constantFrom('👨‍👩‍👧', '👩‍💻', '🏳️‍🌈', '🧑‍🚀', '❤️‍🔥'),
				fc.constantFrom(...'0123456789#*').map((digit) => chars(digit, 0xfe0f, 0x20e3)),
				asciiWord,
			),
		).filter((text) => !isAscii(text)),
	},
	{
		name: 'digits',
		description:
			'Decimal digits of other scripts, which \\d does not match and Number() does not parse.',
		examples: ['٣٢١', '१२३', '１２３', 'Q٣ 2026'],
		arbitrary: phrase(fc.oneof(asciiWord, wordOf(DIGITS))).filter((text) => !isAscii(text)),
	},
	{
		name: 'whitespace',
		description:
			'Non-ASCII spaces such as the no-break space, plus leading, trailing and doubled whitespace.',
		examples: [
			chars('First', 0xa0, 'Name'),
			' Name',
			'Name ',
			chars('Name', 0x3000, 'Value'),
			'First  Name',
			'Tab\tName',
		],
		arbitrary: interleaved(SPACES),
	},
	{
		name: 'invisible',
		description:
			'Zero-width and format characters inside ASCII words. Looks like the plain word, never equals it.',
		examples: [
			chars('Na', 0x200b, 'me'),
			chars(0xfeff, 'Name'),
			chars('Na', 0xad, 'me'),
			chars('Name', 0x200d),
			chars('Na', 0x3164, 'me'),
		],
		arbitrary: interleaved(INVISIBLE),
	},
	{
		name: 'bidi-controls',
		description:
			'Bidirectional controls, which reorder how text renders without changing its code points.',
		examples: [
			chars('Name', 0x202e, 'eman'),
			chars(0x200f, 'Name'),
			chars('Total', 0x2067, ' (USD)', 0x2069),
		],
		arbitrary: interleaved(BIDI_CONTROLS),
	},
	{
		name: 'unsafe-keys',
		description:
			'Object.prototype members and other built-in properties. As object keys they pollute or vanish.',
		examples: UNSAFE_KEYS,
		arbitrary: withCasing(UNSAFE_KEYS),
	},
	{
		name: 'reserved-words',
		description:
			'Words some layer reads as a value or a device: JS literals, Python and SQL nulls, Windows devices.',
		examples: RESERVED_WORDS,
		arbitrary: withCasing(RESERVED_WORDS),
	},
	{
		name: 'expression-hostile',
		description:
			'ASCII that breaks a $json.a.b path or a template: dots, brackets, quotes, leading digits, empty.',
		examples: [
			'',
			' ',
			'.',
			'a.b',
			'1name',
			'[0]',
			'a[b]',
			'{{ $json.x }}',
			'$json',
			"it's",
			'say "hi"',
			'back\\slash',
			'line\nbreak',
			'=cmd',
			'<script>alert(1)</script>',
		],
		arbitrary: fc.oneof(
			interleaved(PUNCTUATION),
			fc.tuple(fc.nat(99), asciiWord).map(([digit, word]) => `${digit}${word}`),
		),
	},
	{
		name: 'long',
		description:
			'Strings of one to twenty thousand characters, past what most columns and regexes expect.',
		examples: ['Name'.repeat(250), 'é'.repeat(1000), 'a b '.repeat(500).trim()],
		arbitrary: fc
			.tuple(
				fc.constantFrom('a', 'Name ', 'é', '日', '😀', '__proto__'),
				fc.integer({ min: 1000, max: 20000 }),
			)
			.map(([unit, length]) => repeatToLength(unit, length)),
	},
	{
		name: 'mixed-script',
		description:
			'ASCII words with Greek or Cyrillic letters in place of Latin ones, such as Nаme with a Cyrillic а.',
		examples: ['Nаme', 'Ρrice', 'Ѕtatus', 'Dаte'],
		arbitrary: mixedWord([...GREEK, ...CYRILLIC]),
	},
	{
		name: 'confusables',
		description:
			'ASCII words with letters swapped for UTS #39 look-alikes: Cyrillic а, fullwidth ａ, mathematical 𝐚.',
		examples: ['Nаme', 'Ρrice', 'ｎａｍｅ', '𝐍𝐚𝐦𝐞', 'Ⅼength'],
		arbitrary: lookAlikePair.map(([, lookAlike]) => lookAlike),
	},
] as const satisfies readonly Family[];

export type FamilyName = (typeof families)[number]['name'];

export const familyByName = (name: FamilyName): Family => {
	const family = families.find((candidate) => candidate.name === name);
	if (!family) throw new Error(`Unknown string family: ${name}`);
	return family;
};

/**
 * A string from any of the given families, or from every family when none is
 * named. The single entry point for a property that must hold for all user text.
 */
export const hardString = (...names: FamilyName[]): fc.Arbitrary<string> => {
	const selected = names.length > 0 ? names.map(familyByName) : families;
	return fc.oneof(...selected.map((family) => family.arbitrary));
};
