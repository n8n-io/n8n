//! Thin system layer for the shell: a readiness poller (kqueue on macOS,
//! epoll on Linux), non-blocking sockets and a clock. Only the shell uses it.
const std = @import("std");
const builtin = @import("builtin");
const c = std.c;

pub const is_linux = builtin.os.tag == .linux;

pub const Ready = struct { token: u64, readable: bool, writable: bool, eof: bool };

/// A poller token: kind in the top byte, a 24-bit generation, a 32-bit index.
pub fn makeToken(kind: u8, gen: u32, idx: u32) u64 {
    return (@as(u64, kind) << 56) | (@as(u64, gen & 0xFFFFFF) << 32) | idx;
}

pub const Poller = struct {
    fd: c_int,

    pub fn init() !Poller {
        const fd = if (is_linux) c.epoll_create1(0) else c.kqueue();
        if (fd < 0) return error.PollerInit;
        return .{ .fd = fd };
    }

    pub fn deinit(p: *Poller) void {
        _ = c.close(p.fd);
    }

    /// Watch `fd` for reads, level-triggered.
    pub fn addRead(p: *Poller, fd: c_int, token: u64) !void {
        if (is_linux) {
            var ev: std.os.linux.epoll_event = .{ .events = std.os.linux.EPOLL.IN | std.os.linux.EPOLL.RDHUP, .data = .{ .u64 = token } };
            if (c.epoll_ctl(p.fd, std.os.linux.EPOLL.CTL_ADD, fd, @ptrCast(&ev)) != 0) return error.PollerAdd;
        } else {
            const ch = [_]c.Kevent{.{ .ident = @intCast(fd), .filter = c.EVFILT.READ, .flags = c.EV.ADD, .fflags = 0, .data = 0, .udata = token }};
            var none: [0]c.Kevent = undefined;
            if (c.kevent(p.fd, &ch, 1, &none, 0, null) < 0) return error.PollerAdd;
        }
    }

    /// Ask for one write-readiness event (after a write returned EAGAIN or
    /// while a connect is in progress).
    pub fn wantWrite(p: *Poller, fd: c_int, token: u64) !void {
        if (is_linux) {
            var ev: std.os.linux.epoll_event = .{ .events = std.os.linux.EPOLL.IN | std.os.linux.EPOLL.OUT | std.os.linux.EPOLL.RDHUP, .data = .{ .u64 = token } };
            if (c.epoll_ctl(p.fd, std.os.linux.EPOLL.CTL_MOD, fd, @ptrCast(&ev)) != 0) return error.PollerMod;
        } else {
            const ch = [_]c.Kevent{.{ .ident = @intCast(fd), .filter = c.EVFILT.WRITE, .flags = c.EV.ADD | c.EV.ONESHOT, .fflags = 0, .data = 0, .udata = token }};
            var none: [0]c.Kevent = undefined;
            if (c.kevent(p.fd, &ch, 1, &none, 0, null) < 0) return error.PollerMod;
        }
    }

    /// On Linux the write interest stays until it is cleared.
    pub fn doneWrite(p: *Poller, fd: c_int, token: u64) void {
        if (!is_linux) return;
        var ev: std.os.linux.epoll_event = .{ .events = std.os.linux.EPOLL.IN | std.os.linux.EPOLL.RDHUP, .data = .{ .u64 = token } };
        _ = c.epoll_ctl(p.fd, std.os.linux.EPOLL.CTL_MOD, fd, @ptrCast(&ev));
    }

    /// Set the read and write interest of `fd` to exactly these values,
    /// level-triggered. c-ares uses this for its sockets.
    pub fn watch(p: *Poller, fd: c_int, tok: u64, read: bool, write: bool) void {
        if (is_linux) {
            const L = std.os.linux.EPOLL;
            const rd: u32 = if (read) L.IN | L.RDHUP else 0;
            const wr: u32 = if (write) L.OUT else 0;
            var ev: std.os.linux.epoll_event = .{ .events = rd | wr, .data = .{ .u64 = tok } };
            if (c.epoll_ctl(p.fd, L.CTL_MOD, fd, @ptrCast(&ev)) != 0) _ = c.epoll_ctl(p.fd, L.CTL_ADD, fd, @ptrCast(&ev));
        } else {
            const ch = [_]c.Kevent{
                .{ .ident = @intCast(fd), .filter = c.EVFILT.READ, .flags = if (read) c.EV.ADD else c.EV.DELETE, .fflags = 0, .data = 0, .udata = tok },
                .{ .ident = @intCast(fd), .filter = c.EVFILT.WRITE, .flags = if (write) c.EV.ADD else c.EV.DELETE, .fflags = 0, .data = 0, .udata = tok },
            };
            var none: [0]c.Kevent = undefined;
            // A delete of a filter that is not there fails; that is fine.
            for (ch) |one| _ = c.kevent(p.fd, (&one)[0..1], 1, &none, 0, null);
        }
    }

    pub fn remove(p: *Poller, fd: c_int) void {
        if (is_linux) {
            _ = c.epoll_ctl(p.fd, std.os.linux.EPOLL.CTL_DEL, fd, null);
        }
        // kqueue drops filters when the descriptor is closed.
    }

    /// Gather every ready descriptor in one call.
    pub fn wait(p: *Poller, out: []Ready, timeout_ms: i32) usize {
        if (is_linux) {
            var evs: [1024]std.os.linux.epoll_event = undefined;
            const max = @min(out.len, evs.len);
            const n = c.epoll_wait(p.fd, @ptrCast(&evs), @intCast(max), timeout_ms);
            if (n <= 0) return 0;
            for (evs[0..@intCast(n)], 0..) |e, i| {
                out[i] = .{
                    .token = e.data.u64,
                    .readable = e.events & (std.os.linux.EPOLL.IN | std.os.linux.EPOLL.HUP | std.os.linux.EPOLL.RDHUP | std.os.linux.EPOLL.ERR) != 0,
                    .writable = e.events & std.os.linux.EPOLL.OUT != 0,
                    .eof = e.events & (std.os.linux.EPOLL.HUP | std.os.linux.EPOLL.ERR) != 0,
                };
            }
            return @intCast(n);
        } else {
            var evs: [1024]c.Kevent = undefined;
            const max = @min(out.len, evs.len);
            const ts: c.timespec = .{ .sec = @divTrunc(timeout_ms, 1000), .nsec = @rem(timeout_ms, 1000) * 1_000_000 };
            const none: [0]c.Kevent = undefined;
            const n = c.kevent(p.fd, &none, 0, &evs, @intCast(max), if (timeout_ms < 0) null else &ts);
            if (n <= 0) return 0;
            for (evs[0..@intCast(n)], 0..) |e, i| {
                out[i] = .{
                    .token = e.udata,
                    .readable = e.filter == c.EVFILT.READ,
                    .writable = e.filter == c.EVFILT.WRITE,
                    .eof = e.flags & c.EV.EOF != 0 and e.data == 0,
                };
            }
            return @intCast(n);
        }
    }
};

