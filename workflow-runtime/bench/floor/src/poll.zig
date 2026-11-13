//! A minimal level-triggered read poller (kqueue or epoll) and the socket
//! calls of the floor benchmarks. Tokens are 32-bit connection indices.
const std = @import("std");
const builtin = @import("builtin");
const c = std.c;
const linux = std.os.linux;

pub const is_linux = builtin.os.tag == .linux;

pub const Poller = struct {
    fd: c_int,

    pub fn init() !Poller {
        const fd = if (is_linux) c.epoll_create1(0) else c.kqueue();
        if (fd < 0) return error.PollerInit;
        return .{ .fd = fd };
    }

    pub fn addRead(p: *Poller, fd: c_int, token: u32) !void {
        if (is_linux) {
            var ev: linux.epoll_event = .{ .events = linux.EPOLL.IN, .data = .{ .u64 = token } };
            if (c.epoll_ctl(p.fd, linux.EPOLL.CTL_ADD, fd, @ptrCast(&ev)) != 0) return error.PollerAdd;
        } else {
            const ch = [_]c.Kevent{.{ .ident = @intCast(fd), .filter = c.EVFILT.READ, .flags = c.EV.ADD, .fflags = 0, .data = 0, .udata = token }};
            var none: [0]c.Kevent = undefined;
            if (c.kevent(p.fd, &ch, 1, &none, 0, null) < 0) return error.PollerAdd;
        }
    }

    /// Fill `out` with ready tokens; one system call.
    pub fn wait(p: *Poller, out: []u32, timeout_ms: i32) usize {
        if (is_linux) {
            var evs: [1024]linux.epoll_event = undefined;
            const max = @min(out.len, evs.len);
            const n = c.epoll_wait(p.fd, @ptrCast(&evs), @intCast(max), timeout_ms);
            if (n <= 0) return 0;
            for (evs[0..@intCast(n)], 0..) |e, i| out[i] = @truncate(e.data.u64);
            return @intCast(n);
        } else {
            var evs: [1024]c.Kevent = undefined;
            const max = @min(out.len, evs.len);
            const ts: c.timespec = .{ .sec = @divTrunc(timeout_ms, 1000), .nsec = @rem(timeout_ms, 1000) * 1_000_000 };
            const none: [0]c.Kevent = undefined;
            const n = c.kevent(p.fd, &none, 0, &evs, @intCast(max), &ts);
            if (n <= 0) return 0;
            for (evs[0..@intCast(n)], 0..) |e, i| out[i] = @truncate(e.udata);
            return @intCast(n);
        }
    }
};

fn setOpt(fd: c_int, level: i32, opt: u32, val: c_int) void {
    _ = c.setsockopt(fd, level, opt, &val, @sizeOf(c_int));
}

pub fn setNonBlocking(fd: c_int) void {
    const flags = c.fcntl(fd, c.F.GETFL, @as(c_int, 0));
    var o: c.O = @bitCast(@as(u32, @intCast(flags)));
    o.NONBLOCK = true;
    _ = c.fcntl(fd, c.F.SETFL, @as(c_int, @intCast(@as(u32, @bitCast(o)))));
}

pub fn tune(fd: c_int) void {
    setNonBlocking(fd);
    setOpt(fd, c.IPPROTO.TCP, c.TCP.NODELAY, 1);
    if (!is_linux) setOpt(fd, c.SOL.SOCKET, c.SO.NOSIGPIPE, 1);
}

/// A blocking listener on 127.0.0.1 with a kernel-chosen port.
pub fn listenLoopback() !struct { fd: c_int, port: u16 } {
    const fd = c.socket(c.AF.INET, c.SOCK.STREAM, 0);
    if (fd < 0) return error.Socket;
    setOpt(fd, c.SOL.SOCKET, c.SO.REUSEADDR, 1);
    var a = std.mem.zeroes(c.sockaddr.in);
    a.family = c.AF.INET;
    a.addr = @bitCast([4]u8{ 127, 0, 0, 1 });
    if (c.bind(fd, @ptrCast(&a), @sizeOf(c.sockaddr.in)) != 0) return error.Bind;
    if (c.listen(fd, 4096) != 0) return error.Listen;
    var len: c.socklen_t = @sizeOf(c.sockaddr.in);
    _ = c.getsockname(fd, @ptrCast(&a), &len);
    return .{ .fd = fd, .port = std.mem.bigToNative(u16, a.port) };
}

/// One connected loopback pair: client fd and the accepted server fd.
pub fn pair(lfd: c_int, port: u16) ![2]c_int {
    const cfd = c.socket(c.AF.INET, c.SOCK.STREAM, 0);
    if (cfd < 0) return error.Socket;
    var a = std.mem.zeroes(c.sockaddr.in);
    a.family = c.AF.INET;
    a.addr = @bitCast([4]u8{ 127, 0, 0, 1 });
    a.port = std.mem.nativeToBig(u16, port);
    if (c.connect(cfd, @ptrCast(&a), @sizeOf(c.sockaddr.in)) != 0) return error.Connect;
    const sfd = c.accept(lfd, null, null);
    if (sfd < 0) return error.Accept;
    tune(cfd);
    tune(sfd);
    return .{ cfd, sfd };
}

/// Raise the open-file limit to the hard limit.
pub fn raiseFdLimit() u64 {
    var rl: c.rlimit = undefined;
    _ = c.getrlimit(.NOFILE, &rl);
    var want = rl.max;
    if (builtin.os.tag == .macos) want = @min(want, 245_760);
    rl.cur = want;
    if (c.setrlimit(.NOFILE, &rl) != 0) {
        rl.cur = 65_536;
        _ = c.setrlimit(.NOFILE, &rl);
    }
    _ = c.getrlimit(.NOFILE, &rl);
    return rl.cur;
}

pub const Io = union(enum) { n: usize, again, closed };

pub fn readSome(fd: c_int, buf: []u8) Io {
    const r = c.read(fd, buf.ptr, buf.len);
    if (r > 0) return .{ .n = @intCast(r) };
    if (r == 0) return .closed;
    return if (c.errno(r) == .AGAIN) .again else .closed;
}

/// Write all of `buf`. Small benchmark messages fit the socket buffer, so
/// the loop runs once; a full buffer spins (counted by the caller).
pub fn writeAll(fd: c_int, buf: []const u8) u32 {
    var off: usize = 0;
    var calls: u32 = 0;
    while (off < buf.len) : (calls += 1) {
        const r = c.write(fd, buf.ptr + off, buf.len - off);
        if (r > 0) off += @intCast(r) else if (c.errno(r) != .AGAIN) return calls + 1;
    }
    return calls;
}
