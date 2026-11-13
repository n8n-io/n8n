//! Build an outbound HTTP/1.1 request from the args of an `http` effect:
//! URL with the query string, header lines and body, with credential
//! injection and `{{$credentials.<path>}}` templates (spec section 7).
//! A pure function: it writes into the buffer it is given.
const std = @import("std");
const http = @import("http.zig");
const creds = @import("creds.zig");
const binary_store = @import("binary_store.zig");
const Out = creds.Out;

pub const max_url = 8 << 10;

/// Layout of a built request in its buffer: the URL, then the header
/// lines (ending with the blank line), then the body. The request line
/// and the Host header are written when the request goes out, because a
/// redirect changes them.
pub const Built = struct {
    method_buf: [16]u8 = undefined,
    method_len: u8 = 0,
    url_len: u32 = 0,
    hdr_end: u32 = 0,
    body_end: u32 = 0,
    timeout_ms: ?u32 = null,
    /// A retry on a fresh connection cannot apply the request twice.
    retry_safe: bool = false,

    pub fn method(b: *const Built) []const u8 {
        return b.method_buf[0..b.method_len];
    }
};

/// The reason for `error.Invalid`, for the effect error message. It never
/// holds a credential value.
pub const Diag = struct {
    buf: [256]u8 = undefined,
    len: usize = 0,

    pub fn set(d: *Diag, comptime fmt: []const u8, args: anytype) void {
        d.len = if (std.fmt.bufPrint(&d.buf, fmt, args)) |w| w.len else |_| 0;
        if (d.len == 0) d.len = (std.fmt.bufPrint(&d.buf, "http: invalid request", .{}) catch unreachable).len;
    }

    pub fn text(d: *const Diag) []const u8 {
        return d.buf[0..d.len];
    }
};

pub const Error = error{ NoSpace, Invalid };

const Tmp = struct { buf: [max_url]u8 = undefined };

/// Build the request into `out`. `error.NoSpace` means "try a larger
/// buffer"; `error.Invalid` fills `diag`.
pub fn build(args: []const u8, store: ?*const creds.Store, idem_key: ?[]const u8, out_buf: []u8, diag: *Diag) Error!Built {
    @setRuntimeSafety(false);
    // Safe builds fill `undefined` memory with 0xAA; for this buffer (8 KB,
    // on every request) the fill cost more than the work. The callee keeps
    // its safety checks.
    var tmp: Tmp = undefined;
    return buildWith(args, store, idem_key, out_buf, diag, &tmp);
}

