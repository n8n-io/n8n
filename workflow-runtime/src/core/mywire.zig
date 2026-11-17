//! The MySQL client/server protocol: a pure codec. It frames packets,
//! reads the handshake of the server, builds the login and the query
//! command, computes the answers of `mysql_native_password` and
//! `caching_sha2_password`, reads OK, ERR and EOF packets, column
//! definitions and text rows, and turns a column value into the JSON that
//! mysql2 gives for it (spec section 9.10).
//!
//! Nothing here reads a socket or a clock. The shell (`shell/my.zig`) owns
//! the connections and passes bytes in and out. Every length from the wire
//! is checked against the buffer before use.
const std = @import("std");
const numfmt = @import("numfmt.zig");
const pgwire = @import("pgwire.zig");
const myerr = @import("myerr_tables.zig");
const Sha1 = std.crypto.hash.Sha1;
const Sha256 = std.crypto.hash.sha2.Sha256;

pub const Error = error{ NoSpace, Malformed };
pub const Out = pgwire.Out;

/// The largest payload of one packet: a payload of this size continues in
/// the next packet.
pub const max_packet = 0xFFFFFF;
pub const nonce_bytes = 20;

/// Capability flags (`CLIENT_*`).
pub const cap = struct {
    const long_password: u32 = 0x1;
    const found_rows: u32 = 0x2;
    const long_flag: u32 = 0x4;
    pub const connect_with_db: u32 = 0x8;
    const local_files: u32 = 0x80;
    const ignore_space: u32 = 0x100;
    const protocol_41: u32 = 0x200;
    pub const ssl: u32 = 0x800;
    const transactions: u32 = 0x2000;
    const secure_connection: u32 = 0x8000;
    pub const multi_statements: u32 = 0x10000;
    pub const multi_results: u32 = 0x20000;
    const plugin_auth: u32 = 0x80000;
    pub const plugin_auth_lenenc: u32 = 0x200000;
    pub const session_track: u32 = 0x800000;
};

/// The flags that the client asks for: the flags of mysql2 that change
/// what a statement does or gives (`FOUND_ROWS`, `IGNORE_SPACE`,
/// `MULTI_STATEMENTS`, `SESSION_TRACK`, `LOCAL_FILES`), and those that the
/// codec needs. Without `CLIENT_DEPRECATE_EOF`, as mysql2.
pub const client_caps: u32 = cap.long_password | cap.found_rows | cap.long_flag | cap.local_files | cap.ignore_space |
    cap.protocol_41 | cap.transactions | cap.secure_connection | cap.multi_statements | cap.multi_results |
    cap.plugin_auth | cap.plugin_auth_lenenc | cap.session_track;

/// The flags that the server must have.
pub const needed_caps: u32 = cap.protocol_41 | cap.secure_connection | cap.plugin_auth;

/// Server status flags.
pub const status = struct {
    pub const in_trans: u16 = 0x1;
    pub const more_results: u16 = 0x8;
    pub const no_backslash: u16 = 0x200;
};

/// `utf8mb4_unicode_ci`, the character set of a mysql2 connection.
pub const charset_utf8mb4: u8 = 224;
const charset_binary: u16 = 63;

// ---- client packets -----------------------------------------------------------

/// A bounded buffer of client packets. A packet that does not fit leaves
/// the buffer as it was before the packet.
pub const Writer = struct {
    buf: []u8,
    len: usize = 0,

    fn bytes(w: *Writer, s: []const u8) Error!void {
        if (s.len > w.buf.len - w.len) return error.NoSpace;
        @memcpy(w.buf[w.len..][0..s.len], s);
        w.len += s.len;
    }

    fn header(w: *Writer, size: usize, seq: u8) Error!void {
        const n = std.math.cast(u24, size) orelse return error.NoSpace;
        var head: [4]u8 = @splat(seq);
        std.mem.writeInt(u24, head[0..3], n, .little);
        try w.bytes(&head);
    }

    /// One packet with a payload below `max_packet`.
    pub fn packet(w: *Writer, seq: u8, parts: []const []const u8) Error!void {
        const start = w.len;
        var size: usize = 0;
        for (parts) |p| size += p.len;
        if (size >= max_packet) return error.NoSpace;
        w.header(size, seq) catch |e| return w.undo(start, e);
        for (parts) |p| w.bytes(p) catch |e| return w.undo(start, e);
    }

    fn undo(w: *Writer, start: usize, e: Error) Error {
        std.debug.assert(start <= w.len);
        w.len = start;
        return e;
    }

    fn loginHead(caps: u32) [32]u8 {
        var head: [32]u8 = @splat(0);
        std.mem.writeInt(u32, head[0..4], caps, .little);
        // mysql2 sends 0 as the largest packet.
        head[8] = charset_utf8mb4;
        return head;
    }

    /// The SSL request: the start of the login, before the TLS handshake.
    pub fn sslRequest(w: *Writer, seq: u8, caps: u32) Error!void {
        std.debug.assert(caps & cap.ssl != 0);
        const head = loginHead(caps);
        try w.packet(seq, &.{&head});
    }

    /// The handshake response (protocol 4.1). A zero byte inside a name
    /// would end it early on the server: it is refused.
    pub fn login(w: *Writer, seq: u8, caps: u32, user: []const u8, auth: []const u8, db: []const u8, plugin: []const u8) Error!void {
        std.debug.assert(caps & cap.protocol_41 != 0 and caps & cap.plugin_auth_lenenc != 0);
        std.debug.assert((caps & cap.connect_with_db != 0) == (db.len > 0));
        const names = [_][]const u8{ user, db, plugin };
        for (names) |n| {
            if (std.mem.indexOfScalar(u8, n, 0) != null) return error.Malformed;
        }
        const alen = [_]u8{std.math.cast(u8, auth.len) orelse return error.Malformed};
        if (alen[0] > 250) return error.Malformed;
        const head = loginHead(caps);
        const zero = [_]u8{0};
        const db_end: []const u8 = if (db.len > 0) &zero else "";
        try w.packet(seq, &.{ &head, user, &zero, &alen, auth, db, db_end, plugin, &zero });
    }

    /// `COM_QUERY` with `text`. A payload of `max_packet` bytes or more
    /// goes in several packets.
    pub fn query(w: *Writer, text: []const u8) Error!void {
        try w.command(0x03, text, max_packet);
    }

    /// A command byte and its text, in packets of `chunk` bytes at most.
    fn command(w: *Writer, code: u8, text: []const u8, chunk: usize) Error!void {
        std.debug.assert(chunk > 0 and chunk <= max_packet);
        const start = w.len;
        const total = text.len + 1;
        if (total + 4 * (total / chunk + 1) > w.buf.len - w.len) return error.NoSpace;
        var sent: usize = 0;
        var seq: u8 = 0;
        // Each pass writes one packet; the last one is shorter than `chunk`.
        for (0..total / chunk + 1) |_| {
            const n = @min(total - sent, chunk);
            w.header(n, seq) catch |e| return w.undo(start, e);
            const from = if (sent == 0) 0 else sent - 1;
            if (sent == 0) w.bytes(&.{code}) catch |e| return w.undo(start, e);
            const take = if (sent == 0) n - 1 else n;
            w.bytes(text[from..][0..take]) catch |e| return w.undo(start, e);
            sent += n;
            seq +%= 1;
        }
        std.debug.assert(sent == total);
    }

    /// `COM_QUIT`.
    pub fn quit(w: *Writer) Error!void {
        try w.packet(0, &.{&.{0x01}});
    }
};

