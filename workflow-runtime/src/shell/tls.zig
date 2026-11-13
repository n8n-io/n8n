//! TLS over non-blocking sockets with OpenSSL 3. Every call returns at
//! once; WANT_READ and WANT_WRITE tell the caller which readiness to wait
//! for in the poller. Without `-Dnet` the functions fail with
//! `error.TlsUnavailable` and nothing links against OpenSSL.
const std = @import("std");
const build_options = @import("build_options");

pub const enabled = build_options.net;

const SSL_CTX = opaque {};
const BIO = opaque {};
const BIO_METHOD = opaque {};
const SSL = opaque {};
const SSL_METHOD = opaque {};
const X509_VERIFY_PARAM = opaque {};

extern fn TLS_client_method() ?*const SSL_METHOD;
extern fn TLS_server_method() ?*const SSL_METHOD;
extern fn SSL_CTX_new(m: *const SSL_METHOD) ?*SSL_CTX;
extern fn SSL_CTX_free(ctx: *SSL_CTX) void;
extern fn SSL_CTX_set_default_verify_paths(ctx: *SSL_CTX) c_int;
extern fn SSL_CTX_load_verify_locations(ctx: *SSL_CTX, file: ?[*:0]const u8, dir: ?[*:0]const u8) c_int;
extern fn SSL_CTX_set_verify(ctx: *SSL_CTX, mode: c_int, cb: ?*const anyopaque) void;
extern fn SSL_CTX_ctrl(ctx: *SSL_CTX, cmd: c_int, larg: c_long, parg: ?*anyopaque) c_long;
extern fn SSL_CTX_set_options(ctx: *SSL_CTX, op: u64) u64;
extern fn SSL_CTX_use_certificate_chain_file(ctx: *SSL_CTX, file: [*:0]const u8) c_int;
extern fn SSL_CTX_use_PrivateKey_file(ctx: *SSL_CTX, file: [*:0]const u8, kind: c_int) c_int;
extern fn SSL_new(ctx: *SSL_CTX) ?*SSL;
extern fn SSL_free(ssl: *SSL) void;
extern fn SSL_set_fd(ssl: *SSL, fd: c_int) c_int;
extern fn SSL_set_connect_state(ssl: *SSL) void;
extern fn SSL_set_accept_state(ssl: *SSL) void;
extern fn SSL_ctrl(ssl: *SSL, cmd: c_int, larg: c_long, parg: ?*anyopaque) c_long;
extern fn SSL_set1_host(ssl: *SSL, host: [*:0]const u8) c_int;
extern fn SSL_get0_param(ssl: *SSL) *X509_VERIFY_PARAM;
extern fn X509_VERIFY_PARAM_set1_ip_asc(p: *X509_VERIFY_PARAM, ip: [*:0]const u8) c_int;
extern fn SSL_do_handshake(ssl: *SSL) c_int;
extern fn SSL_read(ssl: *SSL, buf: [*]u8, n: c_int) c_int;
extern fn SSL_write(ssl: *SSL, buf: [*]const u8, n: c_int) c_int;
extern fn SSL_get_error(ssl: *const SSL, ret: c_int) c_int;
extern fn SSL_get_verify_result(ssl: *const SSL) c_long;
extern fn SSL_has_pending(ssl: *const SSL) c_int;
extern fn SSL_set_bio(ssl: *SSL, rbio: *BIO, wbio: *BIO) void;
extern fn BIO_get_new_index() c_int;
extern fn BIO_meth_new(kind: c_int, name: [*:0]const u8) ?*BIO_METHOD;
extern fn BIO_meth_free(m: *BIO_METHOD) void;
extern fn BIO_meth_set_write(m: *BIO_METHOD, f: *const fn (*BIO, [*]const u8, c_int) callconv(.c) c_int) c_int;
extern fn BIO_meth_set_read(m: *BIO_METHOD, f: *const fn (*BIO, [*]u8, c_int) callconv(.c) c_int) c_int;
extern fn BIO_meth_set_ctrl(m: *BIO_METHOD, f: *const fn (*BIO, c_int, c_long, ?*anyopaque) callconv(.c) c_long) c_int;
extern fn BIO_meth_set_create(m: *BIO_METHOD, f: *const fn (*BIO) callconv(.c) c_int) c_int;
extern fn BIO_new(m: *const BIO_METHOD) ?*BIO;
extern fn BIO_free(b: *BIO) c_int;
extern fn BIO_set_data(b: *BIO, p: ?*anyopaque) void;
extern fn BIO_get_data(b: *BIO) ?*anyopaque;
extern fn BIO_set_init(b: *BIO, init: c_int) void;
extern fn BIO_set_flags(b: *BIO, flags: c_int) void;
extern fn BIO_clear_flags(b: *BIO, flags: c_int) void;
extern fn SSL_set_alpn_protos(ssl: *SSL, protos: [*]const u8, len: c_uint) c_int;
extern fn SSL_get0_alpn_selected(ssl: *const SSL, data: *?[*]const u8, len: *c_uint) void;
extern fn SSL_CTX_set_alpn_select_cb(ctx: *SSL_CTX, cb: *const fn (?*SSL, *?[*]const u8, *u8, [*]const u8, c_uint, ?*anyopaque) callconv(.c) c_int, arg: ?*anyopaque) void;
extern fn X509_verify_cert_error_string(n: c_long) [*:0]const u8;
extern fn ERR_get_error() c_ulong;
extern fn ERR_clear_error() void;
extern fn ERR_error_string_n(e: c_ulong, buf: [*]u8, len: usize) void;

