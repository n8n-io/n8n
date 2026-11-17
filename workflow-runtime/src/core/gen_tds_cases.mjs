// Writes tdscase_tables.zig: test vectors for tdswire.zig (spec section 9.10).
//
// - `client`: the bytes that tedious 20 builds for PRELOGIN, LOGIN7, a SQL
//   batch and the `sp_executesql` RPC of `mssql` 12 (`request.input`, then
//   `request.query`).
// - `replies`: token streams written here from MS-TDS, with the result that
//   the token parser of tedious and the row code of `mssql` give for them.
//   A case with `want` empty has no exact native form.
//
// Run: node src/core/gen_tds_cases.mjs
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = createRequire(join(here, '../../../packages/nodes-base/package.json'));
const mssql = nodesBase('mssql');
const fromMssql = createRequire(nodesBase.resolve('mssql/package.json'));
const tds = fromMssql('tedious');
const lib = dirname(fromMssql.resolve('tedious'));
const load = (name) => {
	const m = fromMssql(join(lib, name));
	return m.default ?? m;
};
const Prelogin = load('prelogin-payload.js');
const Login7 = load('login7-payload.js');
const SqlBatch = load('sqlbatch-payload.js');
const Parser = load('token/stream-parser.js');
const { versions } = fromMssql(join(lib, 'tds-versions.js'));

const hex = (b) => Buffer.from(b).toString('hex');

// ---- client vectors -------------------------------------------------------------

const client = [];
const trace = Buffer.from(Array.from({ length: 36 }, (_, i) => (i * 7 + 3) & 0xff));
for (const encrypt of [true, false]) {
	const p = new Prelogin({ encrypt, version: { major: 20, minor: 0, build: 5, subbuild: 0 } });
	// The trace id of tedious is random: the vector has fixed bytes in its place.
	trace.copy(p.data, 0x31);
	client.push([encrypt ? 'prelogin_on' : 'prelogin_off', p.data]);
}

function login(version, pid, zone, user, password, host, server, database) {
	const l = new Login7({
		tdsVersion: versions[version],
		packetSize: 4096,
		clientProgVer: 0,
		clientPid: pid,
		connectionId: 0,
		clientTimeZone: zone,
		clientLcid: 0x409,
	});
	Object.assign(l, {
		userName: user,
		password,
		hostname: host,
		serverName: server,
		appName: 'node-mssql',
		libraryName: 'Tedious',
		language: 'us_english',
		database,
		clientId: Buffer.from([1, 2, 3, 4, 5, 6]),
		readOnlyIntent: false,
		initDbFatal: true,
	});
	return l.toBuffer();
}
client.push([
	'login_74',
	login('7_4', 4242, 0, 'sa', 'Pä55wörd!', 'host1', 'db.example.test', 'master'),
]);
client.push(['login_73b', login('7_3_B', 1, -120, 'u', '', 'h', 's', 'd')]);
client.push(['login_72', login('7_2', 77, 300, 'user😀', 'p\u0000w', 'h', '10.0.0.1', 'd b')]);

const config = new tds.Connection({
	server: 'x',
	options: { encrypt: true, enableArithAbort: false, tdsVersion: '7_4', appName: 'node-mssql' },
	authentication: { type: 'default', options: { userName: 'sa', password: 'x' } },
}).config;
const initialSql = Object.assign(Object.create(tds.Connection.prototype), {
	config,
}).getInitialSql();
const noTransaction = Buffer.alloc(8);
const batch = (text) =>
	Buffer.concat([...new SqlBatch(text, noTransaction, { tdsVersion: '7_4' })]);
client.push(['batch_initial', batch(initialSql)]);
client.push(['batch_text', batch('set x é😀')]);

const tediousType = new Map([
	[mssql.TYPES.NVarChar, tds.TYPES.NVarChar],
	[mssql.TYPES.Int, tds.TYPES.Int],
	[mssql.TYPES.BigInt, tds.TYPES.BigInt],
	[mssql.TYPES.Float, tds.TYPES.Float],
	[mssql.TYPES.Bit, tds.TYPES.Bit],
]);

/** The RPC payload of `request.input(...)` for each value, then `request.query(sql)`. */
function rpc(sql, values, collation) {
	const outer = new mssql.Request();
	for (const [name, value] of values) outer.input(name, value);
	const request = new tds.Request(sql, () => {});
	for (const name in outer.parameters) {
		const p = outer.parameters[name];
		request.addParameter(p.name, tediousType.get(p.type), p.value, {
			length: p.length,
			scale: p.scale,
			precision: p.precision,
		});
	}
	let bytes;
	const connection = Object.assign(Object.create(tds.Connection.prototype), {
		config,
		databaseCollation: collation,
		debug: { log() {} },
		currentTransactionDescriptor: () => noTransaction,
		makeRequest: (_request, _type, payload) => {
			bytes = Buffer.concat([...payload]);
		},
	});
	connection.execSql(request);
	if (!bytes) throw new Error(`no payload: ${request.error?.message}`);
	return bytes;
}
const { Collation } = fromMssql(join(lib, 'collation.js'));
const latin1 = Buffer.from([0x09, 0x04, 0xd0, 0x00, 0x34]);
const latin1Collation = Collation.fromBuffer(latin1);

