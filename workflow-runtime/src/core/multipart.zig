//! multipart/form-data (RFC 7578) and the request body of a webhook
//! trigger, as n8n's Webhook node builds it (spec 9.1). Pure functions over
//! the bytes of one request; the core logs the request, so a replay builds
//! the same trigger.
const std = @import("std");
const Builder = @import("arena.zig").Builder;
const json = @import("json.zig");

pub const Part = struct {
    name: []const u8,
    /// Null when the part has no `filename` attribute: it is a text field.
    filename: ?[]const u8,
    content_type: ?[]const u8,
    data: []const u8,
};

pub const Error = error{BadMultipart};

/// The `boundary` parameter of a Content-Type, quoted or not.
pub fn boundaryOf(content_type: []const u8) ?[]const u8 {
    return param(content_type, "boundary");
}

/// The value of a `; name=value` parameter of a header value. A quoted
/// value keeps its backslash escapes; `unquote` removes them.
pub fn param(header: []const u8, name: []const u8) ?[]const u8 {
    var i: usize = std.mem.indexOfScalar(u8, header, ';') orelse return null;
    while (i < header.len) {
        i += 1;
        while (i < header.len and (header[i] == ' ' or header[i] == '\t')) i += 1;
        const eq = std.mem.indexOfScalarPos(u8, header, i, '=') orelse return null;
        const key = std.mem.trim(u8, header[i..eq], " \t");
        var j = eq + 1;
        var value: []const u8 = undefined;
        if (j < header.len and header[j] == '"') {
            const start = j + 1;
            j = start;
            while (j < header.len and header[j] != '"') : (j += 1) {
                if (header[j] == '\\') j += 1;
            }
            if (j >= header.len) return null;
            value = header[start..j];
            j += 1;
        } else {
            const start = j;
            while (j < header.len and header[j] != ';') j += 1;
            value = std.mem.trim(u8, header[start..j], " \t");
        }
        if (std.ascii.eqlIgnoreCase(key, name)) return value;
        i = std.mem.indexOfScalarPos(u8, header, j, ';') orelse return null;
    }
    return null;
}

/// Remove the backslash escapes of a quoted value into `out`.
pub fn unquote(v: []const u8, out: []u8) []const u8 {
    var n: usize = 0;
    var i: usize = 0;
    while (i < v.len and n < out.len) : (i += 1) {
        if (v[i] == '\\' and i + 1 < v.len) i += 1;
        out[n] = v[i];
        n += 1;
    }
    return out[0..n];
}

