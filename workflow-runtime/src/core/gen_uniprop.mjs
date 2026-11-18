// Generates the tables of the Unicode property escapes of regular expressions (`\p{…}` and
// `\P{…}` with the `u` flag) from the Node.js that runs it (ICU in V8):
// - uniprop_tables.zig: the code point ranges of each property, and the names of ECMAScript;
// - testdata/uniprop_cases.txt: for each name, the count and two hashes of its code points,
//   which Node.js gives one code point at a time. The test of regex.zig makes the same
//   numbers from the tables for every code point;
// - ../../../packages/@n8n/workflow-lang/src/convert/code-native/regex-properties.generated.ts:
//   the names, for the converter.
//
// A name is a candidate from the lists below. Node.js decides if it is a name of ECMAScript:
// a name that it refuses is not in the tables. The script codes of four letters are all tried.
//
// Run from workflow-runtime: node src/core/gen_uniprop.mjs && zig fmt src/core/uniprop_tables.zig
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MAX = 0x10ffff;

const words = (text) => text.split(/\s+/).filter(Boolean);

const GENERAL_CATEGORY = words(`
	L Letter LC Cased_Letter Lu Uppercase_Letter Ll Lowercase_Letter Lt Titlecase_Letter
	Lm Modifier_Letter Lo Other_Letter M Mark Combining_Mark Mn Nonspacing_Mark Mc Spacing_Mark
	Me Enclosing_Mark N Number Nd Decimal_Number digit Nl Letter_Number No Other_Number
	P Punctuation punct Pc Connector_Punctuation Pd Dash_Punctuation Ps Open_Punctuation
	Pe Close_Punctuation Pi Initial_Punctuation Pf Final_Punctuation Po Other_Punctuation
	S Symbol Sm Math_Symbol Sc Currency_Symbol Sk Modifier_Symbol So Other_Symbol
	Z Separator Zs Space_Separator Zl Line_Separator Zp Paragraph_Separator
	C Other Cc Control cntrl Cf Format Cs Surrogate Co Private_Use Cn Unassigned
`);

const BINARY = words(`
	ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored
	Bidi_M Case_Ignorable CI Cased Changes_When_Case_Mapped Changes_When_Casefolded CWCF
	Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF
	Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI
	Deprecated Dep Diacritic Dia Emoji Emoji_Component EComp Emoji_Modifier EMod
	Emoji_Modifier_Base EBase Emoji_Presentation EPres Extended_Pictographic ExtPict Extender
	Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB
	IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C
	Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar
	Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical
	Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term
	Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space
	XID_Continue XIDC XID_Start XIDS
`);

const SCRIPT = words(`
	Adlam Ahom Anatolian_Hieroglyphs Arabic Armenian Avestan Balinese Bamum Bassa_Vah Batak
	Bengali Beria_Erfe Bhaiksuki Bopomofo Brahmi Braille Buginese Buhid Canadian_Aboriginal
	Carian Caucasian_Albanian Chakma Cham Cherokee Chorasmian Common Coptic Cuneiform Cypriot
	Cypro_Minoan Cyrillic Deseret Devanagari Dives_Akuru Dogra Duployan Egyptian_Hieroglyphs
	Elbasan Elymaic Ethiopic Garay Georgian Glagolitic Gothic Grantha Greek Gujarati
	Gunjala_Gondi Gurmukhi Gurung_Khema Han Hangul Hanifi_Rohingya Hanunoo Hatran Hebrew
	Hiragana Imperial_Aramaic Inherited Inscriptional_Pahlavi Inscriptional_Parthian Javanese
	Jurchen Kaithi Kannada Katakana Kawi Kayah_Li Kharoshthi Khitan_Small_Script Khmer Khojki
	Khudawadi Kirat_Rai Lao Latin Lepcha Limbu Linear_A Linear_B Lisu Lycian Lydian Mahajani
	Makasar Malayalam Mandaic Manichaean Marchen Masaram_Gondi Medefaidrin Meetei_Mayek
	Mende_Kikakui Meroitic_Cursive Meroitic_Hieroglyphs Miao Modi Mongolian Mro Multani Myanmar
	Nabataean Nag_Mundari Nandinagari New_Tai_Lue Newa Nko Nushu Nyiakeng_Puachue_Hmong Ogham
	Ol_Chiki Ol_Onal Old_Hungarian Old_Italic Old_North_Arabian Old_Permic Old_Persian
	Old_Sogdian Old_South_Arabian Old_Turkic Old_Uyghur Oriya Osage Osmanya Pahawh_Hmong
	Palmyrene Pau_Cin_Hau Phags_Pa Phoenician Proto_Cuneiform Psalter_Pahlavi Rejang Runic
	Samaritan Saurashtra Seal Sharada Shavian Siddham Sidetic SignWriting Sinhala Sogdian
	Sora_Sompeng Soyombo Sundanese Sunuwar Syloti_Nagri Syriac Tagalog Tagbanwa Tai_Le Tai_Tham
	Tai_Viet Tai_Yo Takri Tamil Tangsa Tangut Telugu Thaana Thai Tibetan Tifinagh Tirhuta
	Todhri Tolong_Siki Toto Tulu_Tigalari Ugaritic Unknown Vai Vithkuqi Wancho Warang_Citi
	Yezidi Yi Zanabazar_Square
`);