// ---- server packets -----------------------------------------------------------

pub const Packet = struct {
    seq: u8,
    body: []const u8,
    /// The bytes of the packet in the buffer, with its header.
    size: usize,
    /// The payload has `max_packet` bytes: the next packet continues it.
    more: bool,
};

pub const NextError = error{TooLarge};

/// The packet at the start of `buf`, or null when the buffer holds only a
/// part of it. A payload over `max_body` is refused before it is buffered.
pub fn next(buf: []const u8, max_body: usize) NextError!?Packet {
    if (buf.len < 4) return null;
    const len: usize = std.mem.readInt(u24, buf[0..3], .little);
    if (len > max_body) return error.TooLarge;
    if (buf.len - 4 < len) return null;
    return .{ .seq = buf[3], .body = buf[4..][0..len], .size = len + 4, .more = len == max_packet };
}

/// A reader of one packet body. Integers are little-endian.
pub const Reader = struct {
    s: []const u8,
    i: usize = 0,

    pub fn left(r: *const Reader) usize {
        return r.s.len - r.i;
    }

    pub fn take(r: *Reader, n: usize) Error![]const u8 {
        if (r.s.len - r.i < n) return error.Malformed;
        defer r.i += n;
        return r.s[r.i..][0..n];
    }

    pub fn int(r: *Reader, comptime T: type) Error!T {
        const size = @divExact(@typeInfo(T).int.bits, 8);
        const raw = try r.take(size);
        return std.mem.readInt(T, raw[0..size], .little);
    }

    /// A length-encoded integer. `0xFB` (the NULL of a row) and `0xFF` are no integer.
    pub fn lenenc(r: *Reader) Error!u64 {
        const first = try r.int(u8);
        return switch (first) {
            0xFC => try r.int(u16),
            0xFD => try r.int(u24),
            0xFE => try r.int(u64),
            0xFB, 0xFF => error.Malformed,
            // Every other byte is the value.
            else => first,
        };
    }

    pub fn lenencStr(r: *Reader) Error![]const u8 {
        const n = std.math.cast(usize, try r.lenenc()) orelse return error.Malformed;
        return r.take(n);
    }

    pub fn cstr(r: *Reader) Error![]const u8 {
        const end = std.mem.indexOfScalarPos(u8, r.s, r.i, 0) orelse return error.Malformed;
        defer r.i = end + 1;
        return r.s[r.i..end];
    }

    pub fn rest(r: *Reader) []const u8 {
        defer r.i = r.s.len;
        return r.s[r.i..];
    }
};

pub const Err = struct {
    code: u16,
    /// The SQLSTATE: five bytes, or empty.
    state: []const u8,
    message: []const u8,
};

/// An ERR packet (protocol 4.1).
pub fn errPacket(body: []const u8) Error!Err {
    var r: Reader = .{ .s = body };
    if (try r.int(u8) != 0xFF) return error.Malformed;
    const code = try r.int(u16);
    var state: []const u8 = "";
    if (r.left() >= 6 and r.s[r.i] == '#') {
        r.i += 1;
        state = try r.take(5);
    }
    return .{ .code = code, .state = state, .message = r.rest() };
}

/// The name that mysql2 gives an error number (`ER_DUP_ENTRY`), or null.
fn errorName(code: u16) ?[]const u8 {
    var lo: usize = 0;
    var hi: usize = myerr.codes.len;
    // A binary search: each pass halves the range.
    for (0..16) |_| {
        if (lo >= hi) break;
        const mid = lo + (hi - lo) / 2;
        if (myerr.codes[mid] == code) return myerr.names[mid];
        if (myerr.codes[mid] < code) lo = mid + 1 else hi = mid;
    }
    return null;
}

pub const Ok = struct {
    affected: u64,
    insert_id: u64,
    /// The insert id came in the 8-byte form: mysql2 reads it as a signed number.
    insert_wide: bool,
    status: u16,
    warnings: u16,
    info: []const u8,
};

/// An OK packet. `session_track`: the session has `CLIENT_SESSION_TRACK`,
/// so the text is a length-encoded string before the state changes.
pub fn okPacket(body: []const u8, session_track: bool) Error!Ok {
    var r: Reader = .{ .s = body };
    if (try r.int(u8) != 0x00) return error.Malformed;
    const affected = try r.lenenc();
    const wide = r.left() > 0 and r.s[r.i] == 0xFE;
    const insert_id = try r.lenenc();
    const st = try r.int(u16);
    const warnings = try r.int(u16);
    const info = if (session_track and r.left() > 0) try r.lenencStr() else r.rest();
    return .{ .affected = affected, .insert_id = insert_id, .insert_wide = wide, .status = st, .warnings = warnings, .info = info };
}

pub const Handshake = struct {
    version: []const u8,
    thread_id: u32,
    caps: u32,
    status: u16,
    nonce: [nonce_bytes]u8,
    plugin: []const u8,
};

/// The first packet of the server: protocol version 10.
pub fn handshake(body: []const u8) Error!Handshake {
    var r: Reader = .{ .s = body };
    if (try r.int(u8) != 10) return error.Malformed;
    var h: Handshake = .{ .version = try r.cstr(), .thread_id = try r.int(u32), .caps = 0, .status = 0, .nonce = @splat(0), .plugin = "" };
    @memcpy(h.nonce[0..8], try r.take(8));
    // The filler, the low flags, the character set.
    r.i += @intFromBool(r.left() > 0);
    h.caps = try r.int(u16);
    r.i += @intFromBool(r.left() > 0);
    h.status = try r.int(u16);
    h.caps |= @as(u32, try r.int(u16)) << 16;
    const auth_len = try r.int(u8);
    const reserved = try r.take(10);
    std.debug.assert(reserved.len == 10);
    if (h.caps & needed_caps != needed_caps) return error.Malformed;
    const part2 = try r.take(@max(13, @as(usize, auth_len) -| 8));
    @memcpy(h.nonce[8..], part2[0..12]);
    h.plugin = r.cstr() catch r.rest(); // MySQL 5.5 sends the name without a zero byte
    return h;
}

/// What the server answers during the login.
pub const Reply = union(enum) {
    ok: Ok,
    err: Err,
    /// The server asks for another login method, with a new nonce.
    switch_plugin: struct { plugin: []const u8, nonce: [nonce_bytes]u8 },
    /// Data of the login method in use.
    more: []const u8,
};

