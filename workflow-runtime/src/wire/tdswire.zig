//! The Tabular Data Stream protocol of Microsoft SQL Server (MS-TDS, versions
//! 7.2 to 7.4): a pure codec. It frames packets, builds PRELOGIN, LOGIN7
//! with SQL authentication, a SQL batch and the `sp_executesql` RPC as
//! tedious 20 builds them for `mssql` 12, reads the token stream of a reply,
//! and turns a column value into the JSON that the v1 node gives for it
//! (spec section 9.10).
//!
//! Nothing here reads a socket or a clock. A shell client owns the
//! connections and passes bytes in and out. Every length from the wire is
//! checked against the buffer before use. A result without an exact native
//! form is `error.Unsupported`: the call then runs in the fallback host.
const std = @import("std");
const numfmt = @import("numfmt.zig");
const pgwire = @import("pgwire.zig");

pub const Error = error{ NoSpace, Malformed };
pub const ReplyError = error{ NoSpace, Malformed, Unsupported };
pub const Out = pgwire.Out;

// ---- packets --------------------------------------------------------------------

pub const header_len = 8;
/// The packet size that tedious asks for in LOGIN7.
pub const packet_size = 4096;

pub const kind = struct {
    pub const sql_batch: u8 = 0x01;
    pub const rpc: u8 = 0x03;
    pub const reply: u8 = 0x04;
    pub const login7: u8 = 0x10;
    pub const prelogin: u8 = 0x12;
};

pub const Packet = struct {
    kind: u8,
    /// The last packet of its message.
    last: bool,
    body: []const u8,
    /// The bytes of the packet with its header.
    size: usize,
};

/// The first packet of `buf`, or null when `buf` does not hold all of it.
pub fn next(buf: []const u8) Error!?Packet {
    if (buf.len < header_len) return null;
    const size: usize = std.mem.readInt(u16, buf[2..4], .big);
    if (size < header_len) return error.Malformed;
    if (buf.len < size) return null;
    return .{ .kind = buf[0], .last = buf[1] & 1 != 0, .body = buf[header_len..size], .size = size };
}

/// One message as packets of at most `size` bytes. A message that does not
/// fit leaves `o` as it was.
pub fn frame(o: *Out, message_kind: u8, payload: []const u8, size: usize) Error!void {
    std.debug.assert(size > header_len and size <= 0xFFFF);
    const start = o.len;
    const room = size - header_len;
    const count = @max(1, (payload.len + room - 1) / room);
    for (0..count) |i| {
        const part = payload[i * room .. @min(payload.len, (i + 1) * room)];
        var head: [header_len]u8 = @splat(0);
        head[0] = message_kind;
        head[1] = if (i + 1 == count) 1 else 0;
        std.mem.writeInt(u16, head[2..4], std.math.cast(u16, part.len + header_len) orelse unreachable, .big);  // invariant
        head[6] = std.math.cast(u8, i + 1) orelse unreachable; // packet count fits in u8
        o.put(&head) catch |e| return undo(o, start, e);
        o.put(part) catch |e| return undo(o, start, e);
    }
}

fn undo(o: *Out, start: usize, e: error{NoSpace}) error{NoSpace} {
    std.debug.assert(start <= o.len);
    o.len = start;
    return e;
}

// ---- text -----------------------------------------------------------------------

fn putInt(o: *Out, comptime T: type, v: T) error{NoSpace}!void {
    var raw: [@divExact(@typeInfo(T).int.bits, 8)]u8 = @splat(0);
    std.mem.writeInt(T, &raw, v, .little);
    try o.put(&raw);
}

fn patch(o: *Out, at: usize, comptime T: type, v: T) void {
    const size = @divExact(@typeInfo(T).int.bits, 8);
    std.debug.assert(at + size <= o.len);
    std.mem.writeInt(T, o.buf[at..][0..size], v, .little);
}

/// The code point at the start of `s` and its length. Surrogates in the
/// three-byte form pass, as a JavaScript string can hold one alone.
fn decodeUtf8(s: []const u8) error{Malformed}!struct { cp: u21, len: usize } {
    std.debug.assert(s.len > 0);
    const c = s[0];
    if (c < 0x80) return .{ .cp = c, .len = 1 };
    const len: usize = if (c & 0xE0 == 0xC0) 2 else if (c & 0xF0 == 0xE0) 3 else if (c & 0xF8 == 0xF0) 4 else return error.Malformed;
    if (s.len < len) return error.Malformed;
    var cp: u21 = c & (@as(u8, 0x7F) >> (std.math.cast(u3, len) orelse unreachable)); // len in 2..4
    for (s[1..len]) |b| {
        if (b & 0xC0 != 0x80) return error.Malformed;
        cp = cp << 6 | (b & 0x3F);
    }
    const least: u21 = switch (len) {
        2 => 0x80,
        3 => 0x800,
        // Four bytes.
        else => 0x10000,
    };
    if (cp < least or cp > 0x10FFFF) return error.Malformed;
    return .{ .cp = cp, .len = len };
}

/// `s` (UTF-8) as UTF-16, little-endian. Gives the count of code units.
fn putUtf16(o: *Out, s: []const u8) Error!usize {
    var units: usize = 0;
    var i: usize = 0;
    for (0..s.len) |_| {
        if (i == s.len) break;
        const d = try decodeUtf8(s[i..]);
        i += d.len;
        if (d.cp < 0x10000) {
            try putInt(o, u16, std.math.cast(u16, d.cp) orelse unreachable); // cp < 0x10000
            units += 1;
        } else {
            const v = d.cp - 0x10000;
            try putInt(o, u16, std.math.cast(u16, 0xD800 + (v >> 10)) orelse unreachable);  // invariant
            try putInt(o, u16, std.math.cast(u16, 0xDC00 + (v & 0x3FF)) orelse unreachable);  // invariant
            units += 2;
        }
    }
    std.debug.assert(i == s.len);
    return units;
}

// ---- PRELOGIN -------------------------------------------------------------------

pub const trace_bytes = 36;

pub const encryption = struct {
    pub const off: u8 = 0;
    pub const on: u8 = 1;
    pub const not_supported: u8 = 2;
    pub const required: u8 = 3;
};

/// The PRELOGIN message of tedious 20.0.5: VERSION, ENCRYPTION, INSTOPT,
/// THREADID, MARS, TRACEID and FEDAUTHREQUIRED. `trace` is 36 random bytes.
pub fn prelogin(o: *Out, encrypt: bool, trace: *const [trace_bytes]u8) Error!void {
    const sizes = [_]u8{ 6, 1, 1, 4, 1, trace_bytes, 1 };
    const start = o.len;
    var at: u16 = sizes.len * 5 + 1;
    for (sizes, 0..) |size, option| {
        var entry: [5]u8 = @splat(0);
        entry[0] = std.math.cast(u8, option) orelse unreachable; // option < 7
        std.mem.writeInt(u16, entry[1..3], at, .big);
        entry[4] = size;
        o.put(&entry) catch |e| return undo(o, start, e);
        at += size;
    }
    const version = [_]u8{ 20, 0, 0, 5, 0, 0 };
    const mode: u8 = if (encrypt) encryption.on else encryption.not_supported;
    const parts = [_][]const u8{ &.{0xFF}, &version, &.{mode}, &.{0}, &.{ 0, 0, 0, 0 }, &.{0}, trace, &.{1} };
    for (parts) |p| o.put(p) catch |e| return undo(o, start, e);
    std.debug.assert(o.len - start == at);
}

/// The ENCRYPTION option of the PRELOGIN answer of the server.
pub fn preloginEncryption(body: []const u8) Error!u8 {
    const entries = body.len / 5;
    for (0..entries) |i| {
        const entry = body[i * 5 ..][0..5];
        if (entry[0] == 0xFF) break;
        if (entry[0] != 1) continue;
        const at: usize = std.mem.readInt(u16, entry[1..3], .big);
        if (std.mem.readInt(u16, entry[3..5], .big) != 1 or at >= body.len) return error.Malformed;
        return body[at];
    }
    return error.Malformed;
}

// ---- LOGIN7 ---------------------------------------------------------------------

pub const Version = enum(u32) {
    v7_2 = 0x72090002,
    v7_3_a = 0x730A0003,
    v7_3_b = 0x730B0003,
    v7_4 = 0x74000004,
};

pub const Login = struct {
    version: Version,
    pid: u32,
    /// Minutes, as `Date.prototype.getTimezoneOffset`.
    zone: i32,
    host: []const u8,
    user: []const u8,
    password: []const u8,
    server: []const u8,
    database: []const u8,
};

