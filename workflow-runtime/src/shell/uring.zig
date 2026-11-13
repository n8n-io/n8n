//! io_uring for the inbound side of a shard (docs/io-uring-design.md,
//! steps 1, 2 and 5). One ring per shard, made in the shard's own thread at
//! the start of its loop, with fixed sizes:
//!
//! - one multishot accept on the listener;
//! - one multishot recv for each connection, into a group of provided
//!   buffers. The shell copies the bytes into the connection's buffer and
//!   gives the buffer back at once, so the group never stays empty for long.
//!   When it is empty, the kernel ends the recv with ENOBUFS: a limit, and
//!   the shell arms the recv again;
//! - sends of the replies of a batch, all submitted in one `io_uring_enter`;
//! - one poll of the epoll descriptor, so the sockets that stay on epoll
//!   (egress, DNS, the fallback host, the admin port) wake the same wait;
//! - the loop timeout is the `io_uring_enter` timeout (`IORING_ENTER_EXT_ARG`),
//!   not an SQE.
//!
//! Nothing here allocates after `init`. Any setup failure (an old kernel, a
//! seccomp filter, `RLIMIT_MEMLOCK`) makes `init` fail, and the shard keeps
//! epoll. On other systems `Ring` is a stub and `init` always fails.
const std = @import("std");
const sys = @import("sys.zig");

pub const supported = sys.is_linux;

/// The user data of SQEs whose completion the shell ignores (cancels).
pub const ignore: u64 = std.math.maxInt(u64);

/// A completion, as the shell sees it.
pub const Completion = struct {
    user: u64,
    res: i32,
    /// The handler stays armed (`IORING_CQE_F_MORE`).
    more: bool,
    /// The provided buffer that holds the received bytes, if any.
    buffer: ?u16,
    /// The kernel goes on filling the same buffer after these bytes
    /// (incremental consumption, `IORING_CQE_F_BUF_MORE`).
    buf_more: bool = false,
};

pub const Config = struct {
    /// Submission queue entries; the completion queue has four times as many.
    entries: u16 = 4096,
    /// Provided buffers for received bytes, a power of two.
    buffers: u16 = 1024,
    buffer_size: u32 = 16 << 10,
};

pub const Ring = if (supported) LinuxRing else StubRing;

const StubRing = struct {
    pub fn init(_: *StubRing, _: std.mem.Allocator, _: Config) !void {
        return error.Unsupported;
    }
    pub fn deinit(_: *StubRing, _: std.mem.Allocator) void {}
    pub fn acceptMultishot(_: *StubRing, _: u64, _: c_int) void {}
    pub fn recvMultishot(_: *StubRing, _: u64, _: c_int) bool {
        return false;
    }
    pub fn send(_: *StubRing, _: u64, _: c_int, _: []const u8) bool {
        return false;
    }
    pub fn cancel(_: *StubRing, _: u64) void {}
    pub fn pollIn(_: *StubRing, _: u64, _: c_int) bool {
        return false;
    }
    pub fn enter(_: *StubRing, _: i32) void {}
    pub fn next(_: *StubRing) ?Completion {
        return null;
    }
    pub fn bytes(_: *StubRing, _: Completion) []const u8 {
        return &.{};
    }
    pub fn giveBack(_: *StubRing, _: Completion) void {}
};