pub fn loginReply(body: []const u8, session_track: bool) Error!Reply {
    if (body.len == 0) return error.Malformed;
    switch (body[0]) {
        0x00 => return .{ .ok = try okPacket(body, session_track) },
        0xFF => return .{ .err = try errPacket(body) },
        0x01 => return .{ .more = body[1..] },
        0xFE => {
            var r: Reader = .{ .s = body[1..] };
            const plugin = try r.cstr();
            const data = r.rest();
            // A method without a nonce is not one of the two that the client has.
            var nonce: [nonce_bytes]u8 = @splat(0);
            if (data.len >= nonce_bytes) nonce = data[0..nonce_bytes].*;
            return .{ .switch_plugin = .{ .plugin = plugin, .nonce = nonce } };
        },
        // No other packet belongs to a login.
        else => return error.Malformed,
    }
}

// ---- login methods ---------------------------------------------------------------

pub const Plugin = enum(u8) { native, caching_sha2, other };

pub const native_name = "mysql_native_password";
pub const caching_name = "caching_sha2_password";

pub fn pluginOf(name: []const u8) Plugin {
    if (std.mem.eql(u8, name, native_name)) return .native;
    if (std.mem.eql(u8, name, caching_name)) return .caching_sha2;
    return .other;
}

/// The answer of a login method to the nonce of the server. An empty
/// password gives an empty answer. `out` holds the answer.
pub fn scramble(plugin: Plugin, pass: []const u8, nonce: [nonce_bytes]u8, out: *[32]u8) []const u8 {
    std.debug.assert(plugin != .other);
    if (pass.len == 0) return out[0..0];
    if (plugin == .native) {
        // SHA1(pass) XOR SHA1(nonce ++ SHA1(SHA1(pass)))
        var one: [20]u8 = @splat(0);
        var two: [20]u8 = @splat(0);
        var mix: [20]u8 = @splat(0);
        Sha1.hash(pass, &one, .{});
        Sha1.hash(&one, &two, .{});
        var h = Sha1.init(.{});
        h.update(&nonce);
        h.update(&two);
        h.final(&mix);
        for (out[0..20], one, mix) |*o, a, b| o.* = a ^ b;
        return out[0..20];
    }
    // SHA256(pass) XOR SHA256(SHA256(SHA256(pass)) ++ nonce)
    var one: [32]u8 = @splat(0);
    var two: [32]u8 = @splat(0);
    var mix: [32]u8 = @splat(0);
    Sha256.hash(pass, &one, .{});
    Sha256.hash(&one, &two, .{});
    var h = Sha256.init(.{});
    h.update(&two);
    h.update(&nonce);
    h.final(&mix);
    for (out, one, mix) |*o, a, b| o.* = a ^ b;
    return out[0..32];
}

/// The password with its zero byte, XOR the nonce: the text that the full
/// login of `caching_sha2_password` encrypts with the RSA key of the
/// server. `out` must hold `pass.len + 1` bytes.
pub fn maskPassword(pass: []const u8, nonce: [nonce_bytes]u8, out: []u8) []const u8 {
    std.debug.assert(out.len > pass.len);
    @memcpy(out[0..pass.len], pass);
    out[pass.len] = 0;
    for (out[0 .. pass.len + 1], 0..) |*b, i| b.* ^= nonce[i % nonce_bytes];
    return out[0 .. pass.len + 1];
}

// ---- results ------------------------------------------------------------------

/// The first packet of the answer to a statement.
pub const Head = union(enum) {
    ok: Ok,
    err: Err,
    /// A result set with this many columns follows.
    columns: u32,
    /// `LOAD DATA LOCAL INFILE`: the server asks for the file with this name.
    infile: []const u8,
};

pub fn resultHead(body: []const u8, session_track: bool) Error!Head {
    if (body.len == 0) return error.Malformed;
    switch (body[0]) {
        0x00 => return .{ .ok = try okPacket(body, session_track) },
        0xFF => return .{ .err = try errPacket(body) },
        0xFB => return .{ .infile = body[1..] },
        // A length-encoded count of columns.
        else => {},
    }
    var r: Reader = .{ .s = body };
    const n = std.math.cast(u32, try r.lenenc()) orelse return error.Malformed;
    if (n == 0 or r.left() != 0) return error.Malformed;
    return .{ .columns = n };
}

pub const Column = struct {
    name: []const u8,
    charset: u16,
    type: u8,
};

/// A column definition (protocol 4.1).
pub fn column(body: []const u8) Error!Column {
    var r: Reader = .{ .s = body };
    // catalog, schema, table, original table
    for (0..4) |_| {
        const part = try r.lenencStr();
        std.debug.assert(part.len <= body.len);
    }
    const name = try r.lenencStr();
    const org_name = try r.lenencStr();
    std.debug.assert(org_name.len <= body.len);
    if (try r.lenenc() < 0x0c) return error.Malformed;
    const charset = try r.int(u16);
    const length = try r.int(u32);
    std.debug.assert(length <= std.math.maxInt(u32));
    return .{ .name = name, .charset = charset, .type = try r.int(u8) };
}

/// True for the EOF packet that ends the columns or the rows of a result
/// set. A row that starts with `0xFE` has a value of 16 MB or more, so its
/// packet is full.
pub fn isEof(p: Packet) bool {
    return p.body.len > 0 and p.body.len < 9 and p.body[0] == 0xFE and !p.more;
}

/// The status flags of an EOF packet.
pub fn eofStatus(body: []const u8) Error!u16 {
    var r: Reader = .{ .s = body };
    if (try r.int(u8) != 0xFE) return error.Malformed;
    const warnings = try r.int(u16);
    std.debug.assert(warnings <= std.math.maxInt(u16));
    return r.int(u16);
}

/// The values of one text row.
pub const Values = struct {
    r: Reader,

    pub const Value = struct { text: ?[]const u8 };

    pub fn init(body: []const u8) Values {
        return .{ .r = .{ .s = body } };
    }

    /// The next value, or null at the end of the row. Each call takes at
    /// least one byte, so the body length bounds the loop of the caller.
    pub fn next(v: *Values) Error!?Value {
        if (v.r.left() == 0) return null;
        if (v.r.s[v.r.i] == 0xFB) {
            v.r.i += 1;
            return .{ .text = null };
        }
        return .{ .text = try v.r.lenencStr() };
    }
};

// ---- OK and ERR packets as JSON ---------------------------------------------------

const max_safe: u64 = (1 << 53) - 1;

fn putInt(o: *Out, neg: bool, v: u64) error{NoSpace}!void {
    const digits = "0123456789";
    var buf: [20]u8 = @splat('0');
    var i: usize = buf.len;
    var x = v;
    while (x > 0) : (x /= 10) {
        i -= 1;
        buf[i] = digits[x % 10];
    }
    if (neg and v != 0) try o.byte('-');
    try o.put(buf[@min(i, buf.len - 1)..]);
}

/// A number when it is a safe integer, else its decimal text
/// (`readLengthCodedNumberExt` of mysql2).
fn putCount(o: *Out, neg: bool, v: u64, as_text: bool) error{NoSpace}!void {
    const text = as_text or v > max_safe;
    if (text) try o.byte('"');
    try putInt(o, neg, v);
    if (text) try o.byte('"');
}