const app_name = "node-mssql";
const library_name = "Tedious";
const language = "us_english";
const login_fixed = 94;

/// LOGIN7 with SQL authentication, as tedious builds it for `mssql`.
pub fn login7(o: *Out, l: Login) Error!void {
    const start = o.len;
    login7Parts(o, l, start) catch |e| {
        o.len = start;
        return e;
    };
}

fn login7Parts(o: *Out, l: Login, start: usize) Error!void {
    std.debug.assert(o.len == start);
    var fixed: [login_fixed]u8 = @splat(0);
    try o.put(&fixed);
    std.mem.writeInt(u32, fixed[4..8], @backingInt(l.version), .little);
    std.mem.writeInt(u32, fixed[8..12], packet_size, .little);
    std.mem.writeInt(u32, fixed[16..20], l.pid, .little);
    // Flags: the database must exist and a language change warns; then the
    // unknown-collation and extension flags.
    fixed[24] = 0xF0;
    fixed[27] = 0x18;
    std.mem.writeInt(i32, fixed[28..32], l.zone, .little);
    std.mem.writeInt(u32, fixed[32..36], 0x409, .little);
    const extension = l.version == .v7_4;
    const texts = [_][]const u8{ l.host, l.user, l.password, app_name, l.server, "", library_name, language, l.database };
    for (texts, 0..) |text, i| {
        const at = o.len;
        std.mem.writeInt(u16, fixed[36 + i * 4 ..][0..2], try offset16(at - start), .little);
        var units = try putUtf16(o, text);
        if (i == 2) scramble(o.buf[at..o.len]);
        if (i == 5 and extension) {
            try o.put(&.{ 0, 0, 0, 0 });
            units = 4;
        }
        std.mem.writeInt(u16, fixed[38 + i * 4 ..][0..2], try offset16(units), .little);
    }
    @memcpy(fixed[72..78], &[_]u8{ 1, 2, 3, 4, 5, 6 });
    // SSPI, the database file and the new password: all empty.
    for (0..3) |i| std.mem.writeInt(u16, fixed[78 + i * 4 ..][0..2], try offset16(o.len - start), .little);
    if (extension) {
        const at = std.mem.readInt(u16, fixed[56..58], .little);
        patch(o, start + at, u32, std.math.cast(u32, o.len - start) orelse unreachable);  // invariant
        // UTF8_SUPPORT, then the terminator.
        try o.put(&.{ 0x0A, 1, 0, 0, 0, 1, 0xFF });
    }
    std.mem.writeInt(u32, fixed[0..4], std.math.cast(u32, o.len - start) orelse unreachable, .little);  // invariant
    @memcpy(o.buf[start..][0..login_fixed], &fixed);
}

fn offset16(n: usize) Error!u16 {
    return std.math.cast(u16, n) orelse error.NoSpace;
}

/// The password of LOGIN7: each byte with its halves swapped, then XOR 0xA5.
fn scramble(bytes: []u8) void {
    for (bytes) |*b| b.* = (b.* << 4 | b.* >> 4) ^ 0xA5;
}

// ---- requests -------------------------------------------------------------------

/// ALL_HEADERS with the transaction descriptor of no transaction and one
/// request.
const all_headers = [_]u8{ 22, 0, 0, 0, 18, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0 };

/// The statements that tedious sends after the login, with the options of
/// the v1 node (`enableArithAbort: false`).
pub const initial_sql = "set ansi_nulls on\nset ansi_null_dflt_on on\nset ansi_padding on\nset ansi_warnings on\n" ++
    "set arithabort off\nset concat_null_yields_null on\nset datefirst 7\nset dateformat mdy\n" ++
    "set implicit_transactions off\nset language us_english\nset numeric_roundabort off\n" ++
    "set quoted_identifier on\nset textsize 2147483647\nset transaction isolation level read committed\n" ++
    "set xact_abort off";

/// The payload of a SQL batch.
pub fn sqlBatch(o: *Out, text: []const u8) Error!void {
    const start = o.len;
    o.put(&all_headers) catch |e| return undo(o, start, e);
    if (putUtf16(o, text)) |units| {
        std.debug.assert(o.len - start == all_headers.len + units * 2);
    } else |e| {
        o.len = start;
        return e;
    }
}

pub const Value = union(enum) {
    null,
    string: []const u8,
    number: f64,
    boolean: bool,
};

pub const Param = struct {
    /// Without the `@`: letters, digits and `_`.
    name: []const u8,
    value: Value,
};

pub const collation_bytes = 5;
const max_short_units = 4000;

/// The payload of the RPC `sp_executesql` that `mssql` sends for
/// `request.input(name, value)` of each parameter and `request.query(sql)`.
/// A value that `mssql` refuses or changes (NaN, an integer outside 64
/// bits) is `error.Unsupported`.
pub fn executeSql(o: *Out, sql: []const u8, params: []const Param, collation: [collation_bytes]u8) ReplyError!void {
    const start = o.len;
    executeSqlParts(o, sql, params, collation) catch |e| {
        o.len = start;
        return e;
    };
}

fn executeSqlParts(o: *Out, sql: []const u8, params: []const Param, collation: [collation_bytes]u8) ReplyError!void {
    std.debug.assert(o.len <= o.buf.len);
    try o.put(&all_headers);
    // The procedure by its number (10), then no option flags.
    try o.put(&.{ 0xFF, 0xFF, 10, 0, 0, 0 });
    try paramName(o, "statement");
    var text = try NVarChar.begin(o, collation);
    text.units = try putUtf16(o, sql);
    try text.end(o);
    if (params.len == 0) return;
    try paramName(o, "params");
    var declared = try NVarChar.begin(o, collation);
    for (params, 0..) |p, i| {
        if (i > 0) declared.units += try putUtf16(o, ", ");
        declared.units += try putUtf16(o, "@");
        declared.units += try putUtf16(o, p.name);
        declared.units += try declaration(o, p.value);
    }
    try declared.end(o);
    for (params) |p| {
        try paramName(o, p.name);
        try paramValue(o, p.value, collation);
    }
}

fn paramName(o: *Out, name: []const u8) ReplyError!void {
    for (name) |c| if (!std.ascii.isAlphanumeric(c) and c != '_') return error.Malformed;
    if (name.len == 0 or name.len > 127) return error.Malformed;
    try o.byte(std.math.cast(u8, name.len + 1) orelse unreachable); // name.len < 127
    std.debug.assert(try putUtf16(o, "@") == 1);
    std.debug.assert(try putUtf16(o, name) == name.len);
    // The status flags: an input value.
    try o.byte(0);
}

const Number = union(enum) { int: i32, big: i64, float: f64 };

/// The type that `mssql` gives a JavaScript number.
fn numberOf(x: f64) error{Unsupported}!Number {
    if (std.math.isNan(x)) return error.Unsupported;
    if (std.math.isInf(x) or @trunc(x) != x) return .{ .float = x };
    if (x >= -2147483648.0 and x <= 2147483647.0) return .{ .int = @intFromFloat(x) };
    if (x >= -9223372036854775808.0 and x < 9223372036854775808.0) return .{ .big = @intFromFloat(x) };
    return error.Unsupported;
}

fn units16(s: []const u8) Error!usize {
    var units: usize = 0;
    var i: usize = 0;
    for (0..s.len) |_| {
        if (i == s.len) break;
        const d = try decodeUtf8(s[i..]);
        i += d.len;
        units += if (d.cp < 0x10000) 1 else 2;
    }
    return units;
}

/// The declaration of a parameter in `@params`. Gives its code units.
fn declaration(o: *Out, value: Value) ReplyError!usize {
    switch (value) {
        .null => return putUtf16(o, " nvarchar(1)"),
        .boolean => return putUtf16(o, " bit"),
        .number => |x| return switch (try numberOf(x)) {
            .int => putUtf16(o, " int"),
            .big => putUtf16(o, " bigint"),
            .float => putUtf16(o, " float"),
        },
        .string => |s| {
            const units = try units16(s);
            if (units > max_short_units) return putUtf16(o, " nvarchar(max)");
            var digits: [8]u8 = @splat(0);
            var n = @max(units, 1);
            var at: usize = digits.len;
            for (0..digits.len) |_| {
                at -= 1;
                digits[at] = std.math.cast(u8, '0' + n % 10) orelse unreachable; // digit
                n /= 10;
                if (n == 0) break;
            }
            std.debug.assert(at < digits.len);
            const head = try putUtf16(o, " nvarchar(");
            return head + try putUtf16(o, digits[at..]) + try putUtf16(o, ")");
        },
    }
}