fn buildWith(args: []const u8, store: ?*const creds.Store, idem_key: ?[]const u8, out_buf: []u8, diag: *Diag, tmp: *Tmp) Error!Built {
    std.debug.assert(out_buf.len > 0);
    if (idem_key) |k| std.debug.assert(k.len > 0);
    var b: Built = .{};
    var out: Out = .{ .buf = out_buf };

    // Method.
    // The members of the args, in one pass (a scan for each showed in
    // profiles).
    const fa = readArgs(args);
    const m_raw = fa.method;
    const method: []const u8 = if (m_raw) |m| http.plainString(m) orelse "GET" else "GET";
    if (method.len == 0 or method.len > b.method_buf.len) return invalid(diag, "http: the method is not valid", .{});
    for (method, 0..) |c, i| {
        if (!std.ascii.isAlphabetic(c)) return invalid(diag, "http: the method is not valid", .{});
        b.method_buf[i] = std.ascii.toUpper(c);
    }
    b.method_len = @intCast(method.len);
    const m = b.method();
    const idempotent_method = eq(m, "GET") or eq(m, "HEAD") or eq(m, "OPTIONS") or eq(m, "PUT") or eq(m, "DELETE");
    b.retry_safe = idempotent_method or idem_key != null;

    // Credential slot.
    var slot: ?creds.Slot = null;
    if (fa.credential) |raw| {
        if (!std.mem.eql(u8, raw, "null")) {
            const name = http.plainString(raw) orelse return invalid(diag, "http: the credential name is not valid", .{});
            const s = if (store) |st| st.slot(name) else null;
            slot = s orelse return invalid(diag, "credential \"{s}\" is not configured", .{name[0..@min(name.len, 64)]});
        }
    }

    if (fa.timeout_ms) |raw| if (!std.mem.eql(u8, raw, "null")) {
        const f = std.fmt.parseFloat(f64, raw) catch return invalid(diag, "http: timeoutMs must be a number", .{});
        if (!(f >= 1)) return invalid(diag, "http: timeoutMs must be at least 1", .{});
        b.timeout_ms = @intFromFloat(@min(f, 3_600_000));
    };

    // URL, with templates, then the query string.
    const url_raw = fa.url orelse return invalid(diag, "http: url is missing", .{});
    var t: Out = .{ .buf = &tmp.buf };
    http.unescape(url_raw, &t) catch |e| return switch (e) {
        error.NoSpace => invalid(diag, "http: the url is longer than {d} bytes", .{max_url}),
        error.BadString => invalid(diag, "http: url must be a string", .{}),
    };
    try templated(t.written(), slot, .none, &out, diag);
    out.len = whatwgClean(out.buf[0..out.len]);
    if (std.mem.indexOfScalar(u8, out.written(), '#')) |h| out.len = h;
    var has_query = std.mem.indexOfScalar(u8, out.written(), '?') != null;
    const brackets = if (fa.qs_format) |f| blk: {
        if (std.mem.eql(u8, f, "\"brackets\"")) break :blk true;
        if (std.mem.eql(u8, f, "\"repeat\"") or std.mem.eql(u8, f, "null")) break :blk false;
        return invalid(diag, "http: qsFormat must be \"brackets\" or \"repeat\"", .{});
    } else false;
    if (fa.qs) |qs_raw| {
        if (brackets) {
            try qsBrackets(&out, &has_query, qs_raw, slot, diag);
        } else if (http.Members.init(qs_raw)) |it_| {
            var it = it_;
            while (it.next()) |mem| try queryPair(&out, &has_query, mem.key, mem.value, slot, diag);
        }
    }
    if (slot) |s| if (s.qs) |q| {
        var it = q.iterator();
        while (it.next()) |e| {
            const v = e.value_ptr.*;
            if (v != .string) continue;
            try queryText(&out, &has_query, e.key_ptr.*, v.string, slot, diag);
        }
    };
    if (out.len > max_url) return invalid(diag, "http: the url is longer than {d} bytes", .{max_url});
    b.url_len = @intCast(out.len);
    const url = http.parseUrl(out.written()) catch |e| return switch (e) {
        error.BadScheme => invalid(diag, "http: the url scheme must be http or https", .{}),
        error.Userinfo => invalid(diag, "http: a user name or password in the url is not supported; use a credential", .{}),
        error.BadUrl => invalid(diag, "http: the url is not valid", .{}),
    };
    _ = url;

    // A multipart body sets its own content type (with the boundary).
    const multipart: ?[]const u8 = if (fa.multipart) |r| (if (std.mem.eql(u8, r, "null")) null else r) else null;

    // Header lines.
    var have: struct { ct: bool = false, ua: bool = false, accept: bool = false } = .{};
    if (fa.headers) |h_raw| {
        if (http.Members.init(h_raw)) |it_| {
            var it = it_;
            while (it.next()) |mem| {
                var nb: [256]u8 = undefined;
                var no: Out = .{ .buf = &nb };
                http.unescape(mem.key, &no) catch return invalid(diag, "http: a header name is longer than 256 bytes", .{});
                const name = no.written();
                if (managed(name) or injected(slot, name)) continue;
                if (std.mem.eql(u8, mem.value, "null")) continue;
                if (multipart != null and std.ascii.eqlIgnoreCase(name, "content-type")) continue;
                if (std.ascii.eqlIgnoreCase(name, "content-type")) have.ct = true;
                if (std.ascii.eqlIgnoreCase(name, "user-agent")) have.ua = true;
                if (std.ascii.eqlIgnoreCase(name, "accept")) have.accept = true;
                try headerName(&out, name, diag);
                const start = out.len;
                if (mem.value.len > 0 and mem.value[0] == '"') {
                    try headerValue(mem.value, name, slot, &out, diag);
                } else {
                    try out.put(mem.value);
                }
                try checkValue(out.written()[start..], name, diag);
                try out.put("\r\n");
            }
        }
    }
    if (slot) |s| {
        if (s.headers) |hs| {
            var it = hs.iterator();
            while (it.next()) |e| {
                const v = e.value_ptr.*;
                if (v != .string) continue;
                const name = e.key_ptr.*;
                if (managed(name)) continue;
                if (std.ascii.eqlIgnoreCase(name, "content-type")) have.ct = true;
                try headerName(&out, name, diag);
                const start = out.len;
                try templated(v.string, slot, .none, &out, diag);
                try checkValue(out.written()[start..], name, diag);
                try out.put("\r\n");
            }
        }
        if (s.basic) try basicAuth(s, slot, &out, diag);
    }
    if (!have.ua) try out.put("user-agent: n8n-wfrt\r\n");
    if (!have.accept) try out.put("accept: application/json,text/*;q=0.9,*/*;q=0.8\r\n");
    // The runtime does not decompress, so it asks for identity.
    try out.put("accept-encoding: identity\r\n");
    if (idem_key) |k| {
        try out.put("idempotency-key: ");
        try out.put(k);
        try out.put("\r\n");
    }

    // Body.
    var body_raw: ?[]const u8 = if (fa.body) |r| (if (std.mem.eql(u8, r, "null")) null else r) else null;
    const inject_body: ?std.json.ObjectMap = if (slot) |s| s.body else null;
    // A credential that authenticates in the body needs one, except on
    // GET and HEAD.
    if (body_raw == null and inject_body != null and !eq(m, "GET") and !eq(m, "HEAD") and multipart == null) body_raw = "{}";
    if (multipart) |mp| {
        if (body_raw != null) return invalid(diag, "http: a request has body or multipart, not both", .{});
        var bb: [64]u8 = undefined;
        // A boundary from the args: the same request gets the same body.
        const boundary = std.fmt.bufPrint(&bb, "----wfrt{x:0>16}", .{std.hash.Wyhash.hash(0x6d70, args)}) catch unreachable;
        try out.put("content-type: multipart/form-data; boundary=");
        try out.put(boundary);
        try out.put("\r\n");
        b.hdr_end = try deferredBody(&out, diag, MultipartBody{ .raw = mp, .boundary = boundary });
    } else if (body_raw != null and binaryRef(body_raw.?) != null) {
        const ref = binaryRef(body_raw.?).?;
        if (!have.ct) if (http.member(ref, "mimeType")) |mt| if (http.plainString(mt)) |ctv| {
            try checkValue(ctv, "content-type", diag);
            try out.put("content-type: ");
            try out.put(ctv);
            try out.put("\r\n");
        };
        b.hdr_end = try deferredBody(&out, diag, BinaryBody{ .ref = ref });
    } else if (body_raw) |br| {
        const is_string = br.len > 0 and br[0] == '"';
        if (!is_string and !have.ct) try out.put("content-type: application/json\r\n");
        const merge = inject_body != null and !is_string and br.len >= 2 and br[0] == '{';
        var counter = Out.counter();
        try writeFullBody(br, is_string, merge, slot, &counter, diag);
        try contentLength(&out, counter.len);
        try out.put("\r\n");
        b.hdr_end = @intCast(out.len);
        try writeFullBody(br, is_string, merge, slot, &out, diag);
        std.debug.assert(out.len - b.hdr_end == counter.len);
    } else {
        if (eq(m, "POST") or eq(m, "PUT") or eq(m, "PATCH")) try out.put("content-length: 0\r\n");
        try out.put("\r\n");
        b.hdr_end = @intCast(out.len);
    }
    b.body_end = @intCast(out.len);
    // The request line URL, then the headers, then the body, in `out_buf`.
    std.debug.assert(b.url_len <= b.hdr_end and b.hdr_end <= b.body_end and b.body_end <= out_buf.len);
    return b;
}

// ---- binary bodies ------------------------------------------------------------

/// `body: { "$binary": { data, id?, mimeType? } }`: the bytes of a binary
/// entry, as n8n items carry it. Null for any other body.
fn binaryRef(body: []const u8) ?[]const u8 {
    if (body.len < 2 or body[0] != '{') return null;
    const ref = http.member(body, "$binary") orelse return null;
    if (ref.len < 2 or ref[0] != '{') return null;
    return ref;
}

/// Write a body whose length is known only once it is written, then put
/// the content-length line and the blank line before it. Returns `hdr_end`.
fn deferredBody(out: *Out, diag: *Diag, writer: anytype) Error!u32 {
    // "content-length: " + 20 digits + "\r\n\r\n".
    const gap = 42;
    if (out.buf.len - out.len < gap) return error.NoSpace;
    const at = out.len + gap;
    var body: Out = .{ .buf = out.buf[at..] };
    try writer.write(&body, diag);
    const n = body.len;
    var lb: [gap]u8 = undefined;
    const line = std.fmt.bufPrint(&lb, "content-length: {d}\r\n\r\n", .{n}) catch unreachable;
    std.debug.assert(line.len <= gap);
    std.mem.copyForwards(u8, out.buf[out.len + line.len ..][0..n], out.buf[at..][0..n]);
    @memcpy(out.buf[out.len..][0..line.len], line);
    out.len += line.len;
    const hdr_end: u32 = @intCast(out.len);
    out.len += n;
    return hdr_end;
}

const BinaryBody = struct {
    ref: []const u8,
    fn write(w: BinaryBody, out: *Out, diag: *Diag) Error!void {
        return writeBinary(w.ref, out, diag);
    }
};