/// The parts of a multipart body, in order. A preamble before the first
/// boundary and an epilogue after the last are ignored. Line ends are CRLF;
/// a bare LF is accepted after a boundary and in part headers.
pub const Iterator = struct {
    body: []const u8,
    boundary: []const u8,
    pos: usize,
    done: bool = false,

    pub fn init(body: []const u8, boundary: []const u8) Error!Iterator {
        if (boundary.len == 0 or boundary.len > 70) return error.BadMultipart;
        // The first delimiter starts the body or follows a line end.
        var at: usize = 0;
        while (true) {
            const i = std.mem.indexOfPos(u8, body, at, "--") orelse return error.BadMultipart;
            if (std.mem.startsWith(u8, body[i + 2 ..], boundary) and (i == 0 or body[i - 1] == '\n')) {
                return .{ .body = body, .boundary = boundary, .pos = i };
            }
            at = i + 1;
        }
    }

    /// The next part, or null after the closing delimiter.
    pub fn next(it: *Iterator) Error!?Part {
        if (it.done) return null;
        // `pos` is at "--boundary".
        var p = it.pos + 2 + it.boundary.len;
        if (std.mem.startsWith(u8, it.body[p..], "--")) {
            it.done = true;
            return null;
        }
        while (p < it.body.len and (it.body[p] == ' ' or it.body[p] == '\t')) p += 1;
        p = lineEnd(it.body, p) orelse return error.BadMultipart;
        var part: Part = .{ .name = "", .filename = null, .content_type = null, .data = "" };
        var has_name = false;
        // Part headers, up to an empty line.
        while (true) {
            const eol = std.mem.indexOfScalarPos(u8, it.body, p, '\n') orelse return error.BadMultipart;
            const line = std.mem.trimEnd(u8, it.body[p..eol], "\r");
            p = eol + 1;
            if (line.len == 0) break;
            const colon = std.mem.indexOfScalar(u8, line, ':') orelse return error.BadMultipart;
            const hname = std.mem.trim(u8, line[0..colon], " \t");
            const hval = std.mem.trim(u8, line[colon + 1 ..], " \t");
            if (std.ascii.eqlIgnoreCase(hname, "content-disposition")) {
                if (param(hval, "name")) |n| {
                    part.name = n;
                    has_name = true;
                }
                part.filename = param(hval, "filename");
            } else if (std.ascii.eqlIgnoreCase(hname, "content-type")) {
                part.content_type = hval;
            }
        }
        if (!has_name) return error.BadMultipart;
        // The data ends at CRLF "--boundary" (or LF "--boundary").
        var search = p;
        while (true) {
            const i = std.mem.indexOfPos(u8, it.body, search, "--") orelse return error.BadMultipart;
            if (i >= p + 1 and it.body[i - 1] == '\n' and std.mem.startsWith(u8, it.body[i + 2 ..], it.boundary)) {
                const after = it.body[i + 2 + it.boundary.len ..];
                // A delimiter is followed by "--", white space or a line end.
                if (after.len == 0 or after[0] == '-' or after[0] == '\r' or after[0] == '\n' or after[0] == ' ' or after[0] == '\t') {
                    const end = if (i >= p + 2 and it.body[i - 2] == '\r') i - 2 else i - 1;
                    part.data = it.body[p..end];
                    it.pos = i;
                    return part;
                }
            }
            search = i + 1;
        }
    }
};

fn lineEnd(s: []const u8, p: usize) ?usize {
    if (std.mem.startsWith(u8, s[p..], "\r\n")) return p + 2;
    if (std.mem.startsWith(u8, s[p..], "\n")) return p + 1;
    return null;
}

// ---- the webhook body (n8n Webhook node) ----------------------------------------

pub const BodyOptions = struct {
    /// Webhook option `binaryPropertyName`; empty when not set.
    binary_property: []const u8 = "",
    /// Webhook option `rawBody`: also give the raw body as binary `data`.
    raw_body: bool = false,
    /// Webhook option `binaryData`: the whole body is one binary property.
    binary_data: bool = false,
};

pub const WriteError = error{ ArenaFull, BadMultipart };

const max_parts = 256;

