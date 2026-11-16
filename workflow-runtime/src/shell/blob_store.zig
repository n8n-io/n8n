//! The binary data store of a shard (spec 7.1, `responseBinary`): the body
//! of a response becomes a file that n8n reads, and the step gets a handle.
//!
//! The backend is n8n's file system store (`FsByteStore` and
//! `BinaryDataBlobManager` of n8n):
//!
//! - a file is `<root>/workflows/<workflow>/executions/<execution>/binary_data/<uuid>`;
//! - it is written as `<uuid>.tmp.<pid>.<uuid>` and renamed, with no sync, as n8n does;
//! - the companion `<uuid>.metadata` holds `{"fileName","mimeType","fileSize"}`,
//!   written in the same way after the file;
//! - the id of the entry is `filesystem-v2:<file id>`.
//!
//! Paths. A file id comes from workflow data, so it passes `binary_store.fileId`
//! first: six segments of `[A-Za-z0-9._-]`, never `.` or `..`. No operation
//! takes a path: the store walks from the root directory one segment at a
//! time, and each open has `O_NOFOLLOW` (`sys.FileOp`). So no id reaches a
//! file outside the root, and no step of the walk follows a symbolic link.
//!
//! I/O is data. A transfer is a row with a phase. `nextOp` gives the one
//! file operation of the phase, and `onResult` takes its result. The driver
//! runs the operation: on the ring of the shard (`uring.zig`, no blocking),
//! or at once (`sys.fileOpNow`) when the shard has no ring. That second
//! driver blocks the shard for the time of the operation; it is the path of
//! macOS and of `--io poll`. Tests use a third driver that holds each
//! operation until the test runs it.
//!
//! A body comes in pieces (`begin`, `append`, `complete`): the store never holds
//! a whole file. With the ring, a piece waits in blocks of a pool until its
//! write is done, and the block goes back to the pool. When the pool is
//! empty, `append` takes fewer bytes than it was given, and the caller stops
//! reading its socket until blocks are free (`hasRoom`). So the memory of
//! the store does not depend on the size of a file.
//!
//! Memory is reserved at startup: the rows, a result buffer for each row,
//! and the pool of blocks. A full table fails the step with a limit error.
//!
//! A stored file is also the body of a request, or a part of it (`sourceOpen`).
//! The store reads it in pieces of one buffer, on demand: the consumer sees
//! the bytes (`sourcePeek`), sends them, and says how many it sent
//! (`sourceTake`). The next read starts when the buffer is empty. The buffers
//! of the sources are reserved at startup (`Config.source_buffers`); a source
//! without a free buffer waits. So a file of any size goes out with the
//! memory of one buffer, and no read blocks the shard on the ring.
//!
//! Another backend (S3) is another set of phases behind `reserve`, `put`,
//! `nextDone` and `take`: the callers see handles and results only.
const std = @import("std");
const core_lib = @import("core");
const names = core_lib.binary_names;
const sys = @import("sys.zig");
const uring = @import("uring.zig");
const http = @import("http.zig");
const creds = @import("creds.zig");
const binary_store = @import("binary_store.zig");

pub const Config = struct {
    /// The storage path of n8n (`N8N_BINARY_DATA_STORAGE_PATH`).
    root: []const u8,
    /// `--binary-max-file-mb`: a larger body fails its step.
    max_file_bytes: u64 = 16 << 20,
    /// `--binary-max-transfers`: stored responses in flight, from the start
    /// of the request to the result of the step.
    max_transfers: u16 = 64,
    /// `--binary-buffer-mb`: bodies that wait for their writes on the ring.
    buffer_bytes: u64 = 32 << 20,
    block_bytes: u32 = 64 << 10,
    /// The result of a step: status, headers and the handle.
    result_bytes: u32 = 16 << 10,
    /// The time that the file operations of one transfer may take.
    timeout_ms: u32 = 30_000,
    /// Stored files that are read at the same time for the bodies of
    /// requests. Each has one buffer of `block_bytes`.
    source_buffers: u16 = 8,
};

pub const Counters = struct {
    stored: u64 = 0,
    failed: u64 = 0,
    rows_full: u64 = 0,
    blocks_full: u64 = 0,
    too_large: u64 = 0,
    timed_out: u64 = 0,
    stale_completions: u64 = 0,
    ring_full: u64 = 0,
    /// Stored files that were opened as the body of a request.
    sources: u64 = 0,
    /// Times a source found no free read buffer.
    source_waits: u64 = 0,
};

/// The size of a stored file that a request sends (`sourceSize`).
pub const Size = union(enum) {
    /// The file is not open yet: ask again later.
    wait,
    size: u64,
    /// The file cannot be read. The text is valid until `sourceClose`.
    failed: []const u8,
};

/// The next bytes of a stored file that a request sends (`sourcePeek`).
pub const Piece = union(enum) {
    /// A file operation runs, or no read buffer is free: ask again later.
    wait,
    /// Valid until `sourceTake` or `sourceClose`.
    bytes: []const u8,
    /// Every byte of the file was taken.
    end,
    /// The file cannot be read. The text is valid until `sourceClose`.
    failed: []const u8,
};

/// A reserved transfer: the row in the low half, its generation in the high half.
pub const Handle = enum(u32) {
    none = std.math.maxInt(u32),
    _,

    fn of(row: u16, gen: u16) Handle {
        return @fromBackingInt(@as(u32, gen) << 16 | row);
    }
    fn index(h: Handle) u16 {
        return @truncate(@backingInt(h));
    }
    fn generation(h: Handle) u16 {
        return @truncate(@backingInt(h) >> 16);
    }
};

/// A response whose body comes with `append`.
pub const Begin = struct {
    exec_id: u64,
    seq: u32,
    workflow: []const u8,
    /// The execution segment of the path: n8n's id, or `wfrt-<n>`.
    execution: []const u8,
    /// The start of the result, `{"status":N,"headers":{...}}`.
    head: []const u8,
    content_disposition: []const u8,
    content_type: []const u8,
    /// The path of the URL of the response, with its first `/`.
    url_path: []const u8,
    /// The size of the body, when the response says it.
    expected: ?u64 = null,
    /// The caller has the whole body and gives it next (`putBody`): with the
    /// ring, it must fit in the free blocks now.
    whole: bool = false,
    now_ms: i64,
};

/// What `append` did with the bytes.
pub const Append = union(enum) {
    /// The count of bytes that the store has now. Fewer than given: the
    /// pool is empty, and the rest goes again after `hasRoom`.
    took: usize,
    /// The transfer failed. Its result has the reason.
    failed,
};

/// What `put` stores: a response with its whole body.
pub const Put = struct {
    exec_id: u64,
    seq: u32,
    workflow: []const u8,
    /// The execution segment of the path: n8n's id, or `wfrt-<n>`.
    execution: []const u8,
    /// The start of the result, `{"status":N,"headers":{...}}`.
    head: []const u8,
    content_disposition: []const u8,
    content_type: []const u8,
    /// The path of the URL of the response, with its first `/`.
    url_path: []const u8,
    body: []const u8,
    now_ms: i64,
};

/// A result for the step. `payload` is valid until `take`.
pub const Done = struct {
    row: u16,
    exec_id: u64,
    seq: u32,
    ok: bool,
    /// The result of a stored response: `payload` is the head, then the
    /// body. False: `payload` is the whole result (`readMetadata`).
    stored: bool,
    /// The bytes of `payload` before the body of the result.
    head_len: u32,
    payload: []const u8,
};

const none: u32 = std.math.maxInt(u32);
const levels = 5;
const name_bytes = 192;
const aux_bytes = 2048;
/// The result of an operation that the ring did not take.
const refused: i32 = std.math.minInt(i32);
/// Operations of one transfer in one call, for the driver that runs them at once.
const max_steps = 1 << 16;

const State = enum(u8) { free, reserved, active, finished };
const Job = enum(u8) { put, meta, source };
const Have = enum(u8) { none, tmp, final };
const Phase = enum(u8) {
    dir_make,
    dir_open,
    file_create,
    file_write,
    file_rename,
    meta_create,
    meta_write,
    meta_rename,
    meta_open,
    meta_read,
    unlink_file,
    unlink_meta,
    /// A source: open the file, read a piece, and wait for the consumer.
    src_open,
    src_read,
    src_hold,
    end,
};

/// One transfer. Owner: this file. Lifetime: from `reserve` to `take`.
/// Capacity: `Config.max_transfers`.
const Row = struct {
    state: State = .free,
    job: Job = .put,
    phase: Phase = .end,
    gen: u16 = 0,
    exec_id: u64 = 0,
    seq: u32 = 0,
    deadline_ms: i64 = 0,
    /// An operation is with the driver.
    in_flight: bool = false,
    failed: bool = false,
    cleaning: bool = false,
    /// The result is in the done list, or the shell took it.
    reported: bool = false,
    taken: bool = false,
    ok: bool = false,
    /// The caller of `begin` holds the handle: the row stays until `complete` or `fail`.
    open: bool = false,
    /// No more bytes come.
    eof: bool = false,
    done_next: u32 = none,
    dir_fd: c_int = -1,
    file_fd: c_int = -1,
    level: u8 = 0,
    file: Have = .none,
    meta: Have = .none,
    /// The size of the file, known when the last byte is written.
    size: u64 = 0,
    written: u64 = 0,
    /// The bytes that `append` took.
    queued: u64 = 0,
    /// The blocks that wait for their writes, oldest first. `head_off`:
    /// the bytes of the first block that are written. `tail_len`: the
    /// bytes of the last block that are filled.
    block_head: u32 = none,
    block_tail: u32 = none,
    head_off: u32 = 0,
    tail_len: u32 = 0,
    /// A source: its read buffer. `head_off`: the bytes of it that the
    /// consumer took. `tail_len`: the bytes of it that are read. `written`:
    /// the bytes of the file that are read.
    src_buf: u32 = none,
    result_len: u32 = 0,
    head_len: u32 = 0,
    aux_len: u32 = 0,
    id_len: u16 = 0,
    opt_name_len: u16 = 0,
    opt_mime_len: u16 = 0,
    /// The file id, without the prefix of the store.
    id: [binary_store.max_id]u8 = @splat(0),
    opt_name: [names.max_path_bytes]u8 = @splat(0),
    opt_mime: [names.max_mime_bytes]u8 = @splat(0),
    tmp_tag: [names.uuid_len]u8 = @splat(0),
    /// The names of the operation in flight, each with its NUL.
    name_a: [name_bytes]u8 = @splat(0),
    name_b: [name_bytes]u8 = @splat(0),
    /// The companion file: its text to write, or the bytes read.
    aux: [aux_bytes]u8 = @splat(0),

    fn fileId(r: *const Row) []const u8 {
        return r.id[0..r.id_len];
    }

    fn segment(r: *const Row, at: usize) []const u8 {
        var it = std.mem.splitScalar(u8, r.fileId(), '/');
        var i: usize = 0;
        while (it.next()) |s| : (i += 1) if (i == at) return s;
        unreachable; // A file id has six segments (`binary_store.fileId`), and `at` is below six.
    }
};