/// The bytes of a binary entry. When `data` is the marker of n8n's file
/// store (`filesystem-v2`), the file of `id` is read straight into the
/// free part of the request buffer, so its limit is the buffer's and there
/// is no copy; too large gives `NoSpace` and a retry in a large buffer.
/// Otherwise `data` is base64.
fn writeBinary(ref: []const u8, out: *Out, diag: *Diag) Error!void {
    const data_raw = http.member(ref, "data") orelse return invalid(diag, "http: binary data has no data", .{});
    const data = http.plainString(data_raw) orelse return invalid(diag, "http: binary data must be a base64 string", .{});
    const room = out.buf[out.len..];
    if (binary_store.isStoredMarker(data)) {
        const id = (if (http.member(ref, "id")) |r| http.plainString(r) else null) orelse return invalid(diag, "http: binary data in the file store has no id", .{});
        const no_store = "http: binary data is in n8n's file store, and WFRT_BINARY_DATA_STORAGE_PATH is not set";
        const storage = binary_store.storagePath() orelse return invalid(diag, no_store, .{});
        var fba = std.heap.FixedBufferAllocator.init(room);
        const shown = id[0..@min(id.len, 120)];
        const bytes = binary_store.read(fba.allocator(), storage, id, room.len) catch |e| return switch (e) {
            error.TooLarge, error.OutOfMemory => error.NoSpace,
            error.NoStore => invalid(diag, no_store, .{}),
            error.BadId => invalid(diag, "http: binary data id \"{s}\" is not a file store id", .{shown}),
            error.NotFound => invalid(diag, "http: binary data \"{s}\" is not in the file store", .{shown}),
            error.Io => invalid(diag, "http: binary data \"{s}\" could not be read", .{shown}),
        };
        std.debug.assert(bytes.len == 0 or bytes.ptr == room.ptr);
        out.len += bytes.len;
        return;
    }
    const n = std.base64.standard.Decoder.calcSizeForSlice(data) catch return invalid(diag, "http: binary data is not valid base64", .{});
    if (n > room.len) return error.NoSpace;
    std.base64.standard.Decoder.decode(room[0..n], data) catch return invalid(diag, "http: binary data is not valid base64", .{});
    out.len += n;
}

/// `multipart: [ { name, value } | { name, binary: { data, id?, mimeType?, fileName? } } ]`.
const MultipartBody = struct {
    raw: []const u8,
    boundary: []const u8,

    fn write(w: MultipartBody, out: *Out, diag: *Diag) Error!void {
        var it = http.Elements.init(w.raw) orelse return invalid(diag, "http: multipart must be an array", .{});
        var guard: u32 = 0;
        while (it.next()) |part| : (guard += 1) {
            if (guard >= 1024) return invalid(diag, "http: multipart has more than 1024 parts", .{});
            const name_raw = http.member(part, "name") orelse return invalid(diag, "http: a multipart part has no name", .{});
            try out.put("--");
            try out.put(w.boundary);
            try out.put("\r\ncontent-disposition: form-data; name=\"");
            try dispositionValue(out, name_raw, diag);
            try out.byte('"');
            if (http.member(part, "binary")) |bin| {
                if (http.member(bin, "fileName")) |f| {
                    try out.put("; filename=\"");
                    try dispositionValue(out, f, diag);
                    try out.byte('"');
                }
                try out.put("\r\n");
                if (http.member(bin, "mimeType")) |mt| if (http.plainString(mt)) |t| {
                    try checkValue(t, "content-type", diag);
                    try out.put("content-type: ");
                    try out.put(t);
                    try out.put("\r\n");
                };
                try out.put("\r\n");
                try writeBinary(bin, out, diag);
            } else {
                try out.put("\r\n\r\n");
                const v = http.member(part, "value") orelse "\"\"";
                if (v.len > 0 and v[0] == '"') {
                    http.unescape(v, out) catch |e| return if (e == error.NoSpace) error.NoSpace else invalid(diag, "http: a multipart value is not valid", .{});
                } else if (!std.mem.eql(u8, v, "null")) {
                    try out.put(v);
                }
            }
            try out.put("\r\n");
        }
        try out.put("--");
        try out.put(w.boundary);
        try out.put("--\r\n");
    }
};

/// A name or file name in content-disposition: quotes and line breaks
/// are percent-encoded, as browsers and form-data do.
fn dispositionValue(out: *Out, raw: []const u8, diag: *Diag) Error!void {
    var nb: [512]u8 = undefined;
    var no: Out = .{ .buf = &nb };
    http.unescape(raw, &no) catch return invalid(diag, "http: a multipart name is not a string of at most 512 bytes", .{});
    for (no.written()) |c| switch (c) {
        '"' => try out.put("%22"),
        '\r' => try out.put("%0D"),
        '\n' => try out.put("%0A"),
        else => try out.byte(c),
    };
}

/// The URL cleanup of the WHATWG URL parser, which n8n (Node.js `URL`)
/// applies to every URL: C0 controls and spaces at either end go, and tab,
/// CR and LF go wherever they are (for example a URL that ends in "\n\n").
/// In place; returns the new length.
fn whatwgClean(u: []u8) usize {
    var start: usize = 0;
    while (start < u.len and u[start] <= 0x20) start += 1;
    var end: usize = u.len;
    while (end > start and u[end - 1] <= 0x20) end -= 1;
    var w: usize = 0;
    for (u[start..end]) |c| {
        if (c == '\t' or c == '\r' or c == '\n') continue;
        u[w] = c;
        w += 1;
    }
    return w;
}

// ---- qs in brackets form -----------------------------------------------------------

/// The deepest nesting of `qs` that `qsFormat: "brackets"` writes.
pub const max_qs_depth = 32;
/// The longest key path, such as `sort[0][field]`, before encoding.
const max_qs_key = 1024;

/// `qs` as the qs library's `stringify` writes it with n8n's options (the
/// defaults: `arrayFormat: "indices"`, encoding on): nested objects and
/// arrays become `a[b][0]=v`, with the key percent-encoded too; null is
/// `key=`; empty arrays and objects write nothing; values are encoded as
/// RFC 3986 says (only `A-Z a-z 0-9 - . _ ~` stay). An explicit stack,
/// not recursion, walks the value.
fn qsBrackets(out: *Out, has_query: *bool, qs_raw: []const u8, slot: ?creds.Slot, diag: *Diag) Error!void {
    @setRuntimeSafety(false);
    var st: QsState = undefined;
    return qsBracketsWith(out, has_query, qs_raw, slot, diag, &st);
}

const QsFrame = struct {
    obj: bool,
    members: http.Members = undefined,
    elems: http.Elements = undefined,
    /// The key path of this container: `key[0..key_len]`.
    key_len: usize,
    index: u32 = 0,
};

const QsState = struct {
    stack: [max_qs_depth]QsFrame,
    key: [max_qs_key]u8,
    tmp: Tmp,
};