/// Write `,"body":…` and, when there are files, `,"$binary":{…}` for a
/// request with these headers and body. The rules follow n8n:
/// `Webhook.node.ts`, `utils.ts handleFormData` and the body parser of
/// `packages/cli`.
pub fn writeBody(b: *Builder, content_type_raw: ?[]const u8, content_disposition: ?[]const u8, body: []const u8, opts: BodyOptions) WriteError!void {
    const ct_full = content_type_raw orelse "";
    const semi = std.mem.indexOfScalar(u8, ct_full, ';') orelse ct_full.len;
    var media_buf: [128]u8 = undefined;
    const media_raw = std.mem.trim(u8, ct_full[0..semi], " \t");
    const media = std.ascii.lowerString(media_buf[0..@min(media_raw.len, media_buf.len)], media_raw[0..@min(media_raw.len, media_buf.len)]);
    const prop = if (opts.binary_property.len > 0) opts.binary_property else "data";
    // n8n's `req.contentType` is the media type without parameters.
    const mime = if (media_raw.len > 0) media_raw else "application/octet-stream";
    if (opts.binary_data) return writeWholeBinary(b, prop, mime, content_disposition, body);
    if (std.mem.eql(u8, media, "multipart/form-data")) return writeMultipart(b, ct_full, body, opts);
    try b.append(",\"body\":");
    const trimmed = std.mem.trim(u8, body, " \t\r\n");
    if (trimmed.len == 0) {
        try b.append("{}");
    } else if (std.mem.eql(u8, media, "application/json") or (media.len == 0 and (trimmed[0] == '{' or trimmed[0] == '['))) {
        // The core decodes the trigger; text that is not JSON fails there.
        try b.append(body);
    } else if (std.mem.eql(u8, media, "application/x-www-form-urlencoded")) {
        try writePairs(b, body, '&', true);
    } else if (std.mem.eql(u8, media, "text/plain") or std.mem.endsWith(u8, media, "/xml") or std.mem.endsWith(u8, media, "+xml")) {
        // n8n parses XML to an object; the runtime gives the text.
        try str(b, body);
    } else {
        // n8n version 2: a body it does not parse becomes binary data.
        b.len -= ",\"body\":".len;
        return writeWholeBinary(b, prop, mime, content_disposition, body);
    }
    if (opts.raw_body) {
        try b.append(",\"$binary\":{\"data\":");
        try fileObject(b, body, if (media_raw.len > 0) media_raw else "application/json", null);
        try b.byte('}');
    }
}

fn writeWholeBinary(b: *Builder, prop: []const u8, mime: []const u8, content_disposition: ?[]const u8, body: []const u8) WriteError!void {
    try b.append(",\"body\":{}");
    if (body.len == 0) return;
    try b.append(",\"$binary\":{");
    try str(b, prop);
    try b.byte(':');
    var nb: [256]u8 = undefined;
    const name = if (content_disposition) |cd| if (param(cd, "filename")) |f| unquote(f, &nb) else null else null;
    try fileObject(b, body, mime, name);
    try b.byte('}');
}

fn writeMultipart(b: *Builder, content_type: []const u8, body: []const u8, opts: BodyOptions) WriteError!void {
    const boundary_raw = boundaryOf(content_type) orelse return error.BadMultipart;
    var bbuf: [80]u8 = undefined;
    const boundary = unquote(boundary_raw, &bbuf);
    var parts: [max_parts]Part = undefined;
    var n: usize = 0;
    var it = try Iterator.init(body, boundary);
    while (try it.next()) |p| {
        if (n == max_parts) return error.BadMultipart;
        // n8n drops a file input that the user left empty.
        if (p.filename) |f| if (f.len == 0 and p.data.len == 0) continue;
        parts[n] = p;
        n += 1;
    }
    // Text fields: one value per name, an array when the name repeats.
    try b.append(",\"body\":{");
    var first = true;
    for (parts[0..n], 0..) |p, i| {
        if (p.filename != null or firstWithName(parts[0..n], i, false) != i) continue;
        if (!first) try b.byte(',');
        first = false;
        try quotedName(b, p.name);
        try b.byte(':');
        const count = countName(parts[0..n], p.name, false);
        if (count > 1) try b.byte('[');
        var k: usize = 0;
        for (parts[i..n]) |q| {
            if (q.filename != null or !std.mem.eql(u8, q.name, p.name)) continue;
            if (k > 0) try b.byte(',');
            k += 1;
            try str(b, q.data);
        }
        if (count > 1) try b.byte(']');
    }
    try b.byte('}');
    // Files, grouped by field name in the order of first use.
    var nfiles: usize = 0;
    for (parts[0..n], 0..) |p, i| {
        if (p.filename == null or firstWithName(parts[0..n], i, true) != i) continue;
        const multi = countName(parts[0..n], p.name, true) > 1;
        var file_count: usize = 0;
        for (parts[i..n]) |q| {
            if (q.filename == null or !std.mem.eql(u8, q.name, p.name)) continue;
            try b.append(if (nfiles == 0) ",\"$binary\":{" else ",");
            var name_buf: [160]u8 = undefined;
            var nm: []const u8 = undefined;
            var qn_buf: [128]u8 = undefined;
            var key = unquote(q.name, &qn_buf);
            if (std.mem.endsWith(u8, key, "[]")) key = key[0 .. key.len - 2];
            if (opts.binary_property.len > 0) {
                nm = std.fmt.bufPrint(&name_buf, "{s}{d}", .{ opts.binary_property[0..@min(opts.binary_property.len, 128)], nfiles }) catch unreachable;
            } else if (std.mem.trim(u8, key, " \t").len == 0) {
                nm = std.fmt.bufPrint(&name_buf, "data{d}", .{nfiles}) catch unreachable;
            } else if (multi) {
                nm = std.fmt.bufPrint(&name_buf, "{s}{d}", .{ key[0..@min(key.len, 128)], file_count }) catch unreachable;
                file_count += 1;
            } else nm = key;
            try str(b, nm);
            try b.byte(':');
            var fb: [256]u8 = undefined;
            try fileObject(b, q.data, q.content_type orelse "application/octet-stream", unquote(q.filename.?, &fb));
            nfiles += 1;
        }
    }
    if (nfiles > 0) try b.byte('}');
}