fn paramValue(o: *Out, value: Value, collation: [collation_bytes]u8) ReplyError!void {
    std.debug.assert(o.len <= o.buf.len);
    switch (value) {
        .null => {
            try o.put(&.{ type_id.nvarchar, 0x40, 0x1F });
            try o.put(&collation);
            try o.put(&.{ 0xFF, 0xFF });
        },
        .boolean => |b| try o.put(&.{ type_id.bitn, 1, 1, @intFromBool(b) }),
        .number => |x| switch (try numberOf(x)) {
            .int => |v| {
                try o.put(&.{ type_id.intn, 4, 4 });
                try putInt(o, i32, v);
            },
            .big => |v| {
                try o.put(&.{ type_id.intn, 8, 8 });
                try putInt(o, i64, v);
            },
            .float => |v| {
                try o.put(&.{ type_id.floatn, 8, 8 });
                try putInt(o, u64, @bitCast(v));
            },
        },
        .string => |s| {
            var text = try NVarChar.begin(o, collation);
            text.units = try putUtf16(o, s);
            try text.end(o);
        },
    }
}

/// An `nvarchar` parameter: the type and the length go before the text, and
/// both depend on the count of code units. `begin` leaves room for the short
/// form. `end` writes it, or moves the text for the form of `nvarchar(max)`.
const NVarChar = struct {
    start: usize,
    units: usize = 0,

    const short_head = 1 + 2 + collation_bytes + 2;
    const long_head = 1 + 2 + collation_bytes + 8 + 4;

    fn begin(o: *Out, collation: [collation_bytes]u8) error{NoSpace}!NVarChar {
        const start = o.len;
        try o.put(&.{ type_id.nvarchar, 0, 0 });
        try o.put(&collation);
        try o.put(&.{ 0, 0 });
        return .{ .start = start };
    }

    fn end(t: NVarChar, o: *Out) error{NoSpace}!void {
        const size = t.units * 2;
        std.debug.assert(o.len == t.start + short_head + size);
        if (t.units <= max_short_units) {
            patch(o, t.start + 1, u16, std.math.cast(u16, @max(size, 2)) orelse unreachable);  // invariant
            patch(o, t.start + short_head - 2, u16, std.math.cast(u16, size) orelse unreachable);  // invariant
            return;
        }
        const grow = long_head - short_head;
        const zeros: [grow + 4]u8 = @splat(0);
        try o.put(&zeros);
        const text = o.buf[t.start..];
        std.mem.copyBackwards(u8, text[long_head..][0..size], text[short_head..][0..size]);
        patch(o, t.start + 1, u16, 0xFFFF);
        // The whole length is not known, then one chunk and the end.
        patch(o, t.start + 3 + collation_bytes, u64, 0xFFFF_FFFF_FFFF_FFFE);
        patch(o, t.start + long_head - 4, u32, std.math.cast(u32, size) orelse unreachable);  // invariant
        patch(o, o.len - 4, u32, 0);
    }
};

// ---- the token stream -----------------------------------------------------------

const type_id = struct {
    const null_type: u8 = 0x1F;
    const image: u8 = 0x22;
    const text: u8 = 0x23;
    const guid: u8 = 0x24;
    const intn: u8 = 0x26;
    const date: u8 = 0x28;
    const time: u8 = 0x29;
    const datetime2: u8 = 0x2A;
    const datetimeoffset: u8 = 0x2B;
    const tinyint: u8 = 0x30;
    const bit: u8 = 0x32;
    const smallint: u8 = 0x34;
    const int: u8 = 0x38;
    const smalldatetime: u8 = 0x3A;
    const real: u8 = 0x3B;
    const money: u8 = 0x3C;
    const datetime: u8 = 0x3D;
    const float: u8 = 0x3E;
    const ntext: u8 = 0x63;
    const bitn: u8 = 0x68;
    const decimaln: u8 = 0x6A;
    const numericn: u8 = 0x6C;
    const floatn: u8 = 0x6D;
    const moneyn: u8 = 0x6E;
    const datetimen: u8 = 0x6F;
    const smallmoney: u8 = 0x7A;
    const bigint: u8 = 0x7F;
    const varbinary: u8 = 0xA5;
    const varchar: u8 = 0xA7;
    const binary: u8 = 0xAD;
    const char: u8 = 0xAF;
    const nvarchar: u8 = 0xE7;
    const nchar: u8 = 0xEF;
};

const token = struct {
    const return_status: u8 = 0x79;
    const col_metadata: u8 = 0x81;
    const order: u8 = 0xA9;
    const err: u8 = 0xAA;
    const info: u8 = 0xAB;
    const login_ack: u8 = 0xAD;
    const feature_ack: u8 = 0xAE;
    const row: u8 = 0xD1;
    const nbc_row: u8 = 0xD2;
    const env_change: u8 = 0xE3;
    const done: u8 = 0xFD;
    const done_proc: u8 = 0xFE;
    const done_in_proc: u8 = 0xFF;
};

const done_error: u16 = 0x2;
const done_count: u16 = 0x10;

/// How the bytes of a `char` or `varchar` column become text.
const Charset = enum(u8) {
    /// Not a character column.
    none,
    utf8,
    cp1252,
    /// Another code page: only ASCII bytes have a native form.
    other,
};

/// One column of COLMETADATA. The table has the capacity that the caller
/// gives to `writeReply`, and lives for one reply.
pub const Column = struct {
    type: u8 = 0,
    scale: u8 = 0,
    /// A `(max)` type: its value is in chunks.
    chunks: bool = false,
    charset: Charset = .none,
    /// The name in UTF-16, inside the reply.
    name: []const u8 = "",
};

const Reader = struct {
    s: []const u8,
    i: usize = 0,

    fn left(r: *const Reader) usize {
        return r.s.len - r.i;
    }

    fn take(r: *Reader, n: usize) Error![]const u8 {
        if (r.s.len - r.i < n) return error.Malformed;
        defer r.i += n;
        return r.s[r.i..][0..n];
    }

    fn int(r: *Reader, comptime T: type) Error!T {
        const size = @divExact(@typeInfo(T).int.bits, 8);
        const raw = try r.take(size);
        return std.mem.readInt(T, raw[0..size], .little);
    }

    /// A text with its count of code units in one byte or in two.
    fn text(r: *Reader, comptime Count: type) Error![]const u8 {
        const units: usize = try r.int(Count);
        return r.take(units * 2);
    }
};

// The code pages of tedious (`collation.js`): the sort orders and the
// languages with the Windows code page 1252.
const sorts_1252 = [_]u8{ 51, 52, 53, 54, 183, 184, 185, 186 };
const languages_1252 = [_]u16{
    0x406, 0x407, 0x409, 0x40A, 0x40B, 0x40C, 0x40F, 0x414, 0x417, 0x42E, 0x437,
    0x43B, 0x452, 0x462, 0x47A, 0x47C, 0x47E, 0x483, 0x83B, 0x85F, 0xC0A,
};

fn charsetOf(collation: *const [collation_bytes]u8) Charset {
    // The UTF8 flag is bit 6 of the flags, which start in the high half of byte 2.
    if (collation[3] & 0x04 != 0) return .utf8;
    const sort = collation[4];
    if (sort != 0) return if (std.mem.indexOfScalar(u8, &sorts_1252, sort) != null) .cp1252 else .other;
    const lang = std.mem.readInt(u16, collation[0..2], .little);
    return if (std.mem.indexOfScalar(u16, &languages_1252, lang) != null) .cp1252 else .other;
}

/// The type information of one column, after the user type and the flags.
fn readType(r: *Reader) ReplyError!Column {
    var col: Column = .{ .type = try r.int(u8) };
    switch (col.type) {
        type_id.null_type, type_id.tinyint, type_id.bit, type_id.smallint, type_id.int, type_id.bigint => {},
        type_id.real, type_id.float, type_id.money, type_id.smallmoney => {},
        type_id.datetime, type_id.smalldatetime, type_id.date => {},
        type_id.intn, type_id.bitn, type_id.floatn, type_id.moneyn, type_id.datetimen, type_id.guid => try skip(r, 1),
        type_id.time, type_id.datetime2, type_id.datetimeoffset => col.scale = try r.int(u8),
        type_id.decimaln, type_id.numericn => {
            const info = try r.take(3);
            col.scale = info[2];
            // Math.pow(10, scale) is exact only up to 10^22.
            if (col.scale >= pow10.len) return error.Unsupported;
        },
        type_id.varbinary, type_id.binary => col.chunks = try r.int(u16) == 0xFFFF and col.type == type_id.varbinary,
        type_id.varchar, type_id.char, type_id.nvarchar, type_id.nchar => {
            const max = try r.int(u16);
            col.chunks = max == 0xFFFF and (col.type == type_id.varchar or col.type == type_id.nvarchar);
            const collation = try r.take(collation_bytes);
            if (col.type == type_id.varchar or col.type == type_id.char) col.charset = charsetOf(collation[0..collation_bytes]);
        },
        type_id.text, type_id.ntext, type_id.image => {
            try skip(r, 4);
            if (col.type != type_id.image) {
                const collation = try r.take(collation_bytes);
                if (col.type == type_id.text) col.charset = charsetOf(collation[0..collation_bytes]);
            }
            const parts = try r.int(u8);
            for (0..parts) |_| try skip(r, (try r.int(u16)) * @as(usize, 2));
        },
        // xml, a CLR type, sql_variant and any type that tedious does not know.
        else => return error.Unsupported,
    }
    std.debug.assert(r.i <= r.s.len);
    return col;
}