const Driver = union(enum) {
    /// Run each operation at once. It can block the shard.
    blocking,
    ring: *uring.Ring,
    /// Tests: an operation waits here until `runHeld`.
    held: []?sys.FileOp,
};

pub const Store = struct {
    cfg: Config,
    root_fd: c_int,
    pid: u32,
    /// The token kind of the completions of this store.
    kind: u8,
    driver: Driver = .blocking,
    rows: []Row,
    free: []u16,
    nfree: u32,
    results: []u8,
    /// The block pool: `block_next` chains the blocks of a row, and the free ones.
    blocks: []u8,
    block_next: []u32,
    block_free: u32 = none,
    blocks_free: u32 = 0,
    /// The read buffers of the sources, and the free ones.
    src_mem: []u8,
    src_free: []u16,
    nsrc_free: u32,
    done_head: u32 = none,
    done_tail: u32 = none,
    active: u32 = 0,
    /// The body of the `put` that runs now, for the driver that runs at once.
    borrowed: []const u8 = &.{},
    counters: Counters = .{},

    pub const InitError = error{ OutOfMemory, BadRoot };

    /// Reserve every buffer and open the root directory. `s` must not move afterwards.
    pub fn init(s: *Store, gpa: std.mem.Allocator, cfg: Config, kind: u8) InitError!void {
        std.debug.assert(cfg.max_transfers > 0 and cfg.block_bytes > 0 and cfg.result_bytes >= 256);
        var path: [binary_store.max_path + 1]u8 = @splat(0);
        if (cfg.root.len == 0 or cfg.root.len > binary_store.max_path) return error.BadRoot;
        @memcpy(path[0..cfg.root.len], cfg.root);
        const root_fd = sys.openDir(path[0..cfg.root.len :0]) catch return error.BadRoot;
        errdefer sys.close(root_fd);
        const nblocks: u32 = @intCast(@min(cfg.buffer_bytes / cfg.block_bytes, 1 << 24));
        s.* = .{
            .cfg = cfg,
            .root_fd = root_fd,
            .pid = sys.processId(),
            .kind = kind,
            .rows = try gpa.alloc(Row, cfg.max_transfers),
            .free = try gpa.alloc(u16, cfg.max_transfers),
            .nfree = cfg.max_transfers,
            .results = try core_lib.arena.reserve(gpa, u8, @as(usize, cfg.result_bytes) * cfg.max_transfers),
            .blocks = try core_lib.arena.reserve(gpa, u8, @as(usize, cfg.block_bytes) * nblocks),
            .block_next = try gpa.alloc(u32, nblocks),
            .src_mem = try core_lib.arena.reserve(gpa, u8, @as(usize, cfg.block_bytes) * cfg.source_buffers),
            .src_free = try gpa.alloc(u16, cfg.source_buffers),
            .nsrc_free = cfg.source_buffers,
        };
        for (s.src_free, 0..) |*f, i| f.* = @intCast(i);
        for (s.rows, 0..) |*r, i| {
            r.* = .{};
            s.free[i] = @intCast(cfg.max_transfers - 1 - i);
        }
        for (s.block_next, 0..) |*n, i| n.* = if (i + 1 < nblocks) @intCast(i + 1) else none;
        s.block_free = if (nblocks > 0) 0 else none;
        s.blocks_free = nblocks;
    }

    pub fn deinit(s: *Store) void {
        sys.close(s.root_fd);
        s.root_fd = -1;
    }

    /// The shard has a ring: file operations go to it from now on.
    pub fn useRing(s: *Store, ring: *uring.Ring) void {
        std.debug.assert(s.active == 0);
        s.driver = .{ .ring = ring };
    }

    /// Tests of the callers of the store: the file operations wait in `ops`
    /// (one place for each row) until `runHeldOps`, as completions of a ring do.
    pub fn holdOps(s: *Store, ops: []?sys.FileOp) void {
        std.debug.assert(s.active == 0 and ops.len >= s.rows.len);
        s.driver = .{ .held = ops };
    }

    /// Run the operation that waits for each row. Returns their count.
    pub fn runHeldOps(s: *Store) u32 {
        const ops = switch (s.driver) {
            .held => |o| o,
            .blocking, .ring => return 0,
        };
        var ran: u32 = 0;
        for (ops[0..s.rows.len], 0..) |*slot, i| {
            const op = slot.* orelse continue;
            slot.* = null;
            s.onCompletion(s.token(@intCast(i)), sys.fileOpNow(op));
            ran += 1;
        }
        return ran;
    }

    /// Transfers whose file operations are not finished.
    pub fn busy(s: *const Store) bool {
        return s.active > 0;
    }

    // ---- rows ------------------------------------------------------------------

    fn acquire(s: *Store) ?u16 {
        if (s.nfree == 0) {
            s.counters.rows_full += 1;
            return null;
        }
        s.nfree -= 1;
        const ri = s.free[s.nfree];
        const r = &s.rows[ri];
        std.debug.assert(r.state == .free and !r.in_flight);
        const gen = r.gen +% 1;
        r.* = .{ .gen = gen, .state = .reserved };
        return ri;
    }

    fn freeRow(s: *Store, ri: u16) void {
        const r = &s.rows[ri];
        std.debug.assert(r.state != .free and !r.in_flight and r.block_head == none and !r.open);
        std.debug.assert(r.dir_fd < 0 and r.file_fd < 0 and r.src_buf == none);
        r.state = .free;
        r.gen +%= 1;
        s.free[s.nfree] = ri;
        s.nfree += 1;
    }

    fn rowOf(s: *Store, h: Handle) u16 {
        const ri = h.index();
        std.debug.assert(ri < s.rows.len and s.rows[ri].gen == h.generation());
        return ri;
    }

    fn resultBuf(s: *Store, ri: u16) []u8 {
        return s.results[@as(usize, ri) * s.cfg.result_bytes ..][0..s.cfg.result_bytes];
    }

    /// The text of an option of `responseBinary`: a string, else absent.
    fn option(opts: []const u8, name: []const u8, buf: []u8) error{TooLong}!u16 {
        const raw = http.member(opts, name) orelse return 0;
        var out: creds.Out = .{ .buf = buf };
        http.unescape(raw, &out) catch |e| switch (e) {
            error.NoSpace => return error.TooLong,
            // Not a string: the option is absent, as in the reference runner.
            error.BadString => return 0,
        };
        return @intCast(out.len);
    }

    pub const ReserveError = error{ Full, TooLong };

    /// A row for the response of a request with `responseBinary`. `opts` is
    /// the JSON of that member. The caller gives the handle to `put`, or back
    /// with `release`.
    pub fn reserve(s: *Store, opts: []const u8) ReserveError!Handle {
        const ri = s.acquire() orelse return error.Full;
        const r = &s.rows[ri];
        errdefer s.freeRow(ri);
        r.opt_name_len = try option(opts, "fileName", &r.opt_name);
        r.opt_mime_len = try option(opts, "mimeType", &r.opt_mime);
        return Handle.of(ri, r.gen);
    }

    /// The request of a reserved row ended without a response to store.
    pub fn release(s: *Store, h: Handle) void {
        const ri = s.rowOf(h);
        std.debug.assert(s.rows[ri].state == .reserved);
        s.freeRow(ri);
    }

    // ---- blocks ----------------------------------------------------------------

    fn block(s: *Store, bi: u32) []u8 {
        return s.blocks[@as(usize, bi) * s.cfg.block_bytes ..][0..s.cfg.block_bytes];
    }

    /// Copy the start of `bytes` into blocks of the pool, for writes that end
    /// after this call. Returns the count of bytes copied: fewer than given
    /// when the pool is empty.
    fn enqueue(s: *Store, r: *Row, bytes: []const u8) usize {
        const bb = s.cfg.block_bytes;
        var at: usize = 0;
        // Each pass copies at least one byte, or stops.
        while (at < bytes.len) {
            if (r.block_tail == none or r.tail_len == bb) {
                const bi = s.block_free;
                if (bi == none) break;
                s.block_free = s.block_next[bi];
                s.blocks_free -= 1;
                s.block_next[bi] = none;
                if (r.block_tail == none) r.block_head = bi else s.block_next[r.block_tail] = bi;
                r.block_tail = bi;
                r.tail_len = 0;
            }
            const n: u32 = @intCast(@min(bytes.len - at, bb - r.tail_len));
            @memcpy(s.block(r.block_tail)[r.tail_len..][0..n], bytes[at..][0..n]);
            r.tail_len += n;
            at += n;
        }
        if (at < bytes.len) s.counters.blocks_full += 1;
        std.debug.assert(at <= bytes.len and r.tail_len <= bb);
        return at;
    }

    /// `append` for `h` can take bytes again, or has a failure to tell: a
    /// caller that got fewer bytes than it gave can go on.
    pub fn hasRoom(s: *Store, h: Handle) bool {
        const r = &s.rows[s.rowOf(h)];
        std.debug.assert(r.open);
        if (r.failed or r.state != .active or s.driver == .blocking) return true;
        return s.blocks_free > 0 or (r.block_tail != none and r.tail_len < s.cfg.block_bytes);
    }

    fn dropBlocks(s: *Store, r: *Row) void {
        var bi = r.block_head;
        var guard: usize = 0;
        while (bi != none and guard < s.block_next.len) : (guard += 1) {
            const next = s.block_next[bi];
            sys.poison(s.block(bi));
            s.block_next[bi] = s.block_free;
            s.block_free = bi;
            s.blocks_free += 1;
            bi = next;
        }
        std.debug.assert(bi == none);
        r.block_head = none;
        r.block_tail = none;
        r.head_off = 0;
        r.tail_len = 0;
    }

    // ---- put -------------------------------------------------------------------

    const PrepareError = error{ TooLarge, TooLong, NotText, BadId, NoRoom, NoBlocks };

    /// Start to store a response. Its body comes with `append`, then `complete`
    /// or `fail`. The result comes from `nextDone` when the files are written.
    pub fn begin(s: *Store, h: Handle, b: Begin) void {
        const ri = s.rowOf(h);
        const r = &s.rows[ri];
        std.debug.assert(r.state == .reserved and s.borrowed.len == 0);
        r.state = .active;
        r.job = .put;
        r.open = true;
        r.exec_id = b.exec_id;
        r.seq = b.seq;
        r.deadline_ms = b.now_ms + s.cfg.timeout_ms;
        s.active += 1;
        s.prepare(ri, b) catch |e| {
            s.refuse(ri, e, b.expected orelse 0);
            return s.advance(ri);
        };
        r.dir_fd = s.root_fd;
        r.phase = .dir_make;
        s.setDirName(r);
        s.advance(ri);
    }

    /// The next bytes of the body of `h`. `bytes` is not kept.
    pub fn append(s: *Store, h: Handle, bytes: []const u8, now_ms: i64) Append {
        const ri = s.rowOf(h);
        const r = &s.rows[ri];
        std.debug.assert(r.open and !r.eof and bytes.len > 0 and s.borrowed.len == 0);
        if (r.failed or r.state != .active) return .failed;
        r.deadline_ms = now_ms + s.cfg.timeout_ms;
        if (r.queued + bytes.len > s.cfg.max_file_bytes) {
            s.refuse(ri, error.TooLarge, r.queued + bytes.len);
            s.stop(ri);
            return .failed;
        }
        var took = bytes.len;
        if (s.driver == .blocking) {
            // `begin` ran to the write of the file: this write is done on return.
            std.debug.assert(r.phase == .file_write and !r.in_flight);
            s.borrowed = bytes;
            s.advance(ri);
            s.borrowed = &.{};
        } else {
            took = s.enqueue(r, bytes);
            if (!r.in_flight and took > 0) s.advance(ri);
        }
        if (r.failed) return .failed;
        r.queued += took;
        return .{ .took = took };
    }

    /// The body of `h` is complete. The handle is not valid afterwards.
    pub fn complete(s: *Store, h: Handle) void {
        const ri = s.rowOf(h);
        const r = &s.rows[ri];
        std.debug.assert(r.open and !r.eof);
        r.open = false;
        r.eof = true;
        if (r.state == .finished) {
            if (r.taken) s.freeRow(ri);
            return;
        }
        if (!r.in_flight) s.advance(ri);
    }

    /// The body of `h` does not come: the result of the step is `msg`,
    /// unless the transfer has a failure already. What the transfer made
    /// is removed. The handle is not valid afterwards.
    pub fn fail(s: *Store, h: Handle, msg: []const u8) void {
        const ri = s.rowOf(h);
        const r = &s.rows[ri];
        std.debug.assert(r.open and !r.eof);
        r.open = false;
        r.eof = true;
        if (r.state == .finished) {
            if (r.taken) s.freeRow(ri);
            return;
        }
        s.setError(ri, "{s}", .{msg});
        s.stop(ri);
    }

    /// A row with a failure: remove what it made. An operation in flight
    /// ends first (`onResult` starts the removal then).
    fn stop(s: *Store, ri: u16) void {
        const r = &s.rows[ri];
        std.debug.assert(r.failed and r.state == .active);
        if (r.in_flight) return;
        if (!r.cleaning) s.clean(r);
        s.advance(ri);
    }

    /// Store a response that is whole in memory. With the ring, the body
    /// must fit in the free blocks now.
    pub fn put(s: *Store, h: Handle, p: Put) void {
        s.begin(h, .{
            .exec_id = p.exec_id,
            .seq = p.seq,
            .workflow = p.workflow,
            .execution = p.execution,
            .head = p.head,
            .content_disposition = p.content_disposition,
            .content_type = p.content_type,
            .url_path = p.url_path,
            .expected = p.body.len,
            .whole = true,
            .now_ms = p.now_ms,
        });
        s.putBody(h, p.body, p.now_ms);
    }

    /// The whole body of a transfer that `begin` started, then its end.
    pub fn putBody(s: *Store, h: Handle, body: []const u8, now_ms: i64) void {
        const ri = s.rowOf(h);
        const r = &s.rows[ri];
        std.debug.assert(r.open and r.queued == 0);
        if (!r.failed and body.len > 0) {
            // `begin` saw the blocks for a whole body, so the store takes every byte or fails.
            switch (s.append(h, body, now_ms)) {
                .took => |k| std.debug.assert(k == body.len),
                .failed => {},
            }
        }
        s.complete(h);
    }

    fn prepare(s: *Store, ri: u16, b: Begin) PrepareError!void {
        const r = &s.rows[ri];
        if (b.expected) |size| if (size > s.cfg.max_file_bytes) return error.TooLarge;
        var nb: names.NameBuf = .{};
        const src: names.Source = .{
            .file_name = r.opt_name[0..r.opt_name_len],
            .mime_type = r.opt_mime[0..r.opt_mime_len],
            .content_disposition = b.content_disposition,
            .content_type = b.content_type,
            .url_path = b.url_path,
        };
        const n = try names.handleNames(src, &nb);
        // The handle and the companion file are written at the end, with the
        // size. The row keeps the two texts that give the names again: the
        // headers of the response are gone by then.
        const path = try names.namePath(src, &nb);
        if (n.mime_type.len > r.opt_mime.len) return error.TooLong;
        @memcpy(r.opt_mime[0..n.mime_type.len], n.mime_type);
        r.opt_mime_len = @intCast(n.mime_type.len);
        std.mem.copyForwards(u8, r.opt_name[0..path.len], path);
        r.opt_name_len = @intCast(path.len);
        var random: [32]u8 = @splat(0);
        sys.randomBytes(&random);
        r.tmp_tag = names.uuidText(random[0..16].*);
        const uuid = names.uuidText(random[16..32].*);
        var ib: [binary_store.max_id + 16]u8 = @splat(0);
        const full = std.fmt.bufPrint(&ib, "{s}:workflows/{s}/executions/{s}/binary_data/{s}", .{ names.store_mode, b.workflow, b.execution, &uuid }) catch return error.BadId;
        const fid = binary_store.fileId(full) orelse return error.BadId;
        @memcpy(r.id[0..fid.len], fid);
        r.id_len = @intCast(fid.len);
        var res: names.Out = .{ .buf = s.resultBuf(ri) };
        res.put(b.head) catch return error.NoRoom;
        r.head_len = @intCast(res.len);
        r.result_len = r.head_len;
        if (b.whole and s.driver != .blocking) {
            const size: usize = @intCast(b.expected orelse 0);
            if ((size + s.cfg.block_bytes - 1) / s.cfg.block_bytes > s.blocks_free) {
                s.counters.blocks_full += 1;
                return error.NoBlocks;
            }
        }
    }

    /// Every byte of the file is written: its size is known. Write the
    /// result of the step and the text of the companion file.
    fn seal(s: *Store, ri: u16) PrepareError!void {
        const r = &s.rows[ri];
        std.debug.assert(r.eof and r.phase == .file_write and r.written == r.queued);
        r.size = r.written;
        var nb: names.NameBuf = .{};
        const n = try names.handleNames(.{ .file_name = r.opt_name[0..r.opt_name_len], .mime_type = r.opt_mime[0..r.opt_mime_len] }, &nb);
        var sb: [names.max_size_text]u8 = @splat(0);
        const size_text = names.prettyBytes(r.size, &sb) orelse return error.TooLarge;
        var res: names.Out = .{ .buf = s.resultBuf(ri), .len = r.head_len };
        res.put("{\"$binary\":") catch return error.NoRoom;
        names.writeHandle(&res, r.fileId(), n, r.size, size_text) catch return error.NoRoom;
        res.byte('}') catch return error.NoRoom;
        r.result_len = @intCast(res.len);
        r.ok = true;
        var aux: names.Out = .{ .buf = &r.aux };
        names.writeSidecar(&aux, n.file_name, n.mime_type, r.size) catch return error.TooLong;
        r.aux_len = @intCast(aux.len);
    }

    /// A transfer that cannot start: its result is the reason.
    fn refuse(s: *Store, ri: u16, e: PrepareError, size: usize) void {
        const mb = 1 << 20;
        switch (e) {
            error.TooLarge => {
                s.counters.too_large += 1;
                s.setError(ri, "http: the response body is {d} bytes; a stored file can have {d} (--binary-max-file-mb); the fallback host can run the node (limit: binary-max-file)", .{ size, @min(s.cfg.max_file_bytes, names.max_size_bytes - 1) });
            },
            error.TooLong => s.setError(ri, "http: the file name or the MIME type of the response is too long to store", .{}),
            error.NotText => s.setError(ri, "http: the file name or the MIME type of the response is not text", .{}),
            error.BadId => s.setError(ri, "http: the workflow id cannot be a part of the path of a stored file", .{}),
            error.NoRoom => s.setError(ri, "http: the headers of the response are larger than the result of a stored response ({d} bytes)", .{s.cfg.result_bytes}),
            error.NoBlocks => s.setError(ri, "http: the buffers for stored responses are in use ({d} MB, --binary-buffer-mb); the step can run again (limit)", .{s.cfg.buffer_bytes / mb}),
        }
        // Nothing is made yet: there is nothing to remove.
        if (s.rows[ri].dir_fd < 0) s.rows[ri].phase = .end;
    }

    /// The first failure of a row is its result.
    fn setError(s: *Store, ri: u16, comptime fmt: []const u8, args: anytype) void {
        const r = &s.rows[ri];
        if (r.failed) return;
        r.failed = true;
        r.ok = false;
        r.head_len = 0;
        s.counters.failed += 1;
        const buf = s.resultBuf(ri);
        // A message that does not fit is cut: the buffer holds at least 256 bytes.
        const text = std.fmt.bufPrint(buf, fmt, args) catch buf;
        r.result_len = @intCast(text.len);
    }

    // ---- names of operations ---------------------------------------------------

    fn setName(buf: *[name_bytes]u8, parts: []const []const u8) void {
        var at: usize = 0;
        for (parts) |p| {
            std.debug.assert(at + p.len < name_bytes);
            @memcpy(buf[at..][0..p.len], p);
            at += p.len;
        }
        buf[at] = 0;
        // One segment: an operation never walks a path.
        std.debug.assert(at > 0 and std.mem.indexOfScalar(u8, buf[0..at], '/') == null);
    }

    fn setDirName(s: *Store, r: *Row) void {
        std.debug.assert(r.level < levels and s.root_fd >= 0);
        setName(&r.name_a, &.{r.segment(r.level)});
    }

    /// `name_a`: the temporary name. `name_b`: the name after the rename.
    fn setFileNames(s: *Store, r: *Row, suffix: []const u8) void {
        var pb: [16]u8 = @splat(0);
        // 16 bytes hold the text of any u32.
        const pid = std.fmt.bufPrint(&pb, "{d}", .{s.pid}) catch unreachable;
        const file = r.segment(levels);
        setName(&r.name_a, &.{ file, suffix, ".tmp.", pid, ".", &r.tmp_tag });
        setName(&r.name_b, &.{ file, suffix });
    }

    fn nameZ(buf: *const [name_bytes]u8) [*:0]const u8 {
        const end = std.mem.indexOfScalar(u8, buf, 0) orelse unreachable; // `setName` wrote the NUL.
        return buf[0..end :0];
    }

    // ---- the state machine -----------------------------------------------------

    /// The bytes of the next write of the file: the rest of the first block,
    /// or of the bytes that `append` holds now for the driver that runs at once.
    fn chunk(s: *Store, r: *const Row) []const u8 {
        if (r.block_head == none) return s.borrowed;
        const end = if (r.block_head == r.block_tail) r.tail_len else s.cfg.block_bytes;
        std.debug.assert(r.head_off <= end);
        return s.block(r.block_head)[r.head_off..end];
    }

    /// The one operation of the phase of the row. Null at the end.
    fn nextOp(s: *Store, r: *Row) ?sys.FileOp {
        const a = nameZ(&r.name_a);
        return switch (r.phase) {
            .dir_make => .{ .kind = .mkdir, .fd = r.dir_fd, .name = a },
            .dir_open => .{ .kind = .open, .fd = r.dir_fd, .name = a, .how = .dir },
            .file_create, .meta_create => .{ .kind = .open, .fd = r.dir_fd, .name = a, .how = .create },
            .file_write => .{ .kind = .write, .fd = r.file_fd, .from = s.chunk(r), .offset = r.written },
            .meta_write => .{ .kind = .write, .fd = r.file_fd, .from = r.aux[@intCast(r.written)..r.aux_len], .offset = r.written },
            .file_rename, .meta_rename => .{ .kind = .rename, .fd = r.dir_fd, .name = a, .to = nameZ(&r.name_b) },
            .meta_open => .{ .kind = .open, .fd = r.dir_fd, .name = a, .how = .read },
            .meta_read => .{ .kind = .read, .fd = r.file_fd, .into = r.aux[@intCast(r.written)..], .offset = r.written },
            .unlink_file, .unlink_meta => .{ .kind = .unlink, .fd = r.dir_fd, .name = a },
            .src_open => .{ .kind = .open, .fd = r.dir_fd, .name = a, .how = .read },
            .src_read => .{ .kind = .read, .fd = r.file_fd, .into = s.srcRoom(r), .offset = r.written },
            // `advance` stops at a source that waits for its consumer.
            .src_hold, .end => null,
        };
    }

    fn failOp(s: *Store, ri: u16, what: []const u8, res: i32) void {
        if (res == refused) {
            s.counters.ring_full += 1;
            s.setError(ri, "http: {s}: the io_uring queue of the shard is full; the step can run again (limit)", .{s.verb(ri)});
        } else {
            const why = if (res < 0) sys.errnoText(-res) else "no bytes were written";
            s.setError(ri, "http: {s}: {s}: {s}", .{ s.verb(ri), what, why });
        }
        s.clean(&s.rows[ri]);
    }

    /// What the row could not do, for the text of its failure.
    fn verb(s: *const Store, ri: u16) []const u8 {
        std.debug.assert(ri < s.rows.len);
        return switch (s.rows[ri].job) {
            .put => "the response could not be stored",
            .meta => "the metadata of the binary data could not be read",
            .source => "the stored file could not be read",
        };
    }

    /// Remove what a failed transfer made, then end.
    fn clean(s: *Store, r: *Row) void {
        r.cleaning = true;
        s.closeFile(r);
        if (r.dir_fd < 0) {
            r.phase = .end;
        } else if (r.file != .none) {
            r.phase = .unlink_file;
            if (r.file == .tmp) s.setFileNames(r, "") else setName(&r.name_a, &.{r.segment(levels)});
        } else {
            s.cleanMeta(r);
        }
    }

    fn cleanMeta(s: *Store, r: *Row) void {
        std.debug.assert(r.cleaning);
        if (r.meta == .none) {
            r.phase = .end;
            return;
        }
        r.phase = .unlink_meta;
        if (r.meta == .tmp) s.setFileNames(r, ".metadata") else setName(&r.name_a, &.{ r.segment(levels), ".metadata" });
    }

    /// Close without a result: nothing depends on it.
    fn closeFd(s: *Store, fd: c_int) void {
        std.debug.assert(fd >= 0 and fd != s.root_fd);
        const op: sys.FileOp = .{ .kind = .close, .fd = fd };
        const queued = switch (s.driver) {
            .ring => |ring| ring.fileOp(uring.ignore, op),
            .blocking, .held => false,
        };
        // A close has no failure that the store can act on.
        if (!queued) _ = sys.fileOpNow(op);
    }

    fn closeFile(s: *Store, r: *Row) void {
        if (r.file_fd < 0) return;
        s.closeFd(r.file_fd);
        r.file_fd = -1;
    }

    fn closeDir(s: *Store, r: *Row) void {
        if (r.dir_fd >= 0 and r.dir_fd != s.root_fd) s.closeFd(r.dir_fd);
        r.dir_fd = -1;
    }

    /// The result of the operation of the phase: the next phase.
    fn onResult(s: *Store, ri: u16, res: i32) void {
        const r = &s.rows[ri];
        switch (r.phase) {
            .dir_make, .dir_open => s.onDir(ri, res),
            .file_create, .file_write, .file_rename => s.onFile(ri, res),
            .meta_create, .meta_write, .meta_rename => s.onMeta(ri, res),
            .meta_open, .meta_read => s.onMetaRead(ri, res),
            .src_open, .src_read => s.onSource(ri, res),
            // A file that stays is reported by n8n's pruning; the result of the step is set.
            .unlink_file => s.cleanMeta(r),
            .unlink_meta => r.phase = .end,
            .src_hold, .end => unreachable, // `nextOp` gives no operation for these phases.
        }
        // The time ran out while the operation ran: remove what there is.
        if (r.failed and !r.cleaning) s.clean(r);
    }

    fn onDir(s: *Store, ri: u16, res: i32) void {
        const r = &s.rows[ri];
        if (r.phase == .dir_make) {
            if (res < 0 and !sys.isExists(res)) return s.failOp(ri, "make a directory", res);
            r.phase = .dir_open;
            return;
        }
        if (res < 0) return s.failOp(ri, "open a directory", res);
        s.closeDir(r);
        r.dir_fd = res;
        r.level += 1;
        if (r.level < levels) {
            r.phase = if (r.job == .put) .dir_make else .dir_open;
            return s.setDirName(r);
        }
        switch (r.job) {
            .put => {
                r.phase = .file_create;
                s.setFileNames(r, "");
            },
            .meta => {
                r.phase = .meta_open;
                setName(&r.name_a, &.{ r.segment(levels), ".metadata" });
            },
            .source => {
                r.phase = .src_open;
                setName(&r.name_a, &.{r.segment(levels)});
            },
        }
    }

    fn onFile(s: *Store, ri: u16, res: i32) void {
        const r = &s.rows[ri];
        switch (r.phase) {
            .file_create => {
                if (res < 0) return s.failOp(ri, "create the file", res);
                r.file_fd = res;
                r.file = .tmp;
                r.written = 0;
                r.phase = .file_write;
            },
            .file_write => {
                if (res <= 0) return s.failOp(ri, "write the file", res);
                s.wrote(r, @intCast(res));
            },
            .file_rename => {
                if (res < 0) return s.failOp(ri, "rename the file", res);
                r.file = .final;
                r.written = 0;
                r.phase = .meta_create;
                s.setFileNames(r, ".metadata");
            },
            // `onResult` sends the three phases of the file here.
            else => unreachable,
        }
    }

    fn wrote(s: *Store, r: *Row, n: u32) void {
        std.debug.assert(n > 0 and n <= s.chunk(r).len);
        r.written += n;
        if (r.block_head == none) {
            s.borrowed = s.borrowed[n..];
            return;
        }
        r.head_off += n;
        // A block that is not full takes more bytes, or has bytes to write.
        if (r.head_off < s.cfg.block_bytes) return;
        const bi = r.block_head;
        r.block_head = s.block_next[bi];
        r.head_off = 0;
        if (bi == r.block_tail) {
            r.block_tail = none;
            r.tail_len = 0;
        }
        sys.poison(s.block(bi));
        s.block_next[bi] = s.block_free;
        s.block_free = bi;
        s.blocks_free += 1;
    }

    fn onMeta(s: *Store, ri: u16, res: i32) void {
        const r = &s.rows[ri];
        switch (r.phase) {
            .meta_create => {
                if (res < 0) return s.failOp(ri, "create the metadata file", res);
                r.file_fd = res;
                r.meta = .tmp;
                r.phase = .meta_write;
            },
            .meta_write => {
                if (res <= 0) return s.failOp(ri, "write the metadata file", res);
                r.written += @intCast(res);
                if (r.written < r.aux_len) return;
                s.closeFile(r);
                r.phase = .meta_rename;
            },
            .meta_rename => {
                if (res < 0) return s.failOp(ri, "rename the metadata file", res);
                r.meta = .final;
                r.phase = .end;
            },
            // `onResult` sends the three phases of the metadata here.
            else => unreachable,
        }
    }

    fn onMetaRead(s: *Store, ri: u16, res: i32) void {
        const r = &s.rows[ri];
        if (r.phase == .meta_open) {
            if (res < 0) return s.failOp(ri, "open the metadata file", res);
            r.file_fd = res;
            r.written = 0;
            r.phase = .meta_read;
            return;
        }
        if (res < 0) return s.failOp(ri, "read the metadata file", res);
        r.written += @intCast(res);
        if (res > 0 and r.written < r.aux.len) return;
        if (res > 0) return s.failOp(ri, "the metadata file is larger than 2048 bytes", 0);
        s.closeFile(r);
        r.phase = .end;
        const text = std.mem.trim(u8, r.aux[0..@intCast(r.written)], " \t\r\n");
        const size = http.member(text, "fileSize") orelse "";
        // Not a number: the file is not a companion file of n8n.
        _ = std.fmt.parseInt(u64, size, 10) catch return s.setError(ri, "http: the metadata of the binary data is not valid", .{});
        const buf = s.resultBuf(ri);
        @memcpy(buf[0..text.len], text);
        r.result_len = @intCast(text.len);
        r.ok = true;
    }

    fn token(s: *const Store, ri: u16) u64 {
        return sys.makeToken(s.kind, s.rows[ri].gen, ri);
    }

    /// Give `op` to the driver. The result, or null when it comes later
    /// (`onCompletion`).
    fn submit(s: *Store, ri: u16, op: sys.FileOp) ?i32 {
        switch (s.driver) {
            .blocking => return sys.fileOpNow(op),
            .ring => |ring| if (!ring.fileOp(s.token(ri), op)) return refused,
            .held => |ops| ops[ri] = op,
        }
        return null;
    }

    /// Run the row until an operation is with the driver, or to its end.
    fn advance(s: *Store, ri: u16) void {
        const r = &s.rows[ri];
        std.debug.assert(r.state == .active and !r.in_flight);
        var guard: u32 = 0;
        while (guard < max_steps) : (guard += 1) {
            if (r.job == .source and r.phase != .end) {
                // The consumer is gone: end. Else the piece waits for it.
                if (!r.open) r.phase = .end else if (r.phase == .src_hold) return;
            }
            if (r.phase == .file_write and s.chunk(r).len == 0) {
                // Every byte that came is written: wait for more, or end the file.
                if (!r.eof) return;
                if (s.seal(ri)) |_| {
                    s.closeFile(r);
                    r.phase = .file_rename;
                } else |e| {
                    s.refuse(ri, e, r.size);
                    s.clean(r);
                }
            }
            const op = s.nextOp(r) orelse return s.finish(ri);
            const res = s.submit(ri, op) orelse {
                r.in_flight = true;
                return;
            };
            s.onResult(ri, res);
        }
        // More operations than a file of the largest size needs: stop the row.
        s.setError(ri, "http: {s}: too many file operations", .{s.verb(ri)});
        s.closeFile(r);
        r.phase = .end;
        s.finish(ri);
    }

    /// The file operations of the row are done.
    fn finish(s: *Store, ri: u16) void {
        const r = &s.rows[ri];
        std.debug.assert(r.state == .active and r.phase == .end and !r.in_flight);
        s.closeFile(r);
        s.closeDir(r);
        s.dropBlocks(r);
        s.dropSourceBuf(r);
        r.state = .finished;
        s.active -= 1;
        if (!r.failed and r.job != .source) s.counters.stored += 1;
        if (r.taken and !r.open) return s.freeRow(ri);
        if (!r.reported) s.report(ri);
    }

    fn report(s: *Store, ri: u16) void {
        const r = &s.rows[ri];
        std.debug.assert(!r.reported and r.done_next == none);
        r.reported = true;
        if (s.done_tail == none) s.done_head = ri else s.rows[s.done_tail].done_next = ri;
        s.done_tail = ri;
    }

    /// A completion of the ring with the token kind of this store.
    pub fn onCompletion(s: *Store, user: u64, res: i32) void {
        const ri: u16 = @truncate(user);
        const gen: u32 = @truncate((user >> 32) & 0xFFFFFF);
        if (ri >= s.rows.len or s.rows[ri].gen != gen or !s.rows[ri].in_flight) {
            s.counters.stale_completions += 1;
            return;
        }
        s.rows[ri].in_flight = false;
        s.onResult(ri, res);
        s.advance(ri);
    }

    /// Give the step of a transfer that is over its time an error. The row
    /// stays until its operation ends, because the kernel may use its buffers.
    pub fn tick(s: *Store, now_ms: i64) void {
        if (s.active == 0) return;
        for (s.rows, 0..) |*r, i| {
            if (r.state != .active or r.failed or now_ms < r.deadline_ms) continue;
            // A transfer that waits for bytes of its response has no operation to end:
            // the time limits of the request apply.
            if (!r.in_flight and !r.eof and r.phase == .file_write) continue;
            // A source that waits for its consumer: the time limits of the request apply.
            if (r.phase == .src_hold) continue;
            const ri: u16 = @intCast(i);
            s.counters.timed_out += 1;
            s.setError(ri, "http: {s} within {d} ms", .{ s.verb(ri), s.cfg.timeout_ms });
            // The consumer of a source asks for its state: it has no result to take.
            if (!r.reported) s.report(ri);
            switch (s.driver) {
                .ring => |ring| ring.cancel(s.token(ri)),
                .blocking, .held => {},
            }
        }
    }

    /// The oldest result that the shell did not take, or null.
    pub fn nextDone(s: *Store) ?Done {
        if (s.done_head == none) return null;
        const ri: u16 = @intCast(s.done_head);
        const r = &s.rows[ri];
        std.debug.assert(r.reported and !r.taken);
        return .{ .row = ri, .exec_id = r.exec_id, .seq = r.seq, .ok = r.ok, .stored = r.job == .put, .head_len = r.head_len, .payload = s.resultBuf(ri)[0..r.result_len] };
    }

    /// The shell copied the result `d`: free its row when its operations are done.
    pub fn take(s: *Store, d: Done) void {
        std.debug.assert(s.done_head == d.row);
        const r = &s.rows[d.row];
        s.done_head = r.done_next;
        if (s.done_head == none) s.done_tail = none;
        r.done_next = none;
        r.taken = true;
        if (r.state == .finished and !r.open) s.freeRow(d.row);
    }

    // ---- sources: a stored file as the body of a request --------------------------

    fn srcBuf(s: *Store, r: *const Row) []u8 {
        std.debug.assert(r.src_buf != none and r.src_buf < s.cfg.source_buffers);
        return s.src_mem[@as(usize, r.src_buf) * s.cfg.block_bytes ..][0..s.cfg.block_bytes];
    }

    /// The part of the read buffer that the next read fills: free bytes, and
    /// no more than the file has left.
    fn srcRoom(s: *Store, r: *const Row) []u8 {
        std.debug.assert(r.job == .source and r.written <= r.size);
        const free = s.cfg.block_bytes - r.tail_len;
        const n: usize = @intCast(@min(free, r.size - r.written));
        return s.srcBuf(r)[r.tail_len..][0..n];
    }

    fn dropSourceBuf(s: *Store, r: *Row) void {
        if (r.src_buf == none) return;
        std.debug.assert(s.nsrc_free < s.src_free.len);
        sys.poison(s.srcBuf(r));
        s.src_free[s.nsrc_free] = @intCast(r.src_buf);
        s.nsrc_free += 1;
        r.src_buf = none;
        r.head_off = 0;
        r.tail_len = 0;
    }

    fn sourceRow(s: *Store, h: Handle) u16 {
        const ri = s.rowOf(h);
        std.debug.assert(s.rows[ri].job == .source and s.rows[ri].open);
        return ri;
    }

    fn failure(s: *Store, ri: u16) []const u8 {
        std.debug.assert(s.rows[ri].failed);
        return s.resultBuf(ri)[0..s.rows[ri].result_len];
    }

    /// Open the stored file `id` to send its bytes. The caller asks for its
    /// size and its pieces, and gives the handle back with `sourceClose`.
    pub fn sourceOpen(s: *Store, id: []const u8, now_ms: i64) error{ Full, BadId }!Handle {
        const fid = binary_store.fileId(id) orelse return error.BadId;
        const ri = s.acquire() orelse return error.Full;
        const r = &s.rows[ri];
        @memcpy(r.id[0..fid.len], fid);
        r.id_len = @intCast(fid.len);
        r.state = .active;
        r.job = .source;
        r.open = true;
        // The consumer asks for the state of the row: it never joins the results.
        r.reported = true;
        r.deadline_ms = now_ms + s.cfg.timeout_ms;
        r.dir_fd = s.root_fd;
        r.phase = .dir_open;
        s.active += 1;
        s.counters.sources += 1;
        const h = Handle.of(ri, r.gen);
        s.setDirName(r);
        s.advance(ri);
        return h;
    }

    /// The size of the file of `h`, when the file is open.
    pub fn sourceSize(s: *Store, h: Handle) Size {
        const ri = s.sourceRow(h);
        const r = &s.rows[ri];
        if (r.failed) return .{ .failed = s.failure(ri) };
        return if (r.phase == .src_read or r.phase == .src_hold) .{ .size = r.size } else .wait;
    }

    /// The bytes of the file of `h` that the consumer did not take yet. A
    /// call with an empty buffer starts the next read.
    pub fn sourcePeek(s: *Store, h: Handle, now_ms: i64) Piece {
        const ri = s.sourceRow(h);
        const r = &s.rows[ri];
        if (r.failed) return .{ .failed = s.failure(ri) };
        if (r.phase != .src_hold) return .wait;
        if (r.head_off == r.tail_len) {
            if (r.written >= r.size) return .end;
            if (!s.startRead(ri, now_ms)) return .wait;
            // The driver that runs at once has the bytes, or the failure, now.
            if (r.failed) return .{ .failed = s.failure(ri) };
            if (r.phase != .src_hold or r.head_off == r.tail_len) return .wait;
        }
        std.debug.assert(r.head_off < r.tail_len and r.tail_len <= s.cfg.block_bytes);
        return .{ .bytes = s.srcBuf(r)[r.head_off..r.tail_len] };
    }

    /// The consumer sent the first `n` bytes that `sourcePeek` gave. When
    /// the buffer is empty, the next read starts: its bytes are ready when
    /// the consumer can send again.
    pub fn sourceTake(s: *Store, h: Handle, n: usize, now_ms: i64) void {
        const ri = s.sourceRow(h);
        const r = &s.rows[ri];
        std.debug.assert(r.phase == .src_hold and n > 0 and n <= r.tail_len - r.head_off);
        r.head_off += @intCast(n);
        if (r.head_off < r.tail_len or r.written >= r.size or r.failed) return;
        // Without a free buffer the read starts at the next `sourcePeek`.
        if (!s.startRead(ri, now_ms)) std.debug.assert(r.phase == .src_hold);
    }

    /// Read the next piece of the file into the buffer of the row, which
    /// is empty. False when no buffer is free.
    fn startRead(s: *Store, ri: u16, now_ms: i64) bool {
        const r = &s.rows[ri];
        std.debug.assert(r.phase == .src_hold and !r.in_flight and r.head_off == r.tail_len and r.written < r.size);
        if (r.src_buf == none) {
            if (s.nsrc_free == 0) {
                s.counters.source_waits += 1;
                return false;
            }
            s.nsrc_free -= 1;
            r.src_buf = s.src_free[s.nsrc_free];
        }
        r.head_off = 0;
        r.tail_len = 0;
        r.deadline_ms = now_ms + s.cfg.timeout_ms;
        r.phase = .src_read;
        s.advance(ri);
        return true;
    }

    /// The consumer of `h` needs the file no more. The handle is not valid
    /// afterwards. The row stays until its operation ends, because the
    /// kernel may use its buffer.
    pub fn sourceClose(s: *Store, h: Handle) void {
        const ri = s.sourceRow(h);
        const r = &s.rows[ri];
        r.open = false;
        r.taken = true;
        if (r.state == .finished) return s.freeRow(ri);
        // `advance` ends a source without a consumer, now or after its operation.
        if (!r.in_flight) s.advance(ri);
    }

    fn onSource(s: *Store, ri: u16, res: i32) void {
        const r = &s.rows[ri];
        if (r.phase == .src_open) {
            if (res < 0) return s.failOp(ri, "open the file", res);
            r.file_fd = res;
            s.closeDir(r);
            r.size = sys.fileSize(res) orelse {
                s.setError(ri, "http: {s}: the system does not give the size of the file", .{s.verb(ri)});
                return s.clean(r);
            };
            r.written = 0;
            r.phase = .src_hold;
            return;
        }
        std.debug.assert(r.phase == .src_read);
        if (res < 0) return s.failOp(ri, "read the file", res);
        if (res == 0) {
            // The request has the size of the file in its head already.
            s.setError(ri, "http: {s}: the file is shorter than its size", .{s.verb(ri)});
            return s.clean(r);
        }
        const n: u32 = @intCast(res);
        std.debug.assert(n <= s.cfg.block_bytes - r.tail_len);
        r.tail_len += n;
        r.written += n;
        r.phase = .src_hold;
    }

    // ---- metadata --------------------------------------------------------------

    /// Read the companion file of the stored file `id` (`getBinaryMetadata`
    /// of n8n). The result, from `nextDone`, is its JSON:
    /// `{"fileName","mimeType","fileSize"}`.
    pub fn readMetadata(s: *Store, id: []const u8, exec_id: u64, seq: u32, now_ms: i64) error{ Full, BadId }!void {
        const fid = binary_store.fileId(id) orelse return error.BadId;
        const ri = s.acquire() orelse return error.Full;
        const r = &s.rows[ri];
        @memcpy(r.id[0..fid.len], fid);
        r.id_len = @intCast(fid.len);
        r.state = .active;
        r.job = .meta;
        r.exec_id = exec_id;
        r.seq = seq;
        r.deadline_ms = now_ms + s.cfg.timeout_ms;
        r.dir_fd = s.root_fd;
        r.phase = .dir_open;
        s.active += 1;
        s.setDirName(r);
        s.advance(ri);
    }
};