fn firstWithName(parts: []const Part, i: usize, file: bool) usize {
    for (parts[0 .. i + 1], 0..) |p, j| {
        if ((p.filename != null) == file and std.mem.eql(u8, p.name, parts[i].name)) return j;
    }
    unreachable; // Part i itself matches.
}

fn countName(parts: []const Part, name: []const u8, file: bool) usize {
    var c: usize = 0;
    for (parts) |p| {
        if ((p.filename != null) == file and std.mem.eql(u8, p.name, name)) c += 1;
    }
    return c;
}

/// `{"data":<base64>,"mimeType":…,"fileName"?:…,"fileExtension"?:…,"bytes":n}`
fn fileObject(b: *Builder, data: []const u8, mime: []const u8, file_name: ?[]const u8) WriteError!void {
    try b.append("{\"data\":\"");
    const enc = std.base64.standard.Encoder;
    const n = enc.calcSize(data.len);
    const start = b.len;
    // Reserve the bytes, then encode in place.
    var k: usize = 0;
    while (k < n) : (k += 1) try b.byte(0);
    _ = enc.encode(b.arena.buf[b.start + start ..][0..n], data);
    try b.append("\",\"mimeType\":");
    try str(b, mime);
    if (file_name) |f| {
        try b.append(",\"fileName\":");
        try str(b, f);
        if (std.mem.lastIndexOfScalar(u8, f, '.')) |dot| if (dot + 1 < f.len) {
            try b.append(",\"fileExtension\":");
            try str(b, f[dot + 1 ..]);
        };
    }
    var nb: [32]u8 = undefined;
    try b.append(std.fmt.bufPrint(&nb, ",\"bytes\":{d}}}", .{data.len}) catch unreachable);
}

fn str(b: *Builder, s: []const u8) error{ArenaFull}!void {
    return writeLossy(b, s);
}

/// A JSON string of request text. Bytes that are not valid UTF-8 become
/// U+FFFD, one for each bad byte, as Node.js decodes a request body; so the
/// trigger is always valid JSON text.
pub fn writeLossy(b: *Builder, s: []const u8) error{ArenaFull}!void {
    try b.byte('"');
    var i: usize = 0;
    while (i < s.len) {
        const c = s[i];
        if (c < 0x80) {
            switch (c) {
                '"' => try b.append("\\\""),
                '\\' => try b.append("\\\\"),
                '\n' => try b.append("\\n"),
                '\r' => try b.append("\\r"),
                '\t' => try b.append("\\t"),
                0x08 => try b.append("\\b"),
                0x0C => try b.append("\\f"),
                0...0x07, 0x0B, 0x0E...0x1F => {
                    var e: [6]u8 = undefined;
                    try b.append(std.fmt.bufPrint(&e, "\\u{x:0>4}", .{c}) catch unreachable);
                },
                else => try b.byte(c),
            }
            i += 1;
            continue;
        }
        const n = std.unicode.utf8ByteSequenceLength(c) catch 0;
        if (n > 1 and i + n <= s.len) {
            if (std.unicode.utf8Decode(s[i..][0..n])) |_| {
                try b.append(s[i..][0..n]);
                i += n;
                continue;
            } else |_| {}
        }
        try b.append("\u{FFFD}");
        i += 1;
    }
    try b.byte('"');
}