fn qsBracketsWith(out: *Out, has_query: *bool, qs_raw: []const u8, slot: ?creds.Slot, diag: *Diag, st: *QsState) Error!void {
    const root = http.Members.init(qs_raw) orelse return; // Not an object: nothing, as before.
    st.stack[0] = .{ .obj = true, .members = root, .key_len = 0 };
    var depth: usize = 1;
    // Each pass takes one member or element, or leaves a container: the
    // bytes of `qs_raw` bound the passes.
    var guard: usize = 0;
    while (depth > 0 and guard <= 2 * qs_raw.len + 2) : (guard += 1) {
        const f = &st.stack[depth - 1];
        var key_len = f.key_len;
        var value: []const u8 = undefined;
        if (f.obj) {
            const m = f.members.next() orelse {
                depth -= 1;
                continue;
            };
            value = m.value;
            // `name` at the top, `[name]` below it.
            var ko: Out = .{ .buf = st.key[key_len..] };
            if (key_len > 0) ko.byte('[') catch return qsKeyTooLong(diag);
            http.unescape(m.key, &ko) catch return invalid(diag, "http: a qs key is not a string of at most {d} bytes", .{max_qs_key});
            if (key_len > 0) ko.byte(']') catch return qsKeyTooLong(diag);
            key_len += ko.len;
        } else {
            value = f.elems.next() orelse {
                depth -= 1;
                continue;
            };
            const w = std.fmt.bufPrint(st.key[key_len..], "[{d}]", .{f.index}) catch return qsKeyTooLong(diag);
            f.index += 1;
            key_len += w.len;
        }
        if (value.len > 0 and (value[0] == '{' or value[0] == '[')) {
            if (depth == max_qs_depth) return invalid(diag, "http: qs is nested deeper than {d} levels", .{max_qs_depth});
            st.stack[depth] = if (value[0] == '{')
                .{ .obj = true, .members = http.Members.init(value) orelse return invalid(diag, "http: qs holds an object that is not valid", .{}), .key_len = key_len }
            else
                .{ .obj = false, .elems = http.Elements.init(value) orelse return invalid(diag, "http: qs holds an array that is not valid", .{}), .key_len = key_len };
            depth += 1;
            continue;
        }
        try qsLeaf(out, has_query, st.key[0..key_len], value, slot, diag, &st.tmp);
    }
}

fn qsKeyTooLong(diag: *Diag) Error {
    return invalid(diag, "http: a qs key path is longer than {d} bytes", .{max_qs_key});
}

/// One `key=value`: a string unescaped (with credential templates), a
/// number or boolean as its text, null as nothing.
fn qsLeaf(out: *Out, has_query: *bool, key: []const u8, value: []const u8, slot: ?creds.Slot, diag: *Diag, tmp: *Tmp) Error!void {
    try out.byte(if (has_query.*) '&' else '?');
    has_query.* = true;
    try writeRfc3986(out, key);
    try out.byte('=');
    if (std.mem.eql(u8, value, "null")) return;
    if (value.len == 0 or value[0] != '"') return writeRfc3986(out, value);
    var vo: Out = .{ .buf = &tmp.buf };
    http.unescape(value, &vo) catch return invalid(diag, "http: a qs value is longer than {d} bytes", .{max_url});
    if (slot != null and creds.hasTemplate(vo.written())) {
        var t2: Tmp = undefined;
        var so: Out = .{ .buf = &t2.buf };
        templated(vo.written(), slot, .none, &so, diag) catch |e| return if (e == error.NoSpace) invalid(diag, "http: a qs value is too long", .{}) else e;
        return writeRfc3986(out, so.written());
    }
    return writeRfc3986(out, vo.written());
}

/// Percent-encoding as the qs library does it (RFC 3986): every byte but
/// `A-Z a-z 0-9 - . _ ~`, also `! ' ( ) *`.
fn writeRfc3986(out: *Out, s: []const u8) Error!void {
    const hex = "0123456789ABCDEF";
    var start: usize = 0;
    for (s, 0..) |c, i| {
        if (std.ascii.isAlphanumeric(c) or c == '-' or c == '.' or c == '_' or c == '~') continue;
        try out.put(s[start..i]);
        try out.put(&[3]u8{ '%', hex[c >> 4], hex[c & 15] });
        start = i + 1;
    }
    try out.put(s[start..]);
}

/// The members of the `http` args that `build` reads. The first of a
/// repeated key wins, as `http.member` does.
const Args = struct {
    method: ?[]const u8 = null,
    credential: ?[]const u8 = null,
    timeout_ms: ?[]const u8 = null,
    url: ?[]const u8 = null,
    qs: ?[]const u8 = null,
    headers: ?[]const u8 = null,
    body: ?[]const u8 = null,
    multipart: ?[]const u8 = null,
    qs_format: ?[]const u8 = null,
};

fn readArgs(args: []const u8) Args {
    var a: Args = .{};
    var it = http.Members.init(args) orelse return a;
    var guard: usize = 0;
    while (it.next()) |mem| : (guard += 1) {
        if (guard > args.len) break;
        const k = mem.key;
        const slot: *?[]const u8 = if (eq(k, "\"method\"")) &a.method else if (eq(k, "\"credential\"")) &a.credential else if (eq(k, "\"timeoutMs\"")) &a.timeout_ms else if (eq(k, "\"url\"")) &a.url else if (eq(k, "\"qs\"")) &a.qs else if (eq(k, "\"headers\"")) &a.headers else if (eq(k, "\"body\"")) &a.body else if (eq(k, "\"multipart\"")) &a.multipart else if (eq(k, "\"qsFormat\"")) &a.qs_format else continue;
        if (slot.* == null) slot.* = mem.value;
    }
    return a;
}

fn eq(a: []const u8, b: []const u8) bool {
    return std.mem.eql(u8, a, b);
}

fn invalid(diag: *Diag, comptime fmt: []const u8, args: anytype) Error {
    diag.set(fmt, args);
    return error.Invalid;
}

/// Headers the client writes itself; values from args are dropped.
fn managed(name: []const u8) bool {
    const names = [_][]const u8{ "host", "content-length", "transfer-encoding", "connection", "accept-encoding", "idempotency-key" };
    for (names) |n| if (std.ascii.eqlIgnoreCase(n, name)) return true;
    return false;
}

/// A header the credential sets wins over the same header in args.
fn injected(slot: ?creds.Slot, name: []const u8) bool {
    const s = slot orelse return false;
    if (s.basic and std.ascii.eqlIgnoreCase(name, "authorization")) return true;
    const hs = s.headers orelse return false;
    var it = hs.iterator();
    while (it.next()) |e| if (std.ascii.eqlIgnoreCase(e.key_ptr.*, name)) return true;
    return false;
}

fn headerName(out: *Out, name: []const u8, diag: *Diag) Error!void {
    if (name.len == 0) return invalid(diag, "http: a header name is empty", .{});
    for (name) |c| {
        const ok = std.ascii.isAlphanumeric(c) or std.mem.indexOfScalar(u8, "!#$%&'*+-.^_`|~", c) != null;
        if (!ok) return invalid(diag, "http: header name \"{s}\" is not valid", .{name[0..@min(name.len, 64)]});
    }
    try out.put(name);
    try out.put(": ");
}

