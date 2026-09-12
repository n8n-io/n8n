/**
 * Code point sets for the string families. Node's own Unicode tables classify
 * characters through `\p{…}` regex escapes, and every set draws from settled
 * blocks of a script, so the same code points come out on every supported
 * Node version.
 */

/** Characters in the given hex ranges, like `00C0-024F 0370`, that match the `\p{…}` predicate. */
export const charactersIn = (ranges: string, predicate: RegExp): string[] => {
	const characters: string[] = [];
	for (const range of ranges.split(' ')) {
		const [first, last = first] = range.split('-').map((hex) => Number.parseInt(hex, 16));
		for (let codePoint = first; codePoint <= last; codePoint++) {
			const character = String.fromCodePoint(codePoint);
			if (predicate.test(character)) characters.push(character);
		}
	}
	return characters;
};

const LETTER = /^\p{L}$/u;
const MARK = /^\p{M}$/u;
const ANY = /./u;

/** Joins text and code points, so invisible or combining characters stay readable as numbers. */
export const chars = (...parts: Array<string | number>) =>
	parts.map((part) => (typeof part === 'number' ? String.fromCodePoint(part) : part)).join('');

/** True when every code point of the text is ASCII. */
export const isAscii = (text: string) => !/\P{ASCII}/u.test(text);

/** Latin-1 Supplement, Latin Extended-A and Latin Extended-B. */
export const LATIN_ACCENTED = charactersIn('00C0-024F', LETTER);
export const GREEK = charactersIn('0370-03FF', LETTER);
export const CYRILLIC = charactersIn('0400-04FF', LETTER);
export const HEBREW = charactersIn('0590-05FF', LETTER);
export const ARABIC = charactersIn('0600-06FF', LETTER);
export const DEVANAGARI_CONSONANTS = charactersIn('0915-0939', LETTER);
export const DEVANAGARI_VOWEL_SIGNS = charactersIn('093E-094C', MARK);
export const HAN = charactersIn('4E00-9FFF', LETTER);
export const HIRAGANA = charactersIn('3040-309F', LETTER);
export const KATAKANA = charactersIn('30A0-30FF', LETTER);
export const HANGUL = charactersIn('AC00-D7A3', LETTER);
/** Combining Diacritical Marks. */
export const DIACRITICAL_MARKS = charactersIn('0300-036F', MARK);
/** Fullwidth ASCII letters and digits. */
export const FULLWIDTH = charactersIn('FF01-FF5E', /^[\p{L}\p{Nd}]$/u);
/** Letters whose case mapping changes the length or does not round-trip, such as ß, ﬁ and İ. */
export const CASE_EDGE = charactersIn(
	'00C0-024F 0370-03FF 1E00-1EFF FB00-FB06',
	/^\p{Changes_When_Casemapped}$/u,
).filter(
	(c) =>
		c.toUpperCase().length !== c.length ||
		c.toLowerCase().length !== c.length ||
		c.toLowerCase().toUpperCase() !== c.toUpperCase() ||
		c.toUpperCase().toLowerCase() !== c.toLowerCase(),
);
/** Miscellaneous Symbols and Pictographs, Emoticons, Transport and Map Symbols. */
export const PICTOGRAPHS = charactersIn(
	'1F300-1F5FF 1F600-1F64F 1F680-1F6FF',
	/^\p{Extended_Pictographic}$/u,
);
export const SKIN_TONES = charactersIn('1F3FB-1F3FF', ANY);
export const REGIONAL_INDICATORS = charactersIn('1F1E6-1F1FF', ANY);
/** Arabic-Indic, Extended Arabic-Indic, Devanagari and fullwidth digits. */
export const DIGITS = charactersIn('0660-0669 06F0-06F9 0966-096F FF10-FF19', /^\p{Nd}$/u);
/** Every White_Space character, ASCII included. */
export const SPACES = charactersIn(
	'0009-000D 0020 0085 00A0 1680 2000-200A 2028-2029 202F 205F 3000',
	/^\p{White_Space}$/u,
);
/**
 * Soft hyphen, zero width space, non-joiner and joiner, word joiner, byte order
 * mark, Mongolian vowel separator, Hangul filler, variation selectors 15 and 16.
 */
export const INVISIBLE = charactersIn('00AD 200B-200D 2060 FEFF 180E 3164 FE0E-FE0F', ANY);
/** Bidi marks, embeddings, overrides and isolates, plus the Arabic letter mark. */
export const BIDI_CONTROLS = charactersIn('061C 200E-200F 202A-202E 2066-2069', ANY);