/// The set of an OK packet:
/// `{"command":"OK","rowCount":n,"rows":[],"ok":{...}}`. `big_strings`:
/// `bigNumberStrings` of mysql2.
pub fn writeOk(o: *Out, ok: Ok, big_strings: bool) error{NoSpace}!void {
    std.debug.assert(o.len <= o.buf.len);
    try o.put("{\"command\":\"OK\",\"rowCount\":");
    try putCount(o, false, ok.affected, false);
    try o.put(",\"rows\":[],\"ok\":{\"affectedRows\":");
    try putCount(o, false, ok.affected, false);
    try o.put(",\"insertId\":");
    const signed: i64 = @bitCast(ok.insert_id);
    const neg = ok.insert_wide and signed < 0;
    // With `bigNumberStrings`, the 8-byte form with a high word of 2^21 or more is text.
    const as_text = ok.insert_wide and big_strings and (ok.insert_id >> 32) >= 2097152;
    try putCount(o, neg, if (neg) @abs(signed) else ok.insert_id, as_text);
    try o.put(",\"info\":");
    try o.string(ok.info);
    try o.put(",\"serverStatus\":");
    try putInt(o, false, ok.status);
    try o.put(",\"warningStatus\":");
    try putInt(o, false, ok.warnings);
    try o.put("}}");
}

/// The fields of an ERR packet as mysql2 names them:
/// `{"message":...,"code":"ER_...","errno":n,"sqlState":...,"sqlMessage":...}`.
pub fn writeErr(o: *Out, e: Err) error{NoSpace}!void {
    std.debug.assert(e.state.len == 0 or e.state.len == 5);
    try o.put("{\"message\":");
    try o.string(e.message);
    if (errorName(e.code)) |name| {
        try o.put(",\"code\":");
        try o.string(name);
    }
    try o.put(",\"errno\":");
    try putInt(o, false, e.code);
    try o.put(",\"sqlState\":");
    try o.string(e.state);
    try o.put(",\"sqlMessage\":");
    try o.string(e.message);
    try o.byte('}');
}

// ---- column values as JSON ----------------------------------------------------

pub const Options = struct {
    /// `largeNumbers: text` (`bigNumberStrings` of mysql2): a BIGINT is
    /// always a string.
    big_strings: bool = false,
    /// `decimals: numbers` (`decimalNumbers` of mysql2).
    decimal_numbers: bool = false,
    /// `dates: text` (`dateStrings` of mysql2): DATE, DATETIME and
    /// TIMESTAMP are the text of the server. Without it they are `Date`
    /// objects in the zone of the process, which have no native form.
    date_strings: bool = true,
};

pub const Class = enum(u8) {
    /// TINY, SHORT, LONG, INT24, YEAR.
    int,
    /// LONGLONG.
    big,
    /// FLOAT, DOUBLE, and DECIMAL with `decimal_numbers`.
    float,
    /// A text that the server wrote in ASCII.
    ascii,
    /// A string in UTF-8.
    text,
    /// A value in the binary character set: a `Buffer`.
    buffer,
    json,
    /// A column of the type NULL: each value is NULL.
    null_only,
    unsupported,
};

const type_decimal = 0;
const type_tiny = 1;
const type_short = 2;
const type_long = 3;
const type_float = 4;
const type_double = 5;
const type_null = 6;
const type_timestamp = 7;
const type_longlong = 8;
const type_int24 = 9;
const type_date = 10;
const type_time = 11;
const type_datetime = 12;
const type_year = 13;
const type_varchar = 15;
const type_bit = 16;
const type_json = 245;
const type_newdecimal = 246;
const type_enum = 247;
const type_string = 254;
const type_geometry = 255;

/// True for the collations of `utf8mb3`, `utf8mb4` and `ascii` of MySQL
/// 8: the bytes of a string are UTF-8. Another character set gives the
/// marker, because the client asked for `utf8mb4` and does not decode
/// other sets.
fn isUtf8(charset: u16) bool {
    return switch (charset) {
        11, 65, 33, 45, 46, 83, 76, 192...215, 223, 224...247, 255...323 => true,
        // Every other collation is of another character set.
        else => false,
    };
}

/// How mysql2 reads a column in the text protocol (`readCodeFor`).
pub fn classOf(col: Column, opt: Options) Class {
    return switch (col.type) {
        type_tiny, type_short, type_long, type_int24, type_year => .int,
        type_longlong => .big,
        type_float, type_double => .float,
        type_null => .null_only,
        type_decimal, type_newdecimal => if (opt.decimal_numbers) .float else .ascii,
        type_date, type_datetime, type_timestamp => if (opt.date_strings) .ascii else .unsupported,
        type_time => .ascii,
        type_json => .json,
        // VARCHAR, BIT, ENUM, SET, the blobs and the strings: the character set decides.
        type_varchar, type_bit, type_enum...type_string => if (col.charset == charset_binary) .buffer else if (isUtf8(col.charset)) .text else .unsupported,
        // GEOMETRY, VECTOR and each type that the client does not know.
        else => .unsupported,
    };
}

pub const ValueError = error{ NoSpace, Unsupported };

/// Write the JSON of one value that is not NULL.
pub fn writeValue(o: *Out, class: Class, text: []const u8, opt: Options) ValueError!void {
    std.debug.assert(o.len <= o.buf.len);
    switch (class) {
        .int => try writeInt(o, text),
        .big => try writeBig(o, text, opt.big_strings),
        .float => try writeFloat(o, text),
        .ascii => {
            for (text) |c| {
                if (c >= 0x80) return error.Unsupported;
            }
            try o.string(text);
        },
        .text => {
            if (!std.unicode.utf8ValidateSlice(text)) return error.Unsupported;
            try o.string(text);
        },
        .buffer => try writeBuffer(o, text),
        .json => try writeJson(o, text),
        .null_only, .unsupported => return error.Unsupported,
    }
}

const Digits = struct { neg: bool, value: u64, count: usize };

/// An optional `-`, then digits that fit 64 bits; or null.
fn digitsOf(text: []const u8, plus: bool) ?Digits {
    var s = text;
    const neg = s.len > 0 and s[0] == '-';
    if (neg) s = s[1..];
    if (plus and s.len > 0 and s[0] == '+') s = s[1..];
    var v: u64 = 0;
    for (s) |c| {
        if (c < '0' or c > '9') return null;
        // More than 64 bits is no value.
        v = std.math.mul(u64, v, 10) catch return null;
        v = std.math.add(u64, v, c - '0') catch return null;
    }
    return .{ .neg = neg, .value = v, .count = s.len };
}

/// `parseIntNoBigCheck` of mysql2: the digits as a number.
fn writeInt(o: *Out, text: []const u8) ValueError!void {
    const d = digitsOf(text, true) orelse return error.Unsupported;
    // JavaScript would round a value over 2^53.
    if (d.value > max_safe) return error.Unsupported;
    try putInt(o, d.neg, d.value);
}