const LinuxRing = struct {
    const linux = std.os.linux;
    const IoUring = linux.IoUring;

    ring: IoUring,
    group: IoUring.BufferGroup,
    /// SQEs that found the queue full go to the kernel at once; this
    /// counts those extra calls (a sizing signal, not an error).
    early_submits: u64 = 0,
    /// Completions copied out of the ring, for `reap`.
    cqes: [1024]linux.io_uring_cqe = undefined,
    ncqes: usize = 0,
    next_cqe: usize = 0,

    const group_id: u16 = 1;

    pub fn init(r: *LinuxRing, gpa: std.mem.Allocator, cfg: Config) !void {
        std.debug.assert(std.math.isPowerOfTwo(cfg.buffers));
        // From the most to the least that a kernel may refuse. The shard
        // thread is the only one that submits and reaps, so completions can
        // wait until it enters the kernel (`DEFER_TASKRUN`).
        const tries = [_]u32{
            linux.IORING_SETUP_SINGLE_ISSUER | linux.IORING_SETUP_DEFER_TASKRUN,
            linux.IORING_SETUP_SINGLE_ISSUER | linux.IORING_SETUP_COOP_TASKRUN,
            linux.IORING_SETUP_COOP_TASKRUN,
            0,
        };
        var last: anyerror = error.Unsupported;
        const made = for (tries) |flags| {
            var p = std.mem.zeroInit(linux.io_uring_params, .{
                .flags = flags | linux.IORING_SETUP_CQSIZE | linux.IORING_SETUP_SUBMIT_ALL,
                .cq_entries = @as(u32, cfg.entries) * 4,
            });
            if (IoUring.init_params(cfg.entries, &p)) |ring| break ring else |e| last = e;
        } else return last;
        r.ring = made;
        errdefer r.ring.deinit();
        const need = linux.IORING_FEAT_EXT_ARG | linux.IORING_FEAT_NODROP;
        if (r.ring.features & need != need) return error.Unsupported;
        r.group = try IoUring.BufferGroup.init(&r.ring, gpa, group_id, cfg.buffer_size, cfg.buffers);
        r.early_submits = 0;
        r.ncqes = 0;
        r.next_cqe = 0;
    }

    pub fn deinit(r: *LinuxRing, gpa: std.mem.Allocator) void {
        r.group.deinit(gpa);
        r.ring.deinit();
    }

    /// An SQE; a full queue goes to the kernel first. Bounded: one submit
    /// empties the queue unless the kernel refuses, and then the SQE is lost
    /// (the caller's state stays as if it was never armed: a limit).
    fn sqe(r: *LinuxRing) ?*linux.io_uring_sqe {
        if (r.ring.get_sqe()) |s| return s else |_| {}
        r.early_submits += 1;
        _ = r.ring.submit() catch return null;
        return r.ring.get_sqe() catch null;
    }

    pub fn acceptMultishot(r: *LinuxRing, user: u64, lfd: c_int) void {
        const s = r.sqe() orelse return;
        s.prep_multishot_accept(lfd, null, null, linux.SOCK.NONBLOCK | linux.SOCK.CLOEXEC);
        s.user_data = user;
    }

    /// False when no SQE could be queued (a limit).
    pub fn recvMultishot(r: *LinuxRing, user: u64, fd: c_int) bool {
        const s = r.sqe() orelse return false;
        s.prep_rw(.RECV, fd, 0, 0, 0);
        s.flags |= linux.IOSQE_BUFFER_SELECT;
        s.buf_index = group_id;
        s.ioprio |= linux.IORING_RECV_MULTISHOT;
        s.user_data = user;
        return true;
    }

    /// `buf` must stay unchanged until the completion. False when no SQE
    /// could be queued (a limit).
    pub fn send(r: *LinuxRing, user: u64, fd: c_int, buf: []const u8) bool {
        const s = r.sqe() orelse return false;
        s.prep_send(fd, buf, linux.MSG.NOSIGNAL);
        s.user_data = user;
        return true;
    }

    /// Cancel the request with user data `user` (its completion still comes,
    /// with ECANCELED).
    pub fn cancel(r: *LinuxRing, user: u64) void {
        const s = r.sqe() orelse return;
        s.prep_cancel(user, 0);
        s.user_data = ignore;
    }

    /// One readiness completion when `fd` can be read; armed again by the
    /// caller after it fires. Arming checks the readiness at once, so a
    /// level-triggered epoll descriptor with events left is reported again.
    /// False when no SQE could be queued (the caller arms it again later).
    pub fn pollIn(r: *LinuxRing, user: u64, fd: c_int) bool {
        const s = r.sqe() orelse return false;
        s.prep_poll_add(fd, linux.POLL.IN);
        s.user_data = user;
        return true;
    }

    /// Submit what is queued, and wait up to `wait_ms` for one completion
    /// (0: do not wait). One system call.
    pub fn enter(r: *LinuxRing, wait_ms: i32) void {
        const to_submit = r.ring.flush_sq();
        var ts: linux.kernel_timespec = .{ .sec = @divTrunc(wait_ms, 1000), .nsec = @as(i64, @rem(wait_ms, 1000)) * 1_000_000 };
        var arg: linux.io_uring_getevents_arg = .{ .sigmask = 0, .sigmask_sz = linux.NSIG / 8, .pad = 0, .ts = @intFromPtr(&ts) };
        const min_complete: u32 = if (wait_ms > 0) 1 else 0;
        const flags = linux.IORING_ENTER_GETEVENTS | linux.IORING_ENTER_EXT_ARG;
        const rc = linux.syscall6(.io_uring_enter, @as(u32, @bitCast(r.ring.fd)), to_submit, min_complete, flags, @intFromPtr(&arg), @sizeOf(linux.io_uring_getevents_arg));
        // ETIME (the timeout) and EINTR are normal ends of a wait; EBUSY
        // and EAGAIN mean completions must be reaped first, which the
        // caller does next.
        _ = rc;
    }

    /// The next completion, or null when none is left.
    pub fn next(r: *LinuxRing) ?Completion {
        if (r.next_cqe == r.ncqes) {
            r.ncqes = r.ring.copy_cqes(&r.cqes, 0) catch 0;
            r.next_cqe = 0;
            if (r.ncqes == 0) return null;
        }
        const c = r.cqes[r.next_cqe];
        r.next_cqe += 1;
        return .{
            .user = c.user_data,
            .res = c.res,
            .more = c.flags & linux.IORING_CQE_F_MORE != 0,
            .buffer = if (c.flags & linux.IORING_CQE_F_BUFFER != 0) @intCast(c.flags >> linux.IORING_CQE_BUFFER_SHIFT) else null,
            .buf_more = c.flags & linux.IORING_CQE_F_BUF_MORE != 0,
        };
    }

    /// The bytes that a recv completion put in its buffer. Read them before
    /// `giveBack`, which moves the buffer's start.
    pub fn bytes(r: *LinuxRing, c: Completion) []const u8 {
        const id = c.buffer orelse return &.{};
        if (c.res <= 0) return &.{};
        return r.group.get_by_id(id)[0..@intCast(c.res)];
    }

    /// Give the buffer of a completion back to the kernel.
    pub fn giveBack(r: *LinuxRing, c: Completion) void {
        const id = c.buffer orelse return;
        const cqe: linux.io_uring_cqe = .{
            .user_data = c.user,
            .res = c.res,
            .flags = (@as(u32, id) << linux.IORING_CQE_BUFFER_SHIFT) | linux.IORING_CQE_F_BUFFER | if (c.buf_more) @as(u32, linux.IORING_CQE_F_BUF_MORE) else 0,
        };
        r.group.put(cqe) catch {};
    }
};

