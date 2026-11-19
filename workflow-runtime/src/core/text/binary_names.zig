//! The names of stored binary data (spec 7.1, `responseBinary`): the file
//! name, the MIME type, the extension and the size text of a handle, as
//! n8n's `prepareBinaryData` gives them for a response, and the companion
//! `<file>.metadata` that n8n's file system store writes. Pure functions
//! over bytes: the shell reads the headers and writes the files
//! (`shell/blob_store.zig`).
//!
//! The rules are those of the reference runner
//! (`packages/@n8n/workflow-lang/src/reference/binary-response.ts`); the tests
//! hold the values that it gives.
const std = @import("std");
const mime = @import("mime_tables.zig");

/// The name that n8n writes in `data` of an entry whose bytes are in its
/// file system store, and the prefix of the id of such an entry.
pub const store_mode = "filesystem-v2";
/// The longest file name text (a path) that a handle takes.
pub const max_path_bytes = 1024;
/// The longest MIME type that a handle takes.
pub const max_mime_bytes = 255;
/// A size from here on has no size text: `pretty-bytes` rounds a logarithm.
pub const max_size_bytes: u64 = 1_000_000_000_000;
/// The longest size text: `999.9 MB`.
pub const max_size_text = 16;

pub const Error = error{
    /// A name is longer than its limit.
    TooLong,
    /// A name is not text: bytes that are not UTF-8, or a MIME type from a
    /// header with a byte outside printable ASCII.
    NotText,
};

/// A bounded writer over a buffer of the caller.
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

    pub fn written(o: *const Out) []u8 {
        return o.buf[0..o.len];
    }
};

/// White space as `trim` and `\s` of JavaScript see it in a header, which
/// Node.js reads as Latin-1.
fn isSpace(c: u8) bool {
    return c == ' ' or (c >= 0x09 and c <= 0x0d) or c == 0xa0;
}

fn trim(s: []const u8) []const u8 {
    var a: usize = 0;
    var b: usize = s.len;
    while (a < b and isSpace(s[a])) a += 1;
    while (b > a and isSpace(s[b - 1])) b -= 1;
    return s[a..b];
}

fn hexValue(c: u8) ?u8 {
    return switch (c) {
        '0'...'9' => c - '0',
        'a'...'f' => c - 'a' + 10,
        'A'...'F' => c - 'A' + 10,
        // Any other byte is not a hexadecimal digit.
        else => null,
    };
}

/// The byte of the escape `%XX` at `i`, or null.
fn escapeAt(s: []const u8, i: usize) ?u8 {
    if (i + 2 >= s.len or s[i] != '%') return null;
    const hi = hexValue(s[i + 1]) orelse return null;
    const lo = hexValue(s[i + 2]) orelse return null;
    return hi << 4 | lo;
}

/// A byte of a header as UTF-8: Node.js reads a header as Latin-1.
fn putLatin1(out: *Out, c: u8) error{NoSpace}!void {
    if (c < 0x80) return out.byte(c);
    try out.byte(0xc0 | c >> 6);
    try out.byte(0x80 | (c & 0x3f));
}

fn putRaw(out: *Out, s: []const u8) error{NoSpace}!void {
    for (s) |c| try putLatin1(out, c);
}

/// `decodeURIComponent`: escapes become bytes, and the bytes of the escapes
/// must be UTF-8, each byte of a character as its own escape.
fn percentDecode(out: *Out, s: []const u8) error{ NoSpace, Malformed }!void {
    var i: usize = 0;
    while (i < s.len) {
        if (s[i] != '%') {
            try putLatin1(out, s[i]);
            i += 1;
            continue;
        }
        const lead = escapeAt(s, i) orelse return error.Malformed;
        i += 3;
        if (lead < 0x80) {
            try out.byte(lead);
            continue;
        }
        const n = std.unicode.utf8ByteSequenceLength(lead) catch return error.Malformed;
        var seq: [4]u8 = @splat(0);
        seq[0] = lead;
        for (1..n) |k| {
            seq[k] = escapeAt(s, i) orelse return error.Malformed;
            i += 3;
        }
        // An overlong form, a surrogate half or a wrong continuation byte.
        _ = std.unicode.utf8Decode(seq[0..n]) catch return error.Malformed;
        try out.put(seq[0..n]);
    }
    std.debug.assert(i == s.len);
}