// ---- tests -------------------------------------------------------------------

const t = std.testing;

const Fixture = struct {
    tmp: std.testing.TmpDir,
    root_buf: [256]u8 = @splat(0),
    root_len: usize = 0,
    mem: []u8,
    fba: std.heap.FixedBufferAllocator,
    store: Store,
    held: [8]?sys.FileOp = @splat(null),

    fn init(f: *Fixture, cfg: Config) !void {
        f.tmp = t.tmpDir(.{});
        const root = try std.fmt.bufPrint(&f.root_buf, ".zig-cache/tmp/{s}", .{f.tmp.sub_path});
        f.root_len = root.len;
        f.mem = try t.allocator.alloc(u8, 4 << 20);
        f.fba = .init(f.mem);
        var c = cfg;
        c.root = root;
        c.buffer_bytes = @min(c.buffer_bytes, 1 << 20);
        try f.store.init(f.fba.allocator(), c, 12);
    }

    fn deinit(f: *Fixture) void {
        f.store.deinit();
        t.allocator.free(f.mem);
        f.tmp.cleanup();
    }

    fn hold(f: *Fixture) void {
        f.store.driver = .{ .held = &f.held };
    }

    /// Run the operation that row `ri` gave to the driver, as the ring would.
    fn runHeld(f: *Fixture, ri: u16) void {
        const op = f.held[ri] orelse return;
        f.held[ri] = null;
        f.store.onCompletion(f.store.token(ri), sys.fileOpNow(op));
    }

    fn drain(f: *Fixture, ri: u16) void {
        var guard: u32 = 0;
        while (f.held[ri] != null and guard < 10_000) : (guard += 1) f.runHeld(ri);
    }

    /// The bytes of the file `rel` under the root, read through the same
    /// one-segment opens as the store.
    fn read(f: *Fixture, rel: []const u8, buf: []u8) ![]u8 {
        var fd = f.store.root_fd;
        var it = std.mem.splitScalar(u8, rel, '/');
        var name: [name_bytes]u8 = @splat(0);
        while (it.next()) |seg| {
            Store.setName(&name, &.{seg});
            const last = it.peek() == null;
            const res = sys.fileOpNow(.{ .kind = .open, .fd = fd, .name = Store.nameZ(&name), .how = if (last) .read else .dir });
            if (fd != f.store.root_fd) sys.close(fd);
            if (res < 0) return error.NotFound;
            fd = res;
        }
        defer sys.close(fd);
        const n = sys.fileOpNow(.{ .kind = .read, .fd = fd, .into = buf });
        if (n < 0) return error.Io;
        return buf[0..@intCast(n)];
    }
};