// One value for each line: the form `name=kind:value` that the Zig test reads.
const rpcCases = [
	['rpc_none', 'select 1', []],
	[
		'rpc_all',
		'select @p6, @p5, @p4, @p3, @p2, @p1',
		[
			['p6', 'aé😀'],
			['p5', 7],
			['p4', -3000000000],
			['p3', 1.5],
			['p2', true],
			['p1', null],
		],
	],
	['rpc_long', 'select @p1', [['p1', 'x'.repeat(4001)]]],
	['rpc_4000', 'select @p1', [['p1', 'é'.repeat(4000)]]],
	['rpc_empty', 'select @p1', [['p1', '']]],
	['rpc_big', 'select @p1', [['p1', 9007199254740993]]],
	['rpc_inf', 'select @p1', [['p1', Number.NEGATIVE_INFINITY]]],
	['rpc_zero', 'select @p1', [['p1', -0]]],
	[
		'rpc_false',
		'select @p2, @p1',
		[
			['p2', false],
			['p1', -2147483648],
		],
	],
	[
		'rpc_edge',
		'select @p1, @p2',
		[
			['p1', 2147483648],
			['p2', -1e-7],
		],
	],
];
const rpcInputs = [];
for (const [name, sql, values] of rpcCases) {
	client.push([name, rpc(sql, values, latin1Collation)]);
	rpcInputs.push([name, sql, values]);
}

// ---- reply cases ----------------------------------------------------------------

const u8 = (n) => Buffer.from([n & 0xff]);
const u16 = (n) => {
	const b = Buffer.alloc(2);
	b.writeUInt16LE(n);
	return b;
};
const u32 = (n) => {
	const b = Buffer.alloc(4);
	b.writeUInt32LE(n >>> 0);
	return b;
};
const i32 = (n) => {
	const b = Buffer.alloc(4);
	b.writeInt32LE(n);
	return b;
};
const u64 = (n) => {
	const b = Buffer.alloc(8);
	b.writeBigUInt64LE(BigInt.asUintN(64, BigInt(n)));
	return b;
};
const ucs2 = (s) => Buffer.from(s, 'ucs2');
const bVarChar = (s) => Buffer.concat([u8(s.length), ucs2(s)]);
const usVarChar = (s) => Buffer.concat([u16(s.length), ucs2(s)]);
const cat = (...parts) => Buffer.concat(parts.map((p) => (typeof p === 'number' ? u8(p) : p)));

const utf8Collation = Buffer.from([0x09, 0x04, 0x00, 0x04, 0x00]);
const czech = Buffer.from([0x05, 0x04, 0x00, 0x00, 0x00]);
const unknownCollation = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00]);

/** A column: the type information, and whether COLMETADATA has a table name for it. */
const T = {
	fixed: (id) => ({ info: u8(id) }),
	intN: (len) => ({ info: cat(0x26, len) }),
	bitN: () => ({ info: cat(0x68, 1) }),
	floatN: (len) => ({ info: cat(0x6d, len) }),
	moneyN: (len) => ({ info: cat(0x6e, len) }),
	dateTimeN: (len) => ({ info: cat(0x6f, len) }),
	decimal: (id, len, precision, scale) => ({ info: cat(id, len, precision, scale) }),
	guid: () => ({ info: cat(0x24, 0x10) }),
	scaled: (id, scale) => ({ info: cat(id, scale) }),
	chars: (id, max, collation) => ({ info: cat(id, u16(max), collation) }),
	bytes: (id, max) => ({ info: cat(id, u16(max)) }),
	text: (id, collation) => ({ info: cat(id, u32(0x7fffffff), collation), table: true }),
	image: () => ({ info: cat(0x22, u32(0x7fffffff)), table: true }),
	xml: () => ({ info: cat(0xf1, 0) }),
};

