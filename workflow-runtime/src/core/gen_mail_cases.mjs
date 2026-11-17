// Writes mailcase_tables.zig (test vectors for mail.zig) and mailmime_tables.zig
// (the table of nodemailer that gives the content type of a file name).
//
// Each vector is a set of mail fields and the message that nodemailer 10.1.4
// builds for it, through `sendMail` on a transport that keeps the message, with
// the transport options of the Send Email node. The random bytes and the clock
// are fixed: `crypto.randomBytes` gives the bytes of the vector (8 for the
// boundary of the root node, then 4, 2, 2, 2 and 6 for the Message-ID; the 8 bytes
// that each other MIME node takes and never uses are zero) and `new Date()` gives
// its time. Nothing is masked.
//
// Run by hand from workflow-runtime: node src/core/gen_mail_cases.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = createRequire(join(here, '../../../packages/nodes-base/package.json'));
const nodemailer = nodesBase('nodemailer');
const crypto = nodesBase('node:crypto');
const version = nodesBase('nodemailer/package.json').version;
if (version !== '10.1.4') throw new Error(`nodemailer is ${version}; mail.zig states 10.1.4.`);

// ---- a fixed random source and clock ---------------------------------------------

let state = 0x2545f491;
const next = () => {
	state ^= state << 13;
	state ^= state >>> 17;
	state ^= state << 5;
	state >>>= 0;
	return state;
};
const below = (n) => next() % n;
const pick = (list) => list[below(list.length)];
const bytes = (n) => Buffer.from(Array.from({ length: n }, () => below(256)));

const RealDate = Date;
let fixedNow = 0;
let entropy = Buffer.alloc(0);
let entropyAt = 0;
class FixedDate extends RealDate {
	constructor(...args) {
		if (args.length === 0) super(fixedNow);
		else super(...args);
	}
}
const realRandomBytes = crypto.randomBytes;
const fixedRandomBytes = (n) => {
	// Each MIME node takes 8 bytes when it is made. Only the bytes of the root are used.
	if (n === 8 && entropyAt > 0) return Buffer.alloc(8);
	if (entropyAt + n > entropy.length) throw new Error('nodemailer took more random bytes than 24.');
	const out = entropy.subarray(entropyAt, entropyAt + n);
	entropyAt += n;
	return Buffer.from(out);
};

const transport = nodemailer.createTransport({
	name: 'vectors',
	version: '1',
	options: { disableFileAccess: true, disableUrlAccess: true },
	send(mail, done) {
		const chunks = [];
		const stream = mail.message.createReadStream();
		stream.on('data', (chunk) => chunks.push(chunk));
		stream.once('error', done);
		stream.on('end', () =>
			done(null, {
				envelope: mail.message.getEnvelope(),
				messageId: mail.message.messageId(),
				message: Buffer.concat(chunks),
			}),
		);
	},
});

async function build(fields, now, random) {
	fixedNow = now;
	entropy = random;
	entropyAt = 0;
	globalThis.Date = FixedDate;
	crypto.randomBytes = fixedRandomBytes;
	try {
		const mail = {};
		for (const key of ['from', 'to', 'cc', 'bcc', 'subject', 'replyTo', 'text', 'html']) {
			if (fields[key] !== undefined) mail[key] = fields[key];
		}
		if (fields.attachments.length > 0) {
			mail.attachments = fields.attachments.map((a) =>
				a.cid === undefined
					? { filename: a.filename, content: a.content }
					: { filename: a.filename, content: a.content, cid: a.cid },
			);
		}
		return await transport.sendMail(mail);
	} finally {
		globalThis.Date = RealDate;
		crypto.randomBytes = realRandomBytes;
	}
}

// ---- the fields ---------------------------------------------------------------------