const json_column = std.unicode.utf8ToUtf16LeStringLiteral("JSON_F52E2B61-18A1-11d1-B105-00805F49916B");
const xml_column = std.unicode.utf8ToUtf16LeStringLiteral("XML_F52E2B61-18A1-11d1-B105-00805F49916B");
const proto_name = std.unicode.utf8ToUtf16LeStringLiteral("__proto__");

fn nameIs(name: []const u8, comptime want: []const u16) bool {
    return std.mem.eql(u8, name, std.mem.sliceAsBytes(want));
}

/// COLMETADATA after its token byte. Gives the count of columns.
fn readColumns(r: *Reader, cols: []Column) ReplyError!usize {
    const count: usize = try r.int(u16);
    // 0xFFFF is "no metadata", which tedious does not read.
    if (count == 0xFFFF or count > cols.len) return error.Unsupported;
    for (cols[0..count]) |*col| {
        try skip(r, 6);
        col.* = try readType(r);
        col.name = try r.text(u8);
        // `row.__proto__ = value` of mssql sets no property.
        if (nameIs(col.name, proto_name)) return error.Unsupported;
    }
    // mssql joins the rows of one column with these names into one text.
    if (count == 1 and (nameIs(cols[0].name, json_column) or nameIs(cols[0].name, xml_column))) return error.Unsupported;
    // mssql gives an array for columns with one name.
    for (cols[0..count], 0..) |a, i| {
        for (cols[0..i]) |b| if (std.mem.eql(u8, a.name, b.name)) return error.Unsupported;
    }
    return count;
}

// ---- values as JSON -------------------------------------------------------------

const hex_lower = "0123456789abcdef";
const hex_upper = "0123456789ABCDEF";

/// One UTF-16 code unit or code point inside a JSON string, as
/// `JSON.stringify` writes it.
fn putCodePoint(o: *Out, cp: u21) error{NoSpace}!void {
    switch (cp) {
        '"' => return o.put("\\\""),
        '\\' => return o.put("\\\\"),
        0x08 => return o.put("\\b"),
        0x09 => return o.put("\\t"),
        0x0A => return o.put("\\n"),
        0x0C => return o.put("\\f"),
        0x0D => return o.put("\\r"),
        // Every other value needs nothing here.
        else => {},
    }
    if (cp < 0x20 or (cp >= 0xD800 and cp <= 0xDFFF)) {
        return o.put(&.{ '\\', 'u', hex_lower[cp >> 12], hex_lower[cp >> 8 & 15], hex_lower[cp >> 4 & 15], hex_lower[cp & 15] });
    }
    var raw: [4]u8 = @splat(0);
    const len = std.unicode.utf8Encode(cp, &raw) catch return error.NoSpace;
    try o.put(raw[0..len]);
}

/// UTF-16 text in pieces, as `Buffer.toString('ucs2')` reads all of it: a
/// last odd byte is dropped, and a surrogate without its pair stays.
const Utf16 = struct {
    half: ?u8 = null,
    high: ?u16 = null,

    fn feed(t: *Utf16, o: *Out, bytes: []const u8) error{NoSpace}!void {
        for (bytes) |b| {
            const low = t.half orelse {
                t.half = b;
                continue;
            };
            t.half = null;
            try t.unit(o, @as(u16, b) << 8 | low);
        }
    }

    fn unit(t: *Utf16, o: *Out, u: u16) error{NoSpace}!void {
        if (t.high) |high| {
            t.high = null;
            if (u >= 0xDC00 and u <= 0xDFFF) {
                return putCodePoint(o, 0x10000 + (@as(u21, high - 0xD800) << 10) + (u - 0xDC00));
            }
            try putCodePoint(o, high);
        }
        if (u >= 0xD800 and u <= 0xDBFF) {
            t.high = u;
        } else {
            try putCodePoint(o, u);
        }
    }

    fn end(t: *Utf16, o: *Out) error{NoSpace}!void {
        if (t.high) |high| try putCodePoint(o, high);
        t.high = null;
    }
};

fn putUtf16String(o: *Out, bytes: []const u8) error{NoSpace}!void {
    var t: Utf16 = .{};
    try o.byte('"');
    try t.feed(o, bytes);
    try t.end(o);
    try o.byte('"');
}

// The bytes 0x80 to 0x9F of the Windows code page 1252 in iconv-lite.
const cp1252_high = [32]u16{
    0x20AC, 0xFFFD, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0xFFFD, 0x017D, 0xFFFD,
    0xFFFD, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0xFFFD, 0x017E, 0x0178,
};

/// The bytes of a `char` column inside a JSON string. `whole` says that
/// `bytes` is all of the value.
fn putChars(o: *Out, charset: Charset, bytes: []const u8, whole: bool) ReplyError!void {
    var ascii = true;
    for (bytes) |b| ascii = ascii and b < 0x80;
    if (ascii or charset == .cp1252) {
        for (bytes) |b| try putCodePoint(o, if (b >= 0x80 and b < 0xA0) cp1252_high[b - 0x80] else b);
        return;
    }
    // A character can lie in two chunks, and iconv-lite has its own text
    // for a byte that is not UTF-8.
    if (charset != .utf8 or !whole) return error.Unsupported;
    var i: usize = 0;
    for (0..bytes.len) |_| {
        if (i == bytes.len) break;
        const d = decodeUtf8(bytes[i..]) catch return error.Unsupported;
        if (d.cp >= 0xD800 and d.cp <= 0xDFFF) return error.Unsupported;
        i += d.len;
        try putCodePoint(o, d.cp);
    }
}

fn putUnsigned(o: *Out, v: u64) error{NoSpace}!void {
    var digits: [20]u8 = @splat(0);
    var n = v;
    var at: usize = digits.len;
    for (0..digits.len) |_| {
        at -= 1;
        digits[at] = std.math.cast(u8, '0' + n % 10) orelse unreachable; // digit
        n /= 10;
        if (n == 0) break;
    }
    try o.put(digits[at..]);
}

fn putSigned(o: *Out, v: i64) error{NoSpace}!void {
    if (v < 0) try o.byte('-');
    try putUnsigned(o, @abs(v));
}

/// A JavaScript number as `JSON.stringify` writes it.
fn putNumber(o: *Out, x: f64) error{NoSpace}!void {
    if (!std.math.isFinite(x)) return o.put("null");
    var buf: [numfmt.max_len]u8 = @splat(0);
    try o.put(numfmt.format(&buf, x));
}

const epoch_1900: f64 = -2208988800000.0;
const epoch_2000: f64 = 946684800000.0;
const day_ms: f64 = 86400000.0;
/// The day number of 2000-01-01 in a `date` (days from 0001-01-01).
const day_2000: f64 = 730119.0;

const IsoWriter = struct {
    buf: *[80]u8,
    len: usize = 0,

    fn put(w: *IsoWriter, s: []const u8) void {
        @memcpy(w.buf[w.len..][0..s.len], s);
        w.len += s.len;
    }

    fn num(w: *IsoWriter, n: i64, width: usize) void {
        std.debug.assert(n >= 0);
        var tmp: [20]u8 = @splat(0);
        var i: usize = tmp.len;
        var x: u64 = std.math.cast(u64, n) orelse unreachable; // n >= 0
        while (true) {
            i -= 1;
            tmp[i] = std.math.cast(u8, '0' + x % 10) orelse unreachable; // digit
            x /= 10;
            if (x == 0) break;
        }
        var digits = tmp.len - i;
        while (digits < width) : (digits += 1) w.put("0");
        w.put(tmp[i..]);
    }
};