fn quotedName(b: *Builder, raw: []const u8) error{ArenaFull}!void {
    var buf: [256]u8 = undefined;
    try str(b, unquote(raw, &buf));
}

/// `a=1&b=2&a=3` as `{"a":["1","3"],"b":"2"}`: percent-decoded, `+` as a
/// space when `plus`, an array when a key repeats (as n8n's qs parser).
pub fn writePairs(b: *Builder, text: []const u8, sep: u8, plus: bool) error{ArenaFull}!void {
    @setRuntimeSafety(false);
    // Safe builds fill `undefined` memory with 0xAA; for these buffers
    // (kilobytes, on every request) the fill cost more than the work. The
    // callee keeps its safety checks.
    var keys: [max_parts][]const u8 = undefined;
    var vals: [max_parts][]const u8 = undefined;
    var kb: [512]u8 = undefined;
    var kb2: [512]u8 = undefined;
    return writePairsWith(b, text, sep, plus, &keys, &vals, &kb, &kb2);
}

fn writePairsWith(b: *Builder, text: []const u8, sep: u8, plus: bool, keys: *[max_parts][]const u8, vals: *[max_parts][]const u8, kb: *[512]u8, kb2: *[512]u8) error{ArenaFull}!void {
    var n: usize = 0;
    var it = std.mem.tokenizeScalar(u8, text, sep);
    while (it.next()) |pair| {
        if (n == max_parts) break;
        const eq = std.mem.indexOfScalar(u8, pair, '=');
        keys[n] = pair[0 .. eq orelse pair.len];
        vals[n] = if (eq) |e| pair[e + 1 ..] else "";
        n += 1;
    }
    try b.byte('{');
    var first = true;
    for (0..n) |i| {
        const ki = decode(keys[i], plus, kb);
        const seen = for (0..i) |j| {
            if (std.mem.eql(u8, decode(keys[j], plus, kb2), ki)) break true;
        } else false;
        if (seen) continue;
        if (!first) try b.byte(',');
        first = false;
        try str(b, ki);
        try b.byte(':');
        var count: usize = 0;
        for (i..n) |j| {
            if (std.mem.eql(u8, decode(keys[j], plus, kb2), ki)) count += 1;
        }
        if (count > 1) try b.byte('[');
        var w: usize = 0;
        for (i..n) |j| {
            if (!std.mem.eql(u8, decode(keys[j], plus, kb2), ki)) continue;
            if (w > 0) try b.byte(',');
            w += 1;
            var vb: [4096]u8 = undefined;
            try str(b, decode(vals[j], plus, &vb));
        }
        if (count > 1) try b.byte(']');
    }
    try b.byte('}');
}

/// Percent-decode into `out`. A bad escape stays as it is. Text longer than
/// `out` is cut.
pub fn decode(raw: []const u8, plus: bool, out: []u8) []const u8 {
    var n: usize = 0;
    var i: usize = 0;
    while (i < raw.len and n < out.len) : (n += 1) {
        const c = raw[i];
        if (c == '%' and i + 3 <= raw.len) {
            if (std.fmt.parseInt(u8, raw[i + 1 .. i + 3], 16)) |v| {
                out[n] = v;
                i += 3;
                continue;
            } else |_| {}
        }
        out[n] = if (plus and c == '+') ' ' else c;
        i += 1;
    }
    return out[0..n];
}