const addresses = [
	'a@example.com',
	'Bob <bob@example.com>',
	'"Doe, John" <john.doe@Example.COM>',
	'<x@y.org>',
	'José Álvarez <jose@example.es>',
	'Иван Петров <ivan@example.ru>',
	'山田太郎 <taro@example.jp>',
	'A.B. Cee <abc@sub.example.co.uk>',
	"o'brien+tag@example.com",
	'Support Team <support@mail.example.com>',
	'"Sales & Marketing" <sales@example.com>',
	'under_score Name9 <u_s@example.com>',
	'  spaced@example.com  ',
	'Long Name With Many Words In It To Force A Fold Of The Line <long@example.com>',
	'Émilie Dûpont-Lefèvre de la Fontaine du Château <emilie@example.fr>',
	'"quoted <angle> (paren)" <q@example.com>',
	'first.last@a-b.example',
	'😀 Party <party@example.com>',
	'Bob<nospace@example.com>',
	'"Q"<quoted.nospace@example.com>',
];
const hostAddresses = [
	'undisclosed-recipients:;',
	'jöhn@example.com',
	'a@exämple.com',
	'John (comment) <j@example.com>',
	'no-at-sign',
	'Name Only, a@example.com',
	'"Quoted \\" esc" <q@example.com>',
	'x@1.2.3.4',
	'x@[1.2.3.4]',
	'a b@example.com',
	'x@xn--bcher-kva.example',
	'tab\tname <t@example.com>',
	'a@example.com <b@example.com>',
	'"" <empty@example.com>',
	'x@example..com',
	'Bob <bob@example.com> trailing',
	'a@b@example.com',
	'x@-dash.example',
	'x@example.com.',
];
const addressField = () => {
	const roll = below(20);
	if (roll === 0) return undefined;
	if (roll === 1) return '';
	if (roll === 2) return pick(hostAddresses);
	const count = roll < 12 ? 1 : 1 + below(6);
	const list = Array.from({ length: count }, () => pick(addresses));
	if (roll === 3) list.push(pick(hostAddresses));
	return list.join(pick([', ', ',', ' , ']));
};

const words =
	'the quick brown fox jumps over a lazy dog and sends mail to every one who asked for it'.split(
		' ',
	);
const sentence = (n) => Array.from({ length: n }, () => pick(words)).join(' ');
const subjects = [
	'',
	'Hello',
	'Re: your order #1234',
	'   ',
	'Trailing space ',
	'He said "hi"',
	'Grüße aus München',
	'Ünïcödé everywhere: ñandú, façade, coöperate, naïve, résumé, jalapeño, crème brûlée',
	'日本語の件名です。これは長い件名で、折り返しが必要になります。',
	'Mixed 日本語 and English words in one subject line',
	'😀 emoji 🎉 subject 🚀 with a few more words to pass the limit',
	'tab\there',
	'line\nbreak',
	'crlf\r\nbreak',
	'bell\x07char',
	'=?UTF-8?Q?not_encoded?=',
	'question? equals= underscore_ and more text to make this line long enough to need a fold at 76',
	'averyveryverylongwordwithoutanyspacesatallthatgoesonandonandonandonandonandonandonandonandon end',
	'é',
	'x'.repeat(200),
	'é'.repeat(60),
	'a é'.repeat(30),
	'漢'.repeat(50),
	' nbsp',
];
const subjectField = () =>
	below(12) === 0 ? undefined : below(3) === 0 ? sentence(1 + below(25)) : pick(subjects);

const printable = () => {
	const n = below(120);
	let out = '';
	for (let i = 0; i < n; i++) {
		const r = below(40);
		if (r === 0) out += ' ';
		else if (r === 1) out += pick(['.', ',', '!', '?', '=', '\t', ';']);
		else if (r === 2) out += pick(['é', 'ü', 'ß', '€', '漢', '😀', ' ']);
		else out += String.fromCharCode(33 + below(94));
	}
	return out;
};
const lines = () =>
	Array.from({ length: 1 + below(6) }, () =>
		below(3) === 0 ? printable() : sentence(below(30)),
	).join(pick(['\n', '\r\n', '\n', '\n\n', '\r']));
const attribution = (html) => `
					${html}
					<br>
					<br>
					---
					<br>
					<em>This email was sent automatically with <a href="https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.emailSend_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" target="_blank">n8n</a></em>
					`;