/** The pattern of a name, or null when Node.js refuses it. */
function patternOf(expression) {
	try {
		return new RegExp(`\\p{${expression}}`, 'u');
	} catch {
		return null;
	}
}

// Every code point but the surrogates, as two texts: a search finds whole runs in them.
const LOW = Array.from({ length: 0xd800 }, (_, cp) => String.fromCharCode(cp)).join('');
let HIGH = '';
{
	const parts = [];
	for (let cp = 0xe000; cp <= MAX; cp += 0x1000) {
		let part = '';
		for (let k = cp; k < cp + 0x1000 && k <= MAX; k++) part += String.fromCodePoint(k);
		parts.push(part);
	}
	HIGH = parts.join('');
}
/** The code point at UTF-16 index `at` of HIGH. */
const highCodePoint = (at) => (at < 0x2000 ? 0xe000 + at : 0x10000 + (at - 0x2000) / 2);

/** The ranges of the code points that match `expression`. */
function rangesOf(expression) {
	const out = [];
	const add = (lo, hi) => {
		const last = out[out.length - 1];
		if (last && last[1] === lo - 1) last[1] = hi;
		else out.push([lo, hi]);
	};
	const runs = new RegExp(`\\p{${expression}}+`, 'gu');
	for (const m of LOW.matchAll(runs)) add(m.index, m.index + m[0].length - 1);
	const one = patternOf(expression);
	for (let cp = 0xd800; cp <= 0xdfff; cp++) if (one.test(String.fromCharCode(cp))) add(cp, cp);
	for (const m of HIGH.matchAll(runs)) {
		add(highCodePoint(m.index), highCodePoint(m.index + m[0].length) - 1);
	}
	return out;
}

/** The count and two hashes of the code points that match `expression`, one test for each. */
function proofOf(expression) {
	const one = patternOf(expression);
	let count = 0;
	let a = 0x811c9dc5;
	let b = 0x9747b28c;
	for (let cp = 0; cp <= MAX; cp++) {
		if (!one.test(String.fromCodePoint(cp))) continue;
		count++;
		a = Math.imul(a ^ cp, 0x01000193) >>> 0;
		b = (Math.imul(b ^ cp, 0x9e3779b1) + cp) >>> 0;
	}
	return [count, a, b];
}

// ---- the names of ECMAScript that this Node.js has ---------------------------------------

const scriptNames = [...SCRIPT];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
for (const a of LETTERS.toUpperCase()) {
	for (const b of LETTERS) {
		for (const c of LETTERS) {
			for (const d of LETTERS) {
				const code = a + b + c + d;
				if (!scriptNames.includes(code) && patternOf(`sc=${code}`) !== null) scriptNames.push(code);
			}
		}
	}
}

/** [kind, name, expression]: `kind` is the name space of the runtime. */
const names = [];
for (const name of GENERAL_CATEGORY) {
	if (patternOf(`gc=${name}`) !== null && patternOf(name) !== null) names.push(['gc', name, `gc=${name}`]);
}
for (const name of BINARY) {
	if (patternOf(name) !== null && patternOf(`gc=${name}`) === null) names.push(['binary', name, name]);
}
for (const name of scriptNames) {
	if (patternOf(`sc=${name}`) === null || patternOf(`scx=${name}`) === null) continue;
	names.push(['sc', name, `sc=${name}`]);
	names.push(['scx', name, `scx=${name}`]);
}

// ---- tables ------------------------------------------------------------------------------

const tables = [];
const tableOf = new Map();
const entries = { gc: [], binary: [], sc: [], scx: [] };
const proofs = [];
let done = 0;
for (const [kind, name, expression] of names) {
	const ranges = rangesOf(expression);
	const key = ranges.map((r) => r.join('-')).join(',');
	let table = tableOf.get(key);
	if (table === undefined) {
		table = tables.length;
		tables.push(ranges);
		tableOf.set(key, table);
	}
	entries[kind].push([name, table]);
	proofs.push([kind, name, ...proofOf(expression)]);
	done++;
	if (done % 100 === 0) console.log(`${done} of ${names.length} names`);
}