/// ISO 8601 UTC formatting for a valid time value (not NaN, within ±8.64e15).
fn formatIsoUtc(buf: *[80]u8, t: f64) []const u8 {
    const ms: i64 = @intFromFloat(t);
    const days = @divFloor(ms, 86_400_000);
    const in_day = ms - days * 86_400_000;
    const z = days + 719_468;
    const era = @divFloor(z, 146_097);
    const doe = z - era * 146_097;
    const yoe = @divFloor(doe - @divFloor(doe, 1460) + @divFloor(doe, 36_524) - @divFloor(doe, 146_096), 365);
    const doy = doe - (365 * yoe + @divFloor(yoe, 4) - @divFloor(yoe, 100));
    const mp = @divFloor(5 * doy + 2, 153);
    const d = doy - @divFloor(153 * mp + 2, 5) + 1;
    const m = if (mp < 10) mp + 3 else mp - 9;
    const y = yoe + era * 400 + if (m <= 2) @as(i64, 1) else @as(i64, 0);
    const hour = @divFloor(in_day, 3_600_000);
    const minute = @mod(@divFloor(in_day, 60_000), 60);
    const second = @mod(@divFloor(in_day, 1000), 60);
    const milli = @mod(in_day, 1000);
    var w: IsoWriter = .{ .buf = buf };
    if (y >= 0 and y <= 9999) {
        w.num(y, 4);
    } else {
        w.put(if (y < 0) "-" else "+");
        w.num(if (y < 0) -y else y, 6);
    }
    w.put("-");
    w.num(m, 2);
    w.put("-");
    w.num(d, 2);
    w.put("T");
    w.num(hour, 2);
    w.put(":");
    w.num(minute, 2);
    w.put(":");
    w.num(second, 2);
    w.put(".");
    w.num(milli, 3);
    w.put("Z");
    return buf[0..w.len];
}

/// A JavaScript `Date` of `ms` as `JSON.stringify` writes it.
fn putDate(o: *Out, ms: f64) error{NoSpace}!void {
    if (!(@abs(ms) <= 8.64e15)) return o.put("null");
    var buf: [80]u8 = @splat(0);
    try o.byte('"');
    try o.put(formatIsoUtc(&buf, ms));
    try o.byte('"');
}

fn putBufferHead(o: *Out) error{NoSpace}!void {
    try o.put("{\"type\":\"Buffer\",\"data\":[");
}

fn putBufferBytes(o: *Out, bytes: []const u8, first: bool) error{NoSpace}!void {
    for (bytes, 0..) |b, i| {
        if (i > 0 or !first) try o.byte(',');
        try putUnsigned(o, b);
    }
}

fn putBuffer(o: *Out, bytes: []const u8) error{NoSpace}!void {
    try putBufferHead(o);
    try putBufferBytes(o, bytes, true);
    try o.put("]}");
}

fn putGuid(o: *Out, g: *const [16]u8) error{NoSpace}!void {
    const order = [_]u8{ 3, 2, 1, 0, 0xFF, 5, 4, 0xFF, 7, 6, 0xFF, 8, 9, 0xFF, 10, 11, 12, 13, 14, 15 };
    try o.byte('"');
    for (order) |i| {
        if (i == 0xFF) {
            try o.byte('-');
        } else {
            try o.put(&.{ hex_upper[g[i] >> 4], hex_upper[g[i] & 15] });
        }
    }
    try o.byte('"');
}

fn readInt(raw: []const u8, comptime T: type) T {
    return std.mem.readInt(T, raw[0..@divExact(@typeInfo(T).int.bits, 8)], .little);
}

fn putInteger(o: *Out, raw: []const u8) ReplyError!void {
    switch (raw.len) {
        1 => try putUnsigned(o, raw[0]),
        2 => try putSigned(o, readInt(raw, i16)),
        4 => try putSigned(o, readInt(raw, i32)),
        8 => {
            // tedious gives a bigint as a string.
            try o.byte('"');
            try putSigned(o, readInt(raw, i64));
            try o.byte('"');
        },
        // Any other length or type: tedious fails for it.
        else => return error.Malformed,
    }
}

fn putFloat(o: *Out, raw: []const u8) ReplyError!void {
    switch (raw.len) {
        4 => try putNumber(o, @as(f32, @bitCast(readInt(raw, u32)))),
        8 => try putNumber(o, @bitCast(readInt(raw, u64))),
        // Any other length or type: tedious fails for it.
        else => return error.Malformed,
    }
}

fn putMoney(o: *Out, raw: []const u8) ReplyError!void {
    switch (raw.len) {
        4 => try putNumber(o, @as(f64, @floatFromInt(readInt(raw, i32))) / 10000.0),
        8 => {
            const high: f64 = @floatFromInt(readInt(raw[0..4], i32));
            const low: f64 = @floatFromInt(readInt(raw[4..8], u32));
            try putNumber(o, (low + 4294967296.0 * high) / 10000.0);
        },
        // Any other length or type: tedious fails for it.
        else => return error.Malformed,
    }
}

const pow10 = [_]f64{
    1e0,  1e1,  1e2,  1e3,  1e4,  1e5,  1e6,  1e7,  1e8,  1e9,  1e10, 1e11,
    1e12, 1e13, 1e14, 1e15, 1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22,
};

/// A decimal with the arithmetic of tedious: the sum of the 32-bit words as
/// doubles, times the sign, divided by a power of ten.
fn putDecimal(o: *Out, raw: []const u8, scale: u8) ReplyError!void {
    if (raw.len != 5 and raw.len != 9 and raw.len != 13 and raw.len != 17) return error.Malformed;
    std.debug.assert(scale < pow10.len);
    const sign: f64 = if (raw[0] == 1) 1.0 else -1.0;
    var value: f64 = 0;
    var weight: f64 = 1;
    for (0..(raw.len - 1) / 4) |i| {
        const word: f64 = @floatFromInt(readInt(raw[1 + i * 4 ..], u32));
        value = if (i == 0) word else value + weight * word;
        weight *= 4294967296.0;
    }
    try putNumber(o, value * sign / pow10[scale]);
}

fn putDateTime(o: *Out, raw: []const u8) ReplyError!void {
    switch (raw.len) {
        4 => {
            const days: f64 = @floatFromInt(readInt(raw[0..2], u16));
            const minutes: f64 = @floatFromInt(readInt(raw[2..4], u16));
            try putDate(o, epoch_1900 + days * day_ms + minutes * 60000.0);
        },
        8 => {
            const days: f64 = @floatFromInt(readInt(raw[0..4], i32));
            const ticks: f64 = @floatFromInt(readInt(raw[4..8], i32));
            // Math.round of the count of 1/300 second times 3 1/3.
            const ms = @floor(ticks * (3.0 + 1.0 / 3.0) + 0.5);
            try putDate(o, epoch_1900 + days * day_ms + ms);
        },
        // Any other length or type: tedious fails for it.
        else => return error.Malformed,
    }
}

/// The count of 100 nanoseconds of a `time` of 3, 4 or 5 bytes.
fn timeTicks(raw: []const u8, scale: u8) Error!f64 {
    if (raw.len < 3 or raw.len > 5 or scale > 7) return error.Malformed;
    var n: u64 = 0;
    for (raw, 0..) |b, i| n |= @as(u64, b) << (std.math.cast(u6, i * 8) orelse unreachable); // i < 5
    var value: f64 = @floatFromInt(n);
    for (scale..7) |_| value *= 10;
    return value;
}

fn dateDays(raw: []const u8) f64 {
    std.debug.assert(raw.len == 3);
    return @floatFromInt(@as(u32, raw[0]) | @as(u32, raw[1]) << 8 | @as(u32, raw[2]) << 16);
}

/// `date`, `time`, `datetime2` and `datetimeoffset`. tedious gives the UTC
/// time of a `datetimeoffset` and drops its offset.
fn putTemporal(o: *Out, col: Column, raw: []const u8) ReplyError!void {
    const tail: usize = switch (col.type) {
        type_id.date, type_id.datetime2 => 3,
        type_id.datetimeoffset => 5,
        // A time alone.
        else => 0,
    };
    if (raw.len < tail) return error.Malformed;
    const time = raw[0 .. raw.len - tail];
    var ms: f64 = 0;
    if (col.type == type_id.date) {
        if (time.len != 0) return error.Malformed;
    } else {
        ms = @trunc(try timeTicks(time, col.scale) / 10000.0);
    }
    if (tail > 0) ms += epoch_2000 + (dateDays(raw[time.len..][0..3]) - day_2000) * day_ms;
    try putDate(o, ms);
}