fn putOf(body: []const u8) Put {
    return .{
        .exec_id = 7,
        .seq = 3,
        .workflow = "wf1",
        .execution = "wfrt-7",
        .head = "{\"status\":200,\"headers\":{}}",
        .content_disposition = "attachment; filename=\"report.pdf\"",
        .content_type = "application/pdf",
        .url_path = "/files/1",
        .body = body,
        .now_ms = 1000,
    };
}

/// The text of the string member `key` of the handle in a result.
fn member(payload: []const u8, key: []const u8) []const u8 {
    const body = http.member(payload, "$binary") orelse "";
    return http.plainString(http.member(body, key) orelse "") orelse "";
}

fn expectStored(f: *Fixture, d: Done, body: []const u8, sidecar: []const u8) !void {
    try t.expect(d.ok);
    try t.expectEqual(@as(u64, 7), d.exec_id);
    try t.expectEqualStrings("{\"status\":200,\"headers\":{}}", d.payload[0..d.head_len]);
    const result = d.payload[d.head_len..];
    const id = member(result, "id");
    try t.expect(std.mem.startsWith(u8, id, "filesystem-v2:workflows/wf1/executions/wfrt-7/binary_data/"));
    const rel = id["filesystem-v2:".len..];
    try t.expectEqual(@as(usize, 36), rel.len - "workflows/wf1/executions/wfrt-7/binary_data/".len);
    var fb: [1 << 12]u8 = @splat(0);
    try t.expectEqualStrings(body[0..@min(body.len, fb.len)], try f.read(rel, &fb));
    var pb: [256]u8 = @splat(0);
    var sb: [256]u8 = @splat(0);
    try t.expectEqualStrings(sidecar, try f.read(try std.fmt.bufPrint(&pb, "{s}.metadata", .{rel}), &sb));
}

