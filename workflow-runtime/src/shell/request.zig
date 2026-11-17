//! Build an outbound HTTP/1.1 request from the args of an `http` effect:
//! URL with the query string, header lines and body, with credential
//! injection and `{{$credentials.<path>}}` templates (spec section 7).
//! A pure function: it writes into the buffer it is given.
const std = @import("std");
const http = @import("http.zig");
const creds = @import("creds.zig");
const domains = @import("domains.zig");
const binary_store = @import("binary_store.zig");
const store_rule = @import("store_rule.zig");
const Out = creds.Out;

pub const max_url = 8 << 10;

/// The most bytes of a host and of a list of allowed domains in a message.
const max_shown_host = 96;
const max_shown_list = 280;

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
    /// The args have `responseBinary`: the body of a 2xx response goes to
    /// the binary data store (`blob_store.zig`).
    stores: bool = false,
    /// `stores`, and `responseBinary` has a rule (`store_rule.zig`): the
    /// content type of the response says if the body goes to the store.
    detects: bool = false,
    /// `stores`, and `responseBinary` has `anyStatus`: a response with a
    /// status outside 200 to 299 goes to the store too, when it is final.
    any_status: bool = false,
    /// The credential limits the hosts of this request: a redirect goes back
    /// to the node, which sends the next request, so each URL is checked.
    no_redirect: bool = false,
    /// Not 0: the body has stored files (`Files`), so its length is not
    /// known yet. The content-length line goes here (`finishLength`), and
    /// `hdr_end` is the start of the body bytes in memory.
    cl_at: u32 = 0,

    pub fn method(b: *const Built) []const u8 {
        return b.method_buf[0..b.method_len];
    }
};