/// `parseInt(len, supportBigNumbers = true)` of mysql2: a number while it
/// is a safe integer, else the text.
fn writeBig(o: *Out, text: []const u8, strings: bool) ValueError!void {
    for (text) |c| {
        if (c != '-' and (c < '0' or c > '9')) return error.Unsupported;
    }
    if (strings) return o.string(text);
    // More than 64 bits: the text.
    const d = digitsOf(text, false) orelse return o.string(text);
    if (d.count == 0) return if (text.len == 0) o.byte('0') else error.Unsupported;
    if (d.value > max_safe) return o.string(text);
    try putInt(o, d.neg, d.value);
}

/// `parseFloat(len)` of mysql2. A short text without an exponent is read
/// digit by digit, with the rounding of that loop; another text goes
/// through `Number.parseFloat`.
fn writeFloat(o: *Out, text: []const u8) ValueError!void {
    const long = text.len > 17 or std.mem.indexOfAny(u8, text, "eE") != null;
    const f = if (long) numfmt.parseFloatPrefix(text) else try shortFloat(text);
    if (std.math.isNan(f) or std.math.isInf(f)) return o.put("null");
    if (f == 0) return o.byte('0');
    var buf: [numfmt.max_len]u8 = @splat(0);
    try o.put(numfmt.format(&buf, f));
}

fn shortFloat(text: []const u8) error{Unsupported}!f64 {
    std.debug.assert(text.len <= 17);
    var s = text;
    var f: f64 = 0;
    var factor: f64 = 1;
    if (s.len > 0 and s[0] == '-') {
        factor = -1;
        s = s[1..];
    }
    if (s.len > 0 and s[0] == '+') s = s[1..];
    var past_dot = false;
    for (s) |c| {
        if (c == '.') {
            past_dot = true;
            continue;
        }
        if (c < '0' or c > '9') return error.Unsupported;
        f = f * 10 + @as(f64, @floatFromInt(c - '0'));
        if (past_dot) factor *= 10;
    }
    return f / factor;
}

/// The JSON of a `Buffer`: `{"type":"Buffer","data":[...]}`.
fn writeBuffer(o: *Out, raw: []const u8) ValueError!void {
    try o.put("{\"type\":\"Buffer\",\"data\":[");
    for (raw, 0..) |b, i| {
        if (i > 0) try o.byte(',');
        try putInt(o, false, b);
    }
    try o.put("]}");
}

/// A JSON column, as `JSON.stringify(JSON.parse(text))` with the rule of
/// mysql2 for large numbers: no space outside a string; an integer that
/// is not a safe integer becomes its text; another number is written as
/// JavaScript writes the double. The keys keep the order of the server.
fn writeJson(o: *Out, text: []const u8) ValueError!void {
    std.debug.assert(o.len <= o.buf.len);
    var depth: usize = 0;
    var i: usize = 0;
    const start = o.len;
    // Each pass takes one byte or more.
    for (0..text.len) |_| {
        if (i >= text.len) break;
        const c = text[i];
        var n: usize = 1;
        switch (c) {
            '"' => n = (stringEnd(text, i) orelse return error.Unsupported) - i,
            '{', '[' => depth += 1,
            '}', ']' => depth = std.math.sub(usize, depth, 1) catch return error.Unsupported,
            ' ', '\t', '\n', '\r' => {
                i += 1;
                continue;
            },
            ',', ':' => {},
            '-', '0'...'9' => {
                i += try jsonNumber(o, text[i..]);
                continue;
            },
            't', 'f', 'n' => n = literalLen(text[i..]) orelse return error.Unsupported,
            // No other byte starts a JSON token.
            else => return error.Unsupported,
        }
        try o.put(text[i..][0..n]);
        i += n;
    }
    if (depth != 0 or o.len == start) return error.Unsupported;
}

fn literalLen(s: []const u8) ?usize {
    const words = [_][]const u8{ "true", "false", "null" };
    for (words) |w| {
        if (std.mem.startsWith(u8, s, w)) return w.len;
    }
    return null;
}

/// Write the number at the start of `s`; the answer is its length.
fn jsonNumber(o: *Out, s: []const u8) ValueError!usize {
    var n: usize = 0;
    var whole = true;
    while (n < s.len and std.mem.indexOfScalar(u8, "+-.eE0123456789", s[n]) != null) : (n += 1) {
        if (s[n] == '.' or s[n] == 'e' or s[n] == 'E') whole = false;
    }
    std.debug.assert(n > 0);
    const num = s[0..n];
    if (whole) {
        // More than 64 bits: the text, as for each integer that is not safe.
        const d = digitsOf(num, false) orelse return jsonBig(o, num);
        if (d.count == 0) return error.Unsupported;
        if (d.value > max_safe) return jsonBig(o, num);
        try putInt(o, d.neg, d.value);
        return n;
    }
    const f = numfmt.parse(num);
    if (std.math.isNan(f) or std.math.isInf(f)) return error.Unsupported;
    if (f == 0) {
        try o.byte('0');
        return n;
    }
    var buf: [numfmt.max_len]u8 = @splat(0);
    try o.put(numfmt.format(&buf, f));
    return n;
}

fn jsonBig(o: *Out, num: []const u8) ValueError!usize {
    for (num[1..]) |c| {
        if (c < '0' or c > '9') return error.Unsupported;
    }
    try o.string(num);
    return num.len;
}

/// The offset after the JSON string that starts at `at`, or null. The
/// string must be valid UTF-8, without a control byte, and each escape
/// must be one that JavaScript writes in the same form.
fn stringEnd(text: []const u8, at: usize) ?usize {
    std.debug.assert(text[at] == '"');
    var i = at + 1;
    while (i < text.len) : (i += 1) {
        const c = text[i];
        if (c < 0x20) return null;
        if (c == '\\') {
            if (i + 1 >= text.len or std.mem.indexOfScalar(u8, "\"\\nrtbf", text[i + 1]) == null) return null;
            i += 1;
            continue;
        }
        if (c == '"') return if (std.unicode.utf8ValidateSlice(text[at..i])) i + 1 else null;
    }
    return null;
}

// ---- the commands of a statement text ---------------------------------------------

const read_words = [_][]const u8{ "select", "show", "describe", "desc", "explain" };

const TokenKind = enum { space, separator, word, other, unknown };
const Token = struct { kind: TokenKind, len: usize };

/// True when the text has a command and each command starts with
/// `SELECT`, `SHOW`, `DESCRIBE`, `DESC` or `EXPLAIN`: a result set of the
/// text changed nothing. Strings, quoted names and comments are passed
/// over. `backslash`: a backslash in a string takes the next byte (the
/// session has no `NO_BACKSLASH_ESCAPES`).
pub fn onlyReads(text: []const u8, backslash: bool) bool {
    var commands: u32 = 0;
    var reads: u32 = 0;
    var at_start = true;
    var i: usize = 0;
    // Each token has one byte or more.
    for (0..text.len) |_| {
        if (i >= text.len) break;
        const t = tokenAt(text[i..], backslash);
        std.debug.assert(t.len > 0 and t.len <= text.len - i);
        const word = text[i..][0..t.len];
        i += t.len;
        switch (t.kind) {
            .space => {},
            .separator => at_start = true,
            // A comment with code for the server (`/*! ... */`), or a string without an end.
            .unknown => return false,
            .word, .other => {
                if (!at_start) continue;
                at_start = false;
                commands += 1;
                if (t.kind == .word and isReadWord(word)) reads += 1;
            },
        }
    }
    return commands > 0 and reads == commands;
}