fn quoted(s: []const u8) bool {
    return s.len > 0 and s[0] == '"' and s[s.len - 1] == '"';
}

/// The inside of a text that starts and ends with `"`, as `slice(1, -1)`.
fn unquote(s: []const u8) []const u8 {
    std.debug.assert(quoted(s));
    return if (s.len < 2) s[0..0] else s[1 .. s.len - 1];
}

/// The value of one parameter (the text after its `=`), written at the
/// start of `buf`, as n8n's `parseContentDisposition` reads it.
fn paramValue(raw: []const u8, buf: []u8) error{NoSpace}![]const u8 {
    const value = trim(raw);
    const inner = if (quoted(value)) unquote(value) else value;
    var out: Out = .{ .buf = buf };
    percentDecode(&out, inner) catch |e| switch (e) {
        error.NoSpace => return error.NoSpace,
        // Text that does not decode stays as it is.
        error.Malformed => {
            out.len = 0;
            try putRaw(&out, inner);
            return out.written();
        },
    };
    const decoded = out.written();
    if (!quoted(value) and quoted(decoded)) return unquote(decoded);
    return decoded;
}

/// The last parameter with this name, as the text after its `=`. Names are
/// compared after `trim` and without case.
fn lastParam(params: []const u8, name: []const u8) ?[]const u8 {
    var found: ?[]const u8 = null;
    var it = std.mem.splitScalar(u8, params, ';');
    while (it.next()) |part| {
        const at = std.mem.indexOfScalar(u8, part, '=') orelse continue;
        if (!std.ascii.eqlIgnoreCase(trim(part[0..at]), name)) continue;
        found = part[at + 1 ..];
    }
    return found;
}

/// The file name of a `Content-Disposition` header by the rules of n8n's
/// `parseContentDisposition`: a header without `attachment` or `inline` at
/// its start is read as its parameters; parameters are the texts between
/// `;`; a quoted value loses its quotes; a value is percent-decoded when it
/// can be; `filename*` wins, and its value is the text between the second
/// and the third `'`. Null when the header gives no file name. The result
/// is in `buf` and is UTF-8.
pub fn contentDispositionFileName(header: []const u8, buf: []u8) error{TooLong}!?[]const u8 {
    if (header.len == 0) return null;
    const typed = std.mem.startsWith(u8, header, "attachment") or std.mem.startsWith(u8, header, "inline");
    const first = std.mem.indexOfScalar(u8, header, ';');
    const params = if (!typed) header else if (first) |at| header[at + 1 ..] else header[0..0];
    if (lastParam(params, "filename*")) |raw| {
        const wide = paramValue(raw, buf) catch return error.TooLong;
        if (wide.len > 0) {
            var it = std.mem.splitScalar(u8, wide, '\'');
            // The charset and the language come before the name.
            if (it.next() == null or it.next() == null) return null;
            return it.next();
        }
    }
    const raw = lastParam(params, "filename") orelse return null;
    const name = paramValue(raw, buf) catch return error.TooLong;
    std.debug.assert(name.len <= buf.len);
    return name;
}

pub const Parts = struct { base: []const u8, ext: []const u8 };

/// The base name and the extension (without its dot) of a path, as
/// `path.parse` of Node.js gives them for POSIX.
pub fn pathParts(path: []const u8) Parts {
    if (std.mem.eql(u8, path, "/")) return .{ .base = "", .ext = "" };
    var end = path.len;
    while (end > 1 and path[end - 1] == '/') end -= 1;
    const cut = std.mem.lastIndexOfScalar(u8, path[0..end], '/');
    const base = if (cut) |c| path[c + 1 .. end] else path[0..end];
    const dot = std.mem.lastIndexOfScalar(u8, base, '.') orelse return .{ .base = base, .ext = "" };
    if (dot == 0 or std.mem.eql(u8, base, "..")) return .{ .base = base, .ext = "" };
    return .{ .base = base, .ext = base[dot + 1 ..] };
}

fn tableKeyOk(key: []const u8) bool {
    return key.len > 0 and std.mem.indexOfAny(u8, key, "|,") == null;
}

