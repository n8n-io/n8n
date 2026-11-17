//! The PostgreSQL wire protocol, version 3: a pure codec. It builds the
//! frontend messages, frames and decodes the backend messages, computes the
//! MD5 and SCRAM-SHA-256 answers, and turns a column value in text format
//! into the JSON that node-postgres gives for it (spec section 9.10).
//!
//! Nothing here reads a socket or a clock. The shell (`shell/pg.zig`) owns
//! the connections and passes bytes in and out. Every length from the wire
//! is checked against the buffer before use.
const std = @import("std");
const numfmt = @import("numfmt.zig");
const Sha256 = std.crypto.hash.sha2.Sha256;
const Hmac = std.crypto.auth.hmac.sha2.HmacSha256;

pub const Error = error{ NoSpace, Malformed };

// ---- numbers as text (the core does not use std.fmt) ---------------------------

/// The value of a run of decimal digits, or null (empty, another byte, or
/// more than 64 bits).
fn parseU64(s: []const u8) ?u64 {
    if (s.len == 0) return null;
    var v: u64 = 0;
    for (s) |c| {
        if (c < '0' or c > '9') return null;
        // More than 64 bits is no value.
        v = std.math.mul(u64, v, 10) catch return null;
        v = std.math.add(u64, v, c - '0') catch return null;
    }
    return v;
}

/// A decimal integer with an optional `-`, or null.
fn parseI64(s: []const u8) ?i64 {
    const neg = s.len > 0 and s[0] == '-';
    const mag = parseU64(if (neg) s[1..] else s) orelse return null;
    if (!neg) return std.math.cast(i64, mag);
    if (mag == 1 << 63) return std.math.minInt(i64);
    const pos = std.math.cast(i64, mag) orelse return null;
    return -pos;
}

fn hexDigit(c: u8) ?u8 {
    return switch (c) {
        '0'...'9' => c - '0',
        'a'...'f' => c - 'a' + 10,
        'A'...'F' => c - 'A' + 10,
        // Every other byte is no hex digit.
        else => null,
    };
}

/// `bytes` as lower-case hex digits.
fn hexLower(comptime n: usize, bytes: [n]u8) [n * 2]u8 {
    const digits = "0123456789abcdef";
    var out: [n * 2]u8 = @splat(0);
    for (bytes, 0..) |b, i| {
        out[i * 2] = digits[b >> 4];
        out[i * 2 + 1] = digits[b & 15];
    }
    return out;
}

/// `v` in decimal, with zeros on the left up to `width` digits.
fn putDecimal(o: *Out, v: u64, width: usize) error{NoSpace}!void {
    const digits = "0123456789";
    var buf: [20]u8 = @splat('0');
    var i: usize = buf.len;
    var x = v;
    while (x > 0) : (x /= 10) {
        i -= 1;
        buf[i] = digits[x % 10];
    }
    std.debug.assert(width >= 1 and width <= buf.len);
    try o.put(buf[@min(i, buf.len - width)..]);
}

// ---- frontend messages --------------------------------------------------------