fn isReadWord(w: []const u8) bool {
    for (read_words) |x| {
        if (std.ascii.eqlIgnoreCase(x, w)) return true;
    }
    return false;
}

fn isWordByte(c: u8) bool {
    return std.ascii.isAlphanumeric(c) or c == '_' or c == '$' or c >= 0x80;
}

fn tokenAt(s: []const u8, backslash: bool) Token {
    std.debug.assert(s.len > 0);
    const c = s[0];
    if (c == ';') return .{ .kind = .separator, .len = 1 };
    if (std.ascii.isWhitespace(c)) return .{ .kind = .space, .len = 1 };
    if (c == '\'' or c == '"' or c == '`') return quotedAt(s, backslash and c != '`');
    if (c == '#') return .{ .kind = .space, .len = lineEnd(s) };
    const dashes = s.len >= 2 and c == '-' and s[1] == '-';
    if (dashes and (s.len == 2 or s[2] <= ' ')) return .{ .kind = .space, .len = lineEnd(s) };
    if (s.len >= 2 and c == '/' and s[1] == '*') {
        const end = std.mem.indexOfPos(u8, s, 2, "*/") orelse return .{ .kind = .unknown, .len = s.len };
        const code = s[2] == '!' or s[2] == '+' or s[2] == 'M';
        return .{ .kind = if (code) .unknown else .space, .len = end + 2 };
    }
    if (!isWordByte(c)) return .{ .kind = .other, .len = 1 };
    var n: usize = 1;
    while (n < s.len and isWordByte(s[n])) n += 1;
    return .{ .kind = .word, .len = n };
}

fn lineEnd(s: []const u8) usize {
    return if (std.mem.indexOfScalar(u8, s, '\n')) |n| n + 1 else s.len;
}

/// A string or a quoted name: the quote twice is the quote itself.
fn quotedAt(s: []const u8, backslash: bool) Token {
    const q = s[0];
    var i: usize = 1;
    while (i < s.len) : (i += 1) {
        if (backslash and s[i] == '\\') {
            i += 1;
            continue;
        }
        if (s[i] != q) continue;
        if (i + 1 < s.len and s[i + 1] == q) {
            i += 1;
            continue;
        }
        return .{ .kind = .other, .len = i + 1 };
    }
    return .{ .kind = .unknown, .len = s.len };
}

// ---- tests --------------------------------------------------------------------

test "mywire: packets are framed, and a command over the packet size goes in several packets" {
    try std.testing.expectEqual(@as(?Packet, null), try next("\x05\x00\x00\x01abc", 64));
    const p = (try next("\x03\x00\x00\x02abcrest", 64)).?;
    try std.testing.expectEqualStrings("abc", p.body);
    try std.testing.expectEqual(@as(usize, 7), p.size);
    try std.testing.expect(p.seq == 2 and !p.more);
    try std.testing.expectError(error.TooLarge, next("\x41\x00\x00\x00", 64));
    var buf: [64]u8 = @splat(0);
    var w: Writer = .{ .buf = &buf };
    try w.query("select 1");
    try w.quit();
    try std.testing.expectEqualStrings("\x09\x00\x00\x00\x03select 1\x01\x00\x00\x00\x01", buf[0..w.len]);
    // A packet that does not fit leaves the buffer as it was.
    var small: [8]u8 = @splat(0);
    var ws: Writer = .{ .buf = &small };
    try std.testing.expectError(error.NoSpace, ws.query("select 12345"));
    try std.testing.expectEqual(@as(usize, 0), ws.len);
    // With packets of 4 bytes: the command byte and 3 bytes, 4 bytes, then an
    // empty packet, because the last packet was full.
    w.len = 0;
    try w.command(0x03, "abcdefg", 4);
    try std.testing.expectEqualStrings("\x04\x00\x00\x00\x03abc\x04\x00\x00\x01defg\x00\x00\x00\x02", buf[0..w.len]);
    w.len = 0;
    try w.command(0x03, "abcde", 4);
    try std.testing.expectEqualStrings("\x04\x00\x00\x00\x03abc\x02\x00\x00\x01de", buf[0..w.len]);
}

test "mywire: length-encoded integers and strings" {
    var r: Reader = .{ .s = "\x05\xfc\x01\x02\xfd\x01\x02\x03\xfe\x01\x00\x00\x00\x00\x00\x00\x00\x02hi" };
    try std.testing.expectEqual(@as(u64, 5), try r.lenenc());
    try std.testing.expectEqual(@as(u64, 0x201), try r.lenenc());
    try std.testing.expectEqual(@as(u64, 0x30201), try r.lenenc());
    try std.testing.expectEqual(@as(u64, 1), try r.lenenc());
    try std.testing.expectEqualStrings("hi", try r.lenencStr());
    try std.testing.expectError(error.Malformed, r.lenenc());
    var bad: Reader = .{ .s = "\x09abc" };
    try std.testing.expectError(error.Malformed, bad.lenencStr());
}

const test_handshake = "\x0a8.0.36\x00\x2a\x00\x00\x00abcdefgh\x00\xff\xff\xff\x02\x00\xff\xdf\x15" ++
    "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00ijklmnopqrst\x00caching_sha2_password\x00";

test "mywire: the handshake of the server and the login of the client" {
    const h = try handshake(test_handshake);
    try std.testing.expectEqualStrings("8.0.36", h.version);
    try std.testing.expectEqual(@as(u32, 42), h.thread_id);
    try std.testing.expectEqualStrings("abcdefghijklmnopqrst", &h.nonce);
    try std.testing.expectEqual(Plugin.caching_sha2, pluginOf(h.plugin));
    try std.testing.expect(h.caps & cap.session_track != 0 and h.caps & cap.ssl != 0 and h.status == 2);
    try std.testing.expectError(error.Malformed, handshake(test_handshake[0..30]));
    try std.testing.expectError(error.Malformed, handshake("\x09old"));
    var buf: [128]u8 = @splat(0);
    var w: Writer = .{ .buf = &buf };
    try w.login(1, client_caps | cap.connect_with_db, "root", "\x01\x02", "app", native_name);
    try std.testing.expectEqualStrings("\x42\x00\x00\x01\x8f\xa3\xab\x00\x00\x00\x00\x00\xe0", buf[0..13]);
    try std.testing.expect(std.mem.allEqual(u8, buf[13..36], 0));
    try std.testing.expectEqualStrings("root\x00\x02\x01\x02app\x00mysql_native_password\x00", buf[36..w.len]);
    try std.testing.expectError(error.Malformed, w.login(1, client_caps, "ro\x00ot", "", "", native_name));
    w.len = 0;
    try w.sslRequest(1, client_caps | cap.ssl);
    try std.testing.expectEqual(@as(usize, 36), w.len);
    try std.testing.expectEqualStrings("\x20\x00\x00\x01\x87\xab\xab\x00", buf[0..8]);
}