/// A value with a length of one byte before it.
fn putByteLen(o: *Out, col: Column, raw: []const u8) ReplyError!void {
    if (raw.len == 0) return o.put("null");
    switch (col.type) {
        type_id.intn => try putInteger(o, raw),
        type_id.bitn => try o.put(if (raw.len != 1) return error.Malformed else if (raw[0] != 0) "true" else "false"),
        type_id.floatn => try putFloat(o, raw),
        type_id.moneyn => try putMoney(o, raw),
        type_id.datetimen => try putDateTime(o, raw),
        type_id.decimaln, type_id.numericn => try putDecimal(o, raw, col.scale),
        type_id.guid => try putGuid(o, if (raw.len == 16) raw[0..16] else return error.Malformed),
        type_id.date, type_id.time, type_id.datetime2, type_id.datetimeoffset => try putTemporal(o, col, raw),
        // Any other length or type: tedious fails for it.
        else => return error.Malformed,
    }
}

fn putFixed(o: *Out, col: Column, r: *Reader) ReplyError!void {
    switch (col.type) {
        type_id.null_type => try o.put("null"),
        type_id.tinyint => try putInteger(o, try r.take(1)),
        type_id.smallint => try putInteger(o, try r.take(2)),
        type_id.int => try putInteger(o, try r.take(4)),
        type_id.bigint => try putInteger(o, try r.take(8)),
        type_id.bit => try o.put(if ((try r.int(u8)) != 0) "true" else "false"),
        type_id.real => try putFloat(o, try r.take(4)),
        type_id.float => try putFloat(o, try r.take(8)),
        type_id.smallmoney => try putMoney(o, try r.take(4)),
        type_id.money => try putMoney(o, try r.take(8)),
        type_id.smalldatetime => try putDateTime(o, try r.take(4)),
        type_id.datetime => try putDateTime(o, try r.take(8)),
        // Any other length or type: tedious fails for it.
        else => return error.Malformed,
    }
}

/// Text or bytes of a column that is not in chunks.
fn putData(o: *Out, col: Column, raw: []const u8) ReplyError!void {
    switch (col.type) {
        type_id.varbinary, type_id.binary, type_id.image => try putBuffer(o, raw),
        type_id.nvarchar, type_id.nchar, type_id.ntext => try putUtf16String(o, raw),
        // char, varchar and text.
        else => {
            try o.byte('"');
            try putChars(o, col.charset, raw, true);
            try o.byte('"');
        },
    }
}

const plp_null: u64 = 0xFFFF_FFFF_FFFF_FFFF;
const plp_unknown: u64 = 0xFFFF_FFFF_FFFF_FFFE;

/// A value of a `(max)` type: chunks with a length each, up to a length of 0.
fn putChunks(o: *Out, col: Column, r: *Reader) ReplyError!void {
    std.debug.assert(col.chunks);
    const total = try r.int(u64);
    if (total == plp_null) return o.put("null");
    const binary = col.type == type_id.varbinary;
    try if (binary) putBufferHead(o) else o.byte('"');
    var text: Utf16 = .{};
    var seen: u64 = 0;
    const most = r.left() / 4;
    for (0..most + 1) |n| {
        if (n == most) return error.Malformed;
        const size = try r.int(u32);
        if (size == 0) break;
        const chunk = try r.take(size);
        const whole = n == 0 and (total == size or r.left() >= 4 and readInt(r.s[r.i..], u32) == 0);
        switch (col.type) {
            type_id.varbinary => try putBufferBytes(o, chunk, seen == 0),
            type_id.nvarchar => try text.feed(o, chunk),
            // varchar(max).
            else => try putChars(o, col.charset, chunk, whole),
        }
        seen += size;
    }
    // tedious fails when a known length is not the sum of the chunks.
    if (total != plp_unknown and total != seen) return error.Malformed;
    try text.end(o);
    try if (binary) o.put("]}") else o.byte('"');
}

/// One value of a row as JSON.
fn putValue(o: *Out, col: Column, r: *Reader) ReplyError!void {
    std.debug.assert(r.i <= r.s.len);
    if (col.chunks) return putChunks(o, col, r);
    switch (col.type) {
        type_id.intn, type_id.bitn, type_id.floatn, type_id.moneyn, type_id.datetimen, type_id.guid => {},
        type_id.decimaln, type_id.numericn, type_id.date, type_id.time, type_id.datetime2, type_id.datetimeoffset => {},
        type_id.varbinary, type_id.binary, type_id.varchar, type_id.char, type_id.nvarchar, type_id.nchar => {
            const size = try r.int(u16);
            return if (size == 0xFFFF) o.put("null") else putData(o, col, try r.take(size));
        },
        type_id.text, type_id.ntext, type_id.image => {
            const pointer = try r.int(u8);
            if (pointer == 0) return o.put("null");
            // The text pointer and the timestamp.
            try skip(r, @as(usize, pointer) + 8);
            return putData(o, col, try r.take(try r.int(u32)));
        },
        // A type of a fixed size.
        else => return putFixed(o, col, r),
    }
    try putByteLen(o, col, try r.take(try r.int(u8)));
}

// ---- a reply --------------------------------------------------------------------

/// The three lists of a result. Their items lie mixed in the token stream,
/// so `writeReply` reads the stream once for each list.
const Part = enum { sets, counts, errors };

const Pass = struct {
    part: Part,
    /// The columns of the open record set; 0 when none is open.
    columns: usize = 0,
    open: bool = false,
    /// Items of the list, and rows of the open set.
    items: usize = 0,
    rows: usize = 0,
    errors: usize = 0,

    fn item(p: *Pass, o: *Out) error{NoSpace}!void {
        if (p.items > 0) try o.byte(',');
        p.items += 1;
    }
};

fn skip(r: *Reader, n: usize) Error!void {
    if (r.left() < n) return error.Malformed;
    r.i += n;
}

fn onRow(o: *Out, p: *Pass, cols: []const Column, r: *Reader, nulls: []const u8) ReplyError!void {
    if (!p.open) return error.Malformed;
    std.debug.assert(nulls.len == 0 or nulls.len * 8 >= cols.len);
    // A list that is not the sets writes each row into the same scratch space.
    const start = o.len;
    if (p.rows > 0) try o.byte(',');
    p.rows += 1;
    try o.byte('{');
    for (cols, 0..) |col, i| {
        if (i > 0) try o.byte(',');
        try putUtf16String(o, col.name);
        try o.byte(':');
        if (nulls.len > 0 and nulls[i / 8] >> (std.math.cast(u3, i % 8) orelse unreachable) & 1 != 0) {  // invariant
            try o.put("null");
        } else {
            try putValue(o, col, r);
        }
    }
    try o.byte('}');
    if (p.part != .sets) o.len = start;
}

fn onDone(o: *Out, p: *Pass, r: *Reader, kind_of: u8) ReplyError!void {
    const status = try r.int(u16);
    try skip(r, 2);
    const count = try r.int(u64);
    if (kind_of == token.done_proc) {
        // tedious makes its own error for an error flag without an ERROR token.
        if (status & done_error != 0 and p.errors == 0) return error.Unsupported;
        return;
    }
    if (kind_of == token.done and status & done_error != 0 and p.errors == 0) return error.Unsupported;
    if (status & done_count != 0 and p.part == .counts) {
        try p.item(o);
        // mssql has the count as a JavaScript number.
        try putNumber(o, @floatFromInt(count));
    }
    if (!p.open) return;
    if (p.part == .sets) try o.byte(']');
    p.open = false;
    p.columns = 0;
}

fn onError(o: *Out, p: *Pass, r: *Reader) ReplyError!void {
    const size = try r.int(u16);
    var body: Reader = .{ .s = try r.take(size) };
    std.debug.assert(body.s.len == size);
    p.errors += 1;
    if (p.part != .errors) return;
    const number = try body.int(u32);
    const state = try body.int(u8);
    const class = try body.int(u8);
    const texts = [_][]const u8{ try body.text(u16), try body.text(u8), try body.text(u8) };
    const line = try body.int(u32);
    try p.item(o);
    try o.put("{\"message\":");
    try putUtf16String(o, texts[0]);
    const numbers = [_]struct { []const u8, u32 }{ .{ "number", number }, .{ "state", state }, .{ "class", class }, .{ "lineNumber", line } };
    for (numbers) |n| {
        try o.put(",\"");
        try o.put(n[0]);
        try o.put("\":");
        try putUnsigned(o, n[1]);
    }
    try o.put(",\"serverName\":");
    try putUtf16String(o, texts[1]);
    try o.put(",\"procName\":");
    try putUtf16String(o, texts[2]);
    try o.byte('}');
}

fn onColumns(o: *Out, p: *Pass, cols: []Column, r: *Reader) ReplyError!void {
    // mssql puts the rows of two sets into one when no DONE lies between them.
    if (p.open) return error.Unsupported;
    p.columns = try readColumns(r, cols);
    if (p.columns == 0) return;
    p.open = true;
    p.rows = 0;
    if (p.part != .sets) return;
    try p.item(o);
    try o.byte('[');
}