// ---- tests ----------------------------------------------------------------------

const testing = std.testing;
const Arena = @import("arena.zig").Arena;

fn bodyJson(buf: []u8, ct: ?[]const u8, cd: ?[]const u8, body: []const u8, opts: BodyOptions) ![]const u8 {
    var a = Arena.init(buf);
    var b = a.builder();
    try writeBody(&b, ct, cd, body, opts);
    return b.finish();
}

test "boundary and parameters" {
    try testing.expectEqualStrings("abc", boundaryOf("multipart/form-data; boundary=abc").?);
    try testing.expectEqualStrings("a b;c", boundaryOf("multipart/form-data; charset=utf-8; boundary=\"a b;c\"").?);
    try testing.expect(boundaryOf("multipart/form-data") == null);
    var out: [32]u8 = undefined;
    try testing.expectEqualStrings("say \"hi\".txt", unquote(param("form-data; name=\"f\"; filename=\"say \\\"hi\\\".txt\"", "filename").?, &out));
    try testing.expectEqualStrings("f", param("form-data; NAME=f", "name").?);
}

test "parts: CRLF, preamble, quoted names, empty data, data with boundary-like text" {
    const body = "preamble\r\n--XyZ\r\n" ++
        "Content-Disposition: form-data; name=\"a;b\"\r\n\r\n" ++
        "1\r\n--XyZnot\r\n" ++
        "\r\n--XyZ\r\n" ++
        "content-disposition: form-data; name=\"f\"; filename=\"x.txt\"\r\nContent-Type: text/plain\r\n\r\n" ++
        "\r\n--XyZ--\r\nepilogue";
    var it = try Iterator.init(body, "XyZ");
    const p1 = (try it.next()).?;
    try testing.expectEqualStrings("a;b", p1.name);
    try testing.expect(p1.filename == null);
    try testing.expectEqualStrings("1\r\n--XyZnot\r\n", p1.data);
    const p2 = (try it.next()).?;
    try testing.expectEqualStrings("x.txt", p2.filename.?);
    try testing.expectEqualStrings("text/plain", p2.content_type.?);
    try testing.expectEqualStrings("", p2.data);
    try testing.expect((try it.next()) == null);
}

test "parts: bare LF and errors" {
    var it = try Iterator.init("--b\nContent-Disposition: form-data; name=x\n\nv\n--b--", "b");
    try testing.expectEqualStrings("v", (try it.next()).?.data);
    try testing.expect((try it.next()) == null);
    try testing.expectError(error.BadMultipart, Iterator.init("no boundary here", "b"));
    var bad = try Iterator.init("--b\r\nContent-Disposition: form-data\r\n\r\nv\r\n--b--", "b");
    try testing.expectError(error.BadMultipart, bad.next());
    var cut = try Iterator.init("--b\r\nContent-Disposition: form-data; name=x\r\n\r\nv", "b");
    try testing.expectError(error.BadMultipart, cut.next());
}