const SSL_ERROR_SSL = 1;
const SSL_ERROR_WANT_READ = 2;
const SSL_ERROR_WANT_WRITE = 3;
const SSL_ERROR_SYSCALL = 5;
const SSL_ERROR_ZERO_RETURN = 6;
const SSL_CTRL_MODE = 33;
const SSL_CTRL_SET_READ_AHEAD = 41;
const SSL_CTRL_SET_TLSEXT_HOSTNAME = 55;
const SSL_CTRL_SET_MIN_PROTO_VERSION = 123;
const TLS1_2_VERSION = 0x0303;
const SSL_MODE_ENABLE_PARTIAL_WRITE = 1;
const SSL_MODE_ACCEPT_MOVING_WRITE_BUFFER = 2;
const SSL_MODE_RELEASE_BUFFERS = 0x10;
const SSL_OP_IGNORE_UNEXPECTED_EOF: u64 = 1 << 7;
const SSL_VERIFY_NONE = 0;
const SSL_VERIFY_PEER = 1;
const SSL_FILETYPE_PEM = 1;
const SSL_TLSEXT_ERR_OK = 0;
const BIO_TYPE_SOURCE_SINK = 0x0400;
const BIO_FLAGS_READ = 0x01;
const BIO_FLAGS_WRITE = 0x02;
const BIO_FLAGS_RWS = 0x07;
const BIO_FLAGS_SHOULD_RETRY = 0x08;
const BIO_CTRL_FLUSH = 11;
const BIO_CTRL_PUSH = 6;
const BIO_CTRL_POP = 7;
const SSL_TLSEXT_ERR_NOACK = 3;

/// ALPN protocol lists (length-prefixed names).
const alpn_h2_h1 = "\x02h2\x08http/1.1";
const alpn_h1 = "\x08http/1.1";

pub const Error = error{ TlsUnavailable, TlsInit, CaFile };

