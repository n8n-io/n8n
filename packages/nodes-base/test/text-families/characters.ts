import bidiControls from '@unicode/unicode-18.0.0/Binary_Property/Bidi_Control/symbols';
import changesWhenCasemapped from '@unicode/unicode-18.0.0/Binary_Property/Changes_When_Casemapped/symbols';
import emojiModifiers from '@unicode/unicode-18.0.0/Binary_Property/Emoji_Modifier/symbols';
import emoji from '@unicode/unicode-18.0.0/Binary_Property/Emoji_Presentation/symbols';
import regionalIndicators from '@unicode/unicode-18.0.0/Binary_Property/Regional_Indicator/symbols';
import whiteSpace from '@unicode/unicode-18.0.0/Binary_Property/White_Space/symbols';
import combiningDiacriticalMarks from '@unicode/unicode-18.0.0/Block/Combining_Diacritical_Marks/symbols';
import halfwidthAndFullwidthForms from '@unicode/unicode-18.0.0/Block/Halfwidth_and_Fullwidth_Forms/symbols';
import decimalNumber from '@unicode/unicode-18.0.0/General_Category/Decimal_Number/symbols';
import format from '@unicode/unicode-18.0.0/General_Category/Format/symbols';
import arabic from '@unicode/unicode-18.0.0/Script/Arabic/symbols';
import cyrillic from '@unicode/unicode-18.0.0/Script/Cyrillic/symbols';
import devanagari from '@unicode/unicode-18.0.0/Script/Devanagari/symbols';
import greek from '@unicode/unicode-18.0.0/Script/Greek/symbols';
import han from '@unicode/unicode-18.0.0/Script/Han/symbols';
import hangul from '@unicode/unicode-18.0.0/Script/Hangul/symbols';
import hebrew from '@unicode/unicode-18.0.0/Script/Hebrew/symbols';
import hiragana from '@unicode/unicode-18.0.0/Script/Hiragana/symbols';
import katakana from '@unicode/unicode-18.0.0/Script/Katakana/symbols';
import latin from '@unicode/unicode-18.0.0/Script/Latin/symbols';

/** True when every code point of the text is ASCII. */
export const isAscii = (text: string) => !/\P{ASCII}/u.test(text);

/** Joins text and code points, so invisible or combining characters stay readable as numbers. */
export const joinCodePoints = (...parts: Array<string | number>) =>
	parts.map((part) => (typeof part === 'number' ? String.fromCodePoint(part) : part)).join('');

// İ lowercases to two code points (i + combining dot); the case-mapping family covers it.
export const LATIN_ACCENTED = latin.filter((c) => !isAscii(c) && /^\p{L}$/u.test(c) && c !== 'İ');
export const GREEK = greek;
export const CYRILLIC = cyrillic;
export const HEBREW = hebrew;
export const ARABIC = arabic;
export const DEVANAGARI = devanagari;
export const HAN = han;
export const HIRAGANA = hiragana;
export const KATAKANA = katakana;
export const HANGUL = hangul;
export const DIACRITICAL_MARKS = combiningDiacriticalMarks;
export const FULLWIDTH = halfwidthAndFullwidthForms.filter((c) => /^[\p{L}\p{Nd}]$/u.test(c));
/** Letters whose case mapping changes the length or does not round-trip, such as ß, ﬁ and İ. */
export const CASE_EDGE = changesWhenCasemapped.filter(
	(c) =>
		c.toUpperCase().length !== c.length ||
		c.toLowerCase().length !== c.length ||
		c.toLowerCase().toUpperCase() !== c.toUpperCase() ||
		c.toUpperCase().toLowerCase() !== c.toLowerCase(),
);
export const PICTOGRAPHS = emoji;
export const SKIN_TONES = emojiModifiers;
export const REGIONAL_INDICATORS = regionalIndicators;
export const DIGITS = decimalNumber.filter((c) => !isAscii(c));
export const SPACES = whiteSpace;
export const BIDI_CONTROLS = bidiControls;
/** Format characters other than bidi controls: soft hyphen, zero width space and joiners, byte order mark, tags. */
export const INVISIBLE = format.filter((c) => !bidiControls.includes(c));