fn checkValue(v: []const u8, name: []const u8, diag: *Diag) Error!void {
    for (v) |c| if (c == '\r' or c == '\n' or c == 0) return invalid(diag, "http: the value of header \"{s}\" has a line break", .{name[0..@min(name.len, 64)]});
}

fn contentLength(out: *Out, n: usize) Error!void {
    var b: [40]u8 = undefined;
    try out.put(std.fmt.bufPrint(&b, "content-length: {d}\r\n", .{n}) catch unreachable);
}

/// Copy `s` with credential templates replaced, if a slot is set.
fn templated(s: []const u8, slot: ?creds.Slot, esc: creds.Escape, out: *Out, diag: *Diag) Error!void {
    const sl = slot orelse return out.put(s);
    if (!creds.hasTemplate(s)) return out.put(s);
    var missing: []const u8 = "";
    creds.substitute(s, sl.data, esc, out, &missing) catch |e| return switch (e) {
        error.NoSpace => error.NoSpace,
        error.MissingValue => invalid(diag, "credential \"{s}\" has no value at \"{s}\"", .{ sl.name[0..@min(sl.name.len, 64)], missing[0..@min(missing.len, 64)] }),
    };
}

/// The wrappers below declare a `Tmp` with runtime safety off, as `build`
/// does: safe builds would fill its 8 KB with 0xAA on every use. The
/// function they call keeps its safety checks.
fn headerValue(raw: []const u8, name: []const u8, slot: ?creds.Slot, out: *Out, diag: *Diag) Error!void {
    @setRuntimeSafety(false);
    var vt: Tmp = undefined;
    return headerValueWith(raw, name, slot, out, diag, &vt);
}

fn headerValueWith(raw: []const u8, name: []const u8, slot: ?creds.Slot, out: *Out, diag: *Diag, vt: *Tmp) Error!void {
    var vo: Out = .{ .buf = &vt.buf };
    http.unescape(raw, &vo) catch return invalid(diag, "http: the value of header \"{s}\" is too long", .{name[0..@min(name.len, 64)]});
    try templated(vo.written(), slot, .none, out, diag);
}

fn basicAuth(s: creds.Slot, slot: ?creds.Slot, out: *Out, diag: *Diag) Error!void {
    @setRuntimeSafety(false);
    var up: Tmp = undefined;
    return basicAuthWith(s, slot, out, diag, &up);
}

fn basicAuthWith(s: creds.Slot, slot: ?creds.Slot, out: *Out, diag: *Diag, up: *Tmp) Error!void {
    var uo: Out = .{ .buf = &up.buf };
    try templated(s.basic_user, slot, .none, &uo, diag);
    uo.byte(':') catch return invalid(diag, "http: basic auth values are too long", .{});
    try templated(s.basic_password, slot, .none, &uo, diag);
    const enc_len = std.base64.standard.Encoder.calcSize(uo.len);
    try out.put("authorization: Basic ");
    if (out.len + enc_len > out.buf.len) return error.NoSpace;
    _ = std.base64.standard.Encoder.encode(out.buf[out.len..][0..enc_len], uo.written());
    out.len += enc_len;
    try out.put("\r\n");
}

/// One `qs` member. Strings, numbers and booleans become one pair; an
/// array becomes one pair for each element; null is left out; an object
/// is sent as JSON text.
fn queryPair(out: *Out, has_query: *bool, key_raw: []const u8, val_raw: []const u8, slot: ?creds.Slot, diag: *Diag) Error!void {
    @setRuntimeSafety(false);
    var kt: Tmp = undefined;
    return queryPairWith(out, has_query, key_raw, val_raw, slot, diag, &kt);
}

fn queryPairWith(out: *Out, has_query: *bool, key_raw: []const u8, val_raw: []const u8, slot: ?creds.Slot, diag: *Diag, kt: *Tmp) Error!void {
    var ko: Out = .{ .buf = &kt.buf };
    http.unescape(key_raw, &ko) catch return invalid(diag, "http: a qs key is not valid", .{});
    if (http.Elements.init(val_raw)) |it_| {
        var it = it_;
        var guard: u32 = 0;
        while (it.next()) |el| : (guard += 1) {
            if (guard >= 1024) return invalid(diag, "http: a qs array has more than 1024 elements", .{});
            try queryValue(out, has_query, ko.written(), el, slot, diag);
        }
        return;
    }
    try queryValue(out, has_query, ko.written(), val_raw, slot, diag);
}

fn queryValue(out: *Out, has_query: *bool, key: []const u8, val_raw: []const u8, slot: ?creds.Slot, diag: *Diag) Error!void {
    if (std.mem.eql(u8, val_raw, "null") or val_raw.len == 0) return;
    if (val_raw[0] != '"') return queryText(out, has_query, key, val_raw, null, diag);
    return queryValueStr(out, has_query, key, val_raw, slot, diag);
}

fn queryValueStr(out: *Out, has_query: *bool, key: []const u8, val_raw: []const u8, slot: ?creds.Slot, diag: *Diag) Error!void {
    @setRuntimeSafety(false);
    var vt: Tmp = undefined;
    return queryValueWith(out, has_query, key, val_raw, slot, diag, &vt);
}

fn queryValueWith(out: *Out, has_query: *bool, key: []const u8, val_raw: []const u8, slot: ?creds.Slot, diag: *Diag, vt: *Tmp) Error!void {
    var vo: Out = .{ .buf = &vt.buf };
    http.unescape(val_raw, &vo) catch return invalid(diag, "http: a qs value is too long", .{});
    try queryText(out, has_query, key, vo.written(), slot, diag);
}

fn queryText(out: *Out, has_query: *bool, key: []const u8, text: []const u8, slot: ?creds.Slot, diag: *Diag) Error!void {
    try out.byte(if (has_query.*) '&' else '?');
    has_query.* = true;
    try http.writeQueryComponent(out, key);
    try out.byte('=');
    if (slot != null and creds.hasTemplate(text)) return queryTemplated(out, text, slot, diag);
    try http.writeQueryComponent(out, text);
}

fn queryTemplated(out: *Out, text: []const u8, slot: ?creds.Slot, diag: *Diag) Error!void {
    @setRuntimeSafety(false);
    var st: Tmp = undefined;
    return queryTemplatedWith(out, text, slot, diag, &st);
}

fn queryTemplatedWith(out: *Out, text: []const u8, slot: ?creds.Slot, diag: *Diag, st: *Tmp) Error!void {
    var so: Out = .{ .buf = &st.buf };
    templated(text, slot, .none, &so, diag) catch |e| return if (e == error.NoSpace) invalid(diag, "http: a qs value is too long", .{}) else e;
    return http.writeQueryComponent(out, so.written());
}