/// A bounded buffer of frontend messages. A message that does not fit
/// leaves the buffer as it was before the message.
pub const Writer = struct {
    buf: []u8,
    len: usize = 0,

    /// The start of a message that is open: the offset of its length word.
    const Open = struct { at: usize, start: usize };

    fn open(w: *Writer, tag: ?u8) Error!Open {
        const start = w.len;
        if (tag) |t| try w.byte(t);
        const at = w.len;
        try w.int32(0);
        return .{ .at = at, .start = start };
    }

    fn close(w: *Writer, o: Open) Error!void {
        std.debug.assert(o.at + 4 <= w.len);
        const n = std.math.cast(u32, w.len - o.at) orelse return w.fail(o);
        std.mem.writeInt(u32, w.buf[o.at..][0..4], n, .big);
    }

    fn fail(w: *Writer, o: Open) Error {
        return w.undo(o, error.NoSpace);
    }

    /// Drop the open message and give `e` back.
    fn undo(w: *Writer, o: Open, e: Error) Error {
        std.debug.assert(o.start <= w.len);
        w.len = o.start;
        return e;
    }

    fn byte(w: *Writer, c: u8) Error!void {
        if (w.len + 1 > w.buf.len) return error.NoSpace;
        w.buf[w.len] = c;
        w.len += 1;
    }

    fn bytes(w: *Writer, s: []const u8) Error!void {
        if (s.len > w.buf.len - w.len) return error.NoSpace;
        @memcpy(w.buf[w.len..][0..s.len], s);
        w.len += s.len;
    }

    fn int16(w: *Writer, v: u16) Error!void {
        if (w.len + 2 > w.buf.len) return error.NoSpace;
        std.mem.writeInt(u16, w.buf[w.len..][0..2], v, .big);
        w.len += 2;
    }

    fn int32(w: *Writer, v: u32) Error!void {
        if (w.len + 4 > w.buf.len) return error.NoSpace;
        std.mem.writeInt(u32, w.buf[w.len..][0..4], v, .big);
        w.len += 4;
    }

    /// A string with its zero byte. A zero byte inside `s` would end the
    /// string early on the server: it is refused.
    fn cstr(w: *Writer, s: []const u8) Error!void {
        if (std.mem.indexOfScalar(u8, s, 0) != null) return error.Malformed;
        try w.bytes(s);
        try w.byte(0);
    }

    /// The bytes that are free after the messages.
    pub fn room(w: *Writer) []u8 {
        return w.buf[w.len..];
    }

    pub fn sslRequest(w: *Writer) Error!void {
        const o = try w.open(null);
        w.int32(80877103) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    /// The startup message, with the parameters that node-postgres sends.
    pub fn startup(w: *Writer, user: []const u8, database: []const u8) Error!void {
        const o = try w.open(null);
        w.startupBody(user, database) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    fn startupBody(w: *Writer, user: []const u8, database: []const u8) Error!void {
        try w.int32(196608);
        try w.cstr("user");
        try w.cstr(user);
        try w.cstr("database");
        try w.cstr(database);
        try w.cstr("client_encoding");
        try w.cstr("UTF8");
        try w.byte(0);
    }

    /// A password message: the clear password or the MD5 answer.
    pub fn password(w: *Writer, text: []const u8) Error!void {
        const o = try w.open('p');
        w.cstr(text) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    pub fn saslInitial(w: *Writer, mechanism: []const u8, first: []const u8) Error!void {
        const o = try w.open('p');
        const n = std.math.cast(u32, first.len) orelse return w.fail(o);
        w.cstr(mechanism) catch |e| return w.undo(o, e);
        w.int32(n) catch |e| return w.undo(o, e);
        w.bytes(first) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    pub fn saslResponse(w: *Writer, data: []const u8) Error!void {
        const o = try w.open('p');
        w.bytes(data) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    /// A simple query: a text of the client itself (`BEGIN`), or the text
    /// of a `simple` statement, which the library node made.
    pub fn query(w: *Writer, text: []const u8) Error!void {
        const o = try w.open('Q');
        w.cstr(text) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    /// Parse: `text` becomes the prepared statement `name` with these
    /// parameter types (0: the server infers the type).
    pub fn parse(w: *Writer, name: []const u8, text: []const u8, oids: []const u32) Error!void {
        const o = try w.open('P');
        const n = std.math.cast(u16, oids.len) orelse return w.fail(o);
        w.parseBody(name, text, n, oids) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    fn parseBody(w: *Writer, name: []const u8, text: []const u8, n: u16, oids: []const u32) Error!void {
        try w.cstr(name);
        try w.cstr(text);
        try w.int16(n);
        for (oids) |oid| try w.int32(oid);
    }

    /// Bind in pieces: `bindBegin`, one `bindParam` for each value, `bindEnd`.
    /// All values and all results are in text format.
    pub fn bindBegin(w: *Writer, statement: []const u8, nparams: u16) Error!Bind {
        const o = try w.open('B');
        w.bindHead(statement, nparams) catch |e| return w.undo(o, e);
        return .{ .open = o, .left = nparams };
    }

    fn bindHead(w: *Writer, statement: []const u8, nparams: u16) Error!void {
        try w.byte(0);
        try w.cstr(statement);
        try w.int16(0);
        try w.int16(nparams);
    }

    pub const Bind = struct { open: Open, left: u16 };

    /// One value; null is SQL NULL.
    pub fn bindParam(w: *Writer, b: *Bind, value: ?[]const u8) Error!void {
        std.debug.assert(b.left > 0);
        b.left -= 1;
        const v = value orelse return w.int32(0xFFFF_FFFF) catch |e| w.undo(b.open, e);
        const n = std.math.cast(u32, v.len) orelse return w.fail(b.open);
        if (n > std.math.maxInt(i32)) return w.fail(b.open);
        w.int32(n) catch |e| return w.undo(b.open, e);
        w.bytes(v) catch |e| return w.undo(b.open, e);
    }

    /// Reserve the length word of a value that the caller writes into
    /// `room()` itself; `bindParamEnd` gives its size.
    pub fn bindParamBegin(w: *Writer, b: *Bind) Error!usize {
        std.debug.assert(b.left > 0);
        b.left -= 1;
        const at = w.len;
        w.int32(0) catch |e| return w.undo(b.open, e);
        return at;
    }

    pub fn bindParamEnd(w: *Writer, b: *Bind, at: usize, size: usize) Error!void {
        std.debug.assert(at + 4 == w.len);
        const n = std.math.cast(u32, size) orelse return w.fail(b.open);
        if (n > std.math.maxInt(i32) or size > w.buf.len - w.len) return w.fail(b.open);
        std.mem.writeInt(u32, w.buf[at..][0..4], n, .big);
        w.len += size;
    }

    pub fn bindEnd(w: *Writer, b: Bind) Error!void {
        std.debug.assert(b.left == 0);
        w.int16(0) catch |e| return w.undo(b.open, e);
        try w.close(b.open);
    }

    /// Describe a prepared statement (`S`) or the unnamed portal (`P`).
    pub fn describe(w: *Writer, what: u8, name: []const u8) Error!void {
        std.debug.assert(what == 'S' or what == 'P');
        const o = try w.open('D');
        w.byte(what) catch |e| return w.undo(o, e);
        w.cstr(name) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    /// Close the prepared statement `name`.
    pub fn closeStatement(w: *Writer, name: []const u8) Error!void {
        const o = try w.open('C');
        w.byte('S') catch |e| return w.undo(o, e);
        w.cstr(name) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    /// Execute the unnamed portal to its end.
    pub fn execute(w: *Writer) Error!void {
        const o = try w.open('E');
        w.byte(0) catch |e| return w.undo(o, e);
        w.int32(0) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    pub fn sync(w: *Writer) Error!void {
        const o = try w.open('S');
        try w.close(o);
    }

    /// CopyFail: the answer to `COPY ... FROM STDIN`. The client has no data for it.
    pub fn copyFail(w: *Writer, message: []const u8) Error!void {
        const o = try w.open('f');
        w.cstr(message) catch |e| return w.undo(o, e);
        try w.close(o);
    }

    pub fn terminate(w: *Writer) Error!void {
        const o = try w.open('X');
        try w.close(o);
    }

    /// A cancel request. It goes on a connection of its own.
    pub fn cancel(w: *Writer, pid: u32, key: u32) Error!void {
        const o = try w.open(null);
        w.int32(80877102) catch |e| return w.undo(o, e);
        w.int32(pid) catch |e| return w.undo(o, e);
        w.int32(key) catch |e| return w.undo(o, e);
        try w.close(o);
    }
};

/// The parameter type that makes a bind value equal the literal that
/// pg-promise writes for the same JSON value.
pub const oid_unknown: u32 = 0;
pub const oid_bool: u32 = 16;
const oid_int8: u32 = 20;
const oid_int4: u32 = 23;
const oid_numeric: u32 = 1700;

/// The type of a JSON number token: an integer is `int4` when it fits,
/// else `int8` when it fits, and every other number is `numeric`, as the
/// server types a numeric constant.
pub fn numberOid(token: []const u8) u32 {
    std.debug.assert(token.len > 0);
    // A fraction, an exponent or more than 64 bits: numeric.
    const v = parseI64(token) orelse return oid_numeric;
    if (v >= std.math.minInt(i32) and v <= std.math.maxInt(i32)) return oid_int4;
    return oid_int8;
}

// ---- backend messages ---------------------------------------------------------

pub const Msg = struct {
    tag: u8,
    body: []const u8,
    /// The bytes of the message in the buffer, with its header.
    size: usize,
};

pub const NextError = error{ Malformed, TooLarge };

/// The message at the start of `buf`, or null when the buffer holds only
/// a part of it. `max_body` bounds the body: a larger message is refused
/// before it is buffered.
pub fn next(buf: []const u8, max_body: usize) NextError!?Msg {
    if (buf.len < 5) return null;
    const len: usize = std.mem.readInt(u32, buf[1..5], .big);
    if (len < 4) return error.Malformed;
    if (len - 4 > max_body) return error.TooLarge;
    if (buf.len - 1 < len) return null;
    std.debug.assert(len + 1 <= buf.len);
    return .{ .tag = buf[0], .body = buf[5 .. len + 1], .size = len + 1 };
}

/// A reader of one message body.
pub const Reader = struct {
    s: []const u8,
    i: usize = 0,

    /// A 16-bit count at the start of a body.
    pub fn count(r: *Reader) Error!u16 {
        return r.int16();
    }

    fn int16(r: *Reader) Error!u16 {
        if (r.s.len - r.i < 2) return error.Malformed;
        defer r.i += 2;
        return std.mem.readInt(u16, r.s[r.i..][0..2], .big);
    }

    pub fn int32(r: *Reader) Error!u32 {
        if (r.s.len - r.i < 4) return error.Malformed;
        defer r.i += 4;
        return std.mem.readInt(u32, r.s[r.i..][0..4], .big);
    }

    pub fn cstr(r: *Reader) Error![]const u8 {
        const end = std.mem.indexOfScalarPos(u8, r.s, r.i, 0) orelse return error.Malformed;
        defer r.i = end + 1;
        return r.s[r.i..end];
    }

    pub fn take(r: *Reader, n: usize) Error![]const u8 {
        if (r.s.len - r.i < n) return error.Malformed;
        defer r.i += n;
        return r.s[r.i..][0..n];
    }

    pub fn rest(r: *Reader) []const u8 {
        return r.s[r.i..];
    }
};

/// The fields of an ErrorResponse or a NoticeResponse.
pub const Fields = struct {
    r: Reader,

    pub const Field = struct { code: u8, text: []const u8 };

    pub fn init(body: []const u8) Fields {
        return .{ .r = .{ .s = body } };
    }

    /// The next field, or null at the end. Each call takes at least one
    /// byte, so the body length bounds the loop of the caller.
    pub fn next(f: *Fields) Error!?Field {
        const c = try f.r.take(1);
        if (c[0] == 0) return null;
        return .{ .code = c[0], .text = try f.r.cstr() };
    }
};

/// The name that node-postgres gives the field with this code, or null.
pub fn fieldName(code: u8) ?[]const u8 {
    std.debug.assert(code != 0);
    return switch (code) {
        'S' => "severity",
        'C' => "code",
        'M' => "message",
        'D' => "detail",
        'H' => "hint",
        'P' => "position",
        'p' => "internalPosition",
        'q' => "internalQuery",
        'W' => "where",
        's' => "schema",
        't' => "table",
        'c' => "column",
        'd' => "dataType",
        'n' => "constraint",
        'F' => "file",
        'L' => "line",
        'R' => "routine",
        // Other codes (`V`, the severity that is never translated) have no name in node-postgres.
        else => null,
    };
}

/// One column of a RowDescription.
pub const Column = struct { name: []const u8, oid: u32 };

pub const Columns = struct {
    r: Reader,
    left: u16,

    pub fn init(body: []const u8) Error!Columns {
        var r: Reader = .{ .s = body };
        const n = try r.int16();
        return .{ .r = r, .left = n };
    }

    pub fn next(c: *Columns) Error!?Column {
        if (c.left == 0) return null;
        c.left -= 1;
        const name = try c.r.cstr();
        // Table oid and column number.
        const skipped = try c.r.take(6);
        std.debug.assert(skipped.len == 6);
        const oid = try c.r.int32();
        // Type size, type modifier and format code.
        const tail = try c.r.take(8);
        std.debug.assert(tail.len == 8);
        return .{ .name = name, .oid = oid };
    }
};

/// The values of a DataRow.
pub const Values = struct {
    r: Reader,
    left: u16,

    pub fn init(body: []const u8) Error!Values {
        var r: Reader = .{ .s = body };
        const n = try r.int16();
        return .{ .r = r, .left = n };
    }

    pub const Value = struct { text: ?[]const u8 };

    /// The next value (`text` null: SQL NULL), or null after the last.
    pub fn next(v: *Values) Error!?Value {
        if (v.left == 0) return null;
        v.left -= 1;
        const n = try v.r.int32();
        if (n == 0xFFFF_FFFF) return .{ .text = null };
        return .{ .text = try v.r.take(n) };
    }
};

/// A command tag as node-postgres reads it: the first word, and the row
/// count when the tag has one (`INSERT 0 5`, `SELECT 3`, `CREATE TABLE`).
pub const Tag = struct { command: []const u8, rows: ?u64 };

pub fn commandTag(body: []const u8) Error!Tag {
    var r: Reader = .{ .s = body };
    const text = try r.cstr();
    var i: usize = 0;
    while (i < text.len and std.ascii.isAlphabetic(text[i])) i += 1;
    const command = text[0..i];
    var rows: ?u64 = null;
    var words = std.mem.tokenizeScalar(u8, text[i..], ' ');
    // The tag has at most two numbers: an oid and the row count.
    for (0..2) |_| {
        const word = words.next() orelse break;
        // A second word that is no number (`CREATE TABLE`): no count.
        rows = parseU64(word) orelse break;
    }
    std.debug.assert(command.len <= text.len);
    return .{ .command = command, .rows = rows };
}

/// An authentication request (message `R`).
pub const Auth = union(enum) {
    ok,
    cleartext,
    md5: [4]u8,
    /// The mechanism names, each with its zero byte.
    sasl: []const u8,
    sasl_continue: []const u8,
    sasl_final: []const u8,
    /// A method that this client does not have (Kerberos, GSS, SSPI).
    other: u32,
};

pub fn auth(body: []const u8) Error!Auth {
    var r: Reader = .{ .s = body };
    const kind = try r.int32();
    return switch (kind) {
        0 => .ok,
        3 => .cleartext,
        5 => .{ .md5 = (try r.take(4))[0..4].* },
        10 => .{ .sasl = r.rest() },
        11 => .{ .sasl_continue = r.rest() },
        12 => .{ .sasl_final = r.rest() },
        // Every other number is a method without an answer here.
        else => .{ .other = kind },
    };
}

/// True when the SASL mechanism list has `name`.
pub fn hasMechanism(list: []const u8, name: []const u8) bool {
    var it = std.mem.splitScalar(u8, list, 0);
    // Each step takes at least one byte of the list.
    for (0..list.len + 1) |_| {
        const m = it.next() orelse return false;
        if (std.mem.eql(u8, m, name)) return true;
    }
    return false;
}

// ---- passwords ----------------------------------------------------------------

/// The answer to an MD5 request: `md5` and 32 hex digits.
pub fn md5Password(user: []const u8, pass: []const u8, salt: [4]u8, out: *[35]u8) void {
    const Md5 = std.crypto.hash.Md5;
    var inner: [16]u8 = @splat(0);
    var h = Md5.init(.{});
    h.update(pass);
    h.update(user);
    h.final(&inner);
    const hex1 = hexLower(16, inner);
    var outer: [16]u8 = @splat(0);
    h = Md5.init(.{});
    h.update(&hex1);
    h.update(&salt);
    h.final(&outer);
    out[0..3].* = "md5".*;
    out[3..35].* = hexLower(16, outer);
}

/// SCRAM-SHA-256 (RFC 5802, RFC 7677) as node-postgres does it: the user
/// name is `*` (the server takes it from the startup message), and there
/// is no channel binding.
pub const Scram = struct {
    /// `n=*,r=<nonce>`.
    first_bare: [first_bare_len]u8 = @splat(0),
    server_sig: [32]u8 = @splat(0),
    state: enum(u8) { new, sent_first, sent_final, done } = .new,

    pub const mechanism = "SCRAM-SHA-256";
    pub const nonce_bytes = 18;
    const nonce_len = 24;
    const first_bare_len = 6 + nonce_len;
    /// The most PBKDF2 rounds that a server may ask for: the work is done
    /// on the event loop, so a hostile count must not stall it.
    const max_rounds = 100_000;
    const max_server_first = 256;
    /// The longest client-final message: `c=biws,r=`, a nonce, `,p=` and 44 digits.
    pub const max_final = 9 + max_server_first + 3 + 44;

    pub const ScramError = error{ Malformed, NoSpace, TooManyRounds, BadServerSignature };

    /// The client-first message, from `nonce_bytes` random bytes.
    pub fn first(s: *Scram, random: [nonce_bytes]u8, out: *[3 + first_bare_len]u8) []const u8 {
        std.debug.assert(s.state == .new);
        s.first_bare[0..6].* = "n=*,r=".*;
        const enc = std.base64.standard.Encoder.encode(s.first_bare[6..], &random);
        std.debug.assert(enc.len == nonce_len);
        out[0..3].* = "n,,".*;
        out[3..].* = s.first_bare;
        s.state = .sent_first;
        return out;
    }

    /// The client-final message for the server-first message.
    pub fn final(s: *Scram, pass: []const u8, server_first: []const u8, out: *[max_final]u8) ScramError![]const u8 {
        // A server can send this message out of turn.
        if (s.state != .sent_first) return error.Malformed;
        if (server_first.len > max_server_first) return error.NoSpace;
        const p = try parseServerFirst(server_first);
        if (!std.mem.startsWith(u8, p.nonce, s.first_bare[6..]) or p.nonce.len == nonce_len) return error.Malformed;
        if (p.rounds > max_rounds) return error.TooManyRounds;
        var salt: [128]u8 = @splat(0);
        const salt_len = std.base64.standard.Decoder.calcSizeForSlice(p.salt) catch return error.Malformed;
        if (salt_len > salt.len) return error.NoSpace;
        std.base64.standard.Decoder.decode(salt[0..salt_len], p.salt) catch return error.Malformed;
        var salted: [32]u8 = @splat(0);
        std.crypto.pwhash.pbkdf2(&salted, pass, salt[0..salt_len], p.rounds, Hmac) catch return error.Malformed;
        const prefix = "c=biws,r=";
        std.debug.assert(prefix.len + p.nonce.len + 3 + 44 <= out.len);
        out[0..prefix.len].* = prefix.*;
        @memcpy(out[prefix.len..][0..p.nonce.len], p.nonce);
        const head = out[0 .. prefix.len + p.nonce.len];
        const proof = s.prove(salted, server_first, head);
        const enc = std.base64.standard.Encoder.encode(out[head.len + 3 ..][0..44], &proof);
        std.debug.assert(enc.len == 44);
        out[head.len..][0..3].* = ",p=".*;
        s.state = .sent_final;
        return out[0 .. head.len + 3 + 44];
    }

    /// The client proof; it also keeps the signature that the server must show.
    fn prove(s: *Scram, salted: [32]u8, server_first: []const u8, final_bare: []const u8) [32]u8 {
        std.debug.assert(s.state == .sent_first and final_bare.len > 0);
        var client_key: [32]u8 = @splat(0);
        Hmac.create(&client_key, "Client Key", &salted);
        var stored: [32]u8 = @splat(0);
        Sha256.hash(&client_key, &stored, .{});
        var server_key: [32]u8 = @splat(0);
        Hmac.create(&server_key, "Server Key", &salted);
        var sig: [32]u8 = @splat(0);
        for ([_]struct { key: *const [32]u8, out: *[32]u8 }{ .{ .key = &stored, .out = &sig }, .{ .key = &server_key, .out = &s.server_sig } }) |m| {
            var h = Hmac.init(m.key);
            h.update(&s.first_bare);
            h.update(",");
            h.update(server_first);
            h.update(",");
            h.update(final_bare);
            h.final(m.out);
        }
        var proof: [32]u8 = @splat(0);
        for (&proof, client_key, sig) |*p, k, g| p.* = k ^ g;
        return proof;
    }

    /// Check the server-final message (`v=<signature>`).
    pub fn verify(s: *Scram, server_final: []const u8) ScramError!void {
        if (s.state != .sent_final or !std.mem.startsWith(u8, server_final, "v=")) return error.Malformed;
        var sig: [32]u8 = @splat(0);
        const text = server_final[2..];
        const n = std.base64.standard.Decoder.calcSizeForSlice(text) catch return error.Malformed;
        if (n != sig.len) return error.BadServerSignature;
        std.base64.standard.Decoder.decode(&sig, text) catch return error.Malformed;
        if (!std.crypto.timing_safe.eql([32]u8, sig, s.server_sig)) return error.BadServerSignature;
        s.state = .done;
    }

    const ServerFirst = struct { nonce: []const u8, salt: []const u8, rounds: u32 };

    fn parseServerFirst(text: []const u8) ScramError!ServerFirst {
        var out: ServerFirst = .{ .nonce = "", .salt = "", .rounds = 0 };
        var it = std.mem.splitScalar(u8, text, ',');
        // Each part takes at least one byte of the text.
        for (0..text.len + 1) |_| {
            const part = it.next() orelse break;
            if (part.len < 2 or part[1] != '=') continue;
            const v = part[2..];
            switch (part[0]) {
                'r' => out.nonce = v,
                's' => out.salt = v,
                'i' => out.rounds = std.math.cast(u32, parseU64(v) orelse return error.Malformed) orelse return error.Malformed,
                // An extension that this client does not know: RFC 5802 says to ignore it.
                else => {},
            }
        }
        if (out.nonce.len == 0 or out.salt.len == 0 or out.rounds == 0) return error.Malformed;
        return out;
    }
};

// ---- column values as JSON ----------------------------------------------------

/// A bounded output buffer for JSON text.
pub const Out = struct {
    buf: []u8,
    len: usize = 0,

    pub fn put(o: *Out, s: []const u8) error{NoSpace}!void {
        if (s.len > o.buf.len - o.len) return error.NoSpace;
        @memcpy(o.buf[o.len..][0..s.len], s);
        o.len += s.len;
    }

    pub fn byte(o: *Out, c: u8) error{NoSpace}!void {
        if (o.len == o.buf.len) return error.NoSpace;
        o.buf[o.len] = c;
        o.len += 1;
    }

    /// One byte of a JSON string.
    fn escaped(o: *Out, c: u8) error{NoSpace}!void {
        const hex = "0123456789abcdef";
        if (c >= 0x20 and c != '"' and c != '\\') return o.byte(c);
        if (c >= 0x20) return o.put(&.{ '\\', c });
        try o.put(&.{ '\\', 'u', '0', '0', hex[c >> 4], hex[c & 15] });
    }

    /// `s` as a JSON string.
    pub fn string(o: *Out, s: []const u8) error{NoSpace}!void {
        const hex = "0123456789abcdef";
        try o.byte('"');
        var from: usize = 0;
        for (s, 0..) |c, i| {
            if (c >= 0x20 and c != '"' and c != '\\') continue;
            try o.put(s[from..i]);
            from = i + 1;
            if (c >= 0x20) {
                try o.put(&.{ '\\', c });
            } else {
                try o.put(&.{ '\\', 'u', '0', '0', hex[c >> 4], hex[c & 15] });
            }
        }
        try o.put(s[from..]);
        try o.byte('"');
    }
};

pub const Options = struct {
    /// `largeNumbersOutput: numbers`: int8 and numeric become numbers.
    numbers: bool = false,
    /// `dates: legacy` of the call: a date column has no native form.
    legacy_dates: bool = false,
    /// The process that runs the v1 node is in UTC (`--sql-timestamp-zone utc`):
    /// a timestamp without a zone has a native form.
    utc: bool = false,
};

pub const Class = enum(u8) {
    boolean,
    int,
    int8,
    float,
    numeric,
    json,
    bytea,
    timestamp,
    text,
    interval,
    point,
    circle,
    /// An array: the name says how each element becomes JSON.
    array_bool,
    array_int,
    array_float,
    array_text,
    array_json,
    array_timestamp,
    array_interval,
    array_point,
    unsupported,
};

/// How the value of a column of type `oid` becomes JSON. `unsupported`:
/// node-postgres gives a form that this client does not build (`bytea[]`,
/// dates as `Date` objects, a timestamp in the zone of the process).
pub fn classOf(oid: u32, opt: Options) Class {
    return switch (oid) {
        16 => .boolean,
        21, 23, 26 => .int,
        20 => .int8,
        700, 701 => .float,
        1700 => .numeric,
        114, 3802 => .json,
        17 => .bytea,
        1082 => if (opt.legacy_dates) .unsupported else .text,
        1184 => .timestamp,
        1114 => if (opt.utc) .timestamp else .unsupported,
        1186 => .interval,
        600 => .point,
        718 => .circle,
        // An array type, or a type that stays text.
        else => arrayClassOf(oid, opt),
    };
}

/// The class of an array type that node-postgres parses. Each other type
/// has no parser there: the value stays text.
fn arrayClassOf(oid: u32, opt: Options) Class {
    return switch (oid) {
        1000 => .array_bool,
        1005, 1007, 1028 => .array_int,
        // `numeric[]` is `parseFloat` of each element, with every `largeNumbers` value.
        1021, 1022, 1231 => .array_float,
        // `int8[]` stays text, with every `largeNumbers` value.
        1016, 651, 1014, 1015, 1008, 1009, 1040, 1041, 3907, 2951, 791, 1183, 1270 => .array_text,
        199, 3807 => .array_json,
        1182 => if (opt.legacy_dates) .unsupported else .array_text,
        1185 => if (opt.legacy_dates) .unsupported else .array_timestamp,
        1115 => if (opt.utc and !opt.legacy_dates) .array_timestamp else .unsupported,
        1187 => .array_interval,
        1017 => .array_point,
        // `bytea[]`: node-postgres reads the bytes of the hex text, not the value.
        1001 => .unsupported,
        // Not an array type that node-postgres knows.
        else => .text,
    };
}

/// True for a type whose form is another one with `dates: legacy`.
pub fn isDateType(oid: u32) bool {
    return oid == 1082 or oid == 1182 or oid == 1115 or oid == 1185;
}

/// True for a type whose text depends on the DateStyle of the session.
pub fn isTimeType(oid: u32) bool {
    return oid == 1114 or oid == 1184 or isDateType(oid);
}

/// True for a type whose text depends on the IntervalStyle of the session.
pub fn isIntervalType(oid: u32) bool {
    return oid == 1186 or oid == 1187;
}

pub const ValueError = error{
    NoSpace,
    /// The value has no exact native form (a timestamp before year 1000, bytea in the escape format).
    Unsupported,
};

/// Write the JSON of one value in text format.
pub fn writeValue(o: *Out, class: Class, text: []const u8, opt: Options) ValueError!void {
    std.debug.assert(o.len <= o.buf.len);
    switch (class) {
        .boolean => try o.put(if (isTrue(text)) "true" else "false"),
        .int => try writeInt(o, text),
        .int8 => if (opt.numbers) try writeBigAsNumber(o, text) else try o.string(text),
        .float => try writeFloat(o, text),
        .numeric => if (opt.numbers) try writeFloat(o, text) else try o.string(text),
        .json => try writeJson(o, text),
        .bytea => try writeBytea(o, text),
        .timestamp => try writeTimestamp(o, text),
        .text => try o.string(text),
        .interval => try writeInterval(o, text),
        .point => try writePoint(o, text),
        .circle => try writeCircle(o, text),
        .array_bool => try writeArray(o, .boolean, text),
        .array_int => try writeArray(o, .int, text),
        .array_float => try writeArray(o, .float, text),
        .array_text => try writeArray(o, .text, text),
        .array_json => try writeArray(o, .json, text),
        .array_timestamp => try writeArray(o, .timestamp, text),
        .array_interval => try writeArray(o, .interval, text),
        .array_point => try writeArray(o, .point, text),
        .unsupported => return error.Unsupported,
    }
}

fn isTrue(text: []const u8) bool {
    const forms = [_][]const u8{ "t", "TRUE", "true", "y", "yes", "on", "1" };
    for (forms) |f| {
        if (std.mem.eql(u8, text, f)) return true;
    }
    return false;
}

/// `parseInt(text, 10)` of a value that the server wrote: digits with an
/// optional sign.
fn writeInt(o: *Out, text: []const u8) ValueError!void {
    const digits = if (text.len > 0 and text[0] == '-') text[1..] else text;
    if (digits.len == 0 or digits.len > 10) return error.Unsupported;
    for (digits) |c| {
        if (!std.ascii.isDigit(c)) return error.Unsupported;
    }
    try o.put(text);
}

/// `parseInt(text, 10)` of an int8: the nearest double, as JavaScript writes it.
fn writeBigAsNumber(o: *Out, text: []const u8) ValueError!void {
    // The server writes an int8 as digits.
    const v = parseI64(text) orelse return error.Unsupported;
    var buf: [numfmt.max_len]u8 = @splat(0);
    const f: f64 = @floatFromInt(v);
    try o.put(numfmt.format(&buf, f));
}

/// `parseFloat(text)`: NaN and the infinities are `null` in JSON.
fn writeFloat(o: *Out, text: []const u8) ValueError!void {
    const f = numfmt.parseFloatPrefix(text);
    if (std.math.isNan(f) or std.math.isInf(f)) return o.put("null");
    var buf: [numfmt.max_len]u8 = @splat(0);
    try o.put(numfmt.format(&buf, f));
}

/// A json or jsonb value goes into the result as it is. The server checked
/// it; this check only makes sure that the text cannot end the document
/// around it: strings end, and brackets pair up.
fn writeJson(o: *Out, text: []const u8) ValueError!void {
    if (!jsonShape(text)) return error.Unsupported;
    try o.put(text);
}

/// True when strings end and brackets pair up in `text`, and it is one value.
fn jsonShape(text: []const u8) bool {
    var depth: usize = 0;
    var in_string = false;
    var i: usize = 0;
    while (i < text.len) : (i += 1) {
        const c = text[i];
        if (in_string) {
            if (c == '\\') i += 1 else if (c == '"') in_string = false;
        } else if (c == '"') {
            in_string = true;
        } else if (c == '{' or c == '[') {
            depth += 1;
        } else if (c == '}' or c == ']') {
            if (depth == 0) return false;
            depth -= 1;
        } else if (c == ',' and depth == 0) {
            return false;
        }
    }
    std.debug.assert(i >= text.len);
    return depth == 0 and !in_string and std.mem.trim(u8, text, " \t\r\n").len != 0;
}

/// A bytea in the hex format becomes the JSON of a Node.js `Buffer`.
fn writeBytea(o: *Out, text: []const u8) ValueError!void {
    if (!std.mem.startsWith(u8, text, "\\x")) return writeByteaEscape(o, text);
    if (text.len % 2 != 0) return error.Unsupported;
    try o.put("{\"type\":\"Buffer\",\"data\":[");
    var i: usize = 2;
    while (i < text.len) : (i += 2) {
        const hi = hexDigit(text[i]) orelse return error.Unsupported;
        const lo = hexDigit(text[i + 1]) orelse return error.Unsupported;
        if (i > 2) try o.byte(',');
        try putDecimal(o, @as(u64, hi) * 16 + lo, 1);
    }
    try o.put("]}");
}

/// A bytea in the escape format (`bytea_output = escape`), as
/// `postgres-bytea` 1.0.0 reads it: a printable ASCII byte is itself, `\\`
/// is one backslash, and `\ooo` is the byte with that octal number. The
/// server writes every other byte as an octal number.
fn writeByteaEscape(o: *Out, text: []const u8) ValueError!void {
    try o.put("{\"type\":\"Buffer\",\"data\":[");
    var i: usize = 0;
    // Each pass takes one byte or more of the text.
    for (0..text.len) |_| {
        if (i >= text.len) break;
        const b = try escapedByte(text[i..]);
        if (i > 0) try o.byte(',');
        try putDecimal(o, b.value, 1);
        i += b.size;
    }
    std.debug.assert(i == text.len);
    try o.put("]}");
}

const EscapedByte = struct { value: u8, size: usize };

/// The byte at the start of a bytea text in the escape format.
fn escapedByte(s: []const u8) ValueError!EscapedByte {
    std.debug.assert(s.len > 0);
    if (s[0] != '\\') {
        if (s[0] < 0x20 or s[0] > 0x7e) return error.Unsupported;
        return .{ .value = s[0], .size = 1 };
    }
    if (s.len >= 2 and s[1] == '\\') return .{ .value = '\\', .size = 2 };
    if (s.len < 4) return error.Unsupported;
    var v: u32 = 0;
    for (s[1..4]) |c| {
        if (c < '0' or c > '7') return error.Unsupported;
        v = v * 8 + (c - '0');
    }
    return .{ .value = std.math.cast(u8, v) orelse return error.Unsupported, .size = 4 };
}

/// `new Date(text).toISOString()` for the ISO output of the server
/// (`2024-01-02 03:04:05.123456+05:30`), or the text when JavaScript
/// cannot read it (`infinity`). The proven range is the years 1000 to
/// 9999 with an offset of hours and minutes; a value outside it has no
/// native form.
fn writeTimestamp(o: *Out, text: []const u8) ValueError!void {
    if (std.mem.eql(u8, text, "infinity") or std.mem.eql(u8, text, "-infinity")) return o.string(text);
    const ms = timestampMs(text) orelse return error.Unsupported;
    // 1000-01-01T00:00:00Z and 9999-12-31T23:59:59.999Z.
    if (ms < -30610224000000 or ms > 253402300799999) return error.Unsupported;
    const days = @divFloor(ms, 86_400_000);
    const rem: u64 = @abs(@mod(ms, 86_400_000));
    std.debug.assert(rem < 86_400_000);
    const d = civil(days);
    const parts = [_]struct { v: u64, width: usize, after: u8 }{
        .{ .v = @abs(d.year), .width = 4, .after = '-' },
        .{ .v = @abs(d.month), .width = 2, .after = '-' },
        .{ .v = @abs(d.day), .width = 2, .after = 'T' },
        .{ .v = rem / 3_600_000, .width = 2, .after = ':' },
        .{ .v = rem / 60_000 % 60, .width = 2, .after = ':' },
        .{ .v = rem / 1000 % 60, .width = 2, .after = '.' },
        .{ .v = rem % 1000, .width = 3, .after = 'Z' },
    };
    try o.byte('"');
    for (parts) |p| {
        try putDecimal(o, p.v, p.width);
        try o.byte(p.after);
    }
    try o.byte('"');
}

/// The fixed-width fields of `YYYY-MM-DD HH:MM:SS`.
fn fixedFields(text: []const u8) ?[6]u32 {
    if (text.len < 19) return null;
    const seps = [_]struct { at: usize, c: u8 }{ .{ .at = 4, .c = '-' }, .{ .at = 7, .c = '-' }, .{ .at = 10, .c = ' ' }, .{ .at = 13, .c = ':' }, .{ .at = 16, .c = ':' } };
    for (seps) |s| {
        if (text[s.at] != s.c) return null;
    }
    const spans = [_][2]usize{ .{ 0, 4 }, .{ 5, 7 }, .{ 8, 10 }, .{ 11, 13 }, .{ 14, 16 }, .{ 17, 19 } };
    var out: [6]u32 = @splat(0);
    for (spans, &out) |sp, *v| v.* = digitsOf(text[sp[0]..sp[1]]) orelse return null;
    return out;
}

fn digitsOf(s: []const u8) ?u32 {
    var v: u32 = 0;
    if (s.len == 0 or s.len > 6) return null;
    for (s) |c| {
        if (!std.ascii.isDigit(c)) return null;
        v = v * 10 + (c - '0');
    }
    return v;
}

/// Milliseconds since the epoch of a timestamp text, or null when it is
/// not in the proven form.
fn timestampMs(text: []const u8) ?i64 {
    const f = fixedFields(text) orelse return null;
    if (f[0] < 1000 or f[1] < 1 or f[1] > 12 or f[2] < 1 or f[2] > 31 or f[3] > 23 or f[4] > 59 or f[5] > 59) return null;
    var i: usize = 19;
    var milli: i64 = 0;
    if (i < text.len and text[i] == '.') {
        const start = i + 1;
        i = start;
        while (i < text.len and std.ascii.isDigit(text[i])) i += 1;
        if (i == start or i - start > 6) return null;
        // JavaScript keeps three digits and drops the rest.
        var frac: [3]u8 = "000".*;
        const keep = @min(i - start, 3);
        @memcpy(frac[0..keep], text[start..][0..keep]);
        milli = digitsOf(&frac) orelse return null;
    }
    std.debug.assert(i >= 19 and i <= text.len);
    const offset_min = offsetMinutes(text[i..]) orelse return null;
    const days = daysFromCivil(f[0], f[1], f[2]);
    const secs: i64 = days * 86_400 + @as(i64, f[3]) * 3600 + @as(i64, f[4]) * 60 + f[5] - offset_min * 60;
    return secs * 1000 + milli;
}

/// The zone offset in minutes: nothing (a timestamp without a zone, in
/// UTC), `+HH` or `+HH:MM`. An offset with seconds is not in the proven form.
fn offsetMinutes(s: []const u8) ?i64 {
    if (s.len == 0) return 0;
    if (s[0] != '+' and s[0] != '-') return null;
    if (s.len != 3 and s.len != 6) return null;
    const h = digitsOf(s[1..3]) orelse return null;
    var m: u32 = 0;
    if (s.len == 6) {
        if (s[3] != ':') return null;
        m = digitsOf(s[4..6]) orelse return null;
    }
    if (h > 15 or m > 59) return null;
    const total: i64 = @as(i64, h) * 60 + m;
    return if (s[0] == '-') -total else total;
}

/// Days since 1970-01-01 of a date in the proleptic Gregorian calendar.
fn daysFromCivil(y_in: u32, m: u32, d: u32) i64 {
    std.debug.assert(m >= 1 and m <= 12 and d >= 1 and d <= 31);
    const y: i64 = if (m <= 2) @as(i64, y_in) - 1 else y_in;
    const era = @divFloor(y, 400);
    const yoe = y - era * 400;
    const mp: i64 = if (m > 2) @as(i64, m) - 3 else @as(i64, m) + 9;
    const doy = @divFloor(153 * mp + 2, 5) + d - 1;
    const doe = yoe * 365 + @divFloor(yoe, 4) - @divFloor(yoe, 100) + doy;
    return era * 146_097 + doe - 719_468;
}

const Date = struct { year: i64, month: i64, day: i64 };

fn civil(days: i64) Date {
    const z = days + 719_468;
    const era = @divFloor(z, 146_097);
    const doe = z - era * 146_097;
    const yoe = @divFloor(doe - @divFloor(doe, 1460) + @divFloor(doe, 36_524) - @divFloor(doe, 146_096), 365);
    const doy = doe - (365 * yoe + @divFloor(yoe, 4) - @divFloor(yoe, 100));
    const mp = @divFloor(5 * doy + 2, 153);
    const month = if (mp < 10) mp + 3 else mp - 9;
    std.debug.assert(month >= 1 and month <= 12);
    return .{ .year = yoe + era * 400 + @intFromBool(month <= 2), .month = month, .day = doy - @divFloor(153 * mp + 2, 5) + 1 };
}

// ---- interval, point and circle -------------------------------------------------

/// A reader of the text of one value.
const Scan = struct {
    s: []const u8,
    i: usize = 0,

    fn eat(p: *Scan, c: u8) bool {
        if (p.i >= p.s.len or p.s[p.i] != c) return false;
        p.i += 1;
        return true;
    }

    /// -1 after a `-`, else 1 (also after a `+`).
    fn sign(p: *Scan) f64 {
        if (p.eat('-')) return -1;
        // The plus sign says nothing more.
        _ = p.eat('+');
        return 1;
    }

    /// A run of `min` to `max` decimal digits, or null (the position stays).
    fn digits(p: *Scan, min: usize, max: usize) ?[]const u8 {
        const start = p.i;
        while (p.i < p.s.len and std.ascii.isDigit(p.s[p.i])) p.i += 1;
        const n = p.i - start;
        if (n >= min and n <= max) return p.s[start..p.i];
        p.i = start;
        return null;
    }
};

fn digitsValue(text: []const u8) ValueError!f64 {
    const v = parseU64(text) orelse return error.Unsupported;
    return @floatFromInt(v);
}

/// The JSON of the object that `postgres-interval` 1.2.0 makes of an
/// interval: the parts that are not 0, in this order. The proven form is
/// the `postgres` style of the server (`1 year 2 mons -3 days 04:05:06.789`),
/// read as the pattern of that package reads it; another text has no
/// native form.
fn writeInterval(o: *Out, text: []const u8) ValueError!void {
    var p: Scan = .{ .s = text };
    var parts: [7]f64 = @splat(0);
    const words = [_][]const u8{ "year", "mon", "day" };
    for (words, parts[0..3]) |word, *part| part.* = try intervalUnit(&p, word);
    if (p.i < text.len) try intervalTime(&p, parts[3..7]);
    if (p.i != text.len or text.len == 0) return error.Unsupported;
    std.debug.assert(p.i == text.len and text.len > 0);
    const keys = [_][]const u8{ "years", "months", "days", "hours", "minutes", "seconds", "milliseconds" };
    var buf: [numfmt.max_len]u8 = @splat(0);
    var first = true;
    try o.byte('{');
    for (keys, parts) |key, v| {
        if (v == 0) continue;
        if (!first) try o.byte(',');
        first = false;
        try o.byte('"');
        try o.put(key);
        try o.put("\":");
        try o.put(numfmt.format(&buf, v));
    }
    try o.byte('}');
}

/// The number of `<number> <word>` or `<number> <word>s` at the position
/// (the pattern `([+-]?\d+)\s+years?`), or 0 when the text there is
/// another part.
fn intervalUnit(p: *Scan, word: []const u8) ValueError!f64 {
    const start = p.i;
    const sign = p.sign();
    const number = p.digits(1, 10);
    if (number == null or !p.eat(' ') or !std.mem.startsWith(u8, p.s[p.i..], word)) {
        p.i = start;
        return 0;
    }
    p.i += word.len;
    // The plural form.
    _ = p.eat('s');
    // The server ends a part with the end of the text, or with one space and the next part.
    if (p.i < p.s.len and (!p.eat(' ') or p.i == p.s.len)) return error.Unsupported;
    return sign * try digitsValue(number orelse "");
}

/// `[+-]H:MM:SS[.ffffff]` up to the end of the text: hours, minutes,
/// seconds and milliseconds. The sign is the sign of each of them.
fn intervalTime(p: *Scan, out: []f64) ValueError!void {
    std.debug.assert(out.len == 4);
    const sign = p.sign();
    const h = p.digits(1, 10) orelse return error.Unsupported;
    if (!p.eat(':')) return error.Unsupported;
    const m = p.digits(2, 2) orelse return error.Unsupported;
    if (!p.eat(':')) return error.Unsupported;
    const s = p.digits(2, 2) orelse return error.Unsupported;
    // The fraction has 1 to 6 digits; the package reads it as microseconds.
    var micro: [6]u8 = "000000".*;
    if (p.eat('.')) {
        const f = p.digits(1, 6) orelse return error.Unsupported;
        @memcpy(micro[0..f.len], f);
    }
    const fields = [_][]const u8{ h, m, s };
    for (fields, out[0..3]) |f, *v| v.* = sign * try digitsValue(f);
    out[3] = sign * (try digitsValue(&micro) / 1000);
}

/// True for a decimal number as the server writes a float: digits, an
/// optional fraction and an optional exponent.
fn isDecimal(token: []const u8) bool {
    var p: Scan = .{ .s = token };
    // A sign changes nothing for the form.
    _ = p.sign();
    if (p.digits(1, 400) == null) return false;
    if (p.eat('.') and p.digits(1, 400) == null) return false;
    if (p.eat('e')) {
        // The sign of the exponent.
        _ = p.sign();
        if (p.digits(1, 4) == null) return false;
    }
    return p.i == token.len;
}

/// A coordinate as `parseFloat` reads it: a decimal number, or `NaN` and
/// the infinities, which are null in JSON.
fn writeCoordinate(o: *Out, token: []const u8) ValueError!void {
    const special = [_][]const u8{ "NaN", "Infinity", "-Infinity" };
    for (special) |s| {
        if (std.mem.eql(u8, token, s)) return o.put("null");
    }
    if (!isDecimal(token)) return error.Unsupported;
    try writeFloat(o, token);
}

/// `{"x":..,"y":..` for the text `x,y`.
fn writeXy(o: *Out, inner: []const u8) ValueError!void {
    const comma = std.mem.indexOfScalar(u8, inner, ',') orelse return error.Unsupported;
    try o.put("{\"x\":");
    try writeCoordinate(o, inner[0..comma]);
    try o.put(",\"y\":");
    try writeCoordinate(o, inner[comma + 1 ..]);
}

/// A point `(x,y)` is `{"x":x,"y":y}`.
fn writePoint(o: *Out, text: []const u8) ValueError!void {
    if (text.len < 2 or text[0] != '(' or text[text.len - 1] != ')') return error.Unsupported;
    try writeXy(o, text[1 .. text.len - 1]);
    try o.byte('}');
}

/// A circle `<(x,y),r>` is `{"x":x,"y":y,"radius":r}`.
fn writeCircle(o: *Out, text: []const u8) ValueError!void {
    if (!std.mem.startsWith(u8, text, "<(") or text[text.len - 1] != '>') return error.Unsupported;
    const close = std.mem.indexOf(u8, text, "),") orelse return error.Unsupported;
    std.debug.assert(close >= 2 and close + 2 < text.len);
    try writeXy(o, text[2..close]);
    try o.put(",\"radius\":");
    try writeCoordinate(o, text[close + 2 .. text.len - 1]);
    try o.byte('}');
}

// ---- arrays ---------------------------------------------------------------------

/// The most dimensions of an array of the server.
const max_dims = 6;

/// The JSON of an array in the text form of the server
/// (`{1,NULL,"a b",{2}}`), as `postgres-array` 2.0.0 reads it: `NULL`
/// without quotes is null, a backslash gives the byte after it, an inner
/// array is an inner JSON array. `elem` says how an element becomes JSON.
/// A text that the server does not write has no native form.
fn writeArray(o: *Out, elem: Class, text: []const u8) ValueError!void {
    var a: ArrayScan = .{ .s = text };
    // The bounds of an array whose first index is not 1: `[0:2]={7,8,9}`.
    if (text.len > 0 and text[0] == '[') a.i = (std.mem.indexOfScalar(u8, text, '=') orelse return error.Unsupported) + 1;
    // Each pass takes one byte or more of the text.
    for (0..text.len + 1) |_| {
        if (a.i >= text.len) break;
        try a.step(o, elem);
        if (a.depth == 0) break;
    }
    if (a.depth != 0 or a.i != text.len or a.state != .after_item) return error.Unsupported;
}

const ArrayScan = struct {
    s: []const u8,
    i: usize = 0,
    depth: usize = 0,
    state: enum(u8) { open, after_item, after_comma } = .open,

    fn step(a: *ArrayScan, o: *Out, elem: Class) ValueError!void {
        const c = a.s[a.i];
        if (a.depth == 0 and c != '{') return error.Unsupported;
        switch (c) {
            '}' => {
                if (a.state == .after_comma) return error.Unsupported;
                try o.byte(']');
                a.depth -= 1;
                a.state = .after_item;
                a.i += 1;
            },
            ',' => {
                if (a.state != .after_item) return error.Unsupported;
                a.state = .after_comma;
                a.i += 1;
            },
            // An inner array begins, or an element.
            else => try a.item(o, elem, c),
        }
    }

    fn item(a: *ArrayScan, o: *Out, elem: Class, c: u8) ValueError!void {
        std.debug.assert(a.i < a.s.len and a.s[a.i] == c and c != ',' and c != '}');
        if (a.state == .after_item) return error.Unsupported;
        if (a.state == .after_comma) try o.byte(',');
        if (c == '{') {
            if (a.depth == max_dims) return error.Unsupported;
            try o.byte('[');
            a.depth += 1;
            a.state = .open;
            a.i += 1;
            return;
        }
        a.state = .after_item;
        if (c == '"') return a.quoted(o, elem);
        const end = std.mem.indexOfAnyPos(u8, a.s, a.i, ",}") orelse return error.Unsupported;
        const raw = a.s[a.i..end];
        a.i = end;
        // The server puts quotes around an element with one of these bytes.
        if (std.mem.indexOfAny(u8, raw, "{\"\\ ") != null) return error.Unsupported;
        if (std.mem.eql(u8, raw, "NULL")) return o.put("null");
        try writeElement(o, elem, raw, false);
    }

    fn quoted(a: *ArrayScan, o: *Out, elem: Class) ValueError!void {
        std.debug.assert(a.s[a.i] == '"');
        var j = a.i + 1;
        var escapes = false;
        while (j < a.s.len and a.s[j] != '"') : (j += 1) {
            if (a.s[j] != '\\') continue;
            escapes = true;
            j += 1;
        }
        if (j >= a.s.len) return error.Unsupported;
        const raw = a.s[a.i + 1 .. j];
        a.i = j + 1;
        try writeElement(o, elem, raw, escapes);
    }
};

/// One element of an array. `escapes`: `raw` has backslashes, each before
/// the byte that it stands for.
fn writeElement(o: *Out, elem: Class, raw: []const u8, escapes: bool) ValueError!void {
    // The server writes a backslash only in a text or a json element.
    if (escapes and elem != .text and elem != .json) return error.Unsupported;
    switch (elem) {
        .text => if (escapes) try elementString(o, raw) else try o.string(raw),
        .json => try elementJson(o, raw),
        .boolean => try o.put(if (isTrue(raw)) "true" else "false"),
        .int => try writeInt(o, raw),
        .float => try writeFloat(o, raw),
        .timestamp => try writeTimestamp(o, raw),
        .interval => try writeInterval(o, raw),
        .point => try writePoint(o, raw),
        // No array type has elements of these classes.
        .int8, .numeric, .bytea, .circle, .unsupported => return error.Unsupported,
        .array_bool, .array_int, .array_float, .array_text, .array_json, .array_timestamp, .array_interval, .array_point => return error.Unsupported,
    }
}

fn elementString(o: *Out, raw: []const u8) error{NoSpace}!void {
    try o.byte('"');
    var i: usize = 0;
    while (i < raw.len) : (i += 1) {
        if (raw[i] == '\\' and i + 1 < raw.len) i += 1;
        try o.escaped(raw[i]);
    }
    try o.byte('"');
}

/// A json element goes into the result as it is, without the backslashes
/// of the array text, after the check of `jsonShape`.
fn elementJson(o: *Out, raw: []const u8) ValueError!void {
    const start = o.len;
    var i: usize = 0;
    while (i < raw.len) : (i += 1) {
        if (raw[i] == '\\' and i + 1 < raw.len) i += 1;
        try o.byte(raw[i]);
    }
    if (!jsonShape(o.buf[start..o.len])) return error.Unsupported;
}

/// True when the first word of a statement is `select` (after white
/// space): the statement can run again in the fallback host.
pub fn startsWithSelect(text: []const u8) bool {
    const t = std.mem.trimStart(u8, text, " \t\r\n");
    if (t.len < 6 or !std.ascii.eqlIgnoreCase(t[0..6], "select")) return false;
    return t.len == 6 or !(std.ascii.isAlphanumeric(t[6]) or t[6] == '_');
}

/// What the commands of a statement text are. The client reads this
/// before it sends the text with the simple query protocol.
pub const TextScan = struct {
    /// A command starts with a word that starts or ends a transaction, or
    /// that needs a transaction block: the text must run as it is.
    transaction: bool = false,
    /// The text has a command, and each command starts with `select`.
    all_select: bool = false,
};

const block_words = [_][]const u8{ "begin", "start", "commit", "end", "rollback", "abort", "savepoint", "release", "prepare", "lock", "declare" };

const TokenKind = enum { space, separator, word, other };
const Token = struct { kind: TokenKind, len: usize };

/// Look at the first word of each command of `text`. Strings, quoted
/// names, dollar quotes and comments are passed over, as the server reads
/// them. `backslash`: a plain string has backslash escapes (the session
/// has `standard_conforming_strings` off). The client also looks at the
/// command tags of the text that ran, so a word that this scan does not
/// see cannot give a wrong marker.
pub fn scanText(text: []const u8, backslash: bool) TextScan {
    var scan: TextScan = .{};
    var commands: u32 = 0;
    var selects: u32 = 0;
    var at_start = true;
    var i: usize = 0;
    // Each token has one byte or more.
    for (0..text.len) |_| {
        if (i >= text.len) break;
        const t = tokenAt(text[i..], backslash);
        std.debug.assert(t.len > 0 and t.len <= text.len - i);
        const first = at_start and (t.kind == .word or t.kind == .other);
        if (t.kind == .separator) at_start = true;
        if (first) {
            at_start = false;
            commands += 1;
            const word = if (t.kind == .word) text[i..][0..t.len] else "";
            if (std.ascii.eqlIgnoreCase(word, "select")) selects += 1;
            scan.transaction = scan.transaction or isBlockWord(word);
        }
        i += t.len;
    }
    scan.all_select = commands > 0 and selects == commands;
    return scan;
}

fn isBlockWord(word: []const u8) bool {
    for (block_words) |w| {
        if (std.ascii.eqlIgnoreCase(word, w)) return true;
    }
    return false;
}

fn isWordByte(c: u8) bool {
    return std.ascii.isAlphanumeric(c) or c == '_' or c >= 0x80;
}

/// The token at the start of `s`, which is not empty.
fn tokenAt(s: []const u8, backslash: bool) Token {
    std.debug.assert(s.len > 0);
    const c = s[0];
    const two = if (s.len > 1) s[1] else 0;
    if (c == ' ' or (c >= 9 and c <= 13)) return .{ .kind = .space, .len = 1 };
    if (c == '-' and two == '-') return .{ .kind = .space, .len = lineCommentLen(s) };
    if (c == '/' and two == '*') return .{ .kind = .space, .len = blockCommentLen(s) };
    if (c == ';') return .{ .kind = .separator, .len = 1 };
    if (c == '\'') return .{ .kind = .other, .len = quotedLen(s, backslash) };
    if (c == '"') return .{ .kind = .other, .len = quotedLen(s, false) };
    if (c == '$') return .{ .kind = .other, .len = dollarQuoteLen(s) orelse 1 };
    if (!isWordByte(c) or std.ascii.isDigit(c)) return .{ .kind = .other, .len = 1 };
    var n: usize = 1;
    while (n < s.len and (isWordByte(s[n]) or s[n] == '$')) n += 1;
    // `E'...'`: a string with backslash escapes.
    const escape_string = n == 1 and (c == 'e' or c == 'E') and two == '\'';
    if (escape_string) return .{ .kind = .other, .len = 1 + quotedLen(s[1..], true) };
    return .{ .kind = .word, .len = n };
}

fn lineCommentLen(s: []const u8) usize {
    const end = std.mem.indexOfScalar(u8, s, '\n') orelse return s.len;
    return end + 1;
}

/// A block comment, with the comments inside it. One without an end takes the rest.
fn blockCommentLen(s: []const u8) usize {
    std.debug.assert(s.len >= 2);
    var depth: usize = 0;
    var i: usize = 0;
    while (i + 1 < s.len) {
        const open_at = s[i] == '/' and s[i + 1] == '*';
        const close_at = s[i] == '*' and s[i + 1] == '/';
        if (open_at) depth += 1;
        if (close_at) depth -= 1;
        i += if (open_at or close_at) 2 else 1;
        if (depth == 0) return i;
    }
    return s.len;
}

/// A string or a quoted name: the quote of `s[0]` twice is one quote
/// inside it. One without an end takes the rest.
fn quotedLen(s: []const u8, backslash: bool) usize {
    std.debug.assert(s.len > 0);
    const q = s[0];
    var i: usize = 1;
    while (i < s.len) {
        const c = s[i];
        const pair = (c == '\\' and backslash) or (c == q and i + 1 < s.len and s[i + 1] == q);
        if (c == q and !pair) return i + 1;
        i += if (pair) 2 else 1;
    }
    return s.len;
}

/// `$tag$ ... $tag$`, or null when `s` does not start a dollar quote
/// (`$1`). One without an end takes the rest.
fn dollarQuoteLen(s: []const u8) ?usize {
    std.debug.assert(s.len > 0 and s[0] == '$');
    var n: usize = 1;
    while (n < s.len and isWordByte(s[n])) n += 1;
    if (n >= s.len or s[n] != '$') return null;
    if (n > 1 and std.ascii.isDigit(s[1])) return null;
    const tag = s[0 .. n + 1];
    const end = std.mem.indexOfPos(u8, s, tag.len, tag) orelse return s.len;
    return end + tag.len;
}

// ---- tests --------------------------------------------------------------------

fn jsonOf(buf: []u8, class: Class, text: []const u8, opt: Options) ValueError![]const u8 {
    var o: Out = .{ .buf = buf };
    try writeValue(&o, class, text, opt);
    return buf[0..o.len];
}

test "pgwire: frontend messages have the bytes of the protocol" {
    var buf: [256]u8 = @splat(0);
    var w: Writer = .{ .buf = &buf };
    try w.sslRequest();
    try std.testing.expectEqualSlices(u8, &.{ 0, 0, 0, 8, 4, 210, 22, 47 }, buf[0..w.len]);
    w.len = 0;
    try w.startup("u", "d");
    try std.testing.expectEqualSlices(u8, "\x00\x00\x00\x30\x00\x03\x00\x00user\x00u\x00database\x00d\x00client_encoding\x00UTF8\x00\x00", buf[0..w.len]);
    w.len = 0;
    try w.parse("s1", "select $1", &.{23});
    try std.testing.expectEqualSlices(u8, "P\x00\x00\x00\x17s1\x00select $1\x00\x00\x01\x00\x00\x00\x17", buf[0..w.len]);
    w.len = 0;
    var b = try w.bindBegin("s1", 2);
    try w.bindParam(&b, "7");
    try w.bindParam(&b, null);
    try w.bindEnd(b);
    try std.testing.expectEqualSlices(u8, "B\x00\x00\x00\x17\x00s1\x00\x00\x00\x00\x02\x00\x00\x00\x017\xff\xff\xff\xff\x00\x00", buf[0..w.len]);
    w.len = 0;
    try w.execute();
    try w.sync();
    try std.testing.expectEqualSlices(u8, "E\x00\x00\x00\x09\x00\x00\x00\x00\x00S\x00\x00\x00\x04", buf[0..w.len]);
}

test "pgwire: a message that does not fit leaves the buffer unchanged" {
    var buf: [24]u8 = @splat(0);
    var w: Writer = .{ .buf = &buf };
    try w.sync();
    try std.testing.expectError(error.NoSpace, w.parse("s1", "select 1 from a_long_table_name", &.{}));
    try std.testing.expectEqual(@as(usize, 5), w.len);
    try std.testing.expectError(error.Malformed, w.query("a\x00b"));
    try std.testing.expectEqual(@as(usize, 5), w.len);
}

test "pgwire: framing waits for a whole message and refuses a large one" {
    const m = "C\x00\x00\x00\x0dSELECT 1\x00Z\x00\x00\x00\x05I";
    try std.testing.expectEqual(@as(?Msg, null), try next(m[0..4], 100));
    try std.testing.expectEqual(@as(?Msg, null), try next(m[0..9], 100));
    const first = (try next(m, 100)).?;
    try std.testing.expectEqual(@as(u8, 'C'), first.tag);
    try std.testing.expectEqual(@as(usize, 14), first.size);
    const tag = try commandTag(first.body);
    try std.testing.expectEqualStrings("SELECT", tag.command);
    try std.testing.expectEqual(@as(?u64, 1), tag.rows);
    try std.testing.expectError(error.TooLarge, next(m, 4));
    try std.testing.expectError(error.Malformed, next("C\x00\x00\x00\x03", 100));
}

test "pgwire: command tags as node-postgres reads them" {
    const insert = try commandTag("INSERT 0 5\x00");
    try std.testing.expectEqualStrings("INSERT", insert.command);
    try std.testing.expectEqual(@as(?u64, 5), insert.rows);
    const create = try commandTag("CREATE TABLE\x00");
    try std.testing.expectEqualStrings("CREATE", create.command);
    try std.testing.expectEqual(@as(?u64, null), create.rows);
    try std.testing.expectError(error.Malformed, commandTag("SELECT 1"));
}

test "pgwire: row description, data row and error fields" {
    const desc = "\x00\x02id\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x17\x00\x04\xff\xff\xff\xff\x00\x00n\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x19\xff\xff\xff\xff\xff\xff\x00\x00";
    var cols = try Columns.init(desc);
    const a = (try cols.next()).?;
    try std.testing.expectEqualStrings("id", a.name);
    try std.testing.expectEqual(@as(u32, 23), a.oid);
    const b = (try cols.next()).?;
    try std.testing.expectEqualStrings("n", b.name);
    try std.testing.expectEqual(@as(u32, 25), b.oid);
    try std.testing.expectEqual(@as(?Column, null), try cols.next());
    var vals = try Values.init("\x00\x02\x00\x00\x00\x017\xff\xff\xff\xff");
    try std.testing.expectEqualStrings("7", (try vals.next()).?.text.?);
    try std.testing.expectEqual(@as(?[]const u8, null), (try vals.next()).?.text);
    try std.testing.expectEqual(@as(?Values.Value, null), try vals.next());
    var bad = try Values.init("\x00\x01\x00\x00\x00\x09ab");
    try std.testing.expectError(error.Malformed, bad.next());
    var f = Fields.init("SERROR\x00C42601\x00Mbad\x00\x00");
    try std.testing.expectEqualStrings("ERROR", (try f.next()).?.text);
    const code = (try f.next()).?;
    try std.testing.expectEqualStrings("code", fieldName(code.code).?);
    try std.testing.expectEqualStrings("bad", (try f.next()).?.text);
    try std.testing.expectEqual(@as(?Fields.Field, null), try f.next());
}

test "pgwire: the md5 answer equals the one of PostgreSQL" {
    var out: [35]u8 = @splat(0);
    // md5(md5("secret" + "bob") + salt), checked with node-postgres `postgresMd5PasswordHash`.
    md5Password("bob", "secret", .{ 1, 2, 3, 4 }, &out);
    try std.testing.expectEqualStrings("md5", out[0..3]);
    var inner: [16]u8 = @splat(0);
    std.crypto.hash.Md5.hash("secretbob", &inner, .{});
    const hex = hexLower(16, inner);
    var again: [16]u8 = @splat(0);
    var h = std.crypto.hash.Md5.init(.{});
    h.update(&hex);
    h.update(&.{ 1, 2, 3, 4 });
    h.final(&again);
    try std.testing.expectEqualStrings(&hexLower(16, again), out[3..]);
}

test "pgwire: SCRAM-SHA-256 gives the proof of RFC 7677" {
    // The example of RFC 7677 section 3, with the user name `*` in place of `user`:
    // the proof below was computed with node-postgres for the same nonce and password.
    var s: Scram = .{};
    var first_buf: [33]u8 = @splat(0);
    const first = s.first(@splat(7), &first_buf);
    try std.testing.expectEqualStrings("n,,n=*,r=BwcHBwcHBwcHBwcHBwcHBwcH", first);
    const server_first = "r=BwcHBwcHBwcHBwcHBwcHBwcHserver,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096";
    var final_buf: [Scram.max_final]u8 = @splat(0);
    const final = try s.final("pencil", server_first, &final_buf);
    try std.testing.expect(std.mem.startsWith(u8, final, "c=biws,r=BwcHBwcHBwcHBwcHBwcHBwcHserver,p="));
    try std.testing.expectEqual(@as(usize, 42 + 44), final.len);
    // The server signature that this client expects verifies; another does not.
    var sig: [44]u8 = @splat(0);
    const enc = std.base64.standard.Encoder.encode(&sig, &s.server_sig);
    var msg: [46]u8 = @splat(0);
    msg[0..2].* = "v=".*;
    @memcpy(msg[2..], enc);
    try s.verify(&msg);
    var t: Scram = .{};
    _ = t.first(@splat(7), &first_buf); // the message is checked above
    try std.testing.expectError(error.TooManyRounds, t.final("pencil", "r=BwcHBwcHBwcHBwcHBwcHBwcHx,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=100001", &final_buf));
    try std.testing.expectError(error.Malformed, t.final("pencil", "r=other,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096", &final_buf));
}

test "pgwire: bind types follow the literal that pg-promise writes" {
    try std.testing.expectEqual(oid_int4, numberOid("2147483647"));
    try std.testing.expectEqual(oid_int8, numberOid("2147483648"));
    try std.testing.expectEqual(oid_int4, numberOid("-2147483648"));
    try std.testing.expectEqual(oid_numeric, numberOid("9223372036854775808"));
    try std.testing.expectEqual(oid_numeric, numberOid("1.5"));
    try std.testing.expectEqual(oid_numeric, numberOid("1e+21"));
}

test "pgwire: column values become the JSON of node-postgres" {
    var jb: [256]u8 = @splat(0);
    try std.testing.expectEqualStrings("true", try jsonOf(&jb, .boolean, "t", .{}));
    try std.testing.expectEqualStrings("false", try jsonOf(&jb, .boolean, "f", .{}));
    try std.testing.expectEqualStrings("-42", try jsonOf(&jb, .int, "-42", .{}));
    try std.testing.expectEqualStrings("\"9007199254740993\"", try jsonOf(&jb, .int8, "9007199254740993", .{}));
    try std.testing.expectEqualStrings("9007199254740992", try jsonOf(&jb, .int8, "9007199254740993", .{ .numbers = true }));
    try std.testing.expectEqualStrings("9223372036854776000", try jsonOf(&jb, .int8, "9223372036854775807", .{ .numbers = true }));
    try std.testing.expectEqualStrings("\"1.50\"", try jsonOf(&jb, .numeric, "1.50", .{}));
    try std.testing.expectEqualStrings("1.5", try jsonOf(&jb, .numeric, "1.50", .{ .numbers = true }));
    try std.testing.expectEqualStrings("null", try jsonOf(&jb, .numeric, "NaN", .{ .numbers = true }));
    try std.testing.expectEqualStrings("null", try jsonOf(&jb, .float, "-Infinity", .{}));
    try std.testing.expectEqualStrings("1e+21", try jsonOf(&jb, .float, "1e+21", .{}));
    try std.testing.expectEqualStrings("{\"a\": [1, \"}\"]}", try jsonOf(&jb, .json, "{\"a\": [1, \"}\"]}", .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .json, "1},{\"x\":2", .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .json, "1,2", .{}));
    try std.testing.expectEqualStrings("{\"type\":\"Buffer\",\"data\":[0,255,16]}", try jsonOf(&jb, .bytea, "\\x00ff10", .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .bytea, "\\x0", .{}));
    // The escape format (`bytea_output = escape`), checked with postgres-bytea 1.0.0.
    try std.testing.expectEqualStrings("{\"type\":\"Buffer\",\"data\":[0,255,92,65,32,126,127,128]}", try jsonOf(&jb, .bytea, "\\000\\377\\\\A ~\\177\\200", .{}));
    try std.testing.expectEqualStrings("{\"type\":\"Buffer\",\"data\":[]}", try jsonOf(&jb, .bytea, "", .{}));
    try std.testing.expectEqualStrings("{\"type\":\"Buffer\",\"data\":[97,98,99]}", try jsonOf(&jb, .bytea, "abc", .{}));
    const bad_bytes = [_][]const u8{ "\\", "\\1", "\\12", "\\128", "\\400", "\\a", "a\x80", "a\nb" };
    for (bad_bytes) |text| try std.testing.expectError(error.Unsupported, jsonOf(&jb, .bytea, text, .{}));
    try std.testing.expectEqualStrings("\"a\\\"b\\\\c\\u000a\"", try jsonOf(&jb, .text, "a\"b\\c\n", .{}));
    try std.testing.expectEqual(Class.unsupported, classOf(1001, .{}));
    try std.testing.expectEqual(Class.unsupported, classOf(1114, .{}));
    try std.testing.expectEqual(Class.timestamp, classOf(1114, .{ .utc = true }));
    try std.testing.expectEqual(Class.unsupported, classOf(1082, .{ .legacy_dates = true }));
    try std.testing.expectEqual(Class.text, classOf(2950, .{}));
}

test "pgwire: timestamps as new Date(text).toISOString()" {
    var jb: [256]u8 = @splat(0);
    // Each pair was checked with Node.js 22.
    try std.testing.expectEqualStrings("\"2024-01-02T03:04:05.123Z\"", try jsonOf(&jb, .timestamp, "2024-01-02 03:04:05.123456+00", .{}));
    try std.testing.expectEqualStrings("\"2024-01-01T21:34:05.000Z\"", try jsonOf(&jb, .timestamp, "2024-01-02 03:04:05+05:30", .{}));
    try std.testing.expectEqualStrings("\"2024-01-02T11:04:05.100Z\"", try jsonOf(&jb, .timestamp, "2024-01-02 03:04:05.1-08", .{}));
    try std.testing.expectEqualStrings("\"2024-01-02T03:04:05.999Z\"", try jsonOf(&jb, .timestamp, "2024-01-02 03:04:05.9999+00", .{}));
    try std.testing.expectEqualStrings("\"1969-12-31T23:59:59.000Z\"", try jsonOf(&jb, .timestamp, "1969-12-31 23:59:59", .{}));
    try std.testing.expectEqualStrings("\"2024-02-29T00:00:00.000Z\"", try jsonOf(&jb, .timestamp, "2024-02-29 00:00:00+00", .{}));
    try std.testing.expectEqualStrings("\"infinity\"", try jsonOf(&jb, .timestamp, "infinity", .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .timestamp, "0099-01-02 03:04:05+00", .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .timestamp, "0044-03-15 12:00:00+00 BC", .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .timestamp, "1883-11-18 12:03:58-07:52:58", .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .timestamp, "12024-01-02 03:04:05+00", .{}));
}

test "pgwire: arrays become the JSON of postgres-array" {
    var jb: [256]u8 = @splat(0);
    // Each pair was checked with pg-promise and the type parsers of the v1 node (version 2.7).
    try std.testing.expectEqualStrings("[1,null,-3]", try jsonOf(&jb, classOf(1007, .{}), "{1,NULL,-3}", .{}));
    try std.testing.expectEqualStrings("[]", try jsonOf(&jb, .array_int, "{}", .{}));
    try std.testing.expectEqualStrings("[[1,2],[3,4]]", try jsonOf(&jb, .array_int, "{{1,2},{3,4}}", .{}));
    try std.testing.expectEqualStrings("[7,8,9]", try jsonOf(&jb, .array_int, "[0:2]={7,8,9}", .{}));
    try std.testing.expectEqualStrings("[[[\"a\",\"b\"]],[[\"c\",null]]]", try jsonOf(&jb, .array_text, "{{{a,b}},{{c,NULL}}}", .{}));
    try std.testing.expectEqualStrings("[true,false,null]", try jsonOf(&jb, classOf(1000, .{}), "{t,f,NULL}", .{}));
    // int8[] stays text and numeric[] is parseFloat, also with `largeNumbers: numbers`.
    try std.testing.expectEqualStrings("[\"9007199254740993\",null,\"-5\"]", try jsonOf(&jb, classOf(1016, .{ .numbers = true }), "{9007199254740993,NULL,-5}", .{ .numbers = true }));
    try std.testing.expectEqualStrings("[1.5,null,null,12345678901234567000]", try jsonOf(&jb, classOf(1231, .{}), "{1.50,NULL,NaN,12345678901234567890.123}", .{}));
    try std.testing.expectEqualStrings("[1.5,null,null,null]", try jsonOf(&jb, classOf(1022, .{}), "{1.5,NaN,Infinity,NULL}", .{}));
    try std.testing.expectEqualStrings("[0,1e+300,1e-300]", try jsonOf(&jb, .array_float, "{-0,1e+300,1e-300}", .{}));
    // Quotes, the text NULL, the empty text and backslashes.
    try std.testing.expectEqualStrings(
        \\["a",null,"NULL","null","","a b","q\"uote","back\\slash","{x}","a,b","line\u000abreak","é"]
    , try jsonOf(&jb, classOf(1009, .{}), "{a,NULL,\"NULL\",\"null\",\"\",\"a b\",\"q\\\"uote\",\"back\\\\slash\",\"{x}\",\"a,b\",\"line\nbreak\",é}", .{}));
    try std.testing.expectEqualStrings("[\"c81d4e2e-bcf2-11e6-869b-7df92533d2db\",null]", try jsonOf(&jb, classOf(2951, .{}), "{c81d4e2e-bcf2-11e6-869b-7df92533d2db,NULL}", .{}));
    try std.testing.expectEqualStrings(
        \\[{"k": [1, "a"]},null,null,1,"s",[1, {"a": "}"}]]
    , try jsonOf(&jb, classOf(3807, .{}), "{\"{\\\"k\\\": [1, \\\"a\\\"]}\",NULL,\"null\",1,\"\\\"s\\\"\",\"[1, {\\\"a\\\": \\\"}\\\"}]\"}", .{}));
    try std.testing.expectEqualStrings("[\"2024-01-02\",null,\"infinity\"]", try jsonOf(&jb, classOf(1182, .{}), "{2024-01-02,NULL,infinity}", .{}));
    try std.testing.expectEqualStrings(
        \\["2024-01-02T03:04:05.123Z",null,"infinity","2024-05-31T18:30:00.000Z"]
    , try jsonOf(&jb, classOf(1185, .{}), "{\"2024-01-02 03:04:05.123456+00\",NULL,infinity,\"2024-06-01 00:00:00+05:30\"}", .{}));
    try std.testing.expectEqualStrings("[\"2024-01-02T03:04:05.900Z\",null]", try jsonOf(&jb, classOf(1115, .{ .utc = true }), "{\"2024-01-02 03:04:05.9\",NULL}", .{}));
    try std.testing.expectEqualStrings("[{\"days\":1,\"hours\":2},null,{}]", try jsonOf(&jb, classOf(1187, .{}), "{\"1 day 02:00:00\",NULL,00:00:00}", .{}));
    try std.testing.expectEqualStrings("[{\"x\":1,\"y\":2},null]", try jsonOf(&jb, classOf(1017, .{}), "{\"(1,2)\",NULL}", .{}));
    // The types without a native form, and the types that node-postgres leaves as text.
    try std.testing.expectEqual(Class.unsupported, classOf(1115, .{}));
    try std.testing.expectEqual(Class.unsupported, classOf(1182, .{ .legacy_dates = true }));
    try std.testing.expectEqual(Class.unsupported, classOf(1185, .{ .legacy_dates = true }));
    try std.testing.expectEqual(Class.text, classOf(719, .{}));
    try std.testing.expectEqual(Class.text, classOf(1003, .{}));
    // A text that the server does not write has no native form.
    const bad = [_][]const u8{ "", "{", "}", "{1,}", "{,1}", "{1}x", "{1}{2}", "1,2", "{a b}", "{\"a}", "{a\\b}", "{{1}", "{1}}", "[0:1]{1,2}", "{{{{{{{1}}}}}}}", "{1 ,2}" };
    for (bad) |text| try std.testing.expectError(error.Unsupported, jsonOf(&jb, .array_text, text, .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .array_int, "{\"1\\2\"}", .{}));
    try std.testing.expectError(error.Unsupported, jsonOf(&jb, .array_json, "{\"1},{\\\"x\\\":2\"}", .{}));
    try std.testing.expectError(error.NoSpace, jsonOf(jb[0..4], .array_int, "{1,2,3}", .{}));
}

test "pgwire: interval, point and circle as node-postgres gives them" {
    var jb: [256]u8 = @splat(0);
    // Each pair was checked with pg-promise (postgres-interval 1.2.0, pg-types 2.2.0).
    const intervals = [_][2][]const u8{
        .{ "1 year 2 mons 3 days 04:05:06.789", "{\"years\":1,\"months\":2,\"days\":3,\"hours\":4,\"minutes\":5,\"seconds\":6,\"milliseconds\":789}" },
        .{ "00:00:00", "{}" },
        .{ "-1 years -2 mons +3 days -04:05:06", "{\"years\":-1,\"months\":-2,\"days\":3,\"hours\":-4,\"minutes\":-5,\"seconds\":-6}" },
        .{ "1 day", "{\"days\":1}" },
        .{ "-00:00:01.5", "{\"seconds\":-1,\"milliseconds\":-500}" },
        .{ "100:00:00.000001", "{\"hours\":100,\"milliseconds\":0.001}" },
        .{ "2 years", "{\"years\":2}" },
        .{ "1 mon", "{\"months\":1}" },
        .{ "00:00:00.123456", "{\"milliseconds\":123.456}" },
        .{ "-3 days", "{\"days\":-3}" },
        .{ "1 year 00:00:01", "{\"years\":1,\"seconds\":1}" },
        .{ "-1 days +02:03:00", "{\"days\":-1,\"hours\":2,\"minutes\":3}" },
        .{ "1 day -00:00:00.000001", "{\"days\":1,\"milliseconds\":-0.001}" },
        .{ "178000000 years", "{\"years\":178000000}" },
        .{ "-2147483647:59:59.999999", "{\"hours\":-2147483647,\"minutes\":-59,\"seconds\":-59,\"milliseconds\":-999.999}" },
        .{ "1 mon -1 days", "{\"months\":1,\"days\":-1}" },
        .{ "00:00:00.1", "{\"milliseconds\":100}" },
        .{ "25:00:00", "{\"hours\":25}" },
        .{ "1 year 1 day 00:00:00.5", "{\"years\":1,\"days\":1,\"milliseconds\":500}" },
    };
    for (intervals) |pair| try std.testing.expectEqualStrings(pair[1], try jsonOf(&jb, classOf(1186, .{}), pair[0], .{}));
    // The other interval styles of the server, and texts that the server does not write.
    const bad = [_][]const u8{ "", "P1Y2M3DT4H5M6.789S", "+1-2 +3 +4:05:06.789", "-1 0:00:00", "@ 1 year 2 mons", "0", "1 day ", "1  day", "1 dayx", "1 day 2 years", "04:05", "04:05:06.", "04:05:06.1234567", "1 year 04:05:06 x", "1 week" };
    for (bad) |text| try std.testing.expectError(error.Unsupported, jsonOf(&jb, .interval, text, .{}));
    try std.testing.expectEqualStrings("{\"hours\":4,\"minutes\":5,\"seconds\":6}", try jsonOf(&jb, .interval, "4:05:06", .{}));

    try std.testing.expectEqualStrings("{\"x\":1.5,\"y\":-2}", try jsonOf(&jb, classOf(600, .{}), "(1.5,-2)", .{}));
    try std.testing.expectEqualStrings("{\"x\":null,\"y\":null}", try jsonOf(&jb, .point, "(NaN,Infinity)", .{}));
    try std.testing.expectEqualStrings("{\"x\":100000000000000000000,\"y\":1e-7}", try jsonOf(&jb, .point, "(1e+20,1e-07)", .{}));
    try std.testing.expectEqualStrings("{\"x\":1,\"y\":2,\"radius\":3}", try jsonOf(&jb, classOf(718, .{}), "<(1,2),3>", .{}));
    try std.testing.expectEqualStrings("{\"x\":1.5,\"y\":-2.5,\"radius\":0}", try jsonOf(&jb, .circle, "<(1.5,-2.5),0>", .{}));
    try std.testing.expectEqualStrings("{\"x\":100000000000000000000,\"y\":-1e-7,\"radius\":null}", try jsonOf(&jb, .circle, "<(1e+20,-1e-07),Infinity>", .{}));
    const bad_shapes = [_][]const u8{ "", "(", "()", "(1)", "(1,2", "1,2", "(1,2,3)", "(a,b)", "(1,.5)", "(1, 2)", "(0x1,2)" };
    for (bad_shapes) |text| try std.testing.expectError(error.Unsupported, jsonOf(&jb, .point, text, .{}));
    const bad_circles = [_][]const u8{ "", "<", "<(", "<(1,2),3", "<(1,2)3>", "<(1,2),>", "(1,2),3", "<(1),3>" };
    for (bad_circles) |text| try std.testing.expectError(error.Unsupported, jsonOf(&jb, .circle, text, .{}));
}

test "pgwire: the first word of a statement" {
    try std.testing.expect(startsWithSelect("  SELECT 1"));
    try std.testing.expect(startsWithSelect("select"));
    try std.testing.expect(!startsWithSelect("selection"));
    try std.testing.expect(!startsWithSelect("with x as (select 1) insert into t select * from x"));
}

test "pgwire: the first word of each command of a simple text" {
    const plain = scanText("insert into t values (1); update t set a = 2", false);
    try std.testing.expect(!plain.transaction and !plain.all_select);
    const selects = scanText(" select 1;\n-- c\nSELECT 'a;b' /* x /* y */ ; */ ;", false);
    try std.testing.expect(!selects.transaction and selects.all_select);
    try std.testing.expect(!scanText("", false).all_select and !scanText(" ; ", false).all_select);
    try std.testing.expect(!scanText("(select 1)", false).all_select);
    const with_tx = [_][]const u8{
        "insert into t values (1); COMMIT; insert into t values (2)",
        "Begin; select 1",
        "select 1;\tend",
        "lock table t",
        "select $1; rollback",
        "select $a$ ; $a$; savepoint s",
        "select 'it''s' ; \"a;\"\"b\" ; start transaction",
        "select E'a\\'; x' ; abort",
        "select 1 /* c */ ; -- d\n declare c cursor for select 1",
    };
    for (with_tx) |text| try std.testing.expect(scanText(text, false).transaction);
    // The word is inside a string, a name, a dollar quote, a comment or a command.
    const without = [_][]const u8{
        "select 'a; commit'",
        "select \"x; commit\" from t",
        "do $body$ begin perform 1; end $body$",
        "select $$ ; commit $$",
        "select 1 -- ; commit",
        "select 1 /* ; commit */",
        "select case when a then 1 else 2 end from t",
        "select e'a\\'; commit '",
        "select 1; committed",
    };
    for (without) |text| try std.testing.expect(!scanText(text, false).transaction);
    // With backslash escapes in plain strings, the string goes on after the escaped quote.
    try std.testing.expect(scanText("select 'a\\'; commit", false).transaction);
    try std.testing.expect(!scanText("select 'a\\'; commit'", true).transaction);
    var buf: [32]u8 = @splat(0);
    var w: Writer = .{ .buf = &buf };
    try w.copyFail("no");
    try std.testing.expectEqualSlices(u8, "f\x00\x00\x00\x07no\x00", buf[0..w.len]);
}