const bodies = [
	'Hello',
	'Hello\n',
	'Hello\r\n',
	'Hello  ',
	'Hello \t \n',
	'   ',
	' ',
	'x'.repeat(76),
	'x'.repeat(77),
	'x'.repeat(76) + '\n' + 'y'.repeat(76),
	'x'.repeat(75) + ' y',
	'a=b',
	'.',
	'.\n.dot\n..two',
	'From here\nto there',
	'Grüße',
	'漢字だけの本文です',
	'ascii and 漢字 mixed, with more latin letters than other code units',
	'😀😀😀',
	'a\rb\nc\r\nd',
	'end with cr\r',
	'tabs\t\tand spaces  \nnext line \t\n',
	'word '.repeat(40),
	'word.'.repeat(40),
	'é'.repeat(40),
	'x'.repeat(74) + 'é',
	'x'.repeat(75) + 'é',
	'x'.repeat(73) + '😀',
	'x'.repeat(50) + '=' + 'y'.repeat(40),
	'<p>Hi</p>',
	'<html><body><h1>Title</h1><p style="color: red">Paragraph with a long line of text that goes past the limit of 76</p></body></html>',
	'\x00nul',
	'\x0bvt and \x0cff',
	'no letters: 1234567890 ' + 'é'.repeat(4),
];
const bodyField = () => {
	const roll = below(14);
	if (roll === 0) return undefined;
	if (roll === 1) return '';
	if (roll < 6) return lines();
	if (roll < 8) return printable();
	return pick(bodies);
};

const names = [
	'report.pdf',
	'image.png',
	'unknown',
	'data',
	'archive.tar.gz',
	'My File (1).txt',
	'UPPER.JPG',
	'notes.txt',
	'sheet.xlsx',
	'page.html',
	'-dash.csv',
	'semi;colon.json',
	"it's.zip",
	'back\\slash.bin',
	'.hidden',
	'trailing.',
	'a?b.png',
	'dir/file.gif',
	'x'.repeat(70) + '.txt',
	'no extension at all',
];
const hostNames = ['naïve.txt', 'a"b.txt', 'mail.eml', 'x'.repeat(80), 'tab\t.txt', '漢字.pdf'];
const sizes = [0, 1, 2, 3, 56, 57, 58, 100, 114, 400];
const attachmentList = () => {
	if (below(3) !== 0) return [];
	return Array.from({ length: 1 + below(3) }, () => {
		const cidRoll = below(6);
		return {
			filename: below(15) === 0 ? pick(hostNames) : pick(names),
			content: bytes(pick(sizes)),
			cid:
				cidRoll < 3
					? undefined
					: pick(['data', 'img1', 'attachment_0', 'my image', 'a<b>c', 'cid@host']),
		};
	});
};

const fixed = [
	{ from: 'a@example.com', to: 'b@example.com', subject: 'Plain', text: 'Hello', attachments: [] },
	{
		from: 'a@example.com',
		to: 'b@example.com',
		subject: 'Html',
		html: attribution('<p>Hello</p>'),
		attachments: [],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com',
		subject: 'Both',
		text: 'Hello',
		html: attribution('<p>Hello</p>'),
		attachments: [],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com',
		subject: 'Attribution',
		text: 'Hello\n\n---\nThis email was sent automatically with n8n\nhttps://n8n.io',
		attachments: [],
	},
	{ from: 'a@example.com', to: 'b@example.com', attachments: [] },
	{ to: 'b@example.com', replyTo: 'Reply <r@example.com>', text: 'x', attachments: [] },
	{ from: 'a@example.com', text: 'no recipient', attachments: [] },
	{
		from: 'a@example.com',
		to: 'b@example.com',
		attachments: [{ filename: 'only.pdf', content: bytes(300) }],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com',
		attachments: [
			{ filename: 'one.png', content: bytes(10), cid: 'one' },
			{ filename: 'two.txt', content: bytes(10) },
		],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com',
		html: '<img src="cid:one">',
		attachments: [{ filename: 'one.png', content: bytes(100), cid: 'one' }],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com',
		text: 't',
		html: '<img src="cid:one">',
		attachments: [
			{ filename: 'one.png', content: bytes(100), cid: 'one' },
			{ filename: 'two.pdf', content: bytes(200) },
		],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com',
		text: 't',
		html: '<b>h</b>',
		attachments: [
			{ filename: 'two.pdf', content: bytes(200) },
			{ filename: 'three.csv', content: bytes(20) },
		],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com, B <b@example.com>, c@example.com',
		cc: 'c@example.com',
		bcc: 'd@example.com, b@example.com',
		text: 'dedup',
		attachments: [],
	},
	// Bodies past the 64 KiB slices of the quoted-printable encoder.
	{
		from: 'a@example.com',
		to: 'b@example.com',
		text: (sentence(11) + ' é\n').repeat(1400),
		attachments: [],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com',
		html: ('<p>' + 'x'.repeat(90) + '=</p> \n').repeat(1500),
		attachments: [],
	},
	{
		from: 'a@example.com',
		to: 'b@example.com',
		text: 'plain ascii, short lines\n'.repeat(5600),
		attachments: [],
	},
	{ from: 'a@example.com', to: 'b@example.com', text: 'x' + ' '.repeat(70000), attachments: [] },
	{ from: 'a@example.com', to: 'b@example.com', text: '漢字'.repeat(30000), attachments: [] },
];