/// `lookup(path)` of mime-types: the type of the extension of the path, or "".
pub fn mimeLookup(path: []const u8) []const u8 {
    if (path.len > max_path_bytes) return "";
    std.debug.assert(mime.table.len > 0);
    // `lookup` reads the extension of `x.<path>`, so a bare extension works.
    var joined: [max_path_bytes + 2]u8 = @splat(0);
    joined[0] = 'x';
    joined[1] = '.';
    @memcpy(joined[2..][0..path.len], path);
    const ext = pathParts(joined[0 .. path.len + 2]).ext;
    if (!tableKeyOk(ext)) return "";
    var lines = std.mem.splitScalar(u8, mime.table, '\n');
    while (lines.next()) |line| {
        const bar = std.mem.lastIndexOfScalar(u8, line, '|') orelse continue;
        var exts = std.mem.splitScalar(u8, line[bar + 1 ..], ',');
        while (exts.next()) |e| {
            if (e.len == 0 or !std.ascii.eqlIgnoreCase(e, ext)) continue;
            const type_end = std.mem.indexOfScalar(u8, line, '|') orelse continue;
            return line[0..type_end];
        }
    }
    return "";
}

/// `extension(type)` of mime-types: the first extension of the type, or "".
pub fn mimeExtension(mime_type: []const u8) []const u8 {
    var a: usize = 0;
    while (a < mime_type.len and isSpace(mime_type[a])) a += 1;
    var b = a;
    while (b < mime_type.len and mime_type[b] != ';' and !isSpace(mime_type[b])) b += 1;
    const token = mime_type[a..b];
    if (!tableKeyOk(token)) return "";
    var lines = std.mem.splitScalar(u8, mime.table, '\n');
    while (lines.next()) |line| {
        const type_end = std.mem.indexOfScalar(u8, line, '|') orelse continue;
        if (!std.ascii.eqlIgnoreCase(line[0..type_end], token)) continue;
        const rest = line[type_end + 1 ..];
        const ext_end = std.mem.indexOfScalar(u8, rest, '|') orelse continue;
        return rest[0..ext_end];
    }
    return "";
}

/// `fileTypeFromMimeType` of n8n-workflow.
fn fileTypeOf(mime_type: []const u8) ?[]const u8 {
    const kinds = [_]struct { prefix: []const u8, kind: []const u8 }{
        .{ .prefix = "application/json", .kind = "json" },
        .{ .prefix = "text/html", .kind = "html" },
        .{ .prefix = "image/", .kind = "image" },
        .{ .prefix = "audio/", .kind = "audio" },
        .{ .prefix = "video/", .kind = "video" },
        .{ .prefix = "text/", .kind = "text" },
        .{ .prefix = "application/javascript", .kind = "text" },
        .{ .prefix = "application/pdf", .kind = "pdf" },
    };
    for (kinds) |k| if (std.mem.startsWith(u8, mime_type, k.prefix)) return k.kind;
    return null;
}

/// `x * 10^digits` rounded to the nearest integer, a tie upwards, from the
/// exact value of `x`, as `toFixed` of JavaScript rounds. `x` is in [1, 1000).
fn roundScaled(x: f64, digits: u2) u64 {
    std.debug.assert(x >= 1 and x < 1000 and digits <= 2);
    const bits: u64 = @bitCast(x);
    const mant: u128 = (bits & ((1 << 52) - 1)) | (1 << 52);
    const exp2: i64 = @as(i64, @intCast((bits >> 52) & 0x7ff)) - 1075;
    // 1 <= x < 1000, so x = mant * 2^exp2 with exp2 from -52 to -43.
    std.debug.assert(exp2 >= -52 and exp2 <= -43);
    const shift: u7 = @intCast(-exp2);
    const pow: u128 = switch (digits) {
        0 => 1,
        1 => 10,
        2 => 100,
        3 => unreachable, // The assertion above: digits is at most 2.
    };
    const twice = mant * pow * 2 + (@as(u128, 1) << shift);
    return @intCast(twice >> (shift + 1));
}

/// The decimal text of `n`, at least `width` digits.
fn putDecimal(out: *Out, n: u64, width: usize) error{NoSpace}!void {
    var digits: [20]u8 = @splat('0');
    var at: usize = digits.len;
    var left = n;
    while (left > 0) : (left /= 10) {
        at -= 1;
        digits[at] = '0' + @as(u8, @intCast(left % 10));
    }
    std.debug.assert(width <= digits.len);
    try out.put(digits[@min(at, digits.len - @max(width, 1))..]);
}