test "mywire: the answers of the two login methods" {
    var out: [32]u8 = @splat(0);
    const nonce = "abcdefghijklmnopqrst".*;
    // The values of the formulas of the server manual for the password
    // `secret` and this nonce, computed in Node.js.
    const native = scramble(.native, "secret", nonce, &out);
    try std.testing.expectEqualSlices(u8, "\x88\x17\xc5\x0f\xa7\x79\xda\xef\x01\x0e\xe7\x57\x78\x25\xb0\x84\x7d\xf9\x84\x2e", native);
    const caching = scramble(.caching_sha2, "secret", nonce, &out);
    const want = "\xc7\x6e\x28\x98\x61\x2a\x4c\xf0\x42\xc7\x7f\xa8\xc4\x70\x2c\x4c\x64\xc0\xc2\xc5\x57\xc5\x3c\x4d\x75\x59\x5a\xaa\x6a\xba\xe8\x09";
    try std.testing.expectEqualSlices(u8, want, caching);
    try std.testing.expectEqual(@as(usize, 0), scramble(.native, "", nonce, &out).len);
    var mbuf: [8]u8 = @splat(0);
    try std.testing.expectEqualSlices(u8, &.{ 'p' ^ 'a', 'w' ^ 'b', 'c' }, maskPassword("pw", nonce, &mbuf));
    const sw = try loginReply("\xfemysql_native_password\x00ABCDEFGHIJKLMNOPQRST\x00", true);
    try std.testing.expectEqualStrings("mysql_native_password", sw.switch_plugin.plugin);
    try std.testing.expectEqualStrings("ABCDEFGHIJKLMNOPQRST", &sw.switch_plugin.nonce);
    try std.testing.expectEqualStrings("\x03", (try loginReply("\x01\x03", true)).more);
    try std.testing.expectError(error.Malformed, loginReply("\xfe", true));
    try std.testing.expectError(error.Malformed, loginReply("\x07", true));
}

test "mywire: OK, ERR, column and row packets" {
    const ok = try okPacket("\x00\x03\xfc\x10\x27\x03\x00\x01\x00Rows matched: 3  Changed: 2  Warnings: 0", false);
    try std.testing.expectEqual(@as(u64, 3), ok.affected);
    try std.testing.expectEqual(@as(u64, 10000), ok.insert_id);
    try std.testing.expect(ok.status == 3 and ok.warnings == 1 and !ok.insert_wide);
    try std.testing.expectEqualStrings("Rows matched: 3  Changed: 2  Warnings: 0", ok.info);
    // With session tracking the text is a string with its length, before the state changes.
    const tracked = try okPacket("\x00\x00\x00\x02\x40\x00\x00\x02hi\x05\x01\x03\x02ab", true);
    try std.testing.expectEqualStrings("hi", tracked.info);
    try std.testing.expectEqual(@as(u16, 0x4002), tracked.status);
    try std.testing.expectEqualStrings("", (try okPacket("\x00\x00\x00\x02\x00\x00\x00", true)).info);
    const e = try errPacket("\xff\x7a\x04#42S02Table 'a.b' doesn't exist");
    try std.testing.expectEqual(@as(u16, 1146), e.code);
    try std.testing.expectEqualStrings("42S02", e.state);
    try std.testing.expectEqualStrings("Table 'a.b' doesn't exist", e.message);
    try std.testing.expectEqual(@as(u32, 2), (try resultHead("\x02", true)).columns);
    try std.testing.expectEqualStrings("file", (try resultHead("\xfbfile", true)).infile);
    try std.testing.expectError(error.Malformed, resultHead("\x02\x00", true));
    const col = try column("\x03def\x01a\x01t\x01t\x02id\x02id\x0c\x3f\x00\x0b\x00\x00\x00\x03\x03\x42\x00\x00\x00");
    try std.testing.expectEqualStrings("id", col.name);
    try std.testing.expect(col.charset == 63 and col.type == 3);
    try std.testing.expectError(error.Malformed, column("\x03def\x01a"));
    var v = Values.init("\x0242\xfb\x00");
    try std.testing.expectEqualStrings("42", (try v.next()).?.text.?);
    try std.testing.expectEqual(@as(?[]const u8, null), (try v.next()).?.text);
    try std.testing.expectEqualStrings("", (try v.next()).?.text.?);
    try std.testing.expectEqual(@as(?Values.Value, null), try v.next());
    const eof: Packet = .{ .seq = 1, .body = "\xfe\x00\x00\x0a\x00", .size = 9, .more = false };
    try std.testing.expect(isEof(eof));
    try std.testing.expectEqual(@as(u16, 10), try eofStatus(eof.body));
    const row: Packet = .{ .seq = 1, .body = "\xfe\x00\x00\x00\x01\x00\x00\x00\x00", .size = 13, .more = false };
    try std.testing.expect(!isEof(row));
}

test "mywire: OK and ERR packets as the JSON of the result" {
    var buf: [512]u8 = @splat(0);
    var o: Out = .{ .buf = &buf };
    try writeOk(&o, try okPacket("\x00\x02\x04\x02\x00\x00\x00Records: 2  Duplicates: 0  Warnings: 0", false), false);
    const want = "{\"command\":\"OK\",\"rowCount\":2,\"rows\":[],\"ok\":{\"affectedRows\":2,\"insertId\":4," ++
        "\"info\":\"Records: 2  Duplicates: 0  Warnings: 0\",\"serverStatus\":2,\"warningStatus\":0}}";
    try std.testing.expectEqualStrings(want, buf[0..o.len]);
    // An insert id in the 8-byte form is signed; a value that is not a safe integer is text.
    const wide = "\x00\x01\xfe\xfb\xff\xff\xff\xff\xff\xff\xff\x02\x00\x00\x00";
    o.len = 0;
    try writeOk(&o, try okPacket(wide, false), false);
    try std.testing.expect(std.mem.indexOf(u8, buf[0..o.len], "\"insertId\":-5,") != null);
    o.len = 0;
    try writeOk(&o, try okPacket(wide, false), true);
    try std.testing.expect(std.mem.indexOf(u8, buf[0..o.len], "\"insertId\":\"-5\",") != null);
    o.len = 0;
    try writeOk(&o, try okPacket("\x00\x01\xfe\x00\x00\x00\x00\x00\x00\x20\x00\x02\x00\x00\x00", false), false);
    try std.testing.expect(std.mem.indexOf(u8, buf[0..o.len], "\"insertId\":\"9007199254740992\",") != null);
    o.len = 0;
    try writeErr(&o, try errPacket("\xff\x26\x04#23000Duplicate entry '1' for key 'ty.PRIMARY'"));
    const err = "{\"message\":\"Duplicate entry '1' for key 'ty.PRIMARY'\",\"code\":\"ER_DUP_ENTRY\",\"errno\":1062," ++
        "\"sqlState\":\"23000\",\"sqlMessage\":\"Duplicate entry '1' for key 'ty.PRIMARY'\"}";
    try std.testing.expectEqualStrings(err, buf[0..o.len]);
    try std.testing.expectEqualStrings("ER_PARSE_ERROR", errorName(1064).?);
    try std.testing.expectEqualStrings("ER_EMPTY_QUERY", errorName(1065).?);
    try std.testing.expectEqual(@as(?[]const u8, null), errorName(65000));
    o.len = 0;
    try writeErr(&o, .{ .code = 65000, .state = "", .message = "x" });
    try std.testing.expectEqualStrings("{\"message\":\"x\",\"errno\":65000,\"sqlState\":\"\",\"sqlMessage\":\"x\"}", buf[0..o.len]);
}

