//! The OpenSSL 3 calls that the floor benchmarks use, and an allocation
//! counter that splits OpenSSL's live heap bytes by side (client or
//! server), so the memory of one TLS connection can be measured.
const std = @import("std");
const builtin = @import("builtin");

pub const SSL_CTX = opaque {};
pub const SSL = opaque {};
const SSL_METHOD = opaque {};

extern fn TLS_method() ?*const SSL_METHOD;
extern fn SSL_CTX_new(m: *const SSL_METHOD) ?*SSL_CTX;
extern fn SSL_CTX_ctrl(ctx: *SSL_CTX, cmd: c_int, larg: c_long, parg: ?*anyopaque) c_long;
extern fn SSL_CTX_set_verify(ctx: *SSL_CTX, mode: c_int, cb: ?*const anyopaque) void;
extern fn SSL_CTX_set_ciphersuites(ctx: *SSL_CTX, s: [*:0]const u8) c_int;
extern fn SSL_CTX_set_num_tickets(ctx: *SSL_CTX, n: usize) c_int;
extern fn SSL_CTX_use_certificate_chain_file(ctx: *SSL_CTX, file: [*:0]const u8) c_int;
extern fn SSL_CTX_use_PrivateKey_file(ctx: *SSL_CTX, file: [*:0]const u8, kind: c_int) c_int;
extern fn SSL_new(ctx: *SSL_CTX) ?*SSL;
pub extern fn SSL_free(ssl: *SSL) void;
extern fn SSL_set_fd(ssl: *SSL, fd: c_int) c_int;
extern fn SSL_set_connect_state(ssl: *SSL) void;
extern fn SSL_set_accept_state(ssl: *SSL) void;
extern fn SSL_ctrl(ssl: *SSL, cmd: c_int, larg: c_long, parg: ?*anyopaque) c_long;
pub extern fn SSL_do_handshake(ssl: *SSL) c_int;
pub extern fn SSL_read(ssl: *SSL, buf: [*]u8, n: c_int) c_int;
pub extern fn SSL_write(ssl: *SSL, buf: [*]const u8, n: c_int) c_int;
pub extern fn SSL_get_error(ssl: *const SSL, ret: c_int) c_int;
pub extern fn SSL_has_pending(ssl: *const SSL) c_int;
extern fn CRYPTO_set_mem_functions(
    m: *const fn (usize, ?[*:0]const u8, c_int) callconv(.c) ?*anyopaque,
    r: *const fn (?*anyopaque, usize, ?[*:0]const u8, c_int) callconv(.c) ?*anyopaque,
    f: *const fn (?*anyopaque, ?[*:0]const u8, c_int) callconv(.c) void,
) c_int;

pub const want_read = 2;
pub const want_write = 3;
const ctrl_mode = 33;
const ctrl_read_ahead = 41;
const ctrl_min_proto = 123;
const tls13 = 0x0304;
const mode_release_buffers = 0x10;

// ---- allocation counter -------------------------------------------------

/// Which side the current OpenSSL call works for: 0 client, 1 server.
/// Set by the single setup thread before each call; the hot loops do not
/// read it (their allocations still count, under the last side set).
pub var side: u8 = 0;
pub var live: [2]std.atomic.Value(i64) = .{ .init(0), .init(0) };
pub var counting = false;
/// OpenSSL read-ahead: one read() per record batch instead of two (header,
/// then body). wfrt's egress runs without it.
pub var read_ahead = true;

const Hdr = extern struct { size: u64, side: u64 };
comptime {
    std.debug.assert(@sizeOf(Hdr) == 16);
}

fn cMalloc(n: usize, _: ?[*:0]const u8, _: c_int) callconv(.c) ?*anyopaque {
    const raw: ?[*]u8 = @ptrCast(std.c.malloc(n + @sizeOf(Hdr)));
    const p = raw orelse return null;
    const h: *Hdr = @ptrCast(@alignCast(p));
    h.* = .{ .size = n, .side = side };
    _ = live[side].fetchAdd(@intCast(n), .monotonic);
    return p + @sizeOf(Hdr);
}

fn cFree(ptr: ?*anyopaque, _: ?[*:0]const u8, _: c_int) callconv(.c) void {
    const q: [*]u8 = @ptrCast(ptr orelse return);
    const h: *Hdr = @ptrCast(@alignCast(q - @sizeOf(Hdr)));
    _ = live[@intCast(h.side)].fetchSub(@intCast(h.size), .monotonic);
    std.c.free(h);
}

fn cRealloc(ptr: ?*anyopaque, n: usize, f: ?[*:0]const u8, l: c_int) callconv(.c) ?*anyopaque {
    const q: [*]u8 = @ptrCast(ptr orelse return cMalloc(n, f, l));
    const h: *Hdr = @ptrCast(@alignCast(q - @sizeOf(Hdr)));
    const old = h.size;
    const s: u8 = @intCast(h.side);
    const raw: ?[*]u8 = @ptrCast(std.c.realloc(h, n + @sizeOf(Hdr)));
    const p = raw orelse return null;
    const nh: *Hdr = @ptrCast(@alignCast(p));
    nh.size = n;
    _ = live[s].fetchAdd(@as(i64, @intCast(n)) - @as(i64, @intCast(old)), .monotonic);
    return p + @sizeOf(Hdr);
}

/// Must run before OpenSSL allocates anything.
pub fn countAllocations() void {
    if (CRYPTO_set_mem_functions(&cMalloc, &cRealloc, &cFree) == 1) counting = true;
}

// ---- contexts -------------------------------------------------------------

pub fn clientCtx() !*SSL_CTX {
    const ctx = SSL_CTX_new(TLS_method() orelse return error.Tls) orelse return error.Tls;
    _ = SSL_CTX_ctrl(ctx, ctrl_min_proto, tls13, null);
    _ = SSL_CTX_set_ciphersuites(ctx, "TLS_AES_128_GCM_SHA256");
    SSL_CTX_set_verify(ctx, 0, null);
    if (read_ahead) _ = SSL_CTX_ctrl(ctx, ctrl_read_ahead, 1, null);
    return ctx;
}

pub fn serverCtx(cert: [*:0]const u8, key: [*:0]const u8) !*SSL_CTX {
    const ctx = SSL_CTX_new(TLS_method() orelse return error.Tls) orelse return error.Tls;
    _ = SSL_CTX_ctrl(ctx, ctrl_min_proto, tls13, null);
    _ = SSL_CTX_set_ciphersuites(ctx, "TLS_AES_128_GCM_SHA256");
    _ = SSL_CTX_set_num_tickets(ctx, 0);
    _ = SSL_CTX_ctrl(ctx, ctrl_read_ahead, 1, null);
    if (SSL_CTX_use_certificate_chain_file(ctx, cert) != 1) return error.TlsCert;
    if (SSL_CTX_use_PrivateKey_file(ctx, key, 1) != 1) return error.TlsKey;
    return ctx;
}

pub fn newConn(ctx: *SSL_CTX, fd: c_int, server: bool, release_buffers: bool) !*SSL {
    const s = SSL_new(ctx) orelse return error.Tls;
    _ = SSL_set_fd(s, fd);
    if (server) SSL_set_accept_state(s) else SSL_set_connect_state(s);
    if (release_buffers) _ = SSL_ctrl(s, ctrl_mode, mode_release_buffers, null);
    return s;
}