/// The body, with the credential's `inject.body` members added at the
/// end of a JSON object. A repeated key is fine: the last one wins in
/// JSON.parse.
fn writeFullBody(raw: []const u8, is_string: bool, merge: bool, slot: ?creds.Slot, out: *Out, diag: *Diag) Error!void {
    if (!merge) return writeBody(raw, is_string, slot, out, diag);
    const t = std.mem.trimEnd(u8, raw, " \t\r\n");
    std.debug.assert(t.len >= 2 and t[t.len - 1] == '}');
    const inner = t[0 .. t.len - 1];
    try writeBody(inner, false, slot, out, diag);
    var first = std.mem.trim(u8, inner[1..], " \t\r\n").len == 0;
    var it = slot.?.body.?.iterator();
    while (it.next()) |e| {
        if (!first) try out.byte(',');
        first = false;
        try out.byte('"');
        try creds.writeJsonStringBody(out, e.key_ptr.*);
        try out.put("\":");
        switch (e.value_ptr.*) {
            .string => |sv| {
                try out.byte('"');
                try templated(sv, slot, .json_string, out, diag);
                try out.byte('"');
            },
            .number_string => |n| try out.put(n),
            .bool => |v| try out.put(if (v) "true" else "false"),
            else => try out.put("null"),
        }
    }
    try out.byte('}');
}

fn stringBodyTemplated(raw: []const u8, slot: ?creds.Slot, out: *Out, diag: *Diag) Error!void {
    @setRuntimeSafety(false);
    var st: Tmp = undefined;
    return stringBodyTemplatedWith(raw, slot, out, diag, &st);
}

/// Replace inside the escaped text, escaping the values, then decode the
/// result once.
fn stringBodyTemplatedWith(raw: []const u8, slot: ?creds.Slot, out: *Out, diag: *Diag, st: *Tmp) Error!void {
    var so: Out = .{ .buf = &st.buf };
    templated(raw, slot, .json_string, &so, diag) catch |e| return if (e == error.NoSpace) invalid(diag, "http: a string body with credential templates must be shorter than {d} bytes", .{max_url}) else e;
    return http.unescape(so.written(), out) catch |e| if (e == error.NoSpace) error.NoSpace else invalid(diag, "http: the body string is not valid", .{});
}

/// The body bytes. A string is sent as its text; anything else as JSON.
/// With a credential, templates in string values are replaced.
fn writeBody(raw: []const u8, is_string: bool, slot: ?creds.Slot, out: *Out, diag: *Diag) Error!void {
    if (is_string) {
        if (slot != null and creds.hasTemplate(raw)) {
            return stringBodyTemplated(raw, slot, out, diag);
        }
        return http.unescape(raw, out) catch |e| if (e == error.NoSpace) error.NoSpace else invalid(diag, "http: the body string is not valid", .{});
    }
    if (slot == null or !creds.hasTemplate(raw)) return out.put(raw);
    // JSON: replace templates in string values, never in keys.
    var i: usize = 0;
    while (i < raw.len) {
        const q = std.mem.indexOfScalarPos(u8, raw, i, '"') orelse {
            try out.put(raw[i..]);
            return;
        };
        try out.put(raw[i..q]);
        var end = q + 1;
        while (end < raw.len and raw[end] != '"') : (end += 1) {
            if (raw[end] == '\\') end += 1;
        }
        end = @min(end + 1, raw.len);
        var k = end;
        while (k < raw.len and (raw[k] == ' ' or raw[k] == '\n' or raw[k] == '\t' or raw[k] == '\r')) k += 1;
        const is_key = k < raw.len and raw[k] == ':';
        if (is_key) try out.put(raw[q..end]) else try templated(raw[q..end], slot, .json_string, out, diag);
        i = end;
    }
}

test "build a request with qs, headers and a JSON body" {
    var buf: [2048]u8 = undefined;
    var diag: Diag = .{};
    const args =
        \\{"name":"Call","method":"post","url":"https://api.example.com/v1/x?a=1#frag","headers":{"X-Trace":"t 1","Host":"evil","n":5},
        \\"qs":{"q":"a b","list":[1,"two"],"skip":null,"t":true},"body":{"k":"v"}}
    ;
    const b = try build(args, null, "abc", &buf, &diag);
    try std.testing.expectEqualStrings("POST", b.method());
    try std.testing.expectEqualStrings("https://api.example.com/v1/x?a=1&q=a%20b&list=1&list=two&t=true", buf[0..b.url_len]);
    const hdrs = buf[b.url_len..b.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "X-Trace: t 1\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "n: 5\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "evil") == null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "content-type: application/json\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "content-length: 9\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "idempotency-key: abc\r\n") != null);
    try std.testing.expect(std.mem.endsWith(u8, hdrs, "\r\n\r\n"));
    try std.testing.expectEqualStrings("{\"k\":\"v\"}", buf[b.hdr_end..b.body_end]);
    try std.testing.expect(b.retry_safe);
}

test "string body, header injection, errors" {
    var buf: [1024]u8 = undefined;
    var diag: Diag = .{};
    const b = try build("{\"method\":\"PUT\",\"url\":\"http://h/\",\"body\":\"a\\nb\",\"headers\":{\"content-type\":\"text/plain\"}}", null, null, &buf, &diag);
    try std.testing.expectEqualStrings("a\nb", buf[b.hdr_end..b.body_end]);
    try std.testing.expect(std.mem.indexOf(u8, buf[b.url_len..b.hdr_end], "content-type: application/json") == null);
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://h/\",\"headers\":{\"x\":\"a\\r\\nset: 1\"}}", null, null, &buf, &diag));
    try std.testing.expectEqualStrings("http: the value of header \"x\" has a line break", diag.text());
    try std.testing.expectError(error.Invalid, build("{\"url\":\"ftp://h/\"}", null, null, &buf, &diag));
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://h/\",\"credential\":\"gh\"}", null, null, &buf, &diag));
    try std.testing.expectEqualStrings("credential \"gh\" is not configured", diag.text());
    var small: [40]u8 = undefined;
    try std.testing.expectError(error.NoSpace, build("{\"url\":\"http://h/\",\"body\":{\"k\":\"vvvvvvvvvvvvvvvvvvvvvvv\"}}", null, null, &small, &diag));
}