/// The size text that n8n writes in `fileSize` (`pretty-bytes` with its
/// defaults): `1.34 kB`. Null for a size that has no size text.
pub fn prettyBytes(count: u64, buf: *[max_size_text]u8) ?[]const u8 {
    if (count >= max_size_bytes) return null;
    const units = [_][]const u8{ " B", " kB", " MB", " GB" };
    const exponent: usize = if (count < 1_000) 0 else if (count < 1_000_000) 1 else if (count < 1_000_000_000) 2 else 3;
    const divisors = [_]f64{ 1, 1e3, 1e6, 1e9 };
    const scaled = @as(f64, @floatFromInt(count)) / divisors[exponent];
    const digits: u2 = if (exponent == 0 or scaled >= 100) 0 else if (scaled < 10) 2 else 1;
    const pow: u64 = if (digits == 2) 100 else if (digits == 1) 10 else 1;
    // A count below 1,000 is its own text.
    const n = if (exponent == 0) count else roundScaled(scaled, digits);
    var frac = n % pow;
    var width: usize = digits;
    // `Number(text)` drops the zeros at the end of the fraction.
    while (width > 0 and frac % 10 == 0) : (width -= 1) frac /= 10;
    var out: Out = .{ .buf = buf };
    // The whole part has at most 4 digits and the fraction 2: 16 bytes hold every text.
    putDecimal(&out, n / pow, 1) catch unreachable;
    if (width > 0) out.byte('.') catch unreachable; // As above.
    if (width > 0) putDecimal(&out, frac, width) catch unreachable; // As above.
    out.put(units[exponent]) catch unreachable; // As above.
    std.debug.assert(out.len >= 3);
    return out.written();
}

/// The names of a handle. The slices point into the `NameBuf` and the
/// tables, and are valid while the buffer is.
pub const Names = struct {
    mime_type: []const u8,
    file_type: ?[]const u8,
    /// The base name of the file name text, or null without one.
    file_name: ?[]const u8,
    /// Without its dot; "" when there is none.
    extension: []const u8,
};

pub const NameBuf = struct {
    path: [max_path_bytes]u8 = @splat(0),
    mime_type: [max_mime_bytes]u8 = @splat(0),
};

/// What a response gives for the names. An absent value is "".
pub const Source = struct {
    /// `responseBinary.fileName` and `.mimeType`, as text.
    file_name: []const u8 = "",
    mime_type: []const u8 = "",
    /// The values of the two response headers.
    content_disposition: []const u8 = "",
    content_type: []const u8 = "",
    /// The path of the URL, with its first `/`.
    url_path: []const u8 = "",
};

/// The file name text: the option, else the header, else the URL path.
pub fn namePath(src: Source, buf: *NameBuf) Error![]const u8 {
    if (src.file_name.len > 0) {
        if (src.file_name.len > buf.path.len) return error.TooLong;
        @memcpy(buf.path[0..src.file_name.len], src.file_name);
        return buf.path[0..src.file_name.len];
    }
    if (try contentDispositionFileName(src.content_disposition, &buf.path)) |name| {
        if (name.len > 0) return name;
    }
    const path = if (src.url_path.len > 0 and src.url_path[0] == '/') src.url_path[1..] else src.url_path;
    if (path.len > buf.path.len) return error.TooLong;
    @memcpy(buf.path[0..path.len], path);
    return buf.path[0..path.len];
}

/// The MIME type: the option, else the header in lower case (the text
/// before `;`), else the type of the extension, else `text/plain`.
fn nameMime(src: Source, path: []const u8, buf: *NameBuf) Error![]const u8 {
    if (src.mime_type.len > 0) {
        if (src.mime_type.len > buf.mime_type.len) return error.TooLong;
        @memcpy(buf.mime_type[0..src.mime_type.len], src.mime_type);
        return buf.mime_type[0..src.mime_type.len];
    }
    const end = std.mem.indexOfScalar(u8, src.content_type, ';') orelse src.content_type.len;
    const header = src.content_type[0..end];
    if (header.len > buf.mime_type.len) return error.TooLong;
    for (header, 0..) |c, i| {
        if (c < 0x20 or c > 0x7e) return error.NotText;
        buf.mime_type[i] = std.ascii.toLower(c);
    }
    if (header.len > 0) return buf.mime_type[0..header.len];
    const looked = mimeLookup(path);
    return if (looked.len > 0) looked else "text/plain";
}