// ---- the output -------------------------------------------------------------------

const hex = (value) => Buffer.from(value ?? '', 'utf8').toString('hex');
const fnv = (buf) => {
	let h = 0xcbf29ce484222325n;
	for (const b of buf) h = ((h ^ BigInt(b)) * 0x100000001b3n) & 0xffffffffffffffffn;
	return h;
};
const inline_limit = 2500;

const cases = [];
const total = 500;
for (let i = 0; i < total; i++) {
	const fields =
		i < fixed.length
			? fixed[i]
			: {
					from:
						below(10) === 0 ? addressField() : pick(addresses.concat(hostAddresses.slice(0, 2))),
					to: addressField(),
					cc: below(3) === 0 ? addressField() : undefined,
					bcc: below(4) === 0 ? addressField() : undefined,
					replyTo: below(4) === 0 ? addressField() : undefined,
					subject: subjectField(),
					text: below(3) === 0 ? undefined : bodyField(),
					html:
						below(2) === 0
							? undefined
							: below(4) === 0
								? attribution(bodyField() ?? '')
								: bodyField(),
					attachments: attachmentList(),
				};
	const now = 1_600_000_000_000 + below(400_000_000) * 1000 + below(1000);
	const random = bytes(24);
	const info = await build(fields, now, random);
	const message = info.message;
	const large = message.length > inline_limit;
	const atts = fields.attachments
		.map(
			(a) =>
				`.{ .filename = "${hex(a.filename)}", .cid = "${hex(a.cid)}", .content = "${a.content.toString('hex')}" }`,
		)
		.join(', ');
	const big = (value) => {
		// A long body is one unit, repeated: the vector stays small.
		if (value === undefined || value.length < 20000) return { unit: hex(value), count: 1 };
		for (let n = 1; n <= 200; n++) {
			const unit = value.slice(0, n);
			if (value.length % n === 0 && unit.repeat(value.length / n) === value)
				return { unit: hex(unit), count: value.length / n };
		}
		if (/^x {70000}$/.test(value)) return { unit: hex(value), count: 1 };
		throw new Error('A long body must be a repeated unit.');
	};
	const text = big(fields.text);
	const html = big(fields.html);
	cases.push(
		`    .{ .from = "${hex(fields.from)}", .to = "${hex(fields.to)}", .cc = "${hex(fields.cc)}", .bcc = "${hex(fields.bcc)}", ` +
			`.reply_to = "${hex(fields.replyTo)}", .subject = "${hex(fields.subject)}", ` +
			`.text = "${text.unit}", .text_count = ${text.count}, .html = "${html.unit}", .html_count = ${html.count}, ` +
			`.attachments = &.{${atts}}, .now_ms = ${now}, .random = "${random.toString('hex')}", ` +
			`.want = "${large ? '' : message.toString('hex')}", .want_len = ${message.length}, .want_hash = 0x${fnv(message).toString(16)}, ` +
			`.envelope_from = "${hex(info.envelope.from === false ? '' : info.envelope.from)}", ` +
			`.envelope_to = "${hex(info.envelope.to.join('\n'))}", .message_id = "${hex(info.messageId)}" },`,
	);
}