fn onToken(o: *Out, p: *Pass, cols: []Column, r: *Reader) ReplyError!void {
    const t = try r.int(u8);
    switch (t) {
        token.col_metadata => try onColumns(o, p, cols, r),
        token.row => try onRow(o, p, cols[0..p.columns], r, ""),
        token.nbc_row => try onRow(o, p, cols[0..p.columns], r, try r.take((p.columns + 7) / 8)),
        token.done, token.done_proc, token.done_in_proc => try onDone(o, p, r, t),
        token.err => try onError(o, p, r),
        token.info, token.env_change, token.order, token.login_ack => try skip(r, try r.int(u16)),
        token.return_status => try skip(r, 4),
        // Output parameters, SSPI, federated login and any other token.
        else => return error.Unsupported,
    }
}

fn pass(o: *Out, part: Part, msg: []const u8, cols: []Column) ReplyError!void {
    var r: Reader = .{ .s = msg };
    var p: Pass = .{ .part = part };
    // Each token has one byte or more.
    for (0..msg.len) |_| {
        if (r.left() == 0) break;
        try onToken(o, &p, cols, &r);
    }
    // mssql drops the rows of a set without a DONE after it.
    if (p.open) return error.Unsupported;
}

/// The reply to one request (all packets of the message, without their
/// headers) as `{"sets":[[row,...],...],"rowsAffected":[...],"errors":[...]}`:
/// the record sets and the counts that `mssql` gives to the v1 node, and the
/// ERROR tokens in their order. The node throws the last error. `cols` is
/// scratch space: a reply with more columns is `error.Unsupported`.
pub fn writeReply(o: *Out, msg: []const u8, cols: []Column) ReplyError!void {
    const start = o.len;
    const names = [_][]const u8{ "{\"sets\":[", "],\"rowsAffected\":[", "],\"errors\":[" };
    const parts = [_]Part{ .sets, .counts, .errors };
    for (names, parts) |name, part| {
        o.put(name) catch |e| return undo(o, start, e);
        pass(o, part, msg, cols) catch |e| {
            o.len = start;
            return e;
        };
    }
    o.put("]}") catch |e| return undo(o, start, e);
}

/// What the reply to LOGIN7 says.
pub const LoginReply = struct {
    /// LOGINACK came: the login is complete.
    ok: bool = false,
    /// The packet size of the server, or 0.
    packet_size: u32 = 0,
    /// The collation of the database, for the text parameters.
    collation: [collation_bytes]u8 = @splat(0),
    /// The server sends the client to another server. tedious connects there.
    routed: bool = false,
    /// The body of the first ERROR token: `writeLoginError` reads it.
    err: []const u8 = "",
};

const env = struct {
    const packet_size: u8 = 4;
    const collation: u8 = 7;
    const routing: u8 = 20;
};

fn onEnvChange(body: []const u8, reply: *LoginReply) Error!void {
    std.debug.assert(body.len <= 0xFFFF);
    var r: Reader = .{ .s = body };
    switch (try r.int(u8)) {
        env.packet_size => {
            const digits = try r.text(u8);
            var size: u32 = 0;
            for (digits, 0..) |c, i| {
                if (i % 2 == 1) continue;
                if (c < '0' or c > '9' or digits.len > 12) return error.Malformed;
                size = size * 10 + (c - '0');
            }
            reply.packet_size = size;
        },
        env.collation => {
            const size = try r.int(u8);
            if (size == collation_bytes) reply.collation = (try r.take(collation_bytes))[0..collation_bytes].*;
        },
        env.routing => reply.routed = true,
        // Every other value needs nothing here.
        else => {},
    }
}

/// Reads the reply to LOGIN7.
pub fn loginReply(msg: []const u8) ReplyError!LoginReply {
    var reply: LoginReply = .{};
    var r: Reader = .{ .s = msg };
    for (0..msg.len) |_| {
        if (r.left() == 0) break;
        const t = try r.int(u8);
        switch (t) {
            token.done, token.done_proc, token.done_in_proc => try skip(&r, 12),
            token.login_ack => {
                try skip(&r, try r.int(u16));
                reply.ok = true;
            },
            token.err => {
                const body = try r.take(try r.int(u16));
                if (reply.err.len == 0) reply.err = body;
            },
            token.env_change => try onEnvChange(try r.take(try r.int(u16)), &reply),
            token.info => try skip(&r, try r.int(u16)),
            token.feature_ack => {
                for (0..msg.len) |_| {
                    if (try r.int(u8) == 0xFF) break;
                    try skip(&r, try r.int(u32));
                }
            },
            // Any other token or type: no native form.
            else => return error.Unsupported,
        }
    }
    std.debug.assert(r.i <= msg.len);
    return reply;
}

/// The message of an ERROR token body as a JSON string.
pub fn writeErrorMessage(o: *Out, body: []const u8) Error!void {
    var r: Reader = .{ .s = body };
    try skip(&r, 6);
    try putUtf16String(o, try r.text(u16));
}

// ---- tests ----------------------------------------------------------------------

const cases = @import("tdscase_tables.zig");

const Scratch = struct {
    a: [20000]u8 = @splat(0),
    b: [20000]u8 = @splat(0),
    c: [20000]u8 = @splat(0),
};

fn unhex(buf: []u8, text: []const u8) ![]u8 {
    if (text.len % 2 != 0 or text.len / 2 > buf.len) return error.BadHex;
    for (buf[0 .. text.len / 2], 0..) |*b, i| {
        const high = std.mem.indexOfScalar(u8, hex_lower, text[i * 2]) orelse return error.BadHex;
        const low = std.mem.indexOfScalar(u8, hex_lower, text[i * 2 + 1]) orelse return error.BadHex;
        b.* = std.math.cast(u8, high << 4 | low) orelse unreachable; // high/low are hex nibbles
    }
    return buf[0 .. text.len / 2];
}

fn vector(name: []const u8) ![]const u8 {
    for (cases.client) |v| if (std.mem.eql(u8, v.name, name)) return v.hex;
    return error.NoVector;
}

fn vectorBytes(s: *Scratch, name: []const u8) ![]u8 {
    return unhex(&s.b, try vector(name));
}

test "tdswire: packets are framed, and a message over the packet size goes in several packets" {
    var buf: [64]u8 = @splat(0);
    var o: Out = .{ .buf = &buf };
    try frame(&o, kind.sql_batch, "abc", packet_size);
    // The packet that tedious makes for the same payload.
    try std.testing.expectEqualSlices(u8, "\x01\x01\x00\x0b\x00\x00\x01\x00abc", buf[0..o.len]);
    o.len = 0;
    try frame(&o, kind.rpc, "abcdefg", 11);
    try std.testing.expectEqualSlices(u8, "\x03\x00\x00\x0b\x00\x00\x01\x00abc\x03\x00\x00\x0b\x00\x00\x02\x00def\x03\x01\x00\x09\x00\x00\x03\x00g", buf[0..o.len]);
    const first = (try next(buf[0..o.len])).?;
    try std.testing.expect(first.kind == kind.rpc and !first.last and first.size == 11);
    try std.testing.expectEqualStrings("abc", first.body);
    const last = (try next(buf[22..o.len])).?;
    try std.testing.expect(last.last and std.mem.eql(u8, last.body, "g"));
    try std.testing.expect(try next(buf[0..10]) == null);
    try std.testing.expectError(error.Malformed, next("\x04\x01\x00\x07\x00\x00\x01\x00"));
    o.len = 60;
    try std.testing.expectError(error.NoSpace, frame(&o, kind.rpc, "abc", packet_size));
    try std.testing.expectEqual(@as(usize, 60), o.len);
    o.len = 0;
    try frame(&o, kind.prelogin, "", packet_size);
    try std.testing.expectEqualSlices(u8, "\x12\x01\x00\x08\x00\x00\x01\x00", buf[0..o.len]);
}