const versions = `Node.js ${process.version} (ICU ${process.versions.icu}, Unicode ${process.versions.unicode})`;
const hex = (n) => `0x${n.toString(16).toUpperCase()}`;
const byName = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

let zig = `//! The code points of the Unicode properties that a regular expression names with
//! \`\\p{…}\` and \`\\P{…}\` (the \`u\` flag): the values of General_Category, Script and
//! Script_Extensions and the binary properties of ECMAScript, with their names.
//!
//! GENERATED by gen_uniprop.mjs from ${versions}. Do not edit. Regenerate from
//! workflow-runtime with: node src/core/gen_uniprop.mjs && zig fmt src/core/uniprop_tables.zig

/// A table: \`len\` ranges from \`start\` in \`ranges\`, sorted, apart from each other.
pub const Table = struct { start: u32, len: u32 };
/// A name of ECMAScript and its table.
pub const Entry = struct { name: []const u8, table: u16 };

/// Unicode version of the tables.
pub const unicode_version = "${process.versions.unicode}";

`;
let start = 0;
zig += 'pub const tables = [_]Table{\n';
for (const ranges of tables) {
	zig += `.{ .start = ${start}, .len = ${ranges.length} },\n`;
	start += ranges.length;
}
zig += '};\n\n';
zig += '/// The first and the last code point of each range.\npub const ranges = [_][2]u32{\n';
for (const ranges of tables) {
	for (const [lo, hi] of ranges) zig += `.{ ${hex(lo)}, ${hex(hi)} },\n`;
}
zig += '};\n';
const DOC = {
	gc: 'Values of General_Category: `\\p{Lu}` and `\\p{gc=Lu}`.',
	binary: 'Binary properties: `\\p{Alphabetic}`.',
	sc: 'Values of Script: `\\p{sc=Latin}`.',
	scx: 'Values of Script_Extensions: `\\p{scx=Latin}`.',
};
for (const kind of ['gc', 'binary', 'sc', 'scx']) {
	zig += `\n/// ${DOC[kind]} Sorted by name.\npub const ${kind} = [_]Entry{\n`;
	for (const [name, table] of [...entries[kind]].sort(byName)) {
		zig += `.{ .name = "${name}", .table = ${table} },\n`;
	}
	zig += '};\n';
}
writeFileSync(join(here, 'uniprop_tables.zig'), zig);

writeFileSync(
	join(here, 'testdata', 'uniprop_cases.txt'),
	`${proofs.map((p) => p.join(' ')).join('\n')}\n`,
);

const list = (kind) =>
	[...entries[kind]]
		.sort(byName)
		.map(([name]) => `\t'${name}',`)
		.join('\n');
const tsFile = `/**
 * The names of the Unicode properties that the regex engine of the runtime has
 * (\`workflow-runtime/src/core/uniprop_tables.zig\`): \`\\p{…}\` and \`\\P{…}\` with the \`u\` flag.
 *
 * GENERATED by workflow-runtime/src/core/gen_uniprop.mjs from ${versions}.
 * Do not edit.
 */

/** Unicode version of the tables of the runtime. */
export const REGEX_PROPERTY_UNICODE = '${process.versions.unicode}';

/** Values of General_Category: \`\\p{Lu}\`, \`\\p{gc=Lu}\` and \`\\p{General_Category=Lu}\`. */
export const REGEX_GENERAL_CATEGORIES: ReadonlySet<string> = new Set([
${list('gc')}
]);

/** Binary properties: \`\\p{Alphabetic}\`. */
export const REGEX_BINARY_PROPERTIES: ReadonlySet<string> = new Set([
${list('binary')}
]);

/** Values of Script and Script_Extensions: \`\\p{sc=Latin}\`, \`\\p{scx=Latin}\`. */
export const REGEX_SCRIPTS: ReadonlySet<string> = new Set([
${list('sc')}
]);
`;
writeFileSync(
	join(here, '../../../packages/@n8n/workflow-lang/src/convert/code-native/regex-properties.generated.ts'),
	tsFile,
);
console.log(
	`${names.length} names, ${tables.length} tables, ${start} ranges (${versions}); gc ${entries.gc.length}, binary ${entries.binary.length}, scripts ${entries.sc.length}`,
);