writeFileSync(
	join(here, 'mailcase_tables.zig'),
	[
		`//! Generated by gen_mail_cases.mjs from nodemailer ${version}: the test vectors of mail.zig. Do not edit.`,
		'//! Every text is in hex. `want` is empty for a long message: `want_len` and',
		'//! `want_hash` (FNV-1a, 64 bits) state it.',
		'',
		'pub const Attachment = struct { filename: []const u8, cid: []const u8, content: []const u8 };',
		'',
		'pub const Vector = struct {',
		'    from: []const u8,',
		'    to: []const u8,',
		'    cc: []const u8,',
		'    bcc: []const u8,',
		'    reply_to: []const u8,',
		'    subject: []const u8,',
		'    text: []const u8,',
		'    text_count: u32,',
		'    html: []const u8,',
		'    html_count: u32,',
		'    attachments: []const Attachment,',
		'    now_ms: i64,',
		'    random: []const u8,',
		'    want: []const u8,',
		'    want_len: u32,',
		'    want_hash: u64,',
		'    envelope_from: []const u8,',
		'    envelope_to: []const u8,',
		'    message_id: []const u8,',
		'};',
		'',
		'pub const vectors = [_]Vector{',
		...cases,
		'};',
		'',
	].join('\n'),
);

// ---- the content types of nodemailer ----------------------------------------------

const cjs = join(dirname(nodesBase.resolve('nodemailer/package.json')), 'dist/cjs/mime-funcs');
const mimeFuncs = nodesBase(join(cjs, 'index.js'));
const source = readFileSync(join(cjs, 'mime-types.js'), 'utf8');
const at = source.indexOf('const extensions = new Map([');
if (at < 0) throw new Error('The MIME table of nodemailer has another form.');
const end = source.indexOf('\n]);', at);
const literal = source.slice(at + 'const extensions = new Map('.length, end + 2);
if (end < 0 || /[^\s\w'\[\],.+\/*~$!&#@()-]/.test(literal))
	throw new Error('The MIME table of nodemailer has another form.');
const extensions = new Function(`return ${literal};`)().map((row) => row[0]);
const rows = new Map();
for (const extension of extensions) {
	// A key that a file name cannot give (not trimmed, not lower case, or with `?`) is not reachable.
	if (extension !== extension.trim().toLowerCase() || extension.includes('?')) continue;
	if (!/^[\x21-\x7e]+$/.test(extension) || /[.\/\\"]/.test(extension))
		throw new Error(`The entry "${extension}" has another form.`);
	const type = mimeFuncs.detectMimeType(extension);
	if (!/^[A-Za-z0-9.+_-]+\/[A-Za-z0-9.+,_-]+$/.test(type))
		throw new Error(`The type "${type}" has another form.`);
	rows.set(extension, type);
}
if (rows.size < 900) throw new Error('The MIME table of nodemailer is too short.');
const sorted = [...rows.keys()].sort((a, b) => (a < b ? -1 : 1));
writeFileSync(
	join(here, 'mailmime_tables.zig'),
	[
		`//! Generated by gen_mail_cases.mjs from nodemailer ${version} (mime-funcs/mime-types.js): the content`,
		'//! type of a file name extension, as `detectMimeType` gives it. The rows are in',
		'//! byte order of the extension. Do not edit.',
		'',
		'pub const Row = struct { ext: []const u8, mime: []const u8 };',
		'',
		'pub const rows = [_]Row{',
		...sorted.map(
			(extension) => `    .{ .ext = "${extension}", .mime = "${rows.get(extension)}" },`,
		),
		'};',
		'',
	].join('\n'),
);
console.log(`${cases.length} vectors, ${rows.size} extensions`);