test "put writes the file and the companion file of n8n, and gives the handle" {
    var f: Fixture = undefined;
    try f.init(.{ .root = "" });
    defer f.deinit();
    const s = &f.store;
    const h = try s.reserve("{}");
    s.put(h, putOf("%PDF-1.7 hello"));
    const d = s.nextDone() orelse return error.TestExpectedEqual;
    // The companion file is the text that n8n's manager writes for these names
    // (`compiled-binary-store-layout.test.ts` of n8n holds the same text for the real manager).
    try expectStored(&f, d, "%PDF-1.7 hello", "{\"fileName\":\"report.pdf\",\"mimeType\":\"application/pdf\",\"fileSize\":14}");
    const result = d.payload[d.head_len..];
    try t.expectEqualStrings("filesystem-v2", member(result, "data"));
    try t.expectEqualStrings("application/pdf", member(result, "mimeType"));
    try t.expectEqualStrings("pdf", member(result, "fileType"));
    try t.expectEqualStrings("report.pdf", member(result, "fileName"));
    try t.expectEqualStrings("pdf", member(result, "fileExtension"));
    try t.expectEqualStrings("14 B", member(result, "fileSize"));
    try t.expect(std.mem.endsWith(u8, result, ",\"bytes\":14}}"));
    s.take(d);
    try t.expect(s.nextDone() == null and !s.busy());
    try t.expectEqual(@as(u32, s.cfg.max_transfers), s.nfree);
    try t.expectEqual(@as(u64, 1), s.counters.stored);

    // The options of the request win, and an empty body is a file.
    const h2 = try s.reserve("{\"fileName\":\"dir/a b.txt\",\"mimeType\":\"text/x-note\",\"other\":1}");
    s.put(h2, putOf(""));
    const d2 = s.nextDone() orelse return error.TestExpectedEqual;
    try expectStored(&f, d2, "", "{\"fileName\":\"a b.txt\",\"mimeType\":\"text/x-note\",\"fileSize\":0}");
    try t.expectEqualStrings("0 B", member(d2.payload[d2.head_len..], "fileSize"));
    s.take(d2);
}