function colMetadata(columns) {
	const parts = [u8(0x81), u16(columns.length)];
	for (const [name, type, flags] of columns) {
		parts.push(u32(0), u16(flags ?? 0x09), type.info);
		if (type.table) parts.push(u8(1), usVarChar('t'));
		parts.push(bVarChar(name));
	}
	return Buffer.concat(parts);
}
const row = (...values) => cat(0xd1, ...values);
function nbcRow(values) {
	const bitmap = Buffer.alloc(Math.ceil(values.length / 8));
	values.forEach((v, i) => {
		if (v === null) bitmap[i >> 3] |= 1 << (i & 7);
	});
	return cat(0xd2, bitmap, ...values.filter((v) => v !== null));
}
const done = (token, status, count) => cat(token, u16(status), u16(0xc1), u64(count));
const DONE = 0xfd;
const DONEPROC = 0xfe;
const DONEINPROC = 0xff;
const message = (token, number, state, clazz, text, server, proc, line) => {
	const body = cat(
		u32(number),
		state,
		clazz,
		usVarChar(text),
		bVarChar(server),
		bVarChar(proc),
		u32(line),
	);
	return cat(token, u16(body.length), body);
};
const envChange = (type, newValue, oldValue) => {
	const body = cat(type, newValue, oldValue);
	return cat(0xe3, u16(body.length), body);
};
const returnStatus = (n) => cat(0x79, i32(n));
const order = (...cols) => cat(0xa9, u16(cols.length * 2), ...cols.map(u16));

const shortValue = (data) => (data === null ? u16(0xffff) : cat(u16(data.length), data));
const byteValue = (data) => (data === null ? u8(0) : cat(data.length, data));
const plp = (chunks, known) => {
	if (chunks === null) return u64(0xffffffffffffffffn);
	const total = chunks.reduce((n, c) => n + c.length, 0);
	return cat(
		u64(known ? total : 0xfffffffffffffffen),
		...chunks.map((c) => cat(u32(c.length), c)),
		u32(0),
	);
};
const textValue = (data) =>
	data === null
		? u8(0)
		: cat(0x10, Buffer.alloc(16, 0xab), Buffer.alloc(8, 0xcd), u32(data.length), data);