pub fn nowMs() i64 {
    var ts: c.timespec = undefined;
    _ = c.clock_gettime(c.CLOCK.REALTIME, &ts);
    return @as(i64, ts.sec) * 1000 + @divTrunc(@as(i64, ts.nsec), 1_000_000);
}

pub fn nowNs() u64 {
    var ts: c.timespec = undefined;
    _ = c.clock_gettime(c.CLOCK.MONOTONIC, &ts);
    return @as(u64, @intCast(ts.sec)) * 1_000_000_000 + @as(u64, @intCast(ts.nsec));
}

pub fn setNonBlocking(fd: c_int) void {
    const flags = c.fcntl(fd, c.F.GETFL, @as(c_int, 0));
    var o: c.O = @bitCast(@as(u32, @intCast(flags)));
    o.NONBLOCK = true;
    _ = c.fcntl(fd, c.F.SETFL, @as(c_int, @intCast(@as(u32, @bitCast(o)))));
}

fn setOpt(fd: c_int, level: i32, opt: u32, val: c_int) void {
    _ = c.setsockopt(fd, level, opt, &val, @sizeOf(c_int));
}

fn addr4(ip: [4]u8, port: u16) c.sockaddr.in {
    var a = std.mem.zeroes(c.sockaddr.in);
    a.family = c.AF.INET;
    a.port = std.mem.nativeToBig(u16, port);
    a.addr = @bitCast(ip);
    return a;
}

/// A non-blocking listener. With `reuse_port` every shard can bind the
/// same port and the kernel spreads connections (Linux).
pub fn listenTcp(ip: [4]u8, port: u16, reuse_port: bool) !c_int {
    const fd = c.socket(c.AF.INET, c.SOCK.STREAM, 0);
    if (fd < 0) return error.Socket;
    setOpt(fd, c.SOL.SOCKET, c.SO.REUSEADDR, 1);
    if (reuse_port) setOpt(fd, c.SOL.SOCKET, c.SO.REUSEPORT, 1);
    const a = addr4(ip, port);
    if (c.bind(fd, @ptrCast(&a), @sizeOf(c.sockaddr.in)) != 0) return error.Bind;
    if (c.listen(fd, 4096) != 0) return error.Listen;
    setNonBlocking(fd);
    return fd;
}

/// No Nagle delay on a socket that the kernel accepted for io_uring.
pub fn setNoDelay(fd: c_int) void {
    setOpt(fd, c.IPPROTO.TCP, c.TCP.NODELAY, 1);
}