/// True when a value of this column type and character set has the JSON `want`.
fn valueIs(want: []const u8, col_type: u8, charset: u16, text: []const u8, opt: Options) bool {
    var buf: [256]u8 = @splat(0);
    var o: Out = .{ .buf = &buf };
    // A value without JSON is not `want`.
    writeValue(&o, classOf(.{ .name = "c", .charset = charset, .type = col_type }, opt), text, opt) catch return false;
    return std.mem.eql(u8, want, buf[0..o.len]);
}

/// True when the value has no native form.
fn noForm(col_type: u8, charset: u16, text: []const u8, opt: Options) bool {
    var buf: [256]u8 = @splat(0);
    var o: Out = .{ .buf = &buf };
    const class = classOf(.{ .name = "c", .charset = charset, .type = col_type }, opt);
    // Only "no native form" counts.
    writeValue(&o, class, text, opt) catch |e| return e == error.Unsupported;
    return false;
}

test "mywire: column values become the JSON of mysql2" {
    try std.testing.expect(valueIs("42", type_long, 63, "42", .{}));
    try std.testing.expect(valueIs("-7", type_tiny, 63, "-7", .{}));
    try std.testing.expect(valueIs("42", type_long, 63, "0000000042", .{}));
    try std.testing.expect(valueIs("2024", type_year, 63, "2024", .{}));
    // A BIGINT is a number while it is a safe integer.
    try std.testing.expect(valueIs("9007199254740991", type_longlong, 63, "9007199254740991", .{}));
    try std.testing.expect(valueIs("\"9007199254740993\"", type_longlong, 63, "9007199254740993", .{}));
    try std.testing.expect(valueIs("\"-9223372036854775808\"", type_longlong, 63, "-9223372036854775808", .{}));
    try std.testing.expect(valueIs("\"18446744073709551615\"", type_longlong, 63, "18446744073709551615", .{}));
    try std.testing.expect(valueIs("-5", type_longlong, 63, "-5", .{}));
    try std.testing.expect(valueIs("\"5\"", type_longlong, 63, "5", .{ .big_strings = true }));
    try std.testing.expect(valueIs("1.5", type_double, 63, "1.5", .{}));
    try std.testing.expect(valueIs("0", type_double, 63, "-0", .{}));
    try std.testing.expect(valueIs("1e+30", type_double, 63, "1e30", .{}));
    try std.testing.expect(valueIs("0.1", type_float, 63, "0.1", .{}));
    try std.testing.expect(valueIs("\"1.5000000000\"", type_newdecimal, 63, "1.5000000000", .{}));
    try std.testing.expect(valueIs("12.5", type_newdecimal, 63, "12.50", .{ .decimal_numbers = true }));
    try std.testing.expect(valueIs("\"2024-02-29 13:14:15.123456\"", type_datetime, 63, "2024-02-29 13:14:15.123456", .{}));
    try std.testing.expect(valueIs("\"0000-00-00\"", type_date, 63, "0000-00-00", .{}));
    try std.testing.expect(valueIs("\"-838:59:59.000\"", type_time, 63, "-838:59:59.000", .{}));
    try std.testing.expect(valueIs("\"a\\\"b\xc3\xa9\"", 253, 255, "a\"b\xc3\xa9", .{}));
    try std.testing.expect(valueIs("\"x,z\"", type_string, 224, "x,z", .{}));
    try std.testing.expect(valueIs("{\"type\":\"Buffer\",\"data\":[97,98,0,0]}", type_string, 63, "ab\x00\x00", .{}));
    try std.testing.expect(valueIs("{\"type\":\"Buffer\",\"data\":[]}", 252, 63, "", .{}));
    try std.testing.expect(valueIs("{\"type\":\"Buffer\",\"data\":[1,85]}", type_bit, 63, "\x01\x55", .{}));
    // A JSON column: no spaces, a large integer as text, a double as JavaScript writes it.
    try std.testing.expect(valueIs("{\"a\":[1,true,null,\"x y\"],\"b\":{}}", type_json, 63, "{\"a\": [1, true, null, \"x y\"], \"b\": {}}", .{}));
    try std.testing.expect(valueIs("[\"12345678901234567890\",1,1.5,-0.25,100]", type_json, 63, "[12345678901234567890, 1.0, 1.5, -2.5e-1, 1e2]", .{}));
    try std.testing.expect(valueIs("\"a\\n\\\"\"", type_json, 63, "\"a\\n\\\"\"", .{}));
    // A Date object, a geometry, an unknown type, bytes that are not UTF-8, another character set.
    try std.testing.expect(noForm(type_datetime, 63, "2024-01-02 03:04:05", .{ .date_strings = false }));
    try std.testing.expect(noForm(type_geometry, 63, "\x00", .{}));
    try std.testing.expect(noForm(242, 63, "\x00", .{}));
    try std.testing.expect(noForm(200, 63, "a", .{}));
    try std.testing.expect(noForm(253, 255, "\xff", .{}));
    try std.testing.expect(noForm(253, 8, "a", .{}));
    try std.testing.expect(noForm(type_json, 63, "{\"a\": \"\\u0000\"}", .{}));
    try std.testing.expect(noForm(type_json, 63, "[1", .{}));
    try std.testing.expect(noForm(type_json, 63, "", .{}));
    try std.testing.expect(noForm(type_long, 63, "4x", .{}));
    try std.testing.expect(noForm(type_null, 63, "x", .{}));
}

test "mywire: a text of commands that only read" {
    try std.testing.expect(onlyReads("select 1", true));
    try std.testing.expect(onlyReads(" SELECT ';' ; -- insert\n show tables # x\n; /* c */ DESC t; explain select 1;", true));
    try std.testing.expect(onlyReads("select 'a\\'; insert' ", true));
    // Without backslash escapes the string ends at the quote after the backslash.
    try std.testing.expect(!onlyReads("select 'a\\'; insert into t values (1)", false));
    const writes = [_][]const u8{ "", ";", "insert into t values (1)", "select 1; update t set a = 1", "(select 1)", "/*!50000 select 1 */", "select 'x", "selects", "call p()" };
    for (writes) |w| try std.testing.expect(!onlyReads(w, true));
}