let seed = 0x2f6e2b1;
function random() {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (n) => Math.floor(random() * n);
const randomBytes = (n) => Buffer.from(Array.from({ length: n }, () => pick(256)));

const replies = [];
/** `native: false` when the result of v1 has no exact native form. */
function add(name, bytes, native = true) {
	replies.push({ name, bytes, native });
}
const oneColumn = (type, value, name = 'v') =>
	cat(
		colMetadata([[name, type]]),
		row(value),
		done(DONEINPROC, 0x11, 1),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	);

// Integers, bit, floats.
const le = (n, len) => {
	const b = Buffer.alloc(8);
	b.writeBigInt64LE(BigInt(n));
	return b.subarray(0, len);
};
for (const v of [0, 1, 127, 255]) add(`tinyint ${v}`, oneColumn(T.fixed(0x30), u8(v)));
for (const v of [0, -1, 32767, -32768]) add(`smallint ${v}`, oneColumn(T.fixed(0x34), le(v, 2)));
for (const v of [0, -1, 2147483647, -2147483648])
	add(`int ${v}`, oneColumn(T.fixed(0x38), le(v, 4)));
for (const v of [0n, -1n, 9223372036854775807n, -9223372036854775808n, 9007199254740993n]) {
	add(`bigint ${v}`, oneColumn(T.fixed(0x7f), le(v, 8)));
	add(`bigint n ${v}`, oneColumn(T.intN(8), byteValue(le(v, 8))));
}
for (const len of [1, 2, 4, 8]) {
	add(`intn ${len} null`, oneColumn(T.intN(len), byteValue(null)));
	for (let i = 0; i < 4; i++)
		add(`intn ${len} #${i}`, oneColumn(T.intN(len), byteValue(randomBytes(len))));
}
for (const v of [0, 1, 2]) {
	add(`bit ${v}`, oneColumn(T.fixed(0x32), u8(v)));
	add(`bitn ${v}`, oneColumn(T.bitN(), byteValue(u8(v))));
}
add('bitn null', oneColumn(T.bitN(), byteValue(null)));
const f64 = (x) => {
	const b = Buffer.alloc(8);
	b.writeDoubleLE(x);
	return b;
};
const f32 = (x) => {
	const b = Buffer.alloc(4);
	b.writeFloatLE(x);
	return b;
};
const floats = [
	0,
	-0,
	1.5,
	-1e21,
	1e-7,
	0.1,
	123456789.125,
	Number.MAX_VALUE,
	5e-324,
	NaN,
	Infinity,
	-Infinity,
];
for (const v of floats) {
	add(`float ${v}`, oneColumn(T.fixed(0x3e), f64(v)));
	add(`real ${v}`, oneColumn(T.fixed(0x3b), f32(v)));
	add(`floatn 8 ${v}`, oneColumn(T.floatN(8), byteValue(f64(v))));
	add(`floatn 4 ${v}`, oneColumn(T.floatN(4), byteValue(f32(v))));
}
for (let i = 0; i < 12; i++) {
	add(`float #${i}`, oneColumn(T.fixed(0x3e), randomBytes(8)));
	add(`real #${i}`, oneColumn(T.fixed(0x3b), randomBytes(4)));
}
add('floatn null', oneColumn(T.floatN(8), byteValue(null)));

// Money: the high half first.
const money = (v) =>
	cat(i32(Number(BigInt.asIntN(32, BigInt(v) >> 32n))), u32(Number(BigInt(v) & 0xffffffffn)));
for (const v of [
	0n,
	1n,
	-1n,
	12345678n,
	-9223372036854775808n,
	9223372036854775807n,
	99999999999999n,
]) {
	add(`money ${v}`, oneColumn(T.fixed(0x3c), money(v)));
	add(`moneyn ${v}`, oneColumn(T.moneyN(8), byteValue(money(v))));
}
for (const v of [0, 1, -1, 2147483647, -2147483648, 123456]) {
	add(`smallmoney ${v}`, oneColumn(T.fixed(0x7a), i32(v)));
	add(`moneyn 4 ${v}`, oneColumn(T.moneyN(4), byteValue(i32(v))));
}
for (let i = 0; i < 12; i++) add(`money #${i}`, oneColumn(T.fixed(0x3c), randomBytes(8)));
add('moneyn null', oneColumn(T.moneyN(8), byteValue(null)));

// Decimal and numeric: tedious divides a double. Math.pow(10, scale) is exact up to 10^22.
const decimalSizes = [
	[5, 9],
	[9, 19],
	[13, 28],
	[17, 38],
];
for (const id of [0x6a, 0x6c]) {
	add(`decimal ${id} null`, oneColumn(T.decimal(id, 9, 18, 2), byteValue(null)));
	for (const [len, precision] of decimalSizes) {
		for (let i = 0; i < 10; i++) {
			const scale = pick(Math.min(precision, 22) + 1);
			const magnitude = randomBytes(len - 1);
			if (i < 3) magnitude.fill(0, 1 + pick(len - 2));
			if (i === 9) magnitude.fill(0);
			const value = cat(len, pick(2), magnitude);
			add(
				`decimal ${id} ${len} ${scale} #${i}`,
				oneColumn(T.decimal(id, len, precision, scale), value),
			);
		}
	}
	add(
		`decimal ${id} scale 23`,
		oneColumn(T.decimal(id, 17, 38, 23), cat(17, 1, randomBytes(16))),
		false,
	);
	add(
		`decimal ${id} scale 38`,
		oneColumn(T.decimal(id, 17, 38, 38), cat(17, 0, randomBytes(16))),
		false,
	);
}

// Dates and times.
const u24 = (n) => u32(n).subarray(0, 3);
const timeBytes = (ticks, scale) => {
	const len = scale <= 2 ? 3 : scale <= 4 ? 4 : 5;
	const b = Buffer.alloc(8);
	b.writeBigUInt64LE(BigInt(ticks));
	return b.subarray(0, len);
};
const dayOf = (y, m, d) =>
	Math.round((Date.UTC(2000, m - 1, d) - Date.UTC(2000, 0, 1)) / 864e5) + 730119 + daysToYear(y);
function daysToYear(y) {
	const a = new Date(Date.UTC(2000, 0, 1));
	const b = new Date(Date.UTC(2000, 0, 1));
	b.setUTCFullYear(y);
	return Math.round((b - a) / 864e5);
}
const days = [
	0,
	1,
	365,
	577736,
	693595,
	719162,
	730119,
	738000,
	3652058,
	dayOf(2024, 2, 29),
	dayOf(1969, 12, 31),
];
for (const d of days) add(`date ${d}`, oneColumn(T.fixed(0x28), byteValue(u24(d))));
add('date null', oneColumn(T.fixed(0x28), byteValue(null)));
for (let scale = 0; scale <= 7; scale++) {
	const unit = 10 ** scale;
	const ticks = [0, 1, unit * 86400 - 1, pick(unit * 86400), pick(unit * 86400)];
	for (const t of ticks) {
		const time = timeBytes(t, scale);
		add(`time ${scale} ${t}`, oneColumn(T.scaled(0x29, scale), byteValue(time)));
		const d = days[pick(days.length)];
		add(
			`datetime2 ${scale} ${t} ${d}`,
			oneColumn(T.scaled(0x2a, scale), byteValue(cat(time, u24(d)))),
		);
		const zone = pick(1681) - 840;
		const offset = Buffer.alloc(2);
		offset.writeInt16LE(zone);
		add(
			`datetimeoffset ${scale} ${t} ${d} ${zone}`,
			oneColumn(T.scaled(0x2b, scale), byteValue(cat(time, u24(d), offset))),
		);
	}
	add(`time ${scale} null`, oneColumn(T.scaled(0x29, scale), byteValue(null)));
	add(`datetime2 ${scale} null`, oneColumn(T.scaled(0x2a, scale), byteValue(null)));
	add(`datetimeoffset ${scale} null`, oneColumn(T.scaled(0x2b, scale), byteValue(null)));
}
const dateTimes = [
	[0, 0],
	[-53690, 0],
	[2958463, 25919999],
	[45000, 1],
	[45000, 2],
	[45000, 3],
	[-1, 25919999],
];
for (let i = 0; i < 12; i++) dateTimes.push([pick(2958463 + 53690) - 53690, pick(25920000)]);
for (const [d, t] of dateTimes) {
	add(`datetime ${d} ${t}`, oneColumn(T.fixed(0x3d), cat(i32(d), u32(t))));
	add(`datetimen ${d} ${t}`, oneColumn(T.dateTimeN(8), byteValue(cat(i32(d), u32(t)))));
}
for (const [d, m] of [
	[0, 0],
	[65535, 1439],
	[45000, 61],
	[pick(65536), pick(1440)],
]) {
	add(`smalldatetime ${d} ${m}`, oneColumn(T.fixed(0x3a), cat(u16(d), u16(m))));
	add(`datetimen 4 ${d} ${m}`, oneColumn(T.dateTimeN(4), byteValue(cat(u16(d), u16(m)))));
}
add('datetimen null', oneColumn(T.dateTimeN(8), byteValue(null)));

// uniqueidentifier.
add('guid', oneColumn(T.guid(), byteValue(Buffer.from('00112233445566778899aabbccddeeff', 'hex'))));
add('guid random', oneColumn(T.guid(), byteValue(randomBytes(16))));
add('guid null', oneColumn(T.guid(), byteValue(null)));

// Character types.
const texts = [
	'',
	'plain',
	'quote " back \\ slash',
	'line\nfeed\ttab\u0001',
	'é ü ß €',
	'漢字 😀',
	'\ud83d',
	'a\udc00b',
];
for (const id of [0xe7, 0xef]) {
	for (const s of texts)
		add(
			`nchars ${id} ${JSON.stringify(s)}`,
			oneColumn(T.chars(id, 8000, latin1), shortValue(ucs2(s))),
		);
	add(`nchars ${id} null`, oneColumn(T.chars(id, 8000, latin1), shortValue(null)));
	add(`nchars ${id} odd`, oneColumn(T.chars(id, 8000, latin1), shortValue(cat(ucs2('ab'), 0x41))));
}
const allBytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
for (const id of [0xa7, 0xaf]) {
	add(
		`chars ${id} ascii`,
		oneColumn(T.chars(id, 8000, latin1), shortValue(Buffer.from('plain "text" \\ \u0001'))),
	);
	add(`chars ${id} cp1252 all`, oneColumn(T.chars(id, 8000, latin1), shortValue(allBytes)));
	add(`chars ${id} null`, oneColumn(T.chars(id, 8000, latin1), shortValue(null)));
	add(`chars ${id} empty`, oneColumn(T.chars(id, 8000, czech), shortValue(Buffer.alloc(0))));
	add(
		`chars ${id} utf8`,
		oneColumn(T.chars(id, 8000, utf8Collation), shortValue(Buffer.from('é 漢字 😀 "x"'))),
	);
	add(
		`chars ${id} utf8 broken`,
		oneColumn(T.chars(id, 8000, utf8Collation), shortValue(Buffer.from([0x61, 0xc3]))),
		false,
	);
	add(
		`chars ${id} czech ascii`,
		oneColumn(T.chars(id, 8000, czech), shortValue(allBytes.subarray(0, 128))),
	);
	add(
		`chars ${id} czech high`,
		oneColumn(T.chars(id, 8000, czech), shortValue(Buffer.from([0x61, 0xe8]))),
		false,
	);
	add(
		`chars ${id} unknown ascii`,
		oneColumn(T.chars(id, 8000, unknownCollation), shortValue(Buffer.from('abc'))),
	);
	add(
		`chars ${id} unknown high`,
		oneColumn(T.chars(id, 8000, unknownCollation), shortValue(Buffer.from('é'))),
		false,
	);
}
// Sort order 52 has the code page 1252 for each language; a language alone decides without it.
for (const lang of [0x0406, 0x0409, 0x040a, 0x0c0a, 0x0413]) {
	const collation = Buffer.from([lang & 0xff, lang >> 8, 0, 0, 0]);
	add(
		`chars lang ${lang}`,
		oneColumn(T.chars(0xa7, 100, collation), shortValue(Buffer.from([0xe9, 0x80]))),
		collationIs1252(collation),
	);
}
function collationIs1252(bytes) {
	return Collation.fromBuffer(bytes).codepage === 'CP1252';
}
for (let sortId = 1; sortId < 256; sortId += 1) {
	const collation = Buffer.from([0x09, 0x04, 0, 0, sortId]);
	add(
		`chars sort ${sortId}`,
		oneColumn(T.chars(0xa7, 100, collation), shortValue(Buffer.from([0x41, 0xe9]))),
		collationIs1252(collation),
	);
}
for (const lang of Object.keys(fromMssql(join(lib, 'collation.js')).codepageByLanguageId)) {
	const n = Number(lang);
	const collation = Buffer.from([n & 0xff, (n >> 8) & 0xff, 0, 0, 0]);
	add(
		`chars language ${n}`,
		oneColumn(T.chars(0xa7, 100, collation), shortValue(Buffer.from([0x41, 0xe9]))),
		collationIs1252(collation),
	);
}

// The (max) types: partially length-prefixed.
const long = 'é😀'.repeat(40);
add('nvarchar max', oneColumn(T.chars(0xe7, 0xffff, latin1), plp([ucs2(long)], true)));
add(
	'nvarchar max chunks',
	oneColumn(
		T.chars(0xe7, 0xffff, latin1),
		plp([ucs2(long).subarray(0, 3), ucs2(long).subarray(3, 7), ucs2(long).subarray(7)], false),
	),
);
add(
	'nvarchar max odd',
	oneColumn(T.chars(0xe7, 0xffff, latin1), plp([cat(ucs2('ab'), 0x41)], true)),
);
add('nvarchar max empty', oneColumn(T.chars(0xe7, 0xffff, latin1), plp([], true)));
add('nvarchar max null', oneColumn(T.chars(0xe7, 0xffff, latin1), plp(null)));
add(
	'varchar max',
	oneColumn(
		T.chars(0xa7, 0xffff, latin1),
		plp([allBytes.subarray(0, 100), allBytes.subarray(100)], true),
	),
);
add(
	'varchar max utf8',
	oneColumn(T.chars(0xa7, 0xffff, utf8Collation), plp([Buffer.from('é 漢字')], true)),
);
add(
	'varchar max utf8 ascii chunks',
	oneColumn(
		T.chars(0xa7, 0xffff, utf8Collation),
		plp([Buffer.from('ab'), Buffer.from('cd')], false),
	),
);
add(
	'varchar max utf8 chunks',
	oneColumn(T.chars(0xa7, 0xffff, utf8Collation), plp([Buffer.from('é'), Buffer.from('é')], true)),
	false,
);
add('varchar max null', oneColumn(T.chars(0xa7, 0xffff, latin1), plp(null)));
add(
	'varbinary max',
	oneColumn(T.bytes(0xa5, 0xffff), plp([allBytes.subarray(0, 9), allBytes.subarray(9, 20)], true)),
);
add('varbinary max null', oneColumn(T.bytes(0xa5, 0xffff), plp(null)));
add('xml', oneColumn(T.xml(), plp([ucs2('<a/>')], true)), false);

// Binary types and the text types.
for (const id of [0xa5, 0xad]) {
	add(`binary ${id}`, oneColumn(T.bytes(id, 8000), shortValue(Buffer.from([0, 1, 127, 128, 255]))));
	add(`binary ${id} empty`, oneColumn(T.bytes(id, 8000), shortValue(Buffer.alloc(0))));
	add(`binary ${id} null`, oneColumn(T.bytes(id, 8000), shortValue(null)));
}
add('text', oneColumn(T.text(0x23, latin1), textValue(Buffer.from([0x61, 0xe9, 0x80]))));
add('text null', oneColumn(T.text(0x23, latin1), textValue(null)));
add('ntext', oneColumn(T.text(0x63, latin1), textValue(ucs2('n é 😀'))));
add('ntext null', oneColumn(T.text(0x63, latin1), textValue(null)));
add('image', oneColumn(T.image(), textValue(Buffer.from([1, 2, 3]))));
add('image null', oneColumn(T.image(), textValue(null)));
add('null type', oneColumn(T.fixed(0x1f), Buffer.alloc(0)));

// Whole replies.
const two = [
	['id', T.fixed(0x38)],
	['na"me', T.chars(0xe7, 100, latin1)],
	['amount', T.decimal(0x6a, 9, 18, 2)],
];
const intRow = (id, name, amount) =>
	row(
		le(id, 4),
		shortValue(name === null ? null : ucs2(name)),
		byteValue(amount === null ? null : cat(1, le(amount, 8))),
	);
add(
	'rows',
	cat(
		colMetadata(two),
		intRow(1, 'a', 150),
		intRow(2, null, null),
		done(DONEINPROC, 0x10, 2),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);
add(
	'nbc rows',
	cat(
		colMetadata(two),
		nbcRow([le(1, 4), null, null]),
		nbcRow([le(2, 4), shortValue(ucs2('b')), byteValue(cat(0, le(5, 8)))]),
		intRow(3, 'c', 1),
		done(DONEINPROC, 0x10, 3),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);
const nine = Array.from({ length: 9 }, (_, i) => [`c${i}`, T.intN(4)]);
add(
	'nbc nine',
	cat(
		colMetadata(nine),
		nbcRow([null, byteValue(le(1, 4)), null, null, null, null, null, null, byteValue(le(9, 4))]),
		done(DONEINPROC, 0x10, 1),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);
add(
	'no rows',
	cat(colMetadata(two), done(DONEINPROC, 0x10, 0), returnStatus(0), done(DONEPROC, 0, 0)),
);
add(
	'two sets',
	cat(
		colMetadata(two),
		intRow(1, 'a', 1),
		done(DONEINPROC, 0x11, 1),
		colMetadata([['x', T.fixed(0x30)]]),
		row(u8(7)),
		row(u8(8)),
		done(DONEINPROC, 0x10, 2),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);
add('update', cat(done(DONEINPROC, 0x10, 3), returnStatus(0), done(DONEPROC, 0, 0)));
add(
	'update then select',
	cat(
		done(DONEINPROC, 0x11, 3),
		colMetadata([['x', T.fixed(0x30)]]),
		row(u8(7)),
		done(DONEINPROC, 0x10, 1),
		done(DONEINPROC, 0x11, 4),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);
add('nocount', cat(done(DONEINPROC, 0x00, 0), returnStatus(0), done(DONEPROC, 0, 0)));
add(
	'order',
	cat(
		colMetadata([['x', T.fixed(0x30)]]),
		order(1),
		row(u8(7)),
		done(DONEINPROC, 0x10, 1),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);
add(
	'info',
	cat(
		message(0xab, 5701, 2, 0, "Changed database context to 'master'.", 'srv', '', 1),
		envChange(1, bVarChar('master'), bVarChar('tempdb')),
		done(DONEINPROC, 0x10, 0),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);
add(
	'error',
	cat(
		message(0xaa, 208, 1, 16, 'Invalid object name \'no "table"\'.', 'srv', '', 1),
		returnStatus(0),
		done(DONEPROC, 0x02, 0),
	),
);
add(
	'two errors',
	cat(
		message(0xaa, 2627, 1, 14, 'Violation of PRIMARY KEY constraint.', 'srv', 'proc é', 7),
		message(0xaa, 3621, 0, 0, 'The statement has been terminated.', 'srv', '', 4000000000),
		done(DONEINPROC, 0x12, 0),
		returnStatus(0),
		done(DONEPROC, 0x02, 0),
	),
);
add(
	'rows then error',
	cat(
		colMetadata([['x', T.fixed(0x30)]]),
		row(u8(7)),
		done(DONEINPROC, 0x11, 1),
		message(0xaa, 8134, 1, 16, 'Divide by zero error encountered.', 'srv', '', 2),
		done(DONEINPROC, 0x12, 0),
		returnStatus(0),
		done(DONEPROC, 0x02, 0),
	),
);
add('batch done', cat(colMetadata([['x', T.fixed(0x30)]]), row(u8(7)), done(DONE, 0x10, 1)));
add(
	'empty name',
	cat(
		colMetadata([['', T.fixed(0x30)]]),
		row(u8(7)),
		done(DONEINPROC, 0x10, 1),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);
add(
	'same names',
	cat(
		colMetadata([
			['x', T.fixed(0x30)],
			['x', T.fixed(0x30)],
		]),
		row(u8(7), u8(8)),
		done(DONEINPROC, 0x10, 1),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
	false,
);
add('proto name', oneColumn(T.fixed(0x30), u8(1), '__proto__'), false);
add(
	'json column',
	oneColumn(
		T.chars(0xe7, 0xffff, latin1),
		plp([ucs2('{"a":1}')], true),
		'JSON_F52E2B61-18A1-11d1-B105-00805F49916B',
	),
	false,
);
add(
	'xml column',
	oneColumn(
		T.chars(0xe7, 0xffff, latin1),
		plp([ucs2('<a/>')], true),
		'XML_F52E2B61-18A1-11d1-B105-00805F49916B',
	),
	false,
);
add('done error alone', cat(returnStatus(0), done(DONEPROC, 0x02, 0)), false);
add(
	'unicode names',
	cat(
		colMetadata([
			['é😀', T.fixed(0x30)],
			['\u0001', T.fixed(0x30)],
		]),
		row(u8(7), u8(8)),
		done(DONEINPROC, 0x10, 1),
		returnStatus(0),
		done(DONEPROC, 0, 0),
	),
);

// ---- the result of tedious and mssql ----------------------------------------------

const parserOptions = {
	tdsVersion: '7_4',
	useUTC: true,
	lowerCaseGuids: false,
	useColumnNames: false,
	camelCaseColumns: false,
};
const noDebug = { token() {}, payload() {}, data() {}, packet() {}, log() {} };
const chunked = new Set([
	'JSON_F52E2B61-18A1-11d1-B105-00805F49916B',
	'XML_F52E2B61-18A1-11d1-B105-00805F49916B',
]);

/** The row code of `mssql` (lib/tedious/request.js, `_query`) over the tokens of tedious. */
async function result(bytes) {
	const sets = [];
	const rowsAffected = [];
	const errors = [];
	let columns = {};
	let recordset = [];
	const doneHandler = (rowCount) => {
		if (rowCount != null) rowsAffected.push(rowCount);
		if (Object.keys(columns).length === 0) return;
		sets.push(recordset);
		recordset = [];
		columns = {};
	};
	for await (const token of Parser.parseTokens([bytes], noDebug, parserOptions)) {
		switch (token.handlerName) {
			case 'onColMetadata':
				columns = {};
				for (const column of token.columns) columns[column.colName] = column;
				if (token.columns.length === 1 && chunked.has(token.columns[0].colName))
					throw new Error('chunked');
				break;
			case 'onRow': {
				const out = {};
				for (const column of token.columns) {
					if (out[column.metadata.colName] !== undefined)
						throw new Error('two columns have one name');
					out[column.metadata.colName] = column.value;
				}
				recordset.push(out);
				break;
			}
			case 'onDoneInProc':
			case 'onDone':
				doneHandler(token.rowCount);
				break;
			case 'onErrorMessage': {
				const {
					message: text,
					number,
					state,
					class: clazz,
					lineNumber,
					serverName,
					procName,
				} = token;
				errors.push({
					message: text,
					number,
					state,
					class: clazz,
					lineNumber,
					serverName,
					procName,
				});
				break;
			}
			default:
				break;
		}
	}
	return JSON.stringify({ sets, rowsAffected, errors });
}

const lines = [
	'//! Generated by gen_tds_cases.mjs: the test vectors of tdswire.zig. Do not edit.',
	'',
	'pub const Vector = struct { name: []const u8, hex: []const u8 };',
	'',
	'/// The bytes that tedious and mssql build.',
	'pub const client = [_]Vector{',
	...client.map(([name, bytes]) => `    .{ .name = "${name}", .hex = "${hex(bytes)}" },`),
	'};',
	'',
	'pub const Value = struct { name: []const u8, kind: u8, hex: []const u8 };',
	'pub const Rpc = struct { name: []const u8, sql: []const u8, values: []const Value };',
	'',
	'/// The statement and the values of each `rpc_` vector. The kinds are `s`',
	'/// (string, UTF-8), `n` (number, the bytes of the double), `b` (boolean) and `z` (null).',
	'pub const rpcs = [_]Rpc{',
];
for (const [name, sql, values] of rpcInputs) {
	lines.push(`    .{ .name = "${name}", .sql = "${sql}", .values = &.{`);
	for (const [param, value] of values) {
		const [kind, bytes] =
			value === null
				? ['z', Buffer.alloc(0)]
				: typeof value === 'string'
					? ['s', Buffer.from(value)]
					: typeof value === 'number'
						? ['n', f64(value)]
						: ['b', u8(value ? 1 : 0)];
		lines.push(`        .{ .name = "${param}", .kind = '${kind}', .hex = "${hex(bytes)}" },`);
	}
	lines.push('    } },');
}
lines.push(
	'};',
	'',
	'pub const Reply = struct { name: []const u8, hex: []const u8, want: []const u8 };',
	'',
	'/// Token streams, and the result of tedious and mssql as JSON in hex. An',
	'/// empty `want` is a result without an exact native form.',
	'pub const replies = [_]Reply{',
);
for (const reply of replies) {
	let want = '';
	if (reply.native) want = hex(Buffer.from(await result(reply.bytes)));
	else await result(reply.bytes).catch(() => '');
	const name = JSON.stringify(reply.name)
		.slice(1, -1)
		.replace(/\\u([0-9a-f]{4})/g, '\\u{$1}')
		.replace(/[^\x20-\x7e]/g, '?');
	lines.push(`    .{ .name = "${name}", .hex = "${hex(reply.bytes)}", .want = "${want}" },`);
}
lines.push('};', '');
writeFileSync(join(here, 'tdscase_tables.zig'), lines.join('\n'));
console.log(`${client.length} client vectors, ${replies.length} replies`);