/// The reason for `error.Invalid`, for the effect error message. It never
/// holds a credential value.
pub const Diag = struct {
    buf: [512]u8 = undefined,
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

/// The most stored files of one body that go out in pieces. More files of
/// the same body are read whole into the request buffer.
pub const max_files = 8;

/// The stored files of the body of a request (`data` is the marker of
/// n8n's file store). The body bytes in memory do not hold them: the
/// sender puts the bytes of file `i` at offset `at[i]` of those bytes.
pub const Files = struct {
    n: u8 = 0,
    at: [max_files]u32 = @splat(0),
    id_len: [max_files]u16 = @splat(0),
    ids: [max_files][binary_store.max_id]u8 = @splat(@splat(0)),

    pub fn id(f: *const Files, i: usize) []const u8 {
        std.debug.assert(i < f.n);
        return f.ids[i][0..f.id_len[i]];
    }
};

/// "content-length: " + 20 digits + "\r\n\r\n".
const length_gap = 42;

/// The stored files of the body have their sizes: `total` is the length
/// of the whole body. Write the content-length line, and move the body
/// bytes in memory to follow it, as in every other request.
pub fn finishLength(buf: []u8, b: *Built, total: u64) void {
    std.debug.assert(b.cl_at > 0 and b.hdr_end == b.cl_at + length_gap and b.body_end >= b.hdr_end and b.body_end <= buf.len);
    const n = b.body_end - b.hdr_end;
    var lb: [length_gap]u8 = @splat(0);
    // The gap holds the line with any u64.
    const line = std.fmt.bufPrint(&lb, "content-length: {d}\r\n\r\n", .{total}) catch unreachable;
    @memcpy(buf[b.cl_at..][0..line.len], line);
    const hdr_end: u32 = b.cl_at + @as(u32, @intCast(line.len));
    std.mem.copyForwards(u8, buf[hdr_end..][0..n], buf[b.hdr_end..b.body_end]);
    b.hdr_end = hdr_end;
    b.body_end = hdr_end + n;
    b.cl_at = 0;
}

const Tmp = struct { buf: [max_url]u8 = undefined };

/// Build the request into `out`. `error.NoSpace` means "try a larger
/// buffer"; `error.Invalid` fills `diag`.
pub fn build(args: []const u8, store: ?*const creds.Store, idem_key: ?[]const u8, out_buf: []u8, diag: *Diag) Error!Built {
    return buildFiles(args, store, idem_key, out_buf, diag, null);
}

/// `build` for a sender that sends stored files in pieces: the files of the
/// body go to `files`, not into the buffer, and `Built.cl_at` is set when
/// there is one. Null: a stored file is read whole into the buffer.
fn buildFiles(args: []const u8, store: ?*const creds.Store, idem_key: ?[]const u8, out_buf: []u8, diag: *Diag, files: ?*Files) Error!Built {
    return buildFilesAs(args, store, idem_key, out_buf, diag, files, default_user_agent);
}

/// The user agent of a request that sets none: the default of n8n.
pub const default_user_agent = "n8n";

/// The most bytes of a user agent from the settings (`--egress-user-agent`).
const max_user_agent = 256;

/// True when `text` can be the value of the user-agent header.
pub fn validUserAgent(text: []const u8) bool {
    if (text.len == 0 or text.len > max_user_agent) return false;
    for (text) |c| if (c < ' ' or c == 0x7f) return false;
    return true;
}

/// `buildFiles` with the user agent of the settings of n8n, for a request
/// that sets none.
pub fn buildFilesAs(args: []const u8, store: ?*const creds.Store, idem_key: ?[]const u8, out_buf: []u8, diag: *Diag, files: ?*Files, user_agent: []const u8) Error!Built {
    @setRuntimeSafety(false);
    std.debug.assert(validUserAgent(user_agent));
    // Safe builds fill `undefined` memory with 0xAA; for this buffer (8 KB,
    // on every request) the fill cost more than the work. The callee keeps
    // its safety checks.
    var tmp: Tmp = undefined;
    return buildWith(args, store, idem_key, out_buf, diag, &tmp, files, user_agent);
}

fn buildWith(args: []const u8, store: ?*const creds.Store, idem_key: ?[]const u8, out_buf: []u8, diag: *Diag, tmp: *Tmp, files: ?*Files, user_agent: []const u8) Error!Built {
    std.debug.assert(out_buf.len > 0);
    if (idem_key) |k| std.debug.assert(k.len > 0);
    if (files) |f| f.n = 0;
    var b: Built = .{};
    var out: Out = .{ .buf = out_buf };

    // Method.
    // The members of the args, in one pass (a scan for each showed in
    // profiles).
    const fa = readArgs(args);
    // An object asks for a stored response; `null` and other values do not.
    if (fa.response_binary) |raw| if (raw.len > 0 and raw[0] == '{') {
        b.stores = true;
        b.detects = store_rule.Table.has(raw);
        if (http.member(raw, "anyStatus")) |any| b.any_status = std.mem.eql(u8, any, "true");
    };
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

    // `inject: false`: the credential fills templates only. The headers, the query, the
    // body members and the basic auth that it injects are not added, as for a request that
    // v1 sends without the authentication of the credential.
    // `"redirect"` and `"redirectOtherOrigin"`: the request after a redirect, as n8n sends it.
    const inj = injectOf(fa.inject);
    const adding: ?creds.Slot = if (inj.any) slot else null;

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
    if (adding) |s| if (inj.qs) if (s.qs) |q| {
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
    if (fa.allowed_domains) |raw| if (slot) |s| {
        if (eq(raw, "true")) {
            try checkDomains(s, null, out.written(), url, diag);
            b.no_redirect = s.domains_mode == .domains;
        } else if (raw.len > 0 and raw[0] == '{') {
            var own_buf: [max_shown_host]u8 = @splat(0);
            const node = try nodeHost(raw, &own_buf, diag);
            try checkDomains(s, node, out.written(), url, diag);
            b.no_redirect = s.domains_mode == .domains;
        }
    };
    // `followRedirects: false`: the node sends the request of each redirect itself.
    if (fa.follow_redirects) |raw| if (eq(raw, "false")) {
        b.no_redirect = true;
    };

    // A multipart body sets its own content type (with the boundary).
    const multipart: ?[]const u8 = if (fa.multipart) |r| (if (std.mem.eql(u8, r, "null")) null else r) else null;

    // Header lines.
    var have: Have = .{};
    if (fa.headers) |h_raw| {
        if (http.Members.init(h_raw)) |it_| {
            var it = it_;
            while (it.next()) |mem| {
                var nb: [max_header_name]u8 = undefined;
                var no: Out = .{ .buf = &nb };
                http.unescape(mem.key, &no) catch return invalid(diag, "http: a header name is longer than {d} bytes", .{max_header_name});
                const name = no.written();
                if (managed(name) or injected(adding, name)) continue;
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
    if (adding) |s| {
        if (s.headers) |hs| {
            var it = hs.iterator();
            while (it.next()) |e| {
                const v = e.value_ptr.*;
                if (v != .string) continue;
                const name = e.key_ptr.*;
                if (managed(name)) continue;
                if (!inj.auth and authenticates(name)) continue;
                if (std.ascii.eqlIgnoreCase(name, "content-type")) have.ct = true;
                try headerName(&out, name, diag);
                const start = out.len;
                try templated(v.string, slot, .none, &out, diag);
                try checkValue(out.written()[start..], name, diag);
                try out.put("\r\n");
            }
        }
        try defaultHeaders(s, fa.headers, &have, &out, diag);
        // The basic auth of the call replaces the basic auth of the credential.
        const call_auth = if (fa.basic_auth) |raw| !eq(raw, "null") else false;
        if (s.basic and !call_auth and inj.auth) try basicAuth(s, slot, &out, diag);
    }
    if (fa.basic_auth) |raw| {
        if (!eq(raw, "null")) try requestBasicAuth(raw, slot, &out, diag);
    }
    if (!have.ua) {
        try out.put("user-agent: ");
        try out.put(user_agent);
        try out.put("\r\n");
    }
    if (!have.accept) try out.put(acceptLine(fa.accept_as, fa.json));
    // The runtime does not decompress, so it asks for identity.
    try out.put("accept-encoding: identity\r\n");
    if (idem_key) |k| {
        try out.put("idempotency-key: ");
        try out.put(k);
        try out.put("\r\n");
    }

    // Body.
    var body_raw: ?[]const u8 = if (fa.body) |r| (if (std.mem.eql(u8, r, "null")) null else r) else null;
    // The request helper of n8n whose defaults the node expects (`acceptAs`).
    const helper = helperOf(fa.accept_as);
    const sends = eq(m, "POST") or eq(m, "PUT") or eq(m, "PATCH");
    if (body_raw) |br| {
        const text = std.mem.trim(u8, br, " \t\r\n");
        const empty = eq(text, "{}") or eq(text, "[]") or eq(text, "\"\"");
        const reads = eq(m, "GET") or eq(m, "HEAD") or eq(m, "OPTIONS");
        // `helpers.httpRequest` sends no body with GET, and no empty object.
        if (helper == .request and (eq(m, "GET") or eq(text, "{}") or (reads and empty))) body_raw = null;
        // The helpers of n8n that authenticate a request remove an empty body from a GET,
        // HEAD or OPTIONS request. `helpers.request` alone (`inject: false`) keeps it.
        if (helper == .legacy and inj.any and reads and empty) body_raw = null;
    }
    const inject_body: ?std.json.ObjectMap = if (adding) |s| s.body else null;
    // A credential that authenticates in the body needs one, except on
    // HEAD, and on GET without the request helper of n8n.
    // `helpers.request` of n8n sends the body also with GET.
    const bodiless = eq(m, "HEAD") or (eq(m, "GET") and helper != .legacy);
    if (body_raw == null and inject_body != null and !bodiless and multipart == null) body_raw = "{}";
    // A `$binary` or `$form` body: every other body pays one test of its first bytes.
    var special_ref: []const u8 = "";
    const special: Special = if (body_raw) |br| specialBody(br, &special_ref) else .none;
    if (multipart) |mp| {
        if (body_raw != null) return invalid(diag, "http: a request has body or multipart, not both", .{});
        var bb: [64]u8 = undefined;
        // A boundary from the args: the same request gets the same body.
        const boundary = std.fmt.bufPrint(&bb, "----wfrt{x:0>16}", .{std.hash.Wyhash.hash(0x6d70, args)}) catch unreachable;
        try out.put("content-type: multipart/form-data; boundary=");
        try out.put(boundary);
        try out.put("\r\n");
        b.hdr_end = try deferredBody(&out, diag, MultipartBody{ .raw = mp, .boundary = boundary, .files = files }, files, &b.cl_at);
    } else if (special == .form) {
        // v1 `authenticate` adds body members to an object; how they join a form
        // differs for each request helper, so there is no single rule to apply.
        if (inject_body != null) return invalid(diag, "http: a credential that adds body members cannot go with a form body", .{});
        if (!have.ct) try out.put("content-type: application/x-www-form-urlencoded\r\n");
        b.hdr_end = try deferredBody(&out, diag, FormBody{ .raw = special_ref, .slot = slot }, null, &b.cl_at);
    } else if (special == .binary) {
        const ref = special_ref;
        if (!have.ct) if (http.member(ref, "mimeType")) |mt| if (http.plainString(mt)) |ctv| {
            try checkValue(ctv, "content-type", diag);
            try out.put("content-type: ");
            try out.put(ctv);
            try out.put("\r\n");
        };
        b.hdr_end = try deferredBody(&out, diag, BinaryBody{ .ref = ref, .files = files }, files, &b.cl_at);
    } else if (body_raw) |br| {
        const is_string = br.len > 0 and br[0] == '"';
        if (!have.ct) {
            if (!is_string) {
                try out.put("content-type: application/json\r\n");
            } else if (textBodyType(helper, fa.json, br, sends)) |line| {
                try out.put(line);
            }
        }
        const merge = inject_body != null and !is_string and br.len >= 2 and br[0] == '{';
        var counter = Out.counter();
        try writeFullBody(br, is_string, merge, slot, &counter, diag);
        try contentLength(&out, counter.len);
        try out.put("\r\n");
        b.hdr_end = @intCast(out.len);
        try writeFullBody(br, is_string, merge, slot, &out, diag);
        std.debug.assert(out.len - b.hdr_end == counter.len);
    } else {
        // No content type without a body, as the HTTP client of n8n sends it.
        if (sends) try out.put("content-length: 0\r\n");
        try out.put("\r\n");
        b.hdr_end = @intCast(out.len);
    }
    b.body_end = @intCast(out.len);
    // The request line URL, then the headers, then the body, in `out_buf`.
    std.debug.assert(b.url_len <= b.hdr_end and b.hdr_end <= b.body_end and b.body_end <= out_buf.len);
    return b;
}

// ---- binary bodies ------------------------------------------------------------

const Special = enum { none, binary, form };

/// `body: { "$binary": { data, id?, mimeType? } }`: the bytes of a binary
/// entry, as n8n items carry it. `body: { "$form": { name: text } }`: a
/// form body. The key is the first member of the body and no white space
/// comes before it, so a body that does not start with `{"$` costs one
/// test. `ref` gets the value of the key.
fn specialBody(body: []const u8, ref: *[]const u8) Special {
    std.debug.assert(body.len > 0);
    if (body.len < 4 or body[0] != '{' or body[1] != '"' or body[2] != '$') return .none;
    var it = http.Members.init(body) orelse return .none;
    const first = it.next() orelse return .none;
    const kind: Special = if (eq(first.key, "\"$binary\"")) .binary else if (eq(first.key, "\"$form\"")) .form else return .none;
    if (first.value.len < 2 or first.value[0] != '{') return .none;
    ref.* = first.value;
    std.debug.assert(ref.len >= 2);
    return kind;
}

/// A form body as the qs library's `stringify` writes a flat object, which
/// is how n8n's request helper sends `form`: `name=value` joined by `&`,
/// every byte but `A-Z a-z 0-9 - . _ ~` percent-encoded, null as `name=`.
/// A credential template in a value is filled first, so the value of the
/// credential is encoded once, with the text around it.
const FormBody = struct {
    raw: []const u8,
    slot: ?creds.Slot,

    fn write(w: FormBody, out: *Out, diag: *Diag) Error!void {
        std.debug.assert(w.raw.len >= 2 and w.raw[0] == '{');
        var state: FormState = .{};
        const st = &state;
        var it = http.Members.init(w.raw) orelse return invalid(diag, "http: $form must be an object", .{});
        var first = true;
        // Each pass takes one member: the bytes of the text bound the passes.
        var left = w.raw.len;
        while (it.next()) |m| : (left -= 1) {
            std.debug.assert(left > 0);
            const v = m.value;
            if (v.len > 0 and (v[0] == '{' or v[0] == '[')) return invalid(diag, "http: a $form value must be text, a number, a boolean or null", .{});
            var ko: Out = .{ .buf = &st.key };
            http.unescape(m.key, &ko) catch return invalid(diag, "http: a $form name is not a string of at most {d} bytes", .{max_qs_key});
            if (!first) try out.byte('&');
            first = false;
            try writeRfc3986(out, ko.written());
            try out.byte('=');
            try encodedLeaf(out, v, w.slot, diag, &st.tmp, "$form");
        }
    }
};

const FormState = struct { key: [max_qs_key]u8 = @splat(0), tmp: Tmp = .{} };

/// Write a body whose length is known only once it is written, then put
/// the content-length line and the blank line before it. Returns `hdr_end`.
/// A body with stored files in `files` has no length yet: the body bytes
/// stay after the gap for the line, and `cl_at` gets the place of the line.
fn deferredBody(out: *Out, diag: *Diag, writer: anytype, files: ?*const Files, cl_at: *u32) Error!u32 {
    const gap = length_gap;
    if (out.buf.len - out.len < gap) return error.NoSpace;
    const at = out.len + gap;
    var body: Out = .{ .buf = out.buf[at..] };
    try writer.write(&body, diag);
    const n = body.len;
    if (files) |f| if (f.n > 0) {
        cl_at.* = @intCast(out.len);
        out.len = at + n;
        std.debug.assert(cl_at.* > 0 and f.at[f.n - 1] <= n);
        return @intCast(at);
    };
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
    files: ?*Files,
    fn write(w: BinaryBody, out: *Out, diag: *Diag) Error!void {
        return writeBinary(w.ref, out, diag, w.files);
    }
};

/// The bytes of a binary entry. When `data` is the marker of n8n's file
/// store (`filesystem-v2`), the file of `id` goes to `files`: the sender
/// reads it in pieces, so it has no limit. Without `files`, or when `files`
/// is full, the file is read straight into the free part of the request
/// buffer, so its limit is the buffer's and there is no copy; too large
/// gives `NoSpace` and a retry in a large buffer. That read blocks.
/// Otherwise `data` is base64.
fn writeBinary(ref: []const u8, out: *Out, diag: *Diag, files: ?*Files) Error!void {
    const data_raw = http.member(ref, "data") orelse return invalid(diag, "http: binary data has no data", .{});
    const data = http.plainString(data_raw) orelse return invalid(diag, "http: binary data must be a base64 string", .{});
    const room = out.buf[out.len..];
    if (binary_store.isStoredMarker(data)) {
        const id = (if (http.member(ref, "id")) |r| http.plainString(r) else null) orelse return invalid(diag, "http: binary data in the file store has no id", .{});
        if (files) |f| if (f.n < max_files) {
            if (binary_store.fileId(id) == null) return invalid(diag, "http: binary data id \"{s}\" is not a file store id", .{id[0..@min(id.len, 120)]});
            f.at[f.n] = @intCast(out.len);
            @memcpy(f.ids[f.n][0..id.len], id);
            f.id_len[f.n] = @intCast(id.len);
            f.n += 1;
            return;
        };
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
    files: ?*Files,

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
                try writeBinary(bin, out, diag, w.files);
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
    return encodedLeaf(out, value, slot, diag, tmp, "qs");
}

/// A value of `qs` or of a form, percent-encoded. A credential template is
/// filled before the encoding, never after: the value of a credential can
/// hold `&`, `=`, `+`, `%` or a space.
fn encodedLeaf(out: *Out, value: []const u8, slot: ?creds.Slot, diag: *Diag, tmp: *Tmp, comptime what: []const u8) Error!void {
    std.debug.assert(value.len == 0 or (value[0] != '{' and value[0] != '['));
    if (std.mem.eql(u8, value, "null")) return;
    if (value.len == 0 or value[0] != '"') return writeRfc3986(out, value);
    var vo: Out = .{ .buf = &tmp.buf };
    http.unescape(value, &vo) catch return invalid(diag, "http: a " ++ what ++ " value is longer than {d} bytes", .{max_url});
    if (slot != null and creds.hasTemplate(vo.written())) return encodedTemplate(out, vo.written(), slot, diag, what);
    return writeRfc3986(out, vo.written());
}

fn encodedTemplate(out: *Out, text: []const u8, slot: ?creds.Slot, diag: *Diag, comptime what: []const u8) Error!void {
    var filled: Tmp = .{};
    var so: Out = .{ .buf = &filled.buf };
    std.debug.assert(slot != null);
    templated(text, slot, .none, &so, diag) catch |e| return if (e == error.NoSpace) invalid(diag, "http: a " ++ what ++ " value is too long", .{}) else e;
    return writeRfc3986(out, so.written());
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
    basic_auth: ?[]const u8 = null,
    inject: ?[]const u8 = null,
    response_binary: ?[]const u8 = null,
    allowed_domains: ?[]const u8 = null,
    follow_redirects: ?[]const u8 = null,
    accept_as: ?[]const u8 = null,
    json: ?[]const u8 = null,
};

fn readArgs(args: []const u8) Args {
    var a: Args = .{};
    var it = http.Members.init(args) orelse return a;
    var guard: usize = 0;
    while (it.next()) |mem| : (guard += 1) {
        if (guard > args.len) break;
        const k = mem.key;
        const slot: *?[]const u8 = if (eq(k, "\"method\"")) &a.method else if (eq(k, "\"credential\"")) &a.credential else if (eq(k, "\"timeoutMs\"")) &a.timeout_ms else if (eq(k, "\"url\"")) &a.url else if (eq(k, "\"qs\"")) &a.qs else if (eq(k, "\"headers\"")) &a.headers else if (eq(k, "\"body\"")) &a.body else if (eq(k, "\"multipart\"")) &a.multipart else if (eq(k, "\"qsFormat\"")) &a.qs_format else if (eq(k, "\"basicAuth\"")) &a.basic_auth else if (eq(k, "\"inject\"")) &a.inject else if (eq(k, "\"responseBinary\"")) &a.response_binary else if (eq(k, "\"allowedDomains\"")) &a.allowed_domains else if (eq(k, "\"followRedirects\"")) &a.follow_redirects else if (eq(k, "\"acceptAs\"")) &a.accept_as else if (eq(k, "\"json\"")) &a.json else continue;
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

/// The request helper of n8n behind a request (`acceptAs` of the args).
const Helper = enum { none, legacy, request };

fn helperOf(accept_as: ?[]const u8) Helper {
    const as = accept_as orelse return .none;
    std.debug.assert(as.len <= std.math.maxInt(u32));
    if (eq(as, "\"legacy\"")) return .legacy;
    if (eq(as, "\"request\"")) return .request;
    return .none;
}

/// The content-type line of a text body without one, as the HTTP client of
/// n8n writes it: `helpers.request` sends text as JSON unless `json` is
/// false or the text is empty; else a POST, PUT or PATCH has the form type,
/// and another method has no type. Without a helper the body has no type.
fn textBodyType(helper: Helper, json: ?[]const u8, body: []const u8, sends: bool) ?[]const u8 {
    std.debug.assert(body.len > 0 and body[0] == '"');
    if (helper == .none) return null;
    const j = std.mem.trim(u8, json orelse "null", " \t\r\n");
    if (helper == .legacy and !eq(j, "false") and !eq(body, "\"\"")) return "content-type: application/json\r\n";
    return if (sends) "content-type: application/x-www-form-urlencoded\r\n" else null;
}

/// The accept line of a request that sets none. `acceptAs` names the request
/// helper of n8n whose default the node expects, and `json` is the `json`
/// option of the node's request:
/// - `"legacy"` (`helpers.request`): `application/json` when `json` is
///   true, else `*/*`;
/// - `"request"` (`helpers.httpRequest`): `application/json` when `json` is
///   a true value, else the default of the HTTP client of n8n.
/// Without `acceptAs` the runtime asks for JSON first and takes each type.
fn acceptLine(accept_as: ?[]const u8, json: ?[]const u8) []const u8 {
    const as = accept_as orelse return "accept: application/json,text/*;q=0.9,*/*;q=0.8\r\n";
    std.debug.assert(as.len <= std.math.maxInt(u32));
    const j = std.mem.trim(u8, json orelse "null", " \t\r\n");
    if (eq(as, "\"legacy\"")) return if (eq(j, "true")) "accept: application/json\r\n" else "accept: */*\r\n";
    if (eq(as, "\"request\"")) {
        const falsy = eq(j, "null") or eq(j, "false") or eq(j, "0") or eq(j, "\"\"");
        return if (falsy) "accept: application/json, text/plain, */*\r\n" else "accept: application/json\r\n";
    }
    return "accept: application/json,text/*;q=0.9,*/*;q=0.8\r\n";
}

/// What a request gets of its credential (`inject` of the args). The
/// templates of the request are always filled.
const Inject = struct {
    /// False: the credential adds nothing (`inject: false`).
    any: bool = true,
    /// The query parameters of the credential.
    qs: bool = true,
    /// The basic auth, and the headers that authenticate (`authenticates`).
    auth: bool = true,
};

/// `"redirect"`: the request after a redirect. n8n takes the URL of the
/// redirect as it is, so the query parameters of the credential are not
/// added again. `"redirectOtherOrigin"`: such a request to another origin
/// without authentication: also no basic auth and no header that
/// authenticates. A header of the credential with another name stays.
fn injectOf(raw: ?[]const u8) Inject {
    const r = raw orelse return .{};
    std.debug.assert(r.len <= std.math.maxInt(u32));
    if (eq(r, "false")) return .{ .any = false };
    if (eq(r, "\"redirect\"")) return .{ .qs = false };
    if (eq(r, "\"redirectOtherOrigin\"")) return .{ .qs = false, .auth = false };
    return .{};
}

/// The headers that n8n removes from a request to another origin after a redirect.
fn authenticates(name: []const u8) bool {
    std.debug.assert(name.len <= std.math.maxInt(u32));
    return std.ascii.eqlIgnoreCase(name, "authorization") or std.ascii.eqlIgnoreCase(name, "proxy-authorization") or std.ascii.eqlIgnoreCase(name, "cookie");
}

/// The host that the node of a request owns (`allowedDomains: {"own", "target"}`
/// of the args), as the routed nodes of n8n have it (`routing-node.ts`).
/// `own` is a constant of the compiled module: the host of the base URL in the
/// description of the node. `target` is the URL of the request before the
/// hooks of the node. `owned` is true when `target` goes to `own`: only then
/// does n8n add `own` to the allowed domains of the credential.
const NodeHost = struct {
    host: []const u8,
    owned: bool,
};

fn nodeHost(raw: []const u8, buf: *[max_shown_host]u8, diag: *Diag) Error!NodeHost {
    std.debug.assert(raw.len > 0 and raw[0] == '{');
    const own_raw = http.member(raw, "own") orelse return invalid(diag, "http: allowedDomains names no host of the node", .{});
    var own: Out = .{ .buf = buf };
    http.unescape(own_raw, &own) catch return invalid(diag, "http: the host of the node in allowedDomains is not a string of at most {d} bytes", .{max_shown_host});
    const host = std.mem.trimEnd(u8, own.written(), ".");
    if (host.len == 0 or std.mem.indexOfAny(u8, host, ",*/ ") != null) {
        return invalid(diag, "http: the host of the node in allowedDomains is not a host name", .{});
    }
    std.debug.assert(host.len <= max_shown_host);
    var target_buf: [max_url]u8 = @splat(0);
    var target: Out = .{ .buf = &target_buf };
    const target_raw = http.member(raw, "target") orelse return .{ .host = host, .owned = false };
    http.unescape(target_raw, &target) catch return .{ .host = host, .owned = false };
    const to = http.parseUrl(target.written()) catch return .{ .host = host, .owned = false };
    return .{ .host = host, .owned = std.ascii.eqlIgnoreCase(std.mem.trimEnd(u8, to.host, "."), host) };
}

/// The texts of n8n for a request that the allowed domains of its credential
/// refuse. The host and the list are settings, not secrets. With `node` the
/// rule is that of a routed node (`getCredentialAllowedDomains` with
/// `credentialOwnedSurface`): the mode `none` lets a request of an owned
/// target pass, and the mode `domains` adds the host of the node to the list.
fn checkDomains(s: creds.Slot, node: ?NodeHost, url_text: []const u8, url: http.Url, diag: *Diag) Error!void {
    std.debug.assert(url.host.len > 0);
    const owned = if (node) |n| n.owned else false;
    switch (s.domains_mode) {
        .all => {},
        .none => {
            if (owned) return;
            if (node != null) return invalid(diag, "This credential is configured to prevent use within an HTTP Request node", .{});
            return invalid(diag, "This credential is configured to prevent use within an HTTP Request or GraphQL node", .{});
        },
        .domains => {
            const empty = domains.isEmpty(s.domains);
            if (empty and !owned) {
                return invalid(diag, "No allowed domains specified. Configure allowed domains or change restriction setting.", .{});
            }
            if (!empty and domains.allowed(url.host, s.domains)) return;
            const own = if (node) |n| n.host else "";
            const adds = owned and (empty or !domains.allowed(own, s.domains));
            if (adds and domains.allowed(url.host, own)) return;
            // The host as n8n shows it: with the port when it is not the default one.
            const start = (std.mem.indexOf(u8, url_text, "://") orelse 0) + 3;
            const end = std.mem.indexOfAnyPos(u8, url_text, start, "/?#") orelse url_text.len;
            var shown = url_text[@min(start, end)..end];
            const default = if (url.https) ":443" else ":80";
            if (std.mem.endsWith(u8, shown, default)) shown = shown[0 .. shown.len - default.len];
            const list = std.mem.trim(u8, s.domains, " \t\r\n");
            var lower: [max_shown_host]u8 = @splat(0);
            const host = std.ascii.lowerString(&lower, shown[0..@min(shown.len, max_shown_host)]);
            const text = "Domain not allowed: This credential is restricted from accessing {s}. Only the following domains are allowed: ";
            if (adds and empty) return invalid(diag, text ++ "{s}", .{ host, own });
            if (adds) return invalid(diag, text ++ "{s}, {s}", .{ host, own, list[0..@min(list.len, max_shown_list)] });
            return invalid(diag, text ++ "{s}", .{ host, list[0..@min(list.len, max_shown_list)] });
        },
    }
}

/// Headers the client writes itself; values from args are dropped.
fn managed(name: []const u8) bool {
    const names = [_][]const u8{ "host", "content-length", "transfer-encoding", "connection", "accept-encoding", "idempotency-key" };
    for (names) |n| if (std.ascii.eqlIgnoreCase(n, name)) return true;
    return false;
}

/// Header names that are set: a default header is written only when the
/// request has none of that name.
const Have = struct { ct: bool = false, ua: bool = false, accept: bool = false };

/// `inject.defaultHeaders`: a header that v1 `authenticate` sets only when
/// the request has no header of that name, ignoring case. The headers of
/// `inject.headers` count too: v1 checks the request after it set them.
fn defaultHeaders(s: creds.Slot, args_headers: ?[]const u8, have: *Have, out: *Out, diag: *Diag) Error!void {
    const hs = s.default_headers orelse return;
    var it = hs.iterator();
    // One entry per pass, so the member count bounds the loop.
    var left = hs.count();
    while (it.next()) |e| {
        std.debug.assert(left > 0);
        left -= 1;
        const v = e.value_ptr.*;
        if (v != .string) continue;
        const name = e.key_ptr.*;
        if (managed(name)) continue;
        if (hasHeader(s, args_headers, name)) continue;
        if (std.ascii.eqlIgnoreCase(name, "content-type")) have.ct = true;
        try headerName(out, name, diag);
        const start = out.len;
        try templated(v.string, s, .none, out, diag);
        try checkValue(out.written()[start..], name, diag);
        try out.put("\r\n");
    }
}

/// True when the request has a header named `name`, ignoring case, in the
/// injected headers, the basic auth or the args of the effect.
fn hasHeader(s: creds.Slot, args_headers: ?[]const u8, name: []const u8) bool {
    if (s.basic and std.ascii.eqlIgnoreCase(name, "authorization")) return true;
    if (s.headers) |hs| {
        var it = hs.iterator();
        while (it.next()) |e| if (std.ascii.eqlIgnoreCase(e.key_ptr.*, name)) return true;
    }
    const raw = args_headers orelse return false;
    var it = http.Members.init(raw) orelse return false;
    // Each step moves past one member, so the text length bounds the loop.
    var left = raw.len;
    while (it.next()) |m| : (left -= 1) {
        std.debug.assert(left > 0);
        // A member with a null value is no header, as the header loop drops it.
        if (std.mem.eql(u8, m.value, "null")) continue;
        // A name without escapes compares as it is; an escaped name that does
        // not fit is treated as absent, as the args header loop rejects it.
        if (std.mem.indexOfScalar(u8, m.key, '\\') == null) {
            std.debug.assert(m.key.len >= 2);
            const plain = m.key[1 .. m.key.len - 1];
            if (std.ascii.eqlIgnoreCase(plain, name)) return true;
            continue;
        }
        var nb: [max_header_name]u8 = undefined;
        var no: Out = .{ .buf = &nb };
        http.unescape(m.key, &no) catch continue;
        if (std.ascii.eqlIgnoreCase(no.written(), name)) return true;
    }
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

/// The longest accepted header name of the effect args.
const max_header_name = 256;

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

/// `basicAuth: { user, password }` of the call. The values are templates, so a
/// credential field goes into the header and workflow code never reads it.
fn requestBasicAuth(raw: []const u8, slot: ?creds.Slot, out: *Out, diag: *Diag) Error!void {
    var user: Tmp = .{};
    var password: Tmp = .{};
    var pair: Tmp = .{};
    var uo: Out = .{ .buf = &user.buf };
    var po: Out = .{ .buf = &password.buf };
    var it = http.Members.init(raw) orelse return invalid(diag, "http: basicAuth must be an object", .{});
    var guard: usize = 0;
    while (it.next()) |mem| : (guard += 1) {
        if (guard > raw.len) break;
        const target: *Out = if (eq(mem.key, "\"user\"")) &uo else if (eq(mem.key, "\"password\"")) &po else continue;
        target.len = 0;
        http.unescape(mem.value, target) catch return invalid(diag, "http: a basicAuth value must be a string of at most {d} bytes", .{max_url});
    }
    var joined: Out = .{ .buf = &pair.buf };
    try templated(uo.written(), slot, .none, &joined, diag);
    joined.byte(':') catch return invalid(diag, "http: basic auth values are too long", .{});
    try templated(po.written(), slot, .none, &joined, diag);
    std.debug.assert(joined.len <= pair.buf.len);
    const enc_len = std.base64.standard.Encoder.calcSize(joined.len);
    try out.put("authorization: Basic ");
    if (out.len + enc_len > out.buf.len) return error.NoSpace;
    const written = std.base64.standard.Encoder.encode(out.buf[out.len..][0..enc_len], joined.written());
    std.debug.assert(written.len == enc_len);
    out.len += enc_len;
    try out.put("\r\n");
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

test "a credential value is encoded once for the place it goes to" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    // The value holds each character that has a meaning in a form, a query or JSON text.
    const store = try creds.Store.parse(arena.allocator(),
        \\{"s":{"data":{"k":"a&b=c+d%e f\"g\\h","id":"i d","lines":"x\r\ny"}},
        \\ "q":{"data":{"k":"a&b=c+d%e f\"g\\h"},"inject":{"qs":{"key":"{{$credentials.k}}"},"body":{"secret":"{{$credentials.k}}"}}}}
    );
    const enc = "a%26b%3Dc%2Bd%25e%20f%22g%5Ch";
    var buf: [2048]u8 = undefined;
    var diag: Diag = .{};

    // A form body: v1 writes it with qs `stringify`, so every byte with a meaning is encoded.
    const form = try build(
        \\{"method":"POST","url":"http://h/f","credential":"s","body":{"$form":{"api_key":"{{$credentials.k}}","client_id":"{{$credentials.id}}",
        \\"mix":"Bearer {{$credentials.k}}","n":1.5,"t":true,"z":null,"a b&":"c d"}}}
    , &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("api_key=" ++ enc ++ "&client_id=i%20d&mix=Bearer%20" ++ enc ++ "&n=1.5&t=true&z=&a%20b%26=c%20d", buf[form.hdr_end..form.body_end]);
    const form_hdrs = buf[form.url_len..form.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, form_hdrs, "content-type: application/x-www-form-urlencoded\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, form_hdrs, "content-length: 127\r\n") != null);
    try std.testing.expectEqual(@as(usize, 127), form.body_end - form.hdr_end);
    // Without a credential the text of a template stays, encoded as any other text.
    const plain = try build("{\"method\":\"POST\",\"url\":\"http://h/f\",\"body\":{\"$form\":{\"a\":\"1 2\",\"k\":\"{{$credentials.k}}\"}}}", null, null, &buf, &diag);
    try std.testing.expectEqualStrings("a=1%202&k=%7B%7B%24credentials.k%7D%7D", buf[plain.hdr_end..plain.body_end]);
    const empty = try build("{\"method\":\"POST\",\"url\":\"http://h/f\",\"body\":{\"$form\":{}}}", null, null, &buf, &diag);
    try std.testing.expectEqual(empty.hdr_end, empty.body_end);
    try std.testing.expect(std.mem.indexOf(u8, buf[empty.url_len..empty.hdr_end], "content-length: 0\r\n") != null);
    // A header of the call that sets the content type wins over the default.
    const typed = try build("{\"method\":\"POST\",\"url\":\"http://h/f\",\"headers\":{\"Content-Type\":\"application/x-www-form-urlencoded; charset=utf-8\"},\"body\":{\"$form\":{\"a\":\"b\"}}}", null, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[typed.url_len..typed.hdr_end], "content-type: application/x-www-form-urlencoded\r\n") == null);
    try std.testing.expectError(error.Invalid, build("{\"method\":\"POST\",\"url\":\"http://h/f\",\"body\":{\"$form\":{\"a\":{\"b\":1}}}}", null, null, &buf, &diag));
    try std.testing.expectEqualStrings("http: a $form value must be text, a number, a boolean or null", diag.text());
    try std.testing.expectError(error.Invalid, build("{\"method\":\"POST\",\"url\":\"http://h/f\",\"credential\":\"q\",\"body\":{\"$form\":{\"a\":\"b\"}}}", &store, null, &buf, &diag));
    // `$form` that is not the first key, or not an object, is JSON data.
    const data = try build("{\"method\":\"POST\",\"url\":\"http://h/f\",\"body\":{\"a\":1,\"$form\":{\"b\":2}}}", null, null, &buf, &diag);
    try std.testing.expectEqualStrings("{\"a\":1,\"$form\":{\"b\":2}}", buf[data.hdr_end..data.body_end]);

    // A query value, in both forms of `qs`, and a query value that the credential adds.
    const repeat = try build("{\"url\":\"http://h/q\",\"credential\":\"s\",\"qs\":{\"k\":\"{{$credentials.k}}\",\"l\":[\"{{$credentials.id}}\"]}}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("http://h/q?k=" ++ enc ++ "&l=i%20d", buf[0..repeat.url_len]);
    const brackets = try build("{\"url\":\"http://h/q\",\"credential\":\"s\",\"qsFormat\":\"brackets\",\"qs\":{\"o\":{\"k\":\"{{$credentials.k}}\"}}}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("http://h/q?o%5Bk%5D=" ++ enc, buf[0..brackets.url_len]);
    const added = try build("{\"url\":\"http://h/q\",\"credential\":\"q\"}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("http://h/q?key=" ++ enc, buf[0..added.url_len]);

    // JSON text: a quote and a backslash are escaped, in a value of the call and in a member the credential adds.
    const json = try build("{\"method\":\"POST\",\"url\":\"http://h/j\",\"credential\":\"q\",\"body\":{\"v\":\"{{$credentials.k}}\"}}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("{\"v\":\"a&b=c+d%e f\\\"g\\\\h\",\"secret\":\"a&b=c+d%e f\\\"g\\\\h\"}", buf[json.hdr_end..json.body_end]);
    const lines = try build("{\"method\":\"POST\",\"url\":\"http://h/j\",\"credential\":\"s\",\"body\":{\"v\":\"{{$credentials.lines}}\"}}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("{\"v\":\"x\\r\\ny\"}", buf[lines.hdr_end..lines.body_end]);

    // A header value and a string body carry the value as it is: v1 does not encode them.
    const raw = try build("{\"method\":\"POST\",\"url\":\"http://h/r\",\"credential\":\"s\",\"headers\":{\"X-Key\":\"{{$credentials.k}}\"},\"body\":\"k={{$credentials.k}}\"}", &store, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[raw.url_len..raw.hdr_end], "X-Key: a&b=c+d%e f\"g\\h\r\n") != null);
    try std.testing.expectEqualStrings("k=a&b=c+d%e f\"g\\h", buf[raw.hdr_end..raw.body_end]);
    // A line break cannot go into a header: the request is refused.
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://h/r\",\"credential\":\"s\",\"headers\":{\"X-Key\":\"{{$credentials.lines}}\"}}", &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("http: the value of header \"X-Key\" has a line break", diag.text());
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://h/r\",\"credential\":\"s\",\"basicAuth\":{\"user\":\"u\",\"password\":\"p\"},\"headers\":{\"X-Key\":\"a{{$credentials.lines}}\"}}", &store, null, &buf, &diag));
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

test "inject.defaultHeaders sets a header only when the request has none" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const store = try creds.Store.parse(arena.allocator(),
        \\{"notion":{"type":"notionApi","data":{"apiKey":"k","version":"v2"},
        \\ "inject":{"headers":{"Authorization":"Bearer {{$credentials.apiKey}}"},
        \\ "defaultHeaders":{"Notion-Version":"{{$credentials.version}}","X-Y":"y"}}}}
    );
    var buf: [2048]u8 = undefined;
    var diag: Diag = .{};
    // No header of that name: both defaults go out, with the template filled.
    var b = try build("{\"url\":\"http://h/\",\"credential\":\"notion\"}", &store, null, &buf, &diag);
    var hdrs = buf[b.url_len..b.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "Notion-Version: v2\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "X-Y: y\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "Authorization: Bearer k\r\n") != null);
    try std.testing.expectEqual(@as(usize, 1), std.mem.count(u8, hdrs, "Notion-Version: "));
    // The request has the header in another case: the default stays out.
    b = try build("{\"url\":\"http://h/\",\"credential\":\"notion\",\"headers\":{\"notion-VERSION\":\"2021-05-13\"}}", &store, null, &buf, &diag);
    hdrs = buf[b.url_len..b.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "notion-VERSION: 2021-05-13\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "Notion-Version: ") == null);
    // Another default header of the slot is still written.
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "X-Y: y\r\n") != null);
    // An escaped name in the request counts too.
    b = try build("{\"url\":\"http://h/\",\"credential\":\"notion\",\"headers\":{\"X\\u002dY\":\"other\"}}", &store, null, &buf, &diag);
    hdrs = buf[b.url_len..b.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "X-Y: other\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "X-Y: y\r\n") == null);
    // A null header value sends no header, so the default still applies.
    b = try build("{\"url\":\"http://h/\",\"credential\":\"notion\",\"headers\":{\"notion-version\":null}}", &store, null, &buf, &diag);
    hdrs = buf[b.url_len..b.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, hdrs, "Notion-Version: v2\r\n") != null);
    try std.testing.expectEqual(@as(usize, 1), std.mem.count(u8, hdrs, "otion-Version: "));
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
    var small: [152]u8 = undefined;
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

test "stored files of a body go to the sender: their places, and the content-length when the sizes are known" {
    const t = std.testing;
    var buf: [4096]u8 = @splat(0);
    var diag: Diag = .{};
    var files: Files = .{};
    const id1 = "filesystem-v2:workflows/wf1/executions/7/binary_data/f-1";
    const id2 = "filesystem-v2:workflows/wf1/executions/7/binary_data/f-2";

    // The whole body is one file: no body byte is in memory, and no file is read.
    const one = "{\"method\":\"PUT\",\"url\":\"http://x.io/u\",\"body\":{\"$binary\":{\"data\":\"filesystem-v2\",\"id\":\"" ++ id1 ++ "\",\"mimeType\":\"image/png\"}}}";
    var b = try buildFiles(one, null, null, &buf, &diag, &files);
    try t.expectEqual(@as(u8, 1), files.n);
    try t.expectEqualStrings(id1, files.id(0));
    try t.expectEqual(@as(u32, 0), files.at[0]);
    try t.expect(b.cl_at != 0 and b.hdr_end == b.body_end);
    try t.expect(std.mem.indexOf(u8, buf[b.url_len..b.cl_at], "content-length") == null);
    finishLength(&buf, &b, 5_000_000_000);
    try t.expectEqual(@as(u32, 0), b.cl_at);
    try t.expect(std.mem.endsWith(u8, buf[b.url_len..b.hdr_end], "content-type: image/png\r\ncontent-length: 5000000000\r\n\r\n"));
    try t.expectEqual(b.hdr_end, b.body_end);

    // Multipart: the bytes in memory are the parts without the files, and each file has its place.
    const mp = "{\"method\":\"POST\",\"url\":\"http://x.io/up\",\"multipart\":[{\"name\":\"note\",\"value\":\"hi\"},{\"name\":\"a\",\"binary\":{\"data\":\"filesystem-v2\",\"id\":\"" ++ id1 ++ "\"}},{\"name\":\"b\",\"binary\":{\"data\":\"aGVsbG8=\"}},{\"name\":\"c\",\"binary\":{\"data\":\"filesystem-v2\",\"id\":\"" ++ id2 ++ "\"}}]}";
    b = try buildFiles(mp, null, null, &buf, &diag, &files);
    try t.expectEqual(@as(u8, 2), files.n);
    try t.expectEqualStrings(id2, files.id(1));
    const mem_len = b.body_end - b.hdr_end;
    finishLength(&buf, &b, mem_len + 7 + 9);
    const hdrs = buf[b.url_len..b.hdr_end];
    const key = "content-type: multipart/form-data; boundary=";
    const bline = hdrs[std.mem.indexOf(u8, hdrs, key).? + key.len ..];
    const boundary = bline[0..std.mem.indexOf(u8, bline, "\r\n").?];
    var lb: [64]u8 = @splat(0);
    try t.expect(std.mem.endsWith(u8, hdrs, try std.fmt.bufPrint(&lb, "content-length: {d}\r\n\r\n", .{mem_len + 16})));
    // The sender puts the bytes of each file at its place: the body is the one that a whole read gives.
    const body = buf[b.hdr_end..b.body_end];
    try t.expectEqual(mem_len, @as(u32, @intCast(body.len)));
    var sent_buf: [1024]u8 = @splat(0);
    const sent = try std.fmt.bufPrint(&sent_buf, "{s}{s}{s}{s}{s}", .{ body[0..files.at[0]], "1234567", body[files.at[0]..files.at[1]], "123456789", body[files.at[1]..] });
    var want_buf: [1024]u8 = @splat(0);
    const want = try std.fmt.bufPrint(&want_buf, "--{s}\r\ncontent-disposition: form-data; name=\"note\"\r\n\r\nhi\r\n--{s}\r\ncontent-disposition: form-data; name=\"a\"\r\n\r\n1234567\r\n--{s}\r\ncontent-disposition: form-data; name=\"b\"\r\n\r\nhello\r\n--{s}\r\ncontent-disposition: form-data; name=\"c\"\r\n\r\n123456789\r\n--{s}--\r\n", .{ boundary, boundary, boundary, boundary, boundary });
    try t.expectEqualStrings(want, sent);

    // An id outside the store fails here, before any file is opened. A body without a stored file is as before.
    try t.expectError(error.Invalid, buildFiles("{\"url\":\"http://x.io/\",\"method\":\"POST\",\"body\":{\"$binary\":{\"data\":\"filesystem-v2\",\"id\":\"filesystem-v2:../../etc/passwd\"}}}", null, null, &buf, &diag, &files));
    try t.expect(std.mem.indexOf(u8, diag.text(), "not a file store id") != null);
    b = try buildFiles("{\"url\":\"http://x.io/\",\"method\":\"POST\",\"body\":{\"$binary\":{\"data\":\"aGVsbG8=\"}}}", null, null, &buf, &diag, &files);
    try t.expect(files.n == 0 and b.cl_at == 0);
    try t.expectEqualStrings("hello", buf[b.hdr_end..b.body_end]);
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

test "basic auth of the call: templates from the credential, and plain values" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const store = try creds.Store.parse(arena.allocator(),
        \\{"api":{"data":{"user":"u","pw":"p"},"inject":{}},
        \\ "basic":{"data":{"user":"x","pw":"y"},"inject":{"basicAuth":{"user":"{{$credentials.user}}","password":"{{$credentials.pw}}"}}}}
    );
    var buf: [2048]u8 = undefined;
    var diag: Diag = .{};
    const a = try build(
        \\{"url":"http://h/","credential":"api","basicAuth":{"user":"{{$credentials.user}}","password":"{{$credentials.pw}}"}}
    , &store, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[a.url_len..a.hdr_end], "authorization: Basic dTpw\r\n") != null);
    const b = try build("{\"url\":\"http://h/\",\"basicAuth\":{\"user\":\"k\",\"password\":\"\"}}", null, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[b.url_len..b.hdr_end], "authorization: Basic azo=\r\n") != null);
    // The basic auth of the call replaces the basic auth of the credential.
    const c = try build("{\"url\":\"http://h/\",\"credential\":\"basic\",\"basicAuth\":{\"user\":\"k\",\"password\":\"\"}}", &store, null, &buf, &diag);
    const headers = buf[c.url_len..c.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, headers, "authorization: Basic azo=\r\n") != null);
    try std.testing.expectEqual(@as(usize, 1), std.mem.count(u8, headers, "authorization: Basic"));
}

test "inject false: the credential fills templates and adds nothing" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const store = try creds.Store.parse(arena.allocator(),
        \\{"api":{"data":{"token":"T","user":"u","pw":"p"},
        \\ "inject":{"headers":{"X-Key":"{{$credentials.token}}"},"qs":{"key":"{{$credentials.token}}"},"basicAuth":{"user":"{{$credentials.user}}","password":"{{$credentials.pw}}"}}}}
    );
    var buf: [2048]u8 = undefined;
    var diag: Diag = .{};
    const a = try build("{\"url\":\"http://h/{{$credentials.user}}\",\"credential\":\"api\",\"inject\":false}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("http://h/u", buf[0..a.url_len]);
    const headers = buf[a.url_len..a.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, headers, "X-Key") == null);
    try std.testing.expect(std.mem.indexOf(u8, headers, "authorization") == null);
    const b = try build("{\"url\":\"http://h/\",\"credential\":\"api\"}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("http://h/?key=T", buf[0..b.url_len]);
}

test "allowed domains: a request with the member is checked against the list of the credential" {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const doc =
        \\{"open":{"data":{"k":"v"},"inject":{"headers":{"X-Key":"{{$credentials.k}}"}}},
        \\ "listed":{"data":{"k":"v"},"inject":{"headers":{"X-Key":"{{$credentials.k}}"}},
        \\  "allowedDomains":{"mode":"domains","domains":"api.example.com, *.example.org"}},
        \\ "blank":{"data":{"k":"v"},"allowedDomains":{"mode":"domains","domains":"  "}},
        \\ "closed":{"data":{"k":"v"},"allowedDomains":{"mode":"none"}}}
    ;
    var store = try creds.Store.parse(arena.allocator(), doc);
    var buf: [1024]u8 = undefined;
    var diag: Diag = .{};

    // A listed host and a host below a wildcard go out, and a redirect goes back to the node.
    const a = try build("{\"url\":\"https://API.example.com/x\",\"credential\":\"listed\",\"allowedDomains\":true}", &store, null, &buf, &diag);
    try std.testing.expect(a.no_redirect);
    const w = try build("{\"url\":\"https://a.example.org/x\",\"credential\":\"listed\",\"allowedDomains\":true}", &store, null, &buf, &diag);
    try std.testing.expect(w.no_redirect);

    // Another host is refused with the text of n8n, and nothing is built.
    try std.testing.expectError(error.Invalid, build("{\"url\":\"http://Other.test:8080/x?a=1\",\"credential\":\"listed\",\"allowedDomains\":true}", &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("Domain not allowed: This credential is restricted from accessing other.test:8080. Only the following domains are allowed: api.example.com, *.example.org", diag.text());
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://example.org:443/\",\"credential\":\"listed\",\"allowedDomains\":true}", &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("Domain not allowed: This credential is restricted from accessing example.org. Only the following domains are allowed: api.example.com, *.example.org", diag.text());

    // An empty list and the mode `none` refuse each host.
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://api.example.com/\",\"credential\":\"blank\",\"allowedDomains\":true}", &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("No allowed domains specified. Configure allowed domains or change restriction setting.", diag.text());
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://api.example.com/\",\"credential\":\"closed\",\"allowedDomains\":true}", &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("This credential is configured to prevent use within an HTTP Request or GraphQL node", diag.text());

    // A routed node: n8n adds the host that the node owns when the request goes to it.
    const own = "\"allowedDomains\":{\"own\":\"api.node.test\",\"target\":\"https://API.node.test./v1/a\"}}";
    const other = "\"allowedDomains\":{\"own\":\"api.node.test\",\"target\":\"https://other.test/v1/a\"}}";
    const r = try build("{\"url\":\"https://api.node.test/v1/a\",\"credential\":\"listed\"," ++ own, &store, null, &buf, &diag);
    try std.testing.expect(r.no_redirect);
    _ = try build("{\"url\":\"https://api.example.com/x\",\"credential\":\"listed\"," ++ own, &store, null, &buf, &diag);
    _ = try build("{\"url\":\"https://api.node.test/v1/a\",\"credential\":\"blank\"," ++ own, &store, null, &buf, &diag);
    const c = try build("{\"url\":\"https://elsewhere.test/\",\"credential\":\"closed\"," ++ own, &store, null, &buf, &diag);
    try std.testing.expect(!c.no_redirect);
    // The hooks of the node sent the request to another host: the list with the host of the node refuses it.
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://other.test/x\",\"credential\":\"listed\"," ++ own, &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("Domain not allowed: This credential is restricted from accessing other.test. Only the following domains are allowed: api.node.test, api.example.com, *.example.org", diag.text());
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://other.test/x\",\"credential\":\"blank\"," ++ own, &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("Domain not allowed: This credential is restricted from accessing other.test. Only the following domains are allowed: api.node.test", diag.text());
    // The workflow chose the host of the target: the host of the node is not added, and the list alone counts.
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://api.node.test/v1/a\",\"credential\":\"listed\"," ++ other, &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("Domain not allowed: This credential is restricted from accessing api.node.test. Only the following domains are allowed: api.example.com, *.example.org", diag.text());
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://other.test/v1/a\",\"credential\":\"blank\"," ++ other, &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("No allowed domains specified. Configure allowed domains or change restriction setting.", diag.text());
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://other.test/v1/a\",\"credential\":\"closed\"," ++ other, &store, null, &buf, &diag));
    try std.testing.expectEqualStrings("This credential is configured to prevent use within an HTTP Request node", diag.text());
    // A target that is not a URL is not the host of the node, and a request names one host of the node.
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://api.node.test/\",\"credential\":\"closed\",\"allowedDomains\":{\"own\":\"api.node.test\",\"target\":\"//api.node.test/\"}}", &store, null, &buf, &diag));
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://api.node.test/\",\"credential\":\"closed\",\"allowedDomains\":{\"own\":\"a.test,b.test\",\"target\":\"https://a.test/\"}}", &store, null, &buf, &diag));
    try std.testing.expectError(error.Invalid, build("{\"url\":\"https://api.node.test/\",\"credential\":\"closed\",\"allowedDomains\":{\"target\":\"https://a.test/\"}}", &store, null, &buf, &diag));

    // A credential without a limit, and a request of a node that does not read the limit.
    const o = try build("{\"url\":\"https://other.test/\",\"credential\":\"open\",\"allowedDomains\":true}", &store, null, &buf, &diag);
    try std.testing.expect(!o.no_redirect);
    const n = try build("{\"url\":\"https://other.test/\",\"credential\":\"closed\"}", &store, null, &buf, &diag);
    try std.testing.expect(!n.no_redirect);
}

test "inject after a redirect: no query of the credential, and no authentication for another origin" {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const doc =
        \\{"api":{"data":{"t":"tok","user":"u","pw":"p"},
        \\ "inject":{"headers":{"Authorization":"Bearer {{$credentials.t}}","X-Key":"{{$credentials.t}}","Cookie":"s={{$credentials.t}}"},
        \\  "qs":{"key":"{{$credentials.t}}"},"basicAuth":{"user":"{{$credentials.user}}","password":"{{$credentials.pw}}"}}}}
    ;
    var store = try creds.Store.parse(arena.allocator(), doc);
    var buf: [1024]u8 = undefined;
    var diag: Diag = .{};

    // The same origin, or a node that sends its credential to each origin.
    const a = try build("{\"url\":\"http://h/next\",\"credential\":\"api\",\"inject\":\"redirect\",\"followRedirects\":false}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("http://h/next", buf[0..a.url_len]);
    try std.testing.expect(a.no_redirect);
    const ah = buf[a.url_len..a.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, ah, "Authorization: Bearer tok\r\n") != null);
    try std.testing.expect(std.mem.indexOf(u8, ah, "X-Key: tok\r\n") != null);

    // Another origin without authentication: the header with another name stays.
    const o = try build("{\"url\":\"http://other/next\",\"credential\":\"api\",\"inject\":\"redirectOtherOrigin\"}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("http://other/next", buf[0..o.url_len]);
    try std.testing.expect(!o.no_redirect);
    const oh = buf[o.url_len..o.hdr_end];
    try std.testing.expect(std.mem.indexOf(u8, oh, "X-Key: tok\r\n") != null);
    var lower: [1024]u8 = @splat(0);
    const ol = std.ascii.lowerString(&lower, oh);
    try std.testing.expect(std.mem.indexOf(u8, ol, "authorization:") == null);
    try std.testing.expect(std.mem.indexOf(u8, ol, "cookie:") == null);

    // The first request has all that the credential adds.
    const f = try build("{\"url\":\"http://h/first\",\"credential\":\"api\"}", &store, null, &buf, &diag);
    try std.testing.expectEqualStrings("http://h/first?key=tok", buf[0..f.url_len]);
}

test "the user agent of the settings goes to a request that sets none" {
    var buf: [512]u8 = undefined;
    var diag: Diag = .{};
    const a = try buildFilesAs("{\"url\":\"http://h/\"}", null, null, &buf, &diag, null, "Mozilla/5.0 (compatible; n8n/2.48.0; +https://n8n.io/)");
    try std.testing.expect(std.mem.indexOf(u8, buf[a.url_len..a.hdr_end], "user-agent: Mozilla/5.0 (compatible; n8n/2.48.0; +https://n8n.io/)\r\n") != null);
    const own = try buildFilesAs("{\"url\":\"http://h/\",\"headers\":{\"User-Agent\":\"mine\"}}", null, null, &buf, &diag, null, "other");
    try std.testing.expect(std.mem.indexOf(u8, buf[own.url_len..own.hdr_end], "other") == null);
    const d = try build("{\"url\":\"http://h/\"}", null, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[d.url_len..d.hdr_end], "user-agent: n8n\r\n") != null);
    try std.testing.expect(!validUserAgent(""));
    try std.testing.expect(!validUserAgent("a\r\nx: y"));
    try std.testing.expect(validUserAgent("n8n"));
}

test "the accept header of a request that sets none: the defaults of the request helpers of n8n" {
    var buf: [512]u8 = undefined;
    var diag: Diag = .{};
    const Case = struct { args: []const u8, line: []const u8 };
    const cases = [_]Case{
        .{ .args = "{\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":true}", .line = "accept: application/json\r\n" },
        .{ .args = "{\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":false}", .line = "accept: */*\r\n" },
        .{ .args = "{\"url\":\"http://h/\",\"acceptAs\":\"legacy\"}", .line = "accept: */*\r\n" },
        .{ .args = "{\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":\"yes\"}", .line = "accept: */*\r\n" },
        .{ .args = "{\"url\":\"http://h/\",\"acceptAs\":\"request\",\"json\":true}", .line = "accept: application/json\r\n" },
        .{ .args = "{\"url\":\"http://h/\",\"acceptAs\":\"request\",\"json\":\"yes\"}", .line = "accept: application/json\r\n" },
        .{ .args = "{\"url\":\"http://h/\",\"acceptAs\":\"request\",\"json\":null}", .line = "accept: application/json, text/plain, */*\r\n" },
        .{ .args = "{\"url\":\"http://h/\",\"acceptAs\":\"request\"}", .line = "accept: application/json, text/plain, */*\r\n" },
        .{ .args = "{\"url\":\"http://h/\"}", .line = "accept: application/json,text/*;q=0.9,*/*;q=0.8\r\n" },
    };
    for (cases) |c| {
        const b = try build(c.args, null, null, &buf, &diag);
        try std.testing.expect(std.mem.indexOf(u8, buf[b.url_len..b.hdr_end], c.line) != null);
    }
    // A request with its own accept header keeps it.
    const own = try build("{\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":true,\"headers\":{\"Accept\":\"text/csv\"}}", null, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[own.url_len..own.hdr_end], "application/json") == null);
}

test "the content type of a request without one: the defaults of the request helpers of n8n" {
    var buf: [512]u8 = undefined;
    var diag: Diag = .{};
    const json = "content-type: application/json\r\n";
    const form = "content-type: application/x-www-form-urlencoded\r\n";
    const Case = struct { args: []const u8, line: ?[]const u8, body: []const u8 = "" };
    const cases = [_]Case{
        // helpers.request
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":true}", .line = null },
        .{ .args = "{\"method\":\"GET\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":true}", .line = null },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"body\":{\"a\":1}}", .line = json, .body = "{\"a\":1}" },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"body\":{}}", .line = json, .body = "{}" },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":true,\"body\":\"a=1\"}", .line = json, .body = "a=1" },
        .{ .args = "{\"method\":\"GET\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"body\":\"a=1\"}", .line = json, .body = "a=1" },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":false,\"body\":\"a=1\"}", .line = form, .body = "a=1" },
        .{ .args = "{\"method\":\"DELETE\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":false,\"body\":\"a=1\"}", .line = null, .body = "a=1" },
        // helpers.httpRequest
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"request\"}", .line = null },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"request\",\"body\":{\"a\":1}}", .line = json, .body = "{\"a\":1}" },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"request\",\"json\":true,\"body\":\"a=1\"}", .line = form, .body = "a=1" },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"request\",\"body\":{}}", .line = null },
        .{ .args = "{\"method\":\"GET\",\"url\":\"http://h/\",\"acceptAs\":\"request\",\"body\":{\"a\":1}}", .line = null },
        // An empty body of a GET: removed by the helpers that authenticate, kept by `helpers.request`.
        .{ .args = "{\"method\":\"GET\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":true,\"body\":{}}", .line = null },
        .{ .args = "{\"method\":\"GET\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":true,\"inject\":false,\"body\":{}}", .line = json, .body = "{}" },
        .{ .args = "{\"method\":\"DELETE\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"json\":true,\"body\":{}}", .line = json, .body = "{}" },
        // No helper: the defaults of the runtime.
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\"}", .line = null },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"body\":\"a=1\"}", .line = null, .body = "a=1" },
        .{ .args = "{\"method\":\"POST\",\"url\":\"http://h/\",\"body\":{}}", .line = json, .body = "{}" },
    };
    for (cases) |c| {
        const b = try build(c.args, null, null, &buf, &diag);
        const headers = buf[b.url_len..b.hdr_end];
        if (c.line) |line| {
            try std.testing.expect(std.mem.indexOf(u8, headers, line) != null);
        } else {
            try std.testing.expect(std.mem.indexOf(u8, headers, "content-type:") == null);
        }
        try std.testing.expectEqualStrings(c.body, buf[b.hdr_end..b.body_end]);
    }
    // A request with its own content type keeps it.
    const own = try build("{\"method\":\"POST\",\"url\":\"http://h/\",\"acceptAs\":\"legacy\",\"headers\":{\"Content-Type\":\"text/csv\"},\"body\":\"a\"}", null, null, &buf, &diag);
    try std.testing.expect(std.mem.indexOf(u8, buf[own.url_len..own.hdr_end], "application/json") == null);
}