test "multipart body: fields, several files, blank input, names" {
    const body = "--B\r\nContent-Disposition: form-data; name=\"title\"\r\n\r\nHi\r\n" ++
        "--B\r\nContent-Disposition: form-data; name=\"tag\"\r\n\r\nx\r\n" ++
        "--B\r\nContent-Disposition: form-data; name=\"tag\"\r\n\r\ny\r\n" ++
        "--B\r\nContent-Disposition: form-data; name=\"docs[]\"; filename=\"a.txt\"\r\nContent-Type: text/plain\r\n\r\nAA\r\n" ++
        "--B\r\nContent-Disposition: form-data; name=\"docs[]\"; filename=\"b.csv\"\r\nContent-Type: text/csv\r\n\r\nB\r\n" ++
        "--B\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"p\"\r\n\r\n\x00\xff\r\n" ++
        "--B\r\nContent-Disposition: form-data; name=\"empty\"; filename=\"\"\r\n\r\n\r\n" ++
        "--B--\r\n";
    var buf: [4096]u8 = undefined;
    const got = try bodyJson(&buf, "multipart/form-data; boundary=B", null, body, .{});
    try testing.expectEqualStrings(",\"body\":{\"title\":\"Hi\",\"tag\":[\"x\",\"y\"]}" ++
        ",\"$binary\":{\"docs0\":{\"data\":\"QUE=\",\"mimeType\":\"text/plain\",\"fileName\":\"a.txt\",\"fileExtension\":\"txt\",\"bytes\":2}" ++
        ",\"docs1\":{\"data\":\"Qg==\",\"mimeType\":\"text/csv\",\"fileName\":\"b.csv\",\"fileExtension\":\"csv\",\"bytes\":1}" ++
        ",\"photo\":{\"data\":\"AP8=\",\"mimeType\":\"application/octet-stream\",\"fileName\":\"p\",\"bytes\":2}}", got);
    // The binaryPropertyName option names files by their count.
    const named = try bodyJson(&buf, "multipart/form-data; boundary=B", null, body, .{ .binary_property = "file" });
    try testing.expect(std.mem.indexOf(u8, named, "\"file0\":") != null);
    try testing.expect(std.mem.indexOf(u8, named, "\"file2\":") != null);
    try testing.expectError(error.BadMultipart, bodyJson(&buf, "multipart/form-data", null, body, .{}));
}

test "other bodies" {
    var buf: [1024]u8 = undefined;
    try testing.expectEqualStrings(",\"body\":{\"a\":1}", try bodyJson(&buf, "application/json; charset=utf-8", null, "{\"a\":1}", .{}));
    try testing.expectEqualStrings(",\"body\":{}", try bodyJson(&buf, "application/json", null, "", .{}));
    try testing.expectEqualStrings(",\"body\":[1]", try bodyJson(&buf, null, null, "[1]", .{}));
    try testing.expectEqualStrings(",\"body\":{\"a\":[\"1\",\"x y\"],\"b\":\"\"}", try bodyJson(&buf, "application/x-www-form-urlencoded", null, "a=1&a=x+y&b", .{}));
    try testing.expectEqualStrings(",\"body\":\"hello\"", try bodyJson(&buf, "text/plain", null, "hello", .{}));
    try testing.expectEqualStrings(",\"body\":{},\"$binary\":{\"data\":{\"data\":\"aGk=\",\"mimeType\":\"image/png\",\"fileName\":\"a.png\",\"fileExtension\":\"png\",\"bytes\":2}}", try bodyJson(&buf, "image/png", "attachment; filename=\"a.png\"", "hi", .{}));
    try testing.expectEqualStrings(",\"body\":{},\"$binary\":{\"up\":{\"data\":\"e30=\",\"mimeType\":\"application/json\",\"bytes\":2}}", try bodyJson(&buf, "application/json", null, "{}", .{ .binary_data = true, .binary_property = "up" }));
    try testing.expectEqualStrings(",\"body\":{\"a\":1},\"$binary\":{\"data\":{\"data\":\"eyJhIjoxfQ==\",\"mimeType\":\"application/json\",\"bytes\":7}}", try bodyJson(&buf, "application/json", null, "{\"a\":1}", .{ .raw_body = true }));
}

test "regression: request text that is not UTF-8 gives valid JSON (fuzz)" {
    var buf: [256]u8 = undefined;
    const got = try bodyJson(&buf, "text/plain", null, "a\xff\xe2\x82\"\xed\xa0\x80\x01", .{});
    try testing.expectEqualStrings(",\"body\":\"a\u{FFFD}\u{FFFD}\u{FFFD}\\\"\u{FFFD}\u{FFFD}\u{FFFD}\\u0001\"", got);
    try testing.expect(try std.json.validate(testing.allocator, got[",\"body\":".len..]));
}