/// The ciphertext of one client session, in buffers that the caller
/// reserves at startup. OpenSSL reads records from `in` and writes them to
/// `out` through a BIO (`bio_method`), and makes no system call of its own:
/// the caller moves bytes between these buffers and the socket. Nothing
/// here allocates.
pub const BioBuf = struct {
    in: []u8 = &.{},
    in_start: usize = 0,
    in_end: usize = 0,
    out: []u8 = &.{},
    out_len: usize = 0,
    /// The socket reached EOF: a read of an empty `in` ends the stream.
    eof: bool = false,

    pub fn reset(b: *BioBuf) void {
        b.in_start = 0;
        b.in_end = 0;
        b.out_len = 0;
        b.eof = false;
    }

    /// Ciphertext received and not yet taken by OpenSSL.
    pub fn inPending(b: *const BioBuf) usize {
        return b.in_end - b.in_start;
    }

    /// Room to read more ciphertext from the socket, after moving what
    /// waits to the front.
    pub fn inRoom(b: *BioBuf) []u8 {
        if (b.in_start > 0) {
            const n = b.in_end - b.in_start;
            std.mem.copyForwards(u8, b.in[0..n], b.in[b.in_start..b.in_end]);
            b.in_start = 0;
            b.in_end = n;
        }
        return b.in[b.in_end..];
    }

    /// Ciphertext that waits to go to the socket.
    pub fn outPending(b: *const BioBuf) []const u8 {
        return b.out[0..b.out_len];
    }

    /// `n` bytes of `outPending` went to the socket.
    pub fn outSent(b: *BioBuf, n: usize) void {
        std.debug.assert(n <= b.out_len);
        std.mem.copyForwards(u8, b.out[0 .. b.out_len - n], b.out[n..b.out_len]);
        b.out_len -= n;
    }
};

fn bioWrite(bio: *BIO, data: [*]const u8, len: c_int) callconv(.c) c_int {
    const b: *BioBuf = @ptrCast(@alignCast(BIO_get_data(bio).?));
    BIO_clear_flags(bio, BIO_FLAGS_RWS | BIO_FLAGS_SHOULD_RETRY);
    const n = @min(@as(usize, @intCast(len)), b.out.len - b.out_len);
    if (n == 0) {
        BIO_set_flags(bio, BIO_FLAGS_WRITE | BIO_FLAGS_SHOULD_RETRY);
        return -1;
    }
    @memcpy(b.out[b.out_len..][0..n], data[0..n]);
    b.out_len += n;
    return @intCast(n);
}

fn bioRead(bio: *BIO, data: [*]u8, len: c_int) callconv(.c) c_int {
    const b: *BioBuf = @ptrCast(@alignCast(BIO_get_data(bio).?));
    BIO_clear_flags(bio, BIO_FLAGS_RWS | BIO_FLAGS_SHOULD_RETRY);
    const n = @min(@as(usize, @intCast(len)), b.in_end - b.in_start);
    if (n == 0) {
        if (b.eof) return 0;
        BIO_set_flags(bio, BIO_FLAGS_READ | BIO_FLAGS_SHOULD_RETRY);
        return -1;
    }
    @memcpy(data[0..n], b.in[b.in_start..][0..n]);
    b.in_start += n;
    return @intCast(n);
}

fn bioCtrl(_: *BIO, cmd: c_int, _: c_long, _: ?*anyopaque) callconv(.c) c_long {
    return switch (cmd) {
        BIO_CTRL_FLUSH, BIO_CTRL_PUSH, BIO_CTRL_POP => 1,
        else => 0,
    };
}

fn bioCreate(bio: *BIO) callconv(.c) c_int {
    BIO_set_init(bio, 1);
    return 1;
}

