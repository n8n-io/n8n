import bidiControl from '@unicode/unicode-18.0.0/Binary_Property/Bidi_Control/symbols';
import changesWhenCasemapped from '@unicode/unicode-18.0.0/Binary_Property/Changes_When_Casemapped/symbols';
import emojiPresentation from '@unicode/unicode-18.0.0/Binary_Property/Emoji_Presentation/symbols';
import whiteSpace from '@unicode/unicode-18.0.0/Binary_Property/White_Space/symbols';
import combiningDiacriticalMarks from '@unicode/unicode-18.0.0/Block/Combining_Diacritical_Marks/symbols';
import halfwidthAndFullwidthForms from '@unicode/unicode-18.0.0/Block/Halfwidth_And_Fullwidth_Forms/symbols';
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
import { alphabetMap } from 'confusables';
import fc from 'fast-check';

const isAscii = (text: string) => !/\P{ASCII}/u.test(text);

const families = {
	'latin-accented': latin.filter((c) => /^\p{Ll}$/u.test(c) && !isAscii(c)),
	greek,
	cyrillic,
	hebrew,
	arabic,
	devanagari,
	han,
	hiragana,
	katakana,
	hangul,
	'combining-marks': combiningDiacriticalMarks,
	fullwidth: halfwidthAndFullwidthForms.filter((c) => /^[\p{L}\p{Nd}]$/u.test(c)),
	/** Letters whose case mapping changes the length or does not round-trip, such as ß, ﬁ and İ. */
	'case-mapping': changesWhenCasemapped.filter(
		(c) =>
			c.toUpperCase().length !== c.length ||
			c.toLowerCase().length !== c.length ||
			c.toLowerCase().toUpperCase() !== c.toUpperCase() ||
			c.toUpperCase().toLowerCase() !== c.toLowerCase(),
	),
	emoji: emojiPresentation,
	digits: decimalNumber.filter((c) => !isAscii(c)),
	whitespace: whiteSpace,
	/** Format characters other than bidi controls: soft hyphen, zero width space and joiners, byte order mark. */
	invisible: format.filter((c) => !bidiControl.includes(c)),
	'bidi-controls': bidiControl,
	/** Non-ASCII characters the `confusables` package maps to ASCII letters. */
	confusables: [...'abcdefghijklmnopqrstuvwxyz'].flatMap((letter) =>
		(alphabetMap.get(letter) ?? []).filter((c) => !isAscii(c)),
	),
} satisfies Record<string, readonly string[]>;

export type FamilyName = keyof typeof families;

export const wordFrom = (family: FamilyName, minLength = 1, maxLength = 8) =>
	fc.string({ unit: fc.constantFrom(...families[family]), minLength, maxLength });