test "put through a driver that completes later keeps the body in blocks" {
    var f: Fixture = undefined;
    try f.init(.{ .root = "", .block_bytes = 16, .buffer_bytes = 16 * 8, .max_transfers = 4 });
    defer f.deinit();
    f.hold();
    const s = &f.store;
    var body: [100]u8 = @splat(0);
    for (&body, 0..) |*b, i| b.* = @intCast('a' + i % 26);
    const h = try s.reserve("{}");
    s.put(h, putOf(&body));
    // The caller's bytes can change: the store wrote nothing yet.
    try t.expect(s.nextDone() == null and s.busy());
    try t.expectEqual(@as(u32, 1), s.blocks_free);
    const copy = body;
    @memset(&body, 'x');

    // A second body finds the pool in use: a limit, and the first goes on.
    const h2 = try s.reserve("{}");
    s.put(h2, putOf(&copy));
    const full = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!full.ok and std.mem.indexOf(u8, full.payload, "(limit)") != null);
    s.take(full);
    try t.expectEqual(@as(u64, 1), s.counters.blocks_full);

    f.drain(h.index());
    const d = s.nextDone() orelse return error.TestExpectedEqual;
    try expectStored(&f, d, &copy, "{\"fileName\":\"report.pdf\",\"mimeType\":\"application/pdf\",\"fileSize\":100}");
    s.take(d);
    try t.expectEqual(@as(u32, 8), s.blocks_free);
    try t.expectEqual(@as(u32, 4), s.nfree);
    // A completion for a row that is free changes nothing.
    s.onCompletion(s.token(h.index()), 0);
    try t.expectEqual(@as(u64, 1), s.counters.stale_completions);
}