/// One context per shard. `SSL_CTX` holds the trust store and settings.
pub const Context = struct {
    ctx: ?*SSL_CTX = null,
    /// The BIO type of client sessions (`BioBuf`).
    bio_method: ?*BIO_METHOD = null,

    /// `insecure` skips peer verification. Only for tests. `ca_file` adds
    /// the certificates of a PEM file to the default trust store
    /// (`--ca-file`, for example the ai-gym's CA).
    pub fn client(insecure: bool, ca_file: ?[:0]const u8) Error!Context {
        if (!enabled) return .{};
        const ctx = SSL_CTX_new(TLS_client_method() orelse return error.TlsInit) orelse return error.TlsInit;
        _ = SSL_CTX_ctrl(ctx, SSL_CTRL_SET_MIN_PROTO_VERSION, TLS1_2_VERSION, null);
        _ = SSL_CTX_ctrl(ctx, SSL_CTRL_MODE, SSL_MODE_ENABLE_PARTIAL_WRITE | SSL_MODE_ACCEPT_MOVING_WRITE_BUFFER | SSL_MODE_RELEASE_BUFFERS, null);
        // A server that closes without close_notify ends a close-delimited
        // body; treat it as a clean end, as Node.js does.
        _ = SSL_CTX_set_options(ctx, SSL_OP_IGNORE_UNEXPECTED_EOF);
        if (insecure) {
            SSL_CTX_set_verify(ctx, SSL_VERIFY_NONE, null);
        } else {
            if (SSL_CTX_set_default_verify_paths(ctx) != 1) return error.TlsInit;
            if (ca_file) |f| if (SSL_CTX_load_verify_locations(ctx, f.ptr, null) != 1) return error.CaFile;
            SSL_CTX_set_verify(ctx, SSL_VERIFY_PEER, null);
        }
        const m = BIO_meth_new(BIO_get_new_index() | BIO_TYPE_SOURCE_SINK, "wfrt egress") orelse return error.TlsInit;
        if (BIO_meth_set_write(m, bioWrite) != 1 or BIO_meth_set_read(m, bioRead) != 1 or
            BIO_meth_set_ctrl(m, bioCtrl) != 1 or BIO_meth_set_create(m, bioCreate) != 1) return error.TlsInit;
        return .{ .ctx = ctx, .bio_method = m };
    }

    /// A server context for the benchmark stub.
    pub fn server(cert_path: [*:0]const u8, key_path: [*:0]const u8) Error!Context {
        if (!enabled) return error.TlsUnavailable;
        const ctx = SSL_CTX_new(TLS_server_method() orelse return error.TlsInit) orelse return error.TlsInit;
        _ = SSL_CTX_ctrl(ctx, SSL_CTRL_MODE, SSL_MODE_ENABLE_PARTIAL_WRITE | SSL_MODE_ACCEPT_MOVING_WRITE_BUFFER, null);
        if (SSL_CTX_use_certificate_chain_file(ctx, cert_path) != 1) return error.TlsInit;
        if (SSL_CTX_use_PrivateKey_file(ctx, key_path, SSL_FILETYPE_PEM) != 1) return error.TlsInit;
        return .{ .ctx = ctx };
    }

    /// Servers only: answer ALPN with `h2` when the client offers it
    /// (the benchmark stub and the tests), else HTTP/1.1.
    pub fn serverAlpnH2(c: Context) void {
        if (!enabled) return;
        SSL_CTX_set_alpn_select_cb(c.ctx.?, selectH2, null);
    }

    fn selectH2(_: ?*SSL, out: *?[*]const u8, out_len: *u8, in: [*]const u8, in_len: c_uint, _: ?*anyopaque) callconv(.c) c_int {
        const list = in[0..in_len];
        var i: usize = 0;
        var guard: usize = 0;
        while (i < list.len and guard < 256) : (guard += 1) {
            const n = list[i];
            if (i + 1 + n > list.len) break;
            if (n == 2 and std.mem.eql(u8, list[i + 1 .. i + 3], "h2")) {
                out.* = list[i + 1 ..].ptr;
                out_len.* = 2;
                return SSL_TLSEXT_ERR_OK;
            }
            i += 1 + n;
        }
        return SSL_TLSEXT_ERR_NOACK;
    }

    pub fn deinit(c: *Context) void {
        if (!enabled) return;
        if (c.ctx) |ctx| SSL_CTX_free(ctx);
        c.ctx = null;
        if (c.bio_method) |m| BIO_meth_free(m);
        c.bio_method = null;
    }
};

/// The outcome of one non-blocking TLS call.
pub const Io = union(enum) {
    n: usize,
    want_read,
    want_write,
    /// The peer closed the connection (close_notify or EOF).
    closed,
    failed,
};