/// The next completion with user data `user`, entering the kernel as
/// needed. Other completions are dropped (their buffers given back).
fn waitFor(r: *Ring, user: u64) !Completion {
    var tries: u32 = 0;
    while (tries < 200) : (tries += 1) {
        r.enter(20);
        var guard: u32 = 0;
        while (guard < 64) : (guard += 1) {
            const c = r.next() orelse break;
            if (c.user == user) return c;
            r.giveBack(c);
        }
    }
    return error.Timeout;
}

test "ring: accept, recv into provided buffers, send, and buffers come back" {
    if (!supported) return error.SkipZigTest;
    const gpa = std.testing.allocator;
    const mem = try gpa.alloc(u8, 4 * (4096 + 4) + (64 << 10));
    defer gpa.free(mem);
    var fba: std.heap.FixedBufferAllocator = .init(mem);
    var ring: Ring = undefined;
    // A kernel or sandbox without io_uring: nothing to test here.
    ring.init(fba.allocator(), .{ .entries = 64, .buffers = 4, .buffer_size = 4096 }) catch return error.SkipZigTest;
    defer ring.deinit(fba.allocator());

    const lfd = try sys.listenTcp(.{ 127, 0, 0, 1 }, 0, false);
    defer sys.close(lfd);
    var sa: std.c.sockaddr.in = undefined;
    var sl: std.c.socklen_t = @sizeOf(std.c.sockaddr.in);
    try std.testing.expectEqual(@as(c_int, 0), std.c.getsockname(lfd, @ptrCast(&sa), &sl));
    const port = std.mem.bigToNative(u16, sa.port);

    ring.acceptMultishot(1, lfd);
    const cfd = try sys.connectTcp(.{ 127, 0, 0, 1 }, port);
    var cfd_open = true;
    defer if (cfd_open) sys.close(cfd);
    const acc = try waitFor(&ring, 1);
    try std.testing.expect(acc.res >= 0);
    const sfd: c_int = acc.res;
    defer sys.close(sfd);
    try std.testing.expect(ring.recvMultishot(2, sfd));

    // More rounds than buffers: each buffer must come back to the kernel.
    var round: u32 = 0;
    while (round < 20) : (round += 1) {
        var msg_buf: [32]u8 = undefined;
        const msg = try std.fmt.bufPrint(&msg_buf, "request {d}", .{round});
        try std.testing.expectEqual(sys.IoResult{ .n = msg.len }, sys.writeSome(cfd, msg));
        var got: [32]u8 = undefined;
        var n: usize = 0;
        var guard: u32 = 0;
        while (n < msg.len and guard < 16) : (guard += 1) {
            const c = try waitFor(&ring, 2);
            try std.testing.expect(c.res > 0);
            const b = ring.bytes(c);
            @memcpy(got[n..][0..b.len], b);
            n += b.len;
            ring.giveBack(c);
            if (!c.more) try std.testing.expect(ring.recvMultishot(2, sfd));
        }
        try std.testing.expectEqualStrings(msg, got[0..n]);

        try std.testing.expect(ring.send(3, sfd, "reply"));
        const s = try waitFor(&ring, 3);
        try std.testing.expectEqual(@as(i32, 5), s.res);
        var rb: [8]u8 = undefined;
        var rn: usize = 0;
        var tries: u32 = 0;
        while (rn < 5 and tries < 1000) : (tries += 1) switch (sys.readSome(cfd, rb[rn..])) {
            .n => |k| rn += k,
            .again => sys.sleepMs(1),
            .closed => return error.Closed,
        };
        try std.testing.expectEqualStrings("reply", rb[0..rn]);
    }

    // The peer closes: the recv ends with 0 bytes.
    ring.cancel(1);
    sys.close(cfd);
    cfd_open = false;
    const eof = try waitFor(&ring, 2);
    try std.testing.expectEqual(@as(i32, 0), eof.res);
}