/// The names of a handle (spec 7.1), by the rules of n8n's
/// `prepareBinaryData` for a response.
pub fn handleNames(src: Source, buf: *NameBuf) Error!Names {
    const path = try namePath(src, buf);
    if (!std.unicode.utf8ValidateSlice(path)) return error.NotText;
    const mime_type = try nameMime(src, path, buf);
    if (!std.unicode.utf8ValidateSlice(mime_type)) return error.NotText;
    std.debug.assert(mime_type.len > 0);
    if (path.len == 0) {
        return .{ .mime_type = mime_type, .file_type = fileTypeOf(mime_type), .file_name = null, .extension = mimeExtension(mime_type) };
    }
    const parts = pathParts(path);
    return .{
        .mime_type = mime_type,
        .file_type = fileTypeOf(mime_type),
        .file_name = parts.base,
        .extension = if (parts.ext.len > 0) parts.ext else mimeExtension(mime_type),
    };
}

/// A JSON string as `JSON.stringify` writes it. `s` is UTF-8.
fn putJsonString(out: *Out, s: []const u8) error{NoSpace}!void {
    const hex = "0123456789abcdef";
    std.debug.assert(out.len <= out.buf.len);
    try out.byte('"');
    for (s) |c| {
        const short: ?u8 = switch (c) {
            '"' => '"',
            '\\' => '\\',
            0x08 => 'b',
            0x0c => 'f',
            '\n' => 'n',
            '\r' => 'r',
            '\t' => 't',
            // Every other byte has no two-character escape.
            else => null,
        };
        if (short) |e| {
            try out.put(&.{ '\\', e });
        } else if (c < 0x20) {
            try out.put(&.{ '\\', 'u', '0', '0', hex[c >> 4], hex[c & 15] });
        } else {
            try out.byte(c);
        }
    }
    try out.byte('"');
}

fn putMember(out: *Out, comptime key: []const u8, value: []const u8) error{NoSpace}!void {
    try out.put(",\"" ++ key ++ "\":");
    try putJsonString(out, value);
}

/// The handle of a stored file (spec 7.1): `{"id":"filesystem-v2:<file id>",
/// "data":"filesystem-v2","mimeType":...,"fileSize":"1.34 kB","bytes":1340}`.
/// `size_text` is `prettyBytes` of `size`.
pub fn writeHandle(out: *Out, file_id: []const u8, names: Names, size: u64, size_text: []const u8) error{NoSpace}!void {
    std.debug.assert(file_id.len > 0 and size_text.len > 0);
    try out.put("{\"id\":\"" ++ store_mode ++ ":");
    // A file id has only the characters of `binary_store.fileId`: no escape.
    try out.put(file_id);
    try out.put("\",\"data\":\"" ++ store_mode ++ "\"");
    try putMember(out, "mimeType", names.mime_type);
    if (names.file_type) |kind| try putMember(out, "fileType", kind);
    if (names.file_name) |n| try putMember(out, "fileName", n);
    if (names.extension.len > 0) try putMember(out, "fileExtension", names.extension);
    try putMember(out, "fileSize", size_text);
    try out.put(",\"bytes\":");
    try putDecimal(out, size, 1);
    try out.byte('}');
}

/// The companion `<file>.metadata` of n8n's file system store:
/// `JSON.stringify({ fileName, mimeType, fileSize })`, a member left out
/// when it is undefined.
pub fn writeSidecar(out: *Out, file_name: ?[]const u8, mime_type: ?[]const u8, size: u64) error{NoSpace}!void {
    try out.byte('{');
    if (file_name) |n| {
        try out.put("\"fileName\":");
        try putJsonString(out, n);
        try out.byte(',');
    }
    if (mime_type) |m| {
        try out.put("\"mimeType\":");
        try putJsonString(out, m);
        try out.byte(',');
    }
    try out.put("\"fileSize\":");
    try putDecimal(out, size, 1);
    try out.byte('}');
}

pub const uuid_len = 36;

/// A version 4 UUID from 16 random bytes, as `uuid()` of n8n writes it.
pub fn uuidText(random: [16]u8) [uuid_len]u8 {
    var b = random;
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = "0123456789abcdef";
    var text: [uuid_len]u8 = @splat('-');
    var at: usize = 0;
    for (b, 0..) |c, i| {
        if (i == 4 or i == 6 or i == 8 or i == 10) at += 1;
        text[at] = hex[c >> 4];
        text[at + 1] = hex[c & 15];
        at += 2;
    }
    std.debug.assert(at == uuid_len);
    return text;
}