test "credential injection and templates" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const store = try creds.Store.parse(arena.allocator(),
        \\{"api":{"data":{"token":"T\"1","user":"u","pw":"p","bot":"123"},
        \\ "inject":{"headers":{"Authorization":"Bearer {{$credentials.token}}"},"qs":{"key":"{{$credentials.token}}"}}},
        \\ "bm":{"data":{"t":"tok"},"inject":{"body":{"auth_token":"{{$credentials.t}}","n":1}}},
        \\ "basic":{"data":{"user":"u","pw":"p"},"inject":{"basicAuth":{"user":"{{$credentials.user}}","password":"{{$credentials.pw}}"}}}}
    );
    var buf: [2048]u8 = undefined;
    var diag: Diag = .{};
    const args =
        \\{"url":"https://t.me/bot{{$credentials.bot}}/send","credential":"api","method":"POST",
        \\"headers":{"authorization":"mine"},"body":{"{{$credentials.token}}":"x {{$credentials.token}}"}}
    ;
    const b = try build(args, &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("https://t.me/bot123/send?key=T%221", buf[0..b.url_len]);
    const hdrs = buf[b.url_len..b.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "Authorization: Bearer T\"1\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "mine") == null);
    try std.testing.expectEqualStrings("{\"{{$credentials.token}}\":\"x T\\\"1\"}", buf[b.hdr_end..b.body_end]);
    const c = try build("{\"url\":\"http://h/\",\"credential\":\"basic\"}", &store, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[c.url_len..c.hdr_end], "authorization: Basic dTpw\r\n") != null);
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://h/{{$credentials.nope}}\",\"credential\":\"basic\"}", &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("credential \"basic\" has no value at \"nope\"", diag.text());
    const d = try build("{\"method\":\"POST\",\"url\":\"http://h/\",\"credential\":\"bm\",\"body\":{\"v\":2}}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("{\"v\":2,\"auth_token\":\"tok\",\"n\":1}", buf[d.hdr_end..d.body_end]);
    const e = try build("{\"method\":\"POST\",\"url\":\"http://h/\",\"credential\":\"bm\"}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("{\"auth_token\":\"tok\",\"n\":1}", buf[e.hdr_end..e.body_end]);
}

test "a credentials file that wfc credentials wrote" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    // Output of `wfc credentials` for a fake export (no real secrets).
    const store = try creds.Store.parse(arena.allocator(),
        \\{"api":{"type":"httpHeaderAuth","data":{"name":"X-Api-Key","value":"fake-key","useCustomAuth":""},
        \\  "inject":{"headers":{"X-Api-Key":"{{$credentials.value}}"}}},
        \\ "gh":{"type":"githubApi","data":{"server":"https://api.github.com","user":"","accessToken":"fake-gh"},
        \\  "inject":{"headers":{"Authorization":"token {{$credentials.accessToken}}"}}},
        \\ "bm":{"type":"beeminderApi","data":{"authToken":"fake-bm","user":"u"},
        \\  "inject":{"body":{"auth_token":"{{$credentials.authToken}}"}}}}
    );
    var buf: [2048]u8 = undefined;
    var diag: Diag = .{};
    const a = try build("{\"url\":\"https://x.io/\",\"credential\":\"api\"}", &store, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[a.url_len..a.hdr_end], "X-Api-Key: fake-key\r\n") != null);
    const g = try build("{\"url\":\"{{$credentials.server}}/user\",\"credential\":\"gh\"}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("https://api.github.com/user", buf[0..g.url_len]);
    try std.testing.expect(std.mem.indexOf(u8, buf[g.url_len..g.hdr_end], "Authorization: token fake-gh\r\n") != null);
    const b = try build("{\"method\":\"POST\",\"url\":\"https://www.beeminder.com/api/v1/users/u/goals/g/datapoints.json\",\"credential\":\"bm\",\"body\":{\"value\":1}}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("{\"value\":1,\"auth_token\":\"fake-bm\"}", buf[b.hdr_end..b.body_end]);
}

test "binary body: base64, the file store, multipart, and a retry in a larger buffer" {
    var buf: [4096]u8 = undefined;
    var diag: Diag = .{};
    // Base64; the entry's mimeType is the content type.
    const b64 = "{\"method\":\"POST\",\"url\":\"http://x.io/u\",\"body\":{\"$binary\":{\"data\":\"aGVsbG8gYnl0ZXM=\",\"mimeType\":\"image/png\"}}}";
    var b = try build(b64, null, null, &buf, &diag);
    var hdrs = buf[b.url_len..b.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "content-type: image/png\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "content-length: 11\r\n") != null);
    try std.testing.expect(std.mem.endsWith(u8, hdrs, "\r\n\r\n"));
    try std.testing.expectEqualStrings("hello bytes", buf[b.hdr_end..b.body_end]);

    // The file store: a file under workflows/<wf>/executions/<e>/binary_data/.
    var tmp = std.testing.tmpDir(.{});
    defer tmp.cleanup();
    var dir_buf: [256]u8 = undefined;
    const dir = try std.fmt.bufPrint(&dir_buf, ".zig-cache/tmp/{s}", .{tmp.sub_path});
    const parts = [_][]const u8{ "workflows", "wf1", "executions", "7", "binary_data" };
    var path_buf: [512]u8 = undefined;
    var plen: usize = dir.len;
    @memcpy(path_buf[0..dir.len], dir);
    for (parts) |p| {
        path_buf[plen] = '/';
        @memcpy(path_buf[plen + 1 ..][0..p.len], p);
        plen += 1 + p.len;
        path_buf[plen] = 0;
        _ = std.c.mkdir(path_buf[0..plen :0], 0o755);
    }
    const file = try std.fmt.bufPrintSentinel(path_buf[plen + 1 ..], "{s}/f-1", .{path_buf[0..plen]}, 0);
    const fd = std.c.open(file, .{ .ACCMODE = .WRONLY, .CREAT = true, .TRUNC = true }, @as(std.c.mode_t, 0o600));
    try std.testing.expect(fd >= 0);
    const content = "stored bytes";
    try std.testing.expectEqual(@as(isize, content.len), std.c.write(fd, content.ptr, content.len));
    _ = std.c.close(fd);
    var env: [512]u8 = undefined;
    const storage = try std.fmt.bufPrintSentinel(&env, "{s}", .{dir}, 0);
    const Env = struct {
        extern "c" fn setenv(name: [*:0]const u8, value: [*:0]const u8, overwrite: c_int) c_int;
        extern "c" fn unsetenv(name: [*:0]const u8) c_int;
    };
    try std.testing.expectEqual(@as(c_int, 0), Env.setenv("WFRT_BINARY_DATA_STORAGE_PATH", storage, 1));
    defer _ = Env.unsetenv("WFRT_BINARY_DATA_STORAGE_PATH");
    const stored = "{\"method\":\"PUT\",\"url\":\"http://x.io/u\",\"body\":{\"$binary\":{\"data\":\"filesystem-v2\",\"id\":\"filesystem-v2:workflows/wf1/executions/7/binary_data/f-1\"}}}";
    b = try build(stored, null, null, &buf, &diag);
    try std.testing.expectEqualStrings("stored bytes", buf[b.hdr_end..b.body_end]);
    try std.testing.expect(std.mem.indexOf(u8, buf[b.url_len..b.hdr_end], "content-length: 12\r\n") != null);

    // Too large for a small buffer: NoSpace, so egress builds it again in a large one.
    var small: [160]u8 = undefined;
    try std.testing.expectError(error.NoSpace, build(stored, null, null, &small, &diag));
    // A missing file and an id outside the store fail with a reason.
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://x.io/\",\"method\":\"POST\",\"body\":{\"$binary\":{\"data\":\"filesystem-v2\",\"id\":\"filesystem-v2:workflows/wf1/executions/7/binary_data/none\"}}}", null, null, &buf, &diag));
    try std.testing.expect(std.mem.indexOf(u8, diag.text(), "not in the file store") != null);
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://x.io/\",\"method\":\"POST\",\"body\":{\"$binary\":{\"data\":\"filesystem-v2\",\"id\":\"filesystem-v2:../../etc/passwd\"}}}", null, null, &buf, &diag));
    try std.testing.expect(std.mem.indexOf(u8, diag.text(), "not a file store id") != null);
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://x.io/\",\"method\":\"POST\",\"body\":{\"$binary\":{\"data\":\"*not base64*\"}}}", null, null, &buf, &diag));

    // Multipart: a text part and a stored file part; the user's content type is replaced.
    const mp = "{\"method\":\"POST\",\"url\":\"http://x.io/up\",\"headers\":{\"content-type\":\"text/plain\"},\"multipart\":[{\"name\":\"note\",\"value\":\"hi \\\"there\\\"\"},{\"name\":\"fi\\\"le\",\"binary\":{\"data\":\"filesystem-v2\",\"id\":\"filesystem-v2:workflows/wf1/executions/7/binary_data/f-1\",\"fileName\":\"a.txt\",\"mimeType\":\"text/plain\"}}]}";
    b = try build(mp, null, null, &buf, &diag);
    hdrs = buf[b.url_len..b.hdr_end];
    const key = "content-type: multipart/form-data; boundary=";
    const ct_at = std.mem.indexOf(u8, hdrs, key).?;
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "text/plain") == null);
    const bline = hdrs[ct_at + key.len ..];
    const boundary = bline[0..std.mem.indexOf(u8, bline, "\r\n").?];
    const body = buf[b.hdr_end..b.body_end];
    var want_buf: [1024]u8 = undefined;
    const want = try std.fmt.bufPrint(&want_buf, "--{s}\r\ncontent-disposition: form-data; name=\"note\"\r\n\r\nhi \"there\"\r\n--{s}\r\ncontent-disposition: form-data; name=\"fi%22le\"; filename=\"a.txt\"\r\ncontent-type: text/plain\r\n\r\nstored bytes\r\n--{s}--\r\n", .{ boundary, boundary, boundary });
    try std.testing.expectEqualStrings(want, body);
    var clb: [64]u8 = undefined;
    try std.testing.expect(std.mem.indexOf(u8, hdrs, try std.fmt.bufPrint(&clb, "content-length: {d}\r\n", .{body.len})) != null);
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://x.io/\",\"method\":\"POST\",\"body\":\"x\",\"multipart\":[]}", null, null, &buf, &diag));
}

test "url: the WHATWG cleanup of n8n's URL parser (ends, tab, CR, LF)" {
    var buf: [1024]u8 = undefined;
    var diag: Diag = .{};
    const b = try build("{\"method\":\"GET\",\"url\":\" \\thttps://api.ex\\nample.com/a\\tb?x=1\\n\\n\"}", null, null, &buf, &diag);
    try std.testing.expectEqualStrings("https://api.example.com/ab?x=1", buf[0..b.url_len]);
    var u = "\x00\x1f https://x.io/p \x01".*;
    try std.testing.expectEqualStrings("https://x.io/p", u[0..whatwgClean(&u)]);
}

test "qs brackets form: byte-equal to the qs library (n8n's options)" {
    // From qs 6.16 `stringify` (bench: node -e "qs.stringify(case)").
    const cases = [_][2][]const u8{
        .{ "{\"sort\":[{\"field\":\"name\",\"direction\":\"asc\"}]}", "sort%5B0%5D%5Bfield%5D=name&sort%5B0%5D%5Bdirection%5D=asc" },
        .{ "{\"filterByFormula\":\"AND({a}=1, {b}!=\\\"x\\\")\",\"maxRecords\":3}", "filterByFormula=AND%28%7Ba%7D%3D1%2C%20%7Bb%7D%21%3D%22x%22%29&maxRecords=3" },
        .{ "{\"a\":{\"b\":{\"c\":[1,2,{\"d\":\"e\"}]}}}", "a%5Bb%5D%5Bc%5D%5B0%5D=1&a%5Bb%5D%5Bc%5D%5B1%5D=2&a%5Bb%5D%5Bc%5D%5B2%5D%5Bd%5D=e" },
        .{ "{\"n\":null,\"t\":true,\"f\":false,\"z\":0,\"neg\":-1.5,\"e\":\"\"}", "n=&t=true&f=false&z=0&neg=-1.5&e=" },
        .{ "{\"emp\":[],\"eo\":{},\"keep\":\"k\"}", "keep=k" },
        .{ "{\"we ird\":\"sp ace\",\"k[x]\":\"v\"}", "we%20ird=sp%20ace&k%5Bx%5D=v" },
        .{ "{\"u\":\"é漢😀\",\"s\":\"~*()!'.-_\"}", "u=%C3%A9%E6%BC%A2%F0%9F%98%80&s=~%2A%28%29%21%27.-_" },
        .{ "{\"list\":[\"a\",\"b\",\"c\"],\"m\":[[1,2],[3]]}", "list%5B0%5D=a&list%5B1%5D=b&list%5B2%5D=c&m%5B0%5D%5B0%5D=1&m%5B0%5D%5B1%5D=2&m%5B1%5D%5B0%5D=3" },
    };
    for (cases) |c| {
        var args_buf: [1024]u8 = undefined;
        const args = try std.fmt.bufPrint(&args_buf, "{{\"url\":\"https://x.io/p\",\"qsFormat\":\"brackets\",\"qs\":{s}}}", .{c[0]});
        var buf: [2048]u8 = undefined;
        var diag: Diag = .{};
        const b = try build(args, null, null, &buf, &diag);
        const url = buf[0..b.url_len];
        const q = if (std.mem.indexOfScalar(u8, url, '?')) |i| url[i + 1 ..] else "";
        try std.testing.expectEqualStrings(c[1], q);
    }
    // The default stays the repeated-key form; a bad name is an error.
    var buf: [1024]u8 = undefined;
    var diag: Diag = .{};
    const b = try build("{\"url\":\"https://x.io/p\",\"qs\":{\"list\":[1,2]}}", null, null, &buf, &diag);
    try std.testing.expectEqualStrings("https://x.io/p?list=1&list=2", buf[0..b.url_len]);
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://x.io/p\",\"qsFormat\":\"comma\",\"qs\":{}}", null, null, &buf, &diag));
    // Deeper than the cap: an error, not a crash.
    var deep: [512]u8 = undefined;
    var d: Out = .{ .buf = &deep };
    try d.put("{\"url\":\"https://x.io/\",\"qsFormat\":\"brackets\",\"qs\":");
    for (0..max_qs_depth + 1) |_| try d.put("{\"a\":");
    try d.put("1");
    for (0..max_qs_depth + 1) |_| try d.byte('}');
    try d.byte('}');
    try std.testing.expectError(error.Invalid, build(d.written(), null, null, &buf, &diag));
}