test "limits: the file size, the rows, and names that are too long" {
    var f: Fixture = undefined;
    try f.init(.{ .root = "", .max_file_bytes = 8, .max_transfers = 2 });
    defer f.deinit();
    const s = &f.store;
    const h = try s.reserve("{}");
    s.put(h, putOf("123456789"));
    const d = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!d.ok);
    try t.expectEqualStrings("http: the response body is 9 bytes; a stored file can have 8 (--binary-max-file-mb); the fallback host can run the node (limit: binary-max-file)", d.payload);
    s.take(d);
    try t.expectEqual(@as(u64, 1), s.counters.too_large);

    const a = try s.reserve("{}");
    const b = try s.reserve("{}");
    try t.expectError(error.Full, s.reserve("{}"));
    try t.expectEqual(@as(u64, 1), s.counters.rows_full);
    s.release(a);
    s.release(b);
    const long: [names.max_path_bytes + 32]u8 = @splat('n');
    var ob: [names.max_path_bytes + 64]u8 = @splat(0);
    try t.expectError(error.TooLong, s.reserve(try std.fmt.bufPrint(&ob, "{{\"fileName\":\"{s}\"}}", .{&long})));
    try t.expectEqual(@as(u32, 2), s.nfree);

    // A workflow id that is not a path segment never becomes a path.
    const h3 = try s.reserve("{}");
    var p = putOf("12345678");
    p.workflow = "../../etc";
    s.put(h3, p);
    const d3 = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!d3.ok and std.mem.indexOf(u8, d3.payload, "workflow id") != null);
    s.take(d3);
}

test "a symbolic link in the store is not followed, and a failure removes its files" {
    var f: Fixture = undefined;
    try f.init(.{ .root = "" });
    defer f.deinit();
    const s = &f.store;
    // `workflows/wf1` is a link to a directory outside the root.
    try t.expectEqual(@as(i32, 0), sys.fileOpNow(.{ .kind = .mkdir, .fd = s.root_fd, .name = "workflows" }));
    const wf = sys.fileOpNow(.{ .kind = .open, .fd = s.root_fd, .name = "workflows", .how = .dir });
    try t.expect(wf >= 0);
    defer sys.close(wf);
    try t.expect(sys.symlinkAt("/tmp", wf, "wf1"));
    const h = try s.reserve("{}");
    s.put(h, putOf("secret"));
    const d = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!d.ok and std.mem.indexOf(u8, d.payload, "open a directory") != null);
    s.take(d);
    try t.expectEqual(@as(u32, s.cfg.max_transfers), s.nfree);

    // The time of a transfer ends while its write is with the driver: the
    // step gets an error at once, and the files go when the write ends.
    f.hold();
    const h2 = try s.reserve("{}");
    var p = putOf("0123456789");
    p.workflow = "wf2";
    s.put(h2, p);
    var guard: u32 = 0;
    while (s.rows[h2.index()].phase != .file_write and guard < 100) : (guard += 1) f.runHeld(h2.index());
    s.tick(p.now_ms + s.cfg.timeout_ms);
    const late = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!late.ok and std.mem.indexOf(u8, late.payload, "within") != null);
    s.take(late);
    try t.expect(s.busy());
    f.drain(h2.index());
    try t.expect(!s.busy() and s.nextDone() == null);
    try t.expectEqual(@as(u32, s.cfg.max_transfers), s.nfree);
    var fb: [64]u8 = @splat(0);
    var pb: [256]u8 = @splat(0);
    const rel = try std.fmt.bufPrint(&pb, "workflows/wf2/executions/wfrt-7/binary_data/{s}", .{s.rows[h2.index()].segment(levels)});
    try t.expectError(error.NotFound, f.read(rel, &fb));
}

fn beginOf(expected: ?u64) Begin {
    const p = putOf("");
    return .{ .exec_id = p.exec_id, .seq = p.seq, .workflow = p.workflow, .execution = p.execution, .head = p.head, .content_disposition = p.content_disposition, .content_type = p.content_type, .url_path = p.url_path, .expected = expected, .now_ms = p.now_ms };
}

test "a body in pieces: the pool bounds the bytes in memory, and the size comes at the end" {
    var f: Fixture = undefined;
    // Three blocks of 16 bytes for a body of 100.
    try f.init(.{ .root = "", .block_bytes = 16, .buffer_bytes = 16 * 3, .max_transfers = 2 });
    defer f.deinit();
    f.hold();
    const s = &f.store;
    var body: [100]u8 = @splat(0);
    for (&body, 0..) |*b, i| b.* = @intCast('a' + i % 26);
    const h = try s.reserve("{}");
    s.begin(h, beginOf(null));
    var at: usize = 0;
    var short: u32 = 0;
    var guard: u32 = 0;
    while (at < body.len and guard < 1000) : (guard += 1) {
        // Pieces of 23 bytes, as a socket gives them: not the size of a block.
        const piece = body[at..@min(body.len, at + 23)];
        if (s.hasRoom(h)) switch (s.append(h, piece, 1000 + guard)) {
            .took => |k| {
                at += k;
                if (k < piece.len) short += 1;
            },
            .failed => return error.TestExpectedEqual,
        };
        try t.expect(s.blocks_free <= 3);
        f.runHeld(h.index());
    }
    try t.expectEqual(body.len, at);
    // The pool was empty at times: the caller got fewer bytes and went on later.
    try t.expect(short > 0 and s.counters.blocks_full == short);
    // A transfer that waits for bytes is not late.
    f.drain(h.index());
    s.tick(1_000_000);
    try t.expect(s.nextDone() == null);
    s.complete(h);
    f.drain(h.index());
    const d = s.nextDone() orelse return error.TestExpectedEqual;
    try expectStored(&f, d, &body, "{\"fileName\":\"report.pdf\",\"mimeType\":\"application/pdf\",\"fileSize\":100}");
    try t.expectEqualStrings("100 B", member(d.payload[d.head_len..], "fileSize"));
    s.take(d);
    try t.expectEqual(@as(u32, 3), s.blocks_free);
    try t.expectEqual(@as(u32, 2), s.nfree);
}

test "a body in pieces that fails: the caller's reason or the limit is the result, and the part of the file goes" {
    var f: Fixture = undefined;
    try f.init(.{ .root = "", .max_file_bytes = 40, .max_transfers = 2 });
    defer f.deinit();
    const s = &f.store;
    var fb: [64]u8 = @splat(0);
    var pb: [256]u8 = @splat(0);

    // The response ends early: `fail` gives the reason of the caller.
    const h = try s.reserve("{}");
    s.begin(h, beginOf(null));
    try t.expectEqual(Append{ .took = 10 }, s.append(h, "0123456789", 1000));
    const r = &s.rows[h.index()];
    const tmp_rel = try std.fmt.bufPrint(&pb, "workflows/wf1/executions/wfrt-7/binary_data/{s}.tmp.{d}.{s}", .{ r.segment(levels), s.pid, &r.tmp_tag });
    try t.expectEqualStrings("0123456789", try f.read(tmp_rel, &fb));
    s.fail(h, "http: the connection closed before the response was complete");
    const d = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!d.ok);
    try t.expectEqualStrings("http: the connection closed before the response was complete", d.payload);
    try t.expectError(error.NotFound, f.read(tmp_rel, &fb));
    s.take(d);
    try t.expectEqual(@as(u32, 2), s.nfree);

    // More bytes than a file can have, with no length in the response: the limit is the
    // result, the caller learns it from `append`, and its own reason does not replace it.
    const h2 = try s.reserve("{}");
    s.begin(h2, beginOf(null));
    try t.expectEqual(Append{ .took = 30 }, s.append(h2, "012345678901234567890123456789", 1000));
    try t.expectEqual(Append.failed, s.append(h2, "01234567890123456789", 1000));
    try t.expectEqual(Append.failed, s.append(h2, "x", 1000));
    s.fail(h2, "http: closed");
    const big = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!big.ok and std.mem.indexOf(u8, big.payload, "--binary-max-file-mb") != null);
    s.take(big);
    try t.expectEqual(@as(u64, 1), s.counters.too_large);

    // A length above the limit fails before a file is made, and the caller can still end.
    const h3 = try s.reserve("{}");
    s.begin(h3, beginOf(41));
    const early = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!early.ok and std.mem.indexOf(u8, early.payload, "is 41 bytes") != null);
    s.take(early);
    try t.expectEqual(Append.failed, s.append(h3, "x", 1000));
    s.complete(h3);
    try t.expect(!s.busy() and s.nextDone() == null);
    try t.expectEqual(@as(u32, 2), s.nfree);
    try t.expectEqual(@as(u64, 0), s.counters.stored);
}

test "readMetadata gives the companion file of a stored file" {
    var f: Fixture = undefined;
    try f.init(.{ .root = "" });
    defer f.deinit();
    const s = &f.store;
    const h = try s.reserve("{}");
    s.put(h, putOf("abc"));
    const d = s.nextDone() orelse return error.TestExpectedEqual;
    var ib: [binary_store.max_id]u8 = @splat(0);
    const id = try std.fmt.bufPrint(&ib, "{s}", .{member(d.payload[d.head_len..], "id")});
    s.take(d);

    try s.readMetadata(id, 9, 1, 0);
    const m = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(m.ok);
    try t.expectEqualStrings("{\"fileName\":\"report.pdf\",\"mimeType\":\"application/pdf\",\"fileSize\":3}", m.payload);
    s.take(m);

    try s.readMetadata("filesystem-v2:workflows/wf1/executions/wfrt-7/binary_data/none", 9, 2, 0);
    const missing = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(!missing.ok and std.mem.indexOf(u8, missing.payload, "could not be read") != null);
    s.take(missing);
    try t.expectError(error.BadId, s.readMetadata("filesystem-v2:workflows/../executions/1/binary_data/x", 9, 3, 0));
    try t.expectError(error.BadId, s.readMetadata("/etc/passwd", 9, 3, 0));
    try t.expectEqual(@as(u32, s.cfg.max_transfers), s.nfree);
}

/// Store `body` and give the id of its file in `ib`.
fn storedId(f: *Fixture, body: []const u8, ib: *[binary_store.max_id]u8) ![]const u8 {
    const s = &f.store;
    s.put(try s.reserve("{}"), putOf(body));
    const d = s.nextDone() orelse return error.TestExpectedEqual;
    try t.expect(d.ok);
    const id = try std.fmt.bufPrint(ib, "{s}", .{member(d.payload[d.head_len..], "id")});
    s.take(d);
    return id;
}