pub fn acceptOne(lfd: c_int) ?c_int {
    const fd = c.accept(lfd, null, null);
    if (fd < 0) return null;
    setNonBlocking(fd);
    setOpt(fd, c.IPPROTO.TCP, c.TCP.NODELAY, 1);
    if (!is_linux) setOpt(fd, c.SOL.SOCKET, c.SO.NOSIGPIPE, 1);
    return fd;
}

/// An IPv4 or IPv6 address and a port.
pub const Addr = struct {
    v6: bool = false,
    /// IPv4 uses the first 4 bytes.
    ip: [16]u8 = @splat(0),
    port: u16 = 0,

    pub fn ip4(ip: [4]u8, port: u16) Addr {
        var a: Addr = .{ .port = port };
        @memcpy(a.ip[0..4], &ip);
        return a;
    }

    pub fn eql(a: Addr, b: Addr) bool {
        return a.v6 == b.v6 and a.port == b.port and std.mem.eql(u8, &a.ip, &b.ip);
    }
};

/// Start a non-blocking connect. Completion shows as write readiness.
pub fn connectTcp(ip: [4]u8, port: u16) !c_int {
    return connectAddr(Addr.ip4(ip, port));
}

pub fn connectAddr(addr: Addr) !c_int {
    const family: c_uint = if (addr.v6) c.AF.INET6 else c.AF.INET;
    const fd = c.socket(family, c.SOCK.STREAM, 0);
    if (fd < 0) return error.Socket;
    setNonBlocking(fd);
    setOpt(fd, c.IPPROTO.TCP, c.TCP.NODELAY, 1);
    if (!is_linux) setOpt(fd, c.SOL.SOCKET, c.SO.NOSIGPIPE, 1);
    var rc: c_int = 0;
    if (addr.v6) {
        var a = std.mem.zeroes(c.sockaddr.in6);
        a.family = c.AF.INET6;
        a.port = std.mem.nativeToBig(u16, addr.port);
        a.addr = addr.ip;
        rc = c.connect(fd, @ptrCast(&a), @sizeOf(c.sockaddr.in6));
    } else {
        const a = addr4(addr.ip[0..4].*, addr.port);
        rc = c.connect(fd, @ptrCast(&a), @sizeOf(c.sockaddr.in));
    }
    if (rc != 0 and c.errno(@as(c_int, -1)) != .INPROGRESS) {
        _ = c.close(fd);
        return error.Connect;
    }
    return fd;
}

/// The pending error of a socket after a non-blocking connect, 0 if none.
pub fn socketError(fd: c_int) c_int {
    var v: c_int = 0;
    var len: c.socklen_t = @sizeOf(c_int);
    if (c.getsockopt(fd, c.SOL.SOCKET, c.SO.ERROR, &v, &len) != 0) return -1;
    return v;
}

/// The text of an errno value, for error messages.
pub fn errnoText(code: c_int) []const u8 {
    return std.mem.span(strerror(code));
}

extern "c" fn strerror(code: c_int) [*:0]const u8;

extern "c" fn signal(sig: c_int, handler: usize) usize;

/// Writes to a closed peer return an error instead of killing the process.
/// OpenSSL writes with write(2), which has no MSG_NOSIGNAL.
pub fn ignoreSigpipe() void {
    _ = signal(13, 1); // SIGPIPE, SIG_IGN on Linux and macOS.
}

/// Set by SIGINT or SIGTERM: `serve` stops its shards and frees its memory.
pub var shutdown_requested = std.atomic.Value(bool).init(false);

fn onShutdownSignal(_: c_int) callconv(.c) void {
    shutdown_requested.store(true, .release);
}

pub fn handleShutdownSignals() void {
    _ = signal(2, @intFromPtr(&onShutdownSignal)); // SIGINT
    _ = signal(15, @intFromPtr(&onShutdownSignal)); // SIGTERM
}

/// Give the pages of a large buffer back to the system. The next write to
/// them reads zeros, which is fine for receive buffers.
/// Safe builds fill memory that goes back to a pool with 0xAA, so a stale
/// slice into it reads poison. Release builds without safety skip it.
pub fn poison(buf: []u8) void {
    if (std.debug.runtime_safety) @memset(buf, 0xAA);
}

/// Fill `buf` from the operating system's CSPRNG.
pub fn randomBytes(buf: []u8) void {
    if (is_linux) {
        var got: usize = 0;
        while (got < buf.len) {
            const n = std.os.linux.getrandom(buf[got..].ptr, buf.len - got, 0);
            // A negative errno comes back as a large usize: retry (EINTR).
            if (n > buf.len) continue;
            got += n;
        }
    } else {
        c.arc4random_buf(buf.ptr, buf.len);
    }
}