pub const Session = struct {
    ssl: *SSL,
    /// The ciphertext buffers of a client session; null for a session on
    /// a socket (the stub and tests).
    io: ?*BioBuf = null,

    /// A client session on a connected socket. `host` is the URL host:
    /// it is sent as SNI and checked against the certificate. An IP
    /// literal is checked as an IP address and is not sent as SNI.
    /// `offer_h2` offers `h2` and `http/1.1` with ALPN; else only
    /// `http/1.1`.
    pub fn connect(ctx: Context, fd: c_int, host: []const u8, is_ip: bool, offer_h2: bool) Error!Session {
        if (!enabled) return error.TlsUnavailable;
        const ssl = SSL_new(ctx.ctx orelse return error.TlsInit) orelse return error.TlsInit;
        errdefer SSL_free(ssl);
        if (SSL_set_fd(ssl, fd) != 1) return error.TlsInit;
        var z: [256]u8 = undefined;
        if (host.len >= z.len) return error.TlsInit;
        @memcpy(z[0..host.len], host);
        z[host.len] = 0;
        const hz: [*:0]const u8 = z[0..host.len :0];
        if (is_ip) {
            if (X509_VERIFY_PARAM_set1_ip_asc(SSL_get0_param(ssl), hz) != 1) return error.TlsInit;
        } else {
            if (SSL_ctrl(ssl, SSL_CTRL_SET_TLSEXT_HOSTNAME, 0, @ptrCast(@constCast(hz))) != 1) return error.TlsInit;
            if (SSL_set1_host(ssl, hz) != 1) return error.TlsInit;
        }
        const alpn: []const u8 = if (offer_h2) alpn_h2_h1 else alpn_h1;
        if (SSL_set_alpn_protos(ssl, alpn.ptr, @intCast(alpn.len)) != 0) return error.TlsInit;
        SSL_set_connect_state(ssl);
        return .{ .ssl = ssl };
    }

    /// A client session whose ciphertext goes through `io` (see `BioBuf`).
    /// `io` must not move while the session lives.
    pub fn connectBio(ctx: Context, io: *BioBuf, host: []const u8, is_ip: bool, offer_h2: bool) Error!Session {
        if (!enabled) return error.TlsUnavailable;
        const ssl = SSL_new(ctx.ctx orelse return error.TlsInit) orelse return error.TlsInit;
        errdefer SSL_free(ssl);
        const bio = BIO_new(ctx.bio_method orelse return error.TlsInit) orelse return error.TlsInit;
        BIO_set_data(bio, io);
        // One BIO for both directions: SSL_set_bio takes one reference.
        SSL_set_bio(ssl, bio, bio);
        io.reset();
        var s: Session = .{ .ssl = ssl, .io = io };
        try s.setHost(host, is_ip, offer_h2);
        SSL_set_connect_state(ssl);
        return s;
    }

    fn setHost(s: *Session, host: []const u8, is_ip: bool, offer_h2: bool) Error!void {
        const ssl = s.ssl;
        var z: [256]u8 = undefined;
        if (host.len >= z.len) return error.TlsInit;
        @memcpy(z[0..host.len], host);
        z[host.len] = 0;
        const hz: [*:0]const u8 = z[0..host.len :0];
        if (is_ip) {
            if (X509_VERIFY_PARAM_set1_ip_asc(SSL_get0_param(ssl), hz) != 1) return error.TlsInit;
        } else {
            if (SSL_ctrl(ssl, SSL_CTRL_SET_TLSEXT_HOSTNAME, 0, @ptrCast(@constCast(hz))) != 1) return error.TlsInit;
            if (SSL_set1_host(ssl, hz) != 1) return error.TlsInit;
        }
        const alpn: []const u8 = if (offer_h2) alpn_h2_h1 else alpn_h1;
        if (SSL_set_alpn_protos(ssl, alpn.ptr, @intCast(alpn.len)) != 0) return error.TlsInit;
    }

    /// A server session on an accepted socket (benchmark stub).
    pub fn accept(ctx: Context, fd: c_int) Error!Session {
        if (!enabled) return error.TlsUnavailable;
        const ssl = SSL_new(ctx.ctx orelse return error.TlsInit) orelse return error.TlsInit;
        if (SSL_set_fd(ssl, fd) != 1) {
            SSL_free(ssl);
            return error.TlsInit;
        }
        SSL_set_accept_state(ssl);
        return .{ .ssl = ssl };
    }

    pub fn deinit(s: Session) void {
        if (!enabled) return;
        SSL_free(s.ssl);
    }

    /// Read ahead: one read() takes all the records that have arrived,
    /// not a record header and then its body (docs/floor.md). On after the
    /// handshake. (A stall of HTTP/1.1 over TLS at 10,000 connections came
    /// as often without it: it was the handshake storm, not read-ahead.)
    pub fn setReadAhead(s: Session) void {
        if (!enabled) return;
        _ = SSL_ctrl(s.ssl, SSL_CTRL_SET_READ_AHEAD, 1, null);
    }

    /// True when OpenSSL holds bytes that the socket no longer shows:
    /// decrypted data, or records read ahead. Only then is a read without a
    /// readiness event worth its system call.
    pub fn hasPending(s: Session) bool {
        if (!enabled) return false;
        if (s.io) |b| if (b.inPending() > 0) return true;
        return SSL_has_pending(s.ssl) == 1;
    }

    /// After the handshake: true when the server chose `h2`.
    pub fn alpnH2(s: Session) bool {
        if (!enabled) return false;
        var p: ?[*]const u8 = null;
        var n: c_uint = 0;
        SSL_get0_alpn_selected(s.ssl, &p, &n);
        return n == 2 and p != null and p.?[0] == 'h' and p.?[1] == '2';
    }

    /// Advance the handshake. `.n` means it is complete.
    pub fn handshake(s: Session) Io {
        if (!enabled) return .failed;
        ERR_clear_error();
        const rc = SSL_do_handshake(s.ssl);
        if (rc == 1) return .{ .n = 0 };
        return s.classify(rc);
    }

    pub fn read(s: Session, buf: []u8) Io {
        if (!enabled) return .failed;
        if (buf.len == 0) return .want_read;
        ERR_clear_error();
        const rc = SSL_read(s.ssl, buf.ptr, @intCast(@min(buf.len, std.math.maxInt(c_int))));
        if (rc > 0) return .{ .n = @intCast(rc) };
        return s.classify(rc);
    }

    pub fn write(s: Session, buf: []const u8) Io {
        if (!enabled) return .failed;
        std.debug.assert(buf.len > 0);
        ERR_clear_error();
        const rc = SSL_write(s.ssl, buf.ptr, @intCast(@min(buf.len, std.math.maxInt(c_int))));
        if (rc > 0) return .{ .n = @intCast(rc) };
        return s.classify(rc);
    }

    fn classify(s: Session, rc: c_int) Io {
        return switch (SSL_get_error(s.ssl, rc)) {
            SSL_ERROR_WANT_READ => .want_read,
            SSL_ERROR_WANT_WRITE => .want_write,
            SSL_ERROR_ZERO_RETURN => .closed,
            // An I/O error or EOF below TLS: the socket is gone.
            SSL_ERROR_SYSCALL => .closed,
            else => .failed,
        };
    }

    /// Why the last call failed: the certificate check result if it
    /// failed, else the OpenSSL error text. Holds no secrets.
    pub fn failure(s: Session, out: []u8) []const u8 {
        if (!enabled) return "TLS is not in this build";
        const v = SSL_get_verify_result(s.ssl);
        if (v != 0) {
            const t = std.mem.span(X509_verify_cert_error_string(v));
            return std.fmt.bufPrint(out, "certificate verify failed ({s})", .{t}) catch t;
        }
        return lastError(out);
    }
};

/// The text of the oldest queued OpenSSL error, or a generic text.
pub fn lastError(out: []u8) []const u8 {
    if (!enabled) return "TLS is not in this build";
    const e = ERR_get_error();
    if (e == 0 or out.len < 8) return "connection reset during TLS";
    ERR_error_string_n(e, out.ptr, out.len);
    return std.mem.sliceTo(out, 0);
}