test "a source gives a stored file in pieces of one buffer, and each read waits for the consumer" {
    var f: Fixture = undefined;
    try f.init(.{ .root = "", .block_bytes = 4096, .max_transfers = 4, .source_buffers = 1 });
    defer f.deinit();
    const s = &f.store;
    var body: [10_000]u8 = @splat(0);
    for (&body, 0..) |*b, i| b.* = @intCast((i * 13 + i / 97) % 251);
    var ib: [binary_store.max_id]u8 = @splat(0);
    const id = try storedId(&f, &body, &ib);

    // The operations complete later, as on the ring: nothing is known at once.
    f.hold();
    const h = try s.sourceOpen(id, 0);
    try t.expect(s.sourceSize(h) == .wait and s.sourcePeek(h, 0) == .wait);
    f.drain(h.index());
    try t.expectEqual(@as(u64, body.len), s.sourceSize(h).size);
    // The file is open, and no byte is read: the first peek starts the read.
    try t.expectEqual(@as(u32, 1), s.nsrc_free);
    try t.expect(s.sourcePeek(h, 0) == .wait);
    try t.expectEqual(@as(u32, 0), s.nsrc_free);

    var got: [10_000]u8 = @splat(0);
    var at: usize = 0;
    var rounds: u32 = 0;
    var most: usize = 0;
    while (rounds < 100) : (rounds += 1) {
        switch (s.sourcePeek(h, 0)) {
            .wait => f.runHeld(h.index()),
            .bytes => |b| {
                most = @max(most, b.len);
                // The consumer sends a part: the rest of the piece stays.
                const n = @min(b.len, 1500);
                @memcpy(got[at..][0..n], b[0..n]);
                at += n;
                s.sourceTake(h, n, 0);
            },
            .end => break,
            .failed => return error.TestUnexpectedResult,
        }
    }
    try t.expectEqual(body.len, at);
    try t.expectEqualSlices(u8, &body, &got);
    // No piece is larger than one buffer.
    try t.expectEqual(@as(usize, 4096), most);
    s.sourceClose(h);
    try t.expect(!s.busy());
    try t.expectEqual(@as(u32, 4), s.nfree);
    try t.expectEqual(@as(u32, 1), s.nsrc_free);
    try t.expectEqual(@as(u64, 1), s.counters.sources);
}

test "sources: a file that is not there, one buffer for two files, and a close during a read" {
    var f: Fixture = undefined;
    try f.init(.{ .root = "", .block_bytes = 4096, .max_transfers = 4, .source_buffers = 1 });
    defer f.deinit();
    const s = &f.store;
    var body: [6000]u8 = @splat('q');
    body[5999] = 'z';
    var ib: [binary_store.max_id]u8 = @splat(0);
    const id = try storedId(&f, &body, &ib);

    // With the driver that runs at once, the failure is known at the first question.
    const gone = try s.sourceOpen("filesystem-v2:workflows/wf1/executions/wfrt-7/binary_data/none", 0);
    const why = s.sourceSize(gone);
    try t.expect(why == .failed and std.mem.indexOf(u8, why.failed, "the stored file could not be read: open the file") != null);
    try t.expect(s.sourcePeek(gone, 0) == .failed);
    s.sourceClose(gone);
    try t.expectError(error.BadId, s.sourceOpen("filesystem-v2:workflows/../executions/1/binary_data/x", 0));
    try t.expectEqual(@as(u32, 4), s.nfree);

    // Two files and one buffer: the second waits until the first is closed.
    const a = try s.sourceOpen(id, 0);
    const b = try s.sourceOpen(id, 0);
    try t.expectEqual(@as(usize, 4096), s.sourcePeek(a, 0).bytes.len);
    try t.expect(s.sourcePeek(b, 0) == .wait);
    try t.expectEqual(@as(u64, 1), s.counters.source_waits);
    s.sourceTake(a, 4096, 0);
    const tail = s.sourcePeek(a, 0).bytes;
    try t.expectEqual(@as(usize, 6000 - 4096), tail.len);
    try t.expectEqual(@as(u8, 'z'), tail[tail.len - 1]);
    s.sourceTake(a, tail.len, 0);
    try t.expect(s.sourcePeek(a, 0) == .end);
    s.sourceClose(a);
    try t.expectEqual(@as(usize, 4096), s.sourcePeek(b, 0).bytes.len);

    // A close while a read runs: the row and the buffer are free when the read ends.
    f.hold();
    s.sourceTake(b, 4096, 0);
    try t.expect(s.sourcePeek(b, 0) == .wait and f.held[b.index()] != null);
    s.sourceClose(b);
    try t.expect(s.busy());
    try t.expectEqual(@as(u32, 0), s.nsrc_free);
    f.runHeld(b.index());
    try t.expect(!s.busy());
    try t.expectEqual(@as(u32, 4), s.nfree);
    try t.expectEqual(@as(u32, 1), s.nsrc_free);

    // A read that does not end in time fails the source, and the consumer sees the reason.
    const slow = try s.sourceOpen(id, 0);
    f.drain(slow.index());
    try t.expect(s.sourcePeek(slow, 1000) == .wait);
    s.tick(1000 + s.cfg.timeout_ms);
    const late = s.sourcePeek(slow, 0);
    try t.expect(late == .failed and std.mem.indexOf(u8, late.failed, "the stored file could not be read within") != null);
    try t.expect(s.nextDone() == null);
    s.sourceClose(slow);
    f.runHeld(slow.index());
    try t.expect(!s.busy());
    try t.expectEqual(@as(u32, 1), s.nsrc_free);
}

test "a source on the ring of a shard (Linux)" {
    if (!uring.supported) return error.SkipZigTest;
    var f: Fixture = undefined;
    try f.init(.{ .root = "", .block_bytes = 4096, .buffer_bytes = 1 << 20, .max_transfers = 4, .source_buffers = 2 });
    defer f.deinit();
    const s = &f.store;
    var body: [10_000]u8 = @splat(0);
    for (&body, 0..) |*b, i| b.* = @intCast('a' + i % 26);
    var ib: [binary_store.max_id]u8 = @splat(0);
    const id = try storedId(&f, &body, &ib);

    const ring_mem = try t.allocator.alloc(u8, 4 * (4096 + 4) + (64 << 10));
    defer t.allocator.free(ring_mem);
    var ring_fba: std.heap.FixedBufferAllocator = .init(ring_mem);
    var ring: uring.Ring = undefined;
    // A kernel or sandbox without io_uring: nothing to test here.
    ring.init(ring_fba.allocator(), .{ .entries = 64, .buffers = 4, .buffer_size = 4096 }) catch return error.SkipZigTest;
    defer ring.deinit(ring_fba.allocator());
    s.useRing(&ring);

    const h = try s.sourceOpen(id, 0);
    var got: [10_000]u8 = @splat(0);
    var at: usize = 0;
    var rounds: u32 = 0;
    while (rounds < 1000) : (rounds += 1) {
        switch (s.sourcePeek(h, 0)) {
            .wait => {
                ring.enter(20);
                var guard: u32 = 0;
                while (guard < 64) : (guard += 1) {
                    const c = ring.next() orelse break;
                    if (c.user != uring.ignore) s.onCompletion(c.user, c.res);
                }
            },
            .bytes => |b| {
                @memcpy(got[at..][0..b.len], b);
                at += b.len;
                s.sourceTake(h, b.len, 0);
            },
            .end => break,
            .failed => return error.TestUnexpectedResult,
        }
    }
    try t.expectEqual(body.len, at);
    try t.expectEqualSlices(u8, &body, &got);
    s.sourceClose(h);
    try t.expect(!s.busy());
    try t.expectEqual(@as(u32, 4), s.nfree);
    try t.expectEqual(@as(u32, 2), s.nsrc_free);
}

test "put on the ring of a shard (Linux)" {
    if (!uring.supported) return error.SkipZigTest;
    var f: Fixture = undefined;
    try f.init(.{ .root = "", .block_bytes = 4096, .buffer_bytes = 1 << 20, .max_transfers = 4 });
    defer f.deinit();
    const ring_mem = try t.allocator.alloc(u8, 4 * (4096 + 4) + (64 << 10));
    defer t.allocator.free(ring_mem);
    var ring_fba: std.heap.FixedBufferAllocator = .init(ring_mem);
    var ring: uring.Ring = undefined;
    // A kernel or sandbox without io_uring: nothing to test here.
    ring.init(ring_fba.allocator(), .{ .entries = 64, .buffers = 4, .buffer_size = 4096 }) catch return error.SkipZigTest;
    defer ring.deinit(ring_fba.allocator());
    const s = &f.store;
    s.useRing(&ring);

    // Three bodies at once: more than one block each, and an empty one.
    var body: [10_000]u8 = undefined;
    for (&body, 0..) |*b, i| b.* = @intCast('a' + i % 26);
    const sizes = [_]usize{ body.len, 4097, 0 };
    for (sizes) |n| s.put(try s.reserve("{}"), putOf(body[0..n]));
    try t.expect(s.busy() and s.nextDone() == null);
    @memset(&body, 0);
    var rounds: u32 = 0;
    while (s.busy() and rounds < 1000) : (rounds += 1) {
        ring.enter(20);
        var guard: u32 = 0;
        while (guard < 256) : (guard += 1) {
            const c = ring.next() orelse break;
            if (c.user != uring.ignore) s.onCompletion(c.user, c.res);
        }
    }
    try t.expect(!s.busy());
    for (&body, 0..) |*b, i| b.* = @intCast('a' + i % 26);
    var sidecar: [128]u8 = undefined;
    // The results come in the order in which the transfers end.
    var seen: usize = 0;
    for (sizes) |_| {
        const d = s.nextDone() orelse return error.TestExpectedEqual;
        const handle = http.member(d.payload[d.head_len..], "$binary") orelse "";
        const n = try std.fmt.parseInt(usize, http.member(handle, "bytes") orelse "", 10);
        try expectStored(&f, d, body[0..n], try std.fmt.bufPrint(&sidecar, "{{\"fileName\":\"report.pdf\",\"mimeType\":\"application/pdf\",\"fileSize\":{d}}}", .{n}));
        seen += n;
        s.take(d);
    }
    try t.expectEqual(sizes[0] + sizes[1] + sizes[2], seen);
    try t.expectEqual(@as(u64, 3), s.counters.stored);
    try t.expectEqual(@as(u32, 4), s.nfree);
    try t.expectEqual(s.block_next.len, @as(usize, s.blocks_free));
}