pub fn releasePages(buf: []u8) void {
    const page = std.heap.pageSize();
    const start = std.mem.alignForward(usize, @intFromPtr(buf.ptr), page);
    const end = std.mem.alignBackward(usize, @intFromPtr(buf.ptr) + buf.len, page);
    if (end <= start) return;
    const p: *align(std.heap.page_size_min) anyopaque = @ptrFromInt(start);
    _ = c.madvise(p, end - start, if (is_linux) 4 else c.MADV.FREE); // MADV_DONTNEED on Linux.
}

pub fn connectUnix(path: []const u8) !c_int {
    const fd = c.socket(c.AF.UNIX, c.SOCK.STREAM, 0);
    if (fd < 0) return error.Socket;
    var a = std.mem.zeroes(c.sockaddr.un);
    a.family = c.AF.UNIX;
    if (path.len >= a.path.len) return error.PathTooLong;
    @memcpy(a.path[0..path.len], path);
    if (c.connect(fd, @ptrCast(&a), @sizeOf(c.sockaddr.un)) != 0) {
        _ = c.close(fd);
        return error.Connect;
    }
    setNonBlocking(fd);
    return fd;
}

pub const IoResult = union(enum) { n: usize, again, closed };

pub fn readSome(fd: c_int, buf: []u8) IoResult {
    if (buf.len == 0) return .again;
    const n = c.read(fd, buf.ptr, buf.len);
    if (n > 0) return .{ .n = @intCast(n) };
    if (n == 0) return .closed;
    return if (c.errno(n) == .AGAIN) .again else .closed;
}

pub fn writeSome(fd: c_int, buf: []const u8) IoResult {
    const flags: u32 = if (is_linux) 0x4000 else 0; // MSG_NOSIGNAL on Linux.
    const n = c.send(fd, buf.ptr, buf.len, flags);
    if (n >= 0) return .{ .n = @intCast(n) };
    return if (c.errno(n) == .AGAIN) .again else .closed;
}

/// Write several buffers in one system call. The count is capped at 64.
pub fn writevSome(fd: c_int, bufs: []const []const u8) IoResult {
    std.debug.assert(bufs.len > 0);
    var iov: [64]std.posix.iovec_const = undefined;
    const n_iov = @min(bufs.len, iov.len);
    for (bufs[0..n_iov], 0..) |b, i| iov[i] = .{ .base = b.ptr, .len = b.len };
    const n = c.writev(fd, &iov, @intCast(n_iov));
    if (n >= 0) return .{ .n = @intCast(n) };
    return if (c.errno(n) == .AGAIN) .again else .closed;
}

/// An environment variable. The process keeps the text.
pub fn getenv(name: []const u8) ?[]const u8 {
    var buf: [256]u8 = undefined;
    if (name.len >= buf.len) return null;
    @memcpy(buf[0..name.len], name);
    buf[name.len] = 0;
    const v = c.getenv(buf[0..name.len :0]) orelse return null;
    return std.mem.span(v);
}

/// Sleep on the main thread (the stats printer). Shards never sleep.
pub fn sleepMs(ms: u32) void {
    var ts: c.timespec = .{ .sec = @intCast(ms / 1000), .nsec = @intCast(@as(u64, ms % 1000) * 1_000_000) };
    _ = c.nanosleep(&ts, null);
}

pub fn close(fd: c_int) void {
    _ = c.close(fd);
}

extern "c" fn inet_pton(af: c_int, src: [*:0]const u8, dst: *anyopaque) c_int;

/// Parse an IPv6 literal without brackets, for example "::1".
pub fn parseIp6(host: []const u8) ?[16]u8 {
    var z: [64]u8 = undefined;
    if (host.len == 0 or host.len >= z.len) return null;
    @memcpy(z[0..host.len], host);
    z[host.len] = 0;
    var out: [16]u8 = undefined;
    if (inet_pton(@intCast(c.AF.INET6), z[0..host.len :0], &out) != 1) return null;
    return out;
}

/// A numeric host or "localhost" as an address, else null (needs DNS).
pub fn numericAddr(host: []const u8, port: u16) ?Addr {
    if (parseIp4(host)) |ip| return Addr.ip4(ip, port);
    if (parseIp6(host)) |ip| return .{ .v6 = true, .ip = ip, .port = port };
    return null;
}

/// Parse "a.b.c.d" or "localhost".
pub fn parseIp4(host: []const u8) ?[4]u8 {
    if (std.mem.eql(u8, host, "localhost")) return .{ 127, 0, 0, 1 };
    var out: [4]u8 = undefined;
    var it = std.mem.splitScalar(u8, host, '.');
    var i: usize = 0;
    while (it.next()) |part| : (i += 1) {
        if (i == 4) return null;
        out[i] = std.fmt.parseInt(u8, part, 10) catch return null;
    }
    return if (i == 4) out else null;
}