test "tdswire: PRELOGIN, LOGIN7 and a SQL batch equal the bytes of tedious" {
    var s: Scratch = .{};
    var o: Out = .{ .buf = &s.a };
    var trace: [trace_bytes]u8 = @splat(0);
    for (&trace, 0..) |*b, i| b.* = std.math.cast(u8, i * 7 + 3) orelse unreachable; // trace bytes from 0..255
    try prelogin(&o, true, &trace);
    try std.testing.expectEqualSlices(u8, try vectorBytes(&s, "prelogin_on"), s.a[0..o.len]);
    try std.testing.expectEqual(encryption.on, try preloginEncryption(s.a[0..o.len]));
    o.len = 0;
    try prelogin(&o, false, &trace);
    try std.testing.expectEqualSlices(u8, try vectorBytes(&s, "prelogin_off"), s.a[0..o.len]);
    try std.testing.expectEqual(encryption.not_supported, try preloginEncryption(s.a[0..o.len]));
    // The answer of a server: VERSION and ENCRYPTION (required).
    try std.testing.expectEqual(encryption.required, try preloginEncryption("\x00\x00\x0b\x00\x06\x01\x00\x11\x00\x01\xff\x0f\x00\x07\xd0\x00\x00\x03"));
    try std.testing.expectError(error.Malformed, preloginEncryption("\x00\x00\x0b\x00\x06\xff"));
    try std.testing.expectError(error.Malformed, preloginEncryption("\x01\x00\x40\x00\x01\xff"));

    const logins = [_]struct { []const u8, Login }{
        .{ "login_74", .{ .version = .v7_4, .pid = 4242, .zone = 0, .host = "host1", .user = "sa", .password = "Pä55wörd!", .server = "db.example.test", .database = "master" } },
        .{ "login_73b", .{ .version = .v7_3_b, .pid = 1, .zone = -120, .host = "h", .user = "u", .password = "", .server = "s", .database = "d" } },
        .{ "login_72", .{ .version = .v7_2, .pid = 77, .zone = 300, .host = "h", .user = "user😀", .password = "p\x00w", .server = "10.0.0.1", .database = "d b" } },
    };
    for (logins) |l| {
        o.len = 0;
        try login7(&o, l[1]);
        try std.testing.expectEqualSlices(u8, try vectorBytes(&s, l[0]), s.a[0..o.len]);
    }
    o.len = s.a.len - 100;
    try std.testing.expectError(error.NoSpace, login7(&o, logins[0][1]));
    try std.testing.expectEqual(s.a.len - 100, o.len);

    o.len = 0;
    try sqlBatch(&o, initial_sql);
    try std.testing.expectEqualSlices(u8, try vectorBytes(&s, "batch_initial"), s.a[0..o.len]);
    o.len = 0;
    try sqlBatch(&o, "set x é😀");
    try std.testing.expectEqualSlices(u8, try vectorBytes(&s, "batch_text"), s.a[0..o.len]);
    try std.testing.expectError(error.Malformed, sqlBatch(&o, "a\xc3"));
    try std.testing.expectError(error.Malformed, sqlBatch(&o, "a\xc0\x80"));
}

test "tdswire: the sp_executesql request equals the bytes of mssql and tedious" {
    var s: Scratch = .{};
    const latin1 = [_]u8{ 0x09, 0x04, 0xd0, 0x00, 0x34 };
    for (cases.rpcs) |case| {
        var params: [8]Param = @splat(.{ .name = "", .value = .null });
        var text: usize = 0;
        for (case.values, 0..) |v, i| {
            const raw = try unhex(s.c[text..], v.hex);
            text += raw.len;
            params[i] = .{
                .name = v.name,
                .value = switch (v.kind) {
                    's' => .{ .string = raw },
                    'n' => .{ .number = @bitCast(readInt(raw, u64)) },
                    'b' => .{ .boolean = raw[0] != 0 },
                    // The kind `z`.
                    else => .null,
                },
            };
        }
        var o: Out = .{ .buf = &s.a };
        try executeSql(&o, case.sql, params[0..case.values.len], latin1);
        try std.testing.expectEqualSlices(u8, try vectorBytes(&s, case.name), s.a[0..o.len]);
    }
    var o: Out = .{ .buf = &s.a };
    // mssql sends NULL for NaN, and tedious refuses an integer outside 64 bits.
    const refused = [_]f64{ std.math.nan(f64), 1e30, -1e19, 9223372036854775808.0 };
    for (refused) |x| {
        try std.testing.expectError(error.Unsupported, executeSql(&o, "select @p1", &.{.{ .name = "p1", .value = .{ .number = x } }}, latin1));
    }
    try std.testing.expectError(error.Malformed, executeSql(&o, "select 1", &.{.{ .name = "p 1", .value = .null }}, latin1));
    try std.testing.expectEqual(@as(usize, 0), o.len);
    o.len = s.a.len - 30;
    try std.testing.expectError(error.NoSpace, executeSql(&o, "select 1", &.{}, latin1));
    try std.testing.expectEqual(s.a.len - 30, o.len);
}

test "tdswire: replies become the result of tedious and mssql" {
    var s: Scratch = .{};
    var cols: [16]Column = @splat(.{});
    var native: usize = 0;
    for (cases.replies) |case| {
        const msg = try unhex(&s.a, case.hex);
        var o: Out = .{ .buf = &s.b };
        if (case.want.len == 0) {
            try std.testing.expectError(error.Unsupported, writeReply(&o, msg, &cols));
            try std.testing.expectEqual(@as(usize, 0), o.len);
            continue;
        }
        native += 1;
        try writeReply(&o, msg, &cols);
        try std.testing.expectEqualStrings(try unhex(&s.c, case.want), s.b[0..o.len]);
    }
    try std.testing.expect(native > 500);
}

test "tdswire: a reply that is cut, or has no room, is an error and writes nothing" {
    var s: Scratch = .{};
    var cols: [16]Column = @splat(.{});
    for (cases.replies) |case| {
        if (!std.mem.eql(u8, case.name, "nbc rows") and !std.mem.eql(u8, case.name, "nvarchar max chunks")) continue;
        const msg = try unhex(&s.a, case.hex);
        for (1..msg.len) |cut| {
            var o: Out = .{ .buf = &s.b };
            if (writeReply(&o, msg[0..cut], &cols)) |_| {
                // A cut between two tokens, after the DONE of the set.
                try std.testing.expect(o.len > 0);
            } else |e| {
                try std.testing.expect(e == error.Malformed or e == error.Unsupported);
                try std.testing.expectEqual(@as(usize, 0), o.len);
            }
        }
        var small: Out = .{ .buf = s.b[0..40] };
        try std.testing.expectError(error.NoSpace, writeReply(&small, msg, &cols));
        try std.testing.expectEqual(@as(usize, 0), small.len);
        var o: Out = .{ .buf = &s.b };
        try std.testing.expectError(error.Unsupported, writeReply(&o, msg, cols[0..0]));
    }
}

test "tdswire: the reply to LOGIN7" {
    // ENVCHANGE (database), INFO, ENVCHANGE (collation), LOGINACK, ENVCHANGE
    // (packet size 8000), FEATUREEXTACK (UTF8_SUPPORT) and DONE, as MS-TDS
    // section 4.2 shows them.
    const ok = "\xe3\x0b\x00\x01\x02m\x00a\x00\x02t\x00e\x00" ++
        "\xab\x14\x00\x45\x16\x00\x00\x02\x00\x02\x00h\x00i\x00\x01s\x00\x00\x01\x00\x00\x00" ++
        "\xe3\x08\x00\x07\x05\x09\x04\xd0\x00\x34\x00" ++
        "\xad\x10\x00\x01\x74\x00\x00\x04\x03S\x00Q\x00L\x00\x0f\x00\x07\xd0" ++
        "\xe3\x13\x00\x04\x048\x000\x000\x000\x00\x044\x000\x009\x006\x00" ++
        "\xae\x0a\x01\x00\x00\x00\x01\xff" ++
        "\xfd\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
    const reply = try loginReply(ok);
    try std.testing.expect(reply.ok and !reply.routed and reply.err.len == 0);
    try std.testing.expectEqual(@as(u32, 8000), reply.packet_size);
    try std.testing.expectEqualSlices(u8, "\x09\x04\xd0\x00\x34", &reply.collation);
    // ERROR 18456 "no", then DONE with the error flag.
    const failed = "\xaa\x14\x00\x18\x48\x00\x00\x01\x0e\x02\x00n\x00o\x00\x01s\x00\x00\x01\x00\x00\x00" ++
        "\xfd\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
    const refused = try loginReply(failed);
    try std.testing.expect(!refused.ok);
    var buf: [16]u8 = @splat(0);
    var o: Out = .{ .buf = &buf };
    try writeErrorMessage(&o, refused.err);
    try std.testing.expectEqualStrings("\"no\"", buf[0..o.len]);
    const routed = try loginReply("\xe3\x03\x00\x14\x00\x00" ++ ok);
    try std.testing.expect(routed.routed and routed.ok);
    try std.testing.expectError(error.Malformed, loginReply(ok[0 .. ok.len - 3]));
    try std.testing.expectError(error.Unsupported, loginReply("\xed\x00\x00"));
}
