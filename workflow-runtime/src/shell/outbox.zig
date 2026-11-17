//! The durable event outbox of one shard (spec 9.2): the segment files that
//! hold each durable lifecycle event until n8n acks it, the ack file, the
//! byte count that limits new work, and the read cursor of the event stream.
//!
//! Files in the log dir: `outbox-<shard>-<first seq>.seg`, a record per event
//! (its seq, the bytes of its line, then the line), and `outbox-<shard>.ack`
//! with the seq n8n handled last. Every file is 0600, and the log dir is 0700
//! when wfrt creates it.
//!
//! Every buffer is reserved at startup (`docs/zig-standards.md`): a full
//! outbox is a limit for new work, never a crash and never an allocation.
const std = @import("std");
const core_lib = @import("core");
const reserve = core_lib.arena.reserve;
const sys = @import("sys.zig");

/// Longest path of a file in the log dir.
const path_bytes: usize = 512;
/// Bytes of one write to a segment.
const chunk_bytes: usize = 64 << 10;
/// Bytes the stream reader takes from a segment at a time.
const read_bytes: usize = 128 << 10;
/// Slices the stream reader holds for one write.
pub const max_slices: usize = 64;
/// Bound of one pass of the read loop.
const fill_bound: u32 = 1 << 16;
/// Bound of the records of one segment at startup.
const scan_bound: u64 = 1 << 30;
/// Largest line of a record: a trigger with a 16 MB upload is base64, and a
/// result can be as large as its region memory.
pub const max_line_bytes: u32 = 64 << 20;
/// Smallest and largest segment file.
const min_segment_bytes: u64 = 1 << 20;
const max_segment_bytes: u64 = 64 << 20;
/// Most segments one shard keeps. When the table is full the last segment
/// grows: a limit, not a lost record.
const max_segments: u32 = 1024;
/// Text of the ack file: a seq in decimal, then a newline.
const ack_text_bytes: usize = 24;
const header_bytes: usize = @sizeOf(RecordHeader);

/// The header of one record: the seq of its event (LE), the bytes of its
/// line (LE), and 4 zero bytes that keep the header aligned.
pub const RecordHeader = extern struct {
    seq: u64,
    len: u32,
    _pad: u32 = 0,
};

comptime {
    std.debug.assert(header_bytes == 16);
    std.debug.assert(@offsetOf(RecordHeader, "seq") == 0);
    std.debug.assert(@offsetOf(RecordHeader, "len") == 8);
}

/// The sync policy of a record: the durability tier of its workflow.
pub const Sync = enum {
    /// `sync`: the record is on disk before its event counts as written.
    now,
    /// `batched`: the record is on disk with the next batch flush.
    batch,
    /// `none`: the record is written, but not synced.
    none,
};

/// One segment file.
pub const Segment = struct {
    /// The seq of its first record; its file name holds it.
    first_seq: u64,
    /// Bytes of its valid records.
    bytes: u64,
};

/// What `GET /_admin/outbox` reports for this shard.
pub const Status = struct {
    first: u64,
    last: u64,
    acked: u64,
    bytes: u64,
    max_bytes: u64,
};

/// The result of one write of the stream.
pub const Step = union(enum) {
    /// `n` bytes went out; the cursor moved.
    sent: usize,
    /// Nothing waits within the limit now.
    empty,
    /// The socket is full: write interest goes back on.
    blocked,
    /// The client went.
    closed,
};

pub const Options = struct {
    dir: []const u8,
    shard: u32,
    max_bytes: u64,
    /// Bytes of a segment file. 0: a size from `max_bytes`.
    segment_bytes: u64 = 0,
};

/// A segment file's size: a 64th of the outbox, so that an ack can delete a
/// segment often enough to return its space.
fn segmentBytesFor(max_bytes: u64) u64 {
    return std.math.clamp(max_bytes / 64, min_segment_bytes, max_segment_bytes);
}

pub const Outbox = struct {
    dir: []const u8,
    shard: u32,
    max_bytes: u64,
    segment_bytes: u64,
    /// The segment files, oldest first. The last one receives records.
    segs: []Segment,
    nsegs: u32 = 0,
    /// The receiving segment, or -1 before its first record.
    fd: c_int = -1,
    /// Bytes of the receiving segment.
    cur_bytes: u64 = 0,
    /// The next record gets this seq.
    next_seq: u64 = 1,
    acked_seq: u64 = 0,
    /// Bytes of every segment file: the retained events.
    stored: u64 = 0,
    /// A `batched` record is not synced yet.
    dirty: bool = false,
    chunk: []u8,
    rd: Reader,

    /// Open the outbox of one shard: scan the log dir, cut a torn last
    /// record, read the ack file, and continue the seq after the last record.
    pub fn init(gpa: std.mem.Allocator, opts: Options) !Outbox {
        std.debug.assert(opts.dir.len > 0 and opts.dir.len < path_bytes);
        std.debug.assert(opts.max_bytes > 0);
        try ensureDir(opts.dir);
        const seg_bytes = if (opts.segment_bytes > 0) opts.segment_bytes else segmentBytesFor(opts.max_bytes);
        std.debug.assert(seg_bytes > 0);
        const nsegs = std.math.clamp(opts.max_bytes / seg_bytes + 16, 16, max_segments);
        var ob: Outbox = .{
            .dir = opts.dir,
            .shard = opts.shard,
            .max_bytes = opts.max_bytes,
            .segment_bytes = seg_bytes,
            .segs = try reserve(gpa, Segment, @intCast(nsegs)),
            .chunk = try reserve(gpa, u8, chunk_bytes),
            .rd = .{ .buf = try reserve(gpa, u8, read_bytes) },
        };
        try ob.scanNames();
        try ob.cutTornTail();
        ob.acked_seq = ob.readAckFile();
        // A seq only grows, also across restarts: an outbox that an ack
        // emptied continues after the seq that n8n handled last.
        if (ob.acked_seq + 1 > ob.next_seq) ob.next_seq = ob.acked_seq + 1;
        try ob.dropAcked();
        std.debug.assert(ob.nsegs <= ob.segs.len);
        std.debug.assert(ob.acked_seq < ob.next_seq);
        return ob;
    }

    pub fn deinit(ob: *Outbox) void {
        ob.flushSync();
        if (ob.fd >= 0) {
            _ = std.c.close(ob.fd);
            ob.fd = -1;
        }
        ob.rd.closeFd();
    }

    pub fn nextSeq(ob: *const Outbox) u64 {
        return ob.next_seq;
    }

    pub fn ackedSeq(ob: *const Outbox) u64 {
        return ob.acked_seq;
    }

    /// True when new work must wait: the retained events are at the limit.
    pub fn full(ob: *const Outbox) bool {
        return ob.stored >= ob.max_bytes;
    }

    pub fn status(ob: *const Outbox) Status {
        return .{
            .first = if (ob.nsegs > 0) ob.segs[0].first_seq else ob.next_seq,
            .last = ob.next_seq - 1,
            .acked = ob.acked_seq,
            .bytes = ob.stored,
            .max_bytes = ob.max_bytes,
        };
    }

    /// Write the header of one record and give back its writer. `seq` is
    /// `nextSeq()`, and `len` the bytes of its line.
    pub fn begin(ob: *Outbox, seq: u64, len: u32) !Record {
        std.debug.assert(seq == ob.next_seq);
        std.debug.assert(len <= max_line_bytes);
        if (ob.fd < 0) {
            if (ob.nsegs > 0) try ob.openSegment(ob.segs[ob.nsegs - 1].first_seq) else try ob.startSegment(seq);
        } else if (ob.cur_bytes > 0 and ob.cur_bytes + recSize(len) > ob.segment_bytes and ob.nsegs < ob.segs.len) {
            try ob.startSegment(seq);
        }
        std.debug.assert(ob.fd >= 0 and ob.nsegs > 0);
        // The header goes out first: the line follows it.
        var hdr: [header_bytes]u8 = undefined;
        std.mem.writeInt(u64, hdr[0..8], seq, .little);
        std.mem.writeInt(u32, hdr[8..12], len, .little);
        @memset(hdr[12..], 0);
        writeAll(ob.fd, &hdr) catch return error.OutboxWrite;
        return .{ .ob = ob, .seq = seq, .len = len };
    }

    /// Fsync the records of the `batched` tier.
    pub fn flushSync(ob: *Outbox) void {
        if (!ob.dirty or ob.fd < 0) return;
        if (std.c.fsync(ob.fd) != 0) {
            std.debug.print("shard {d}: the outbox sync failed\n", .{ob.shard});
            return;
        }
        ob.dirty = false;
    }

    /// Store the acked seq durably, then delete the segments that it covers.
    /// `error.AckBeyond` when that seq is not written yet.
    pub fn ack(ob: *Outbox, seq: u64) !void {
        if (seq >= ob.next_seq) return error.AckBeyond;
        if (seq > ob.acked_seq) {
            ob.acked_seq = seq;
            try ob.writeAckFile();
        }
        try ob.dropAcked();
    }

    /// The first stored record with a seq greater than `after` goes next.
    /// The client has the records up to `after`, and the stored records that
    /// follow are its replay: they go out before any live best-effort line.
    pub fn startStream(ob: *Outbox, after: u64) void {
        ob.rd.closeFd();
        ob.rd.nspans = 0;
        ob.rd.cur = 0;
        ob.rd.sent = 0;
        ob.rd.used = 0;
        ob.rd.in_line = false;
        ob.rd.line_left = 0;
        ob.rd.skip = after;
        ob.rd.sent_seq = after;
        ob.rd.replay_until = ob.next_seq - 1;
        // The last segment that starts at or before `after` holds the first
        // record that the client does not have.
        var seg: u32 = 0;
        var i: u32 = 0;
        while (i < ob.nsegs) : (i += 1) {
            if (ob.segs[i].first_seq <= after) seg = i;
        }
        ob.rd.seg = @min(seg, ob.nsegs);
        ob.rd.off = 0;
    }

    /// Send the stored lines of the records up to `upto` to `fd`, in one
    /// write. The cursor keeps its place: a slow client reads less, nothing
    /// is lost.
    pub fn flushTo(ob: *Outbox, fd: c_int, upto: u64) Step {
        if (ob.rd.nspans == 0 and ob.rd.fill(ob) == 0) return .empty;
        var bufs: [max_slices][]const u8 = undefined;
        const n = ob.rd.slicesUpTo(&bufs, upto);
        if (n == 0) return .empty;
        switch (sys.writevSome(fd, bufs[0..n])) {
            .n => |k| {
                if (k == 0) return .empty;
                ob.rd.consume(k);
                return .{ .sent = k };
            },
            .again => return .blocked,
            .closed => return .closed,
        }
    }

    /// True when the stream cursor has not reached the last stored record:
    /// one pass of `flushStream` stopped at its bound.
    pub fn pending(ob: *const Outbox) bool {
        const rd = &ob.rd;
        if (rd.nspans > 0) return true;
        if (rd.seg + 1 < ob.nsegs) return true;
        if (rd.seg >= ob.nsegs) return false;
        return rd.off < ob.segs[rd.seg].bytes;
    }

    /// The connection went: a half-sent line goes again in full.
    pub fn restartFront(ob: *Outbox) void {
        ob.rd.sent = 0;
    }

    /// The seq of the last record of segment `i`.
    fn lastSeqOf(ob: *const Outbox, i: u32) u64 {
        std.debug.assert(i < ob.nsegs);
        return if (i + 1 < ob.nsegs) ob.segs[i + 1].first_seq - 1 else ob.next_seq - 1;
    }

    /// Delete the segments whose every record is acked. Only whole segments
    /// go, so a record that the client did not get is never lost.
    fn dropAcked(ob: *Outbox) !void {
        var k: u32 = 0;
        while (k < ob.nsegs and ob.lastSeqOf(k) <= ob.acked_seq) : (k += 1) {}
        if (k == 0) return;
        var i: u32 = 0;
        while (i < k) : (i += 1) {
            var pb: [path_bytes]u8 = undefined;
            const p = ob.segPath(&pb, ob.segs[i].first_seq) catch return error.OutboxPath;
            if (std.c.unlink(p) != 0 and std.c.errno(@as(c_int, -1)) != .NOENT) return error.OutboxDelete;
            std.debug.assert(ob.stored >= ob.segs[i].bytes);
            ob.stored -= ob.segs[i].bytes;
        }
        // The receiving segment may be one of them.
        if (ob.fd >= 0 and k == ob.nsegs) {
            _ = std.c.close(ob.fd);
            ob.fd = -1;
            ob.cur_bytes = 0;
        }
        const keep = ob.nsegs - k;
        std.mem.copyForwards(Segment, ob.segs[0..keep], ob.segs[k..ob.nsegs]);
        ob.nsegs = keep;
        ob.rd.onDropped(k, ob);
        syncDir(ob.dir);
    }

    /// Close the receiving segment and start a new one at `seq`.
    fn startSegment(ob: *Outbox, seq: u64) !void {
        std.debug.assert(seq == ob.next_seq);
        if (ob.fd >= 0) {
            _ = std.c.close(ob.fd);
            ob.fd = -1;
        }
        if (ob.nsegs == ob.segs.len) {
            // A limit: the last segment keeps the records, and the ack of a
            // front segment makes room again.
            if (ob.nsegs == 0) return error.OutboxFull;
            std.debug.print("shard {d}: the outbox holds {d} segments; the last one grows\n", .{ ob.shard, ob.nsegs });
            return ob.openSegment(ob.segs[ob.nsegs - 1].first_seq);
        }
        var pb: [path_bytes]u8 = undefined;
        const p = try ob.segPath(&pb, seq);
        const fd = std.c.open(p, .{ .ACCMODE = .WRONLY, .CREAT = true, .EXCL = true, .APPEND = true }, @as(std.c.mode_t, 0o600));
        if (fd >= 0) return ob.adoptSegment(fd, seq);
        // A segment file of a crash: it holds no valid record.
        _ = std.c.unlink(p);
        const again = std.c.open(p, .{ .ACCMODE = .WRONLY, .CREAT = true, .APPEND = true }, @as(std.c.mode_t, 0o600));
        if (again < 0) return error.OutboxOpen;
        return ob.adoptSegment(again, seq);
    }

    /// Continue an existing segment.
    fn openSegment(ob: *Outbox, first_seq: u64) !void {
        var pb: [path_bytes]u8 = undefined;
        const p = try ob.segPath(&pb, first_seq);
        const fd = std.c.open(p, .{ .ACCMODE = .WRONLY, .APPEND = true }, @as(std.c.mode_t, 0o600));
        if (fd < 0) return error.OutboxOpen;
        ob.fd = fd;
        std.debug.assert(ob.nsegs > 0 and ob.segs[ob.nsegs - 1].first_seq == first_seq);
        ob.cur_bytes = ob.segs[ob.nsegs - 1].bytes;
        ob.dirty = false;
    }

    fn adoptSegment(ob: *Outbox, fd: c_int, first_seq: u64) !void {
        if (std.c.fchmod(fd, @as(std.c.mode_t, 0o600)) != 0) {
            _ = std.c.close(fd);
            return error.OutboxOpen;
        }
        std.debug.assert(ob.nsegs < ob.segs.len);
        ob.fd = fd;
        ob.cur_bytes = 0;
        ob.dirty = false;
        ob.segs[ob.nsegs] = .{ .first_seq = first_seq, .bytes = 0 };
        ob.nsegs += 1;
    }

    fn segPath(ob: *const Outbox, buf: []u8, first_seq: u64) ![:0]const u8 {
        return std.fmt.bufPrintSentinel(buf, "{s}/outbox-{d}-{d}.seg", .{ ob.dir, ob.shard, first_seq }, 0) catch error.OutboxPath;
    }

    fn ackPath(ob: *const Outbox, buf: []u8) ![:0]const u8 {
        return std.fmt.bufPrintSentinel(buf, "{s}/outbox-{d}.ack", .{ ob.dir, ob.shard }, 0) catch error.OutboxPath;
    }

    fn ackTmpPath(ob: *const Outbox, buf: []u8) ![:0]const u8 {
        return std.fmt.bufPrintSentinel(buf, "{s}/outbox-{d}.ack.tmp", .{ ob.dir, ob.shard }, 0) catch error.OutboxPath;
    }

    /// The segment files of this shard, oldest first.
    fn scanNames(ob: *Outbox) !void {
        var pb: [path_bytes]u8 = undefined;
        const d = std.c.opendir(dirPath(ob.dir, &pb)) orelse return error.OutboxDir;
        defer _ = std.c.closedir(d);
        var guard: u32 = 0;
        while (std.c.readdir(d)) |ent| : (guard += 1) {
            if (guard > 1 << 20) return error.OutboxDir;
            const first = parseSegName(std.mem.sliceTo(&ent.name, 0), ob.shard) orelse continue;
            if (ob.nsegs == ob.segs.len) return error.OutboxTooManySegments;
            ob.segs[ob.nsegs] = .{ .first_seq = first, .bytes = 0 };
            ob.nsegs += 1;
        }
        std.sort.heap(Segment, ob.segs[0..ob.nsegs], {}, struct {
            fn less(_: void, a: Segment, b: Segment) bool {
                return a.first_seq < b.first_seq;
            }
        }.less);
    }

    /// Cut a torn last record and find the seq after the last stored record.
    /// The segments that a torn record makes unreachable go.
    fn cutTornTail(ob: *Outbox) !void {
        if (ob.nsegs == 0) return;
        var expect = ob.segs[0].first_seq;
        var keep: u32 = 0;
        var i: u32 = 0;
        while (i < ob.nsegs) : (i += 1) {
            if (ob.segs[i].first_seq != expect) break; // A gap: nothing after it is numbered.
            const end = try ob.scanSegment(ob.segs[i].first_seq);
            ob.segs[i].bytes = end.bytes;
            ob.stored += end.bytes;
            expect = end.next_seq;
            keep += 1;
            if (end.bytes == 0) break;
        }
        // Records after a torn one never went to n8n: their files go.
        var j: u32 = keep;
        while (j < ob.nsegs) : (j += 1) {
            var pb: [path_bytes]u8 = undefined;
            const p = ob.segPath(&pb, ob.segs[j].first_seq) catch continue;
            _ = std.c.unlink(p);
        }
        ob.nsegs = keep;
        ob.next_seq = expect;
    }

    const Scanned = struct { bytes: u64, next_seq: u64 };

    /// The valid bytes of one segment, and the seq after its last record. A
    /// torn record is cut from the file.
    fn scanSegment(ob: *Outbox, first_seq: u64) !Scanned {
        var pb: [path_bytes]u8 = undefined;
        const p = try ob.segPath(&pb, first_seq);
        const fd = std.c.open(p, .{ .ACCMODE = .RDWR }, @as(std.c.mode_t, 0o600));
        if (fd < 0) return error.OutboxOpen;
        defer _ = std.c.close(fd);
        var off: u64 = 0;
        var expect = first_seq;
        var guard: u64 = 0;
        while (guard < scan_bound) : (guard += 1) {
            var hdr: [header_bytes]u8 = undefined;
            if (readAt(fd, &hdr, off) != hdr.len) break;
            const h = parseHeader(&hdr) orelse break;
            if (h.seq != expect) break;
            // A record is valid only when its whole line is there.
            var left: u64 = h.len;
            var at = off + header_bytes;
            while (left > 0) {
                const want: usize = @intCast(@min(left, ob.rd.buf.len));
                const k = readAt(fd, ob.rd.buf[0..want], at);
                if (k < want) break;
                left -= k;
                at += k;
            }
            if (left > 0) break;
            off = at;
            expect += 1;
        }
        // Drop what a crash left behind.
        if (off != fileSize(fd) and std.c.ftruncate(fd, @intCast(off)) != 0) return error.OutboxTruncate;
        return .{ .bytes = off, .next_seq = expect };
    }

    fn readAckFile(ob: *Outbox) u64 {
        var pb: [path_bytes]u8 = undefined;
        const p = ob.ackPath(&pb) catch return 0;
        const fd = std.c.open(p, .{ .ACCMODE = .RDONLY }, @as(std.c.mode_t, 0));
        if (fd < 0) return 0;
        defer _ = std.c.close(fd);
        var buf: [ack_text_bytes]u8 = undefined;
        const n = readAt(fd, &buf, 0);
        const text = std.mem.trim(u8, buf[0..n], " \t\r\n");
        if (text.len == 0) return 0;
        return std.fmt.parseInt(u64, text, 10) catch {
            std.debug.print("shard {d}: the outbox ack file is not a seq; it reads as 0\n", .{ob.shard});
            return 0;
        };
    }

    /// The acked seq: a temp file, fsync, rename, then the dir.
    fn writeAckFile(ob: *Outbox) !void {
        var tb: [path_bytes]u8 = undefined;
        var ab: [path_bytes]u8 = undefined;
        const tmp = try ob.ackTmpPath(&tb);
        const p = try ob.ackPath(&ab);
        const fd = std.c.open(tmp, .{ .ACCMODE = .WRONLY, .CREAT = true, .TRUNC = true }, @as(std.c.mode_t, 0o600));
        if (fd < 0) return error.OutboxAck;
        var text: [ack_text_bytes]u8 = undefined;
        const line = std.fmt.bufPrint(&text, "{d}\n", .{ob.acked_seq}) catch unreachable;
        writeAll(fd, line) catch {
            _ = std.c.close(fd);
            return error.OutboxAck;
        };
        if (std.c.fsync(fd) != 0) {
            _ = std.c.close(fd);
            return error.OutboxAck;
        }
        _ = std.c.close(fd);
        if (std.c.rename(tmp, p) != 0) return error.OutboxAck;
        syncDir(ob.dir);
    }
};

fn recSize(len: u32) u64 {
    return header_bytes + len;
}

/// One record as it is written: the header is out, and the line follows in
/// the outbox's chunk buffer.
pub const Record = struct {
    ob: *Outbox,
    seq: u64,
    len: u32,
    written: u32 = 0,
    used: usize = 0,

    pub const Error = error{ NoSpace, OutboxWrite };

    pub fn put(r: *Record, bytes: []const u8) Error!void {
        if (@as(u64, r.written) + bytes.len > r.len) return error.NoSpace;
        var rest = bytes;
        while (rest.len > 0) {
            const room = r.ob.chunk.len - r.used;
            if (room == 0) {
                r.flush() catch return error.OutboxWrite;
                continue;
            }
            const k = @min(room, rest.len);
            @memcpy(r.ob.chunk[r.used..][0..k], rest[0..k]);
            r.used += k;
            r.written += @intCast(k);
            rest = rest[k..];
        }
    }

    pub fn byte(r: *Record, c: u8) Error!void {
        return r.put(&[_]u8{c});
    }

    fn flush(r: *Record) Error!void {
        if (r.used == 0) return;
        writeAll(r.ob.fd, r.ob.chunk[0..r.used]) catch return error.OutboxWrite;
        r.used = 0;
    }

    /// The record is written (and synced, for its tier): the seq moves on.
    pub fn finish(r: *Record, sync: Sync) !void {
        try r.flush();
        std.debug.assert(r.written == r.len);
        const ob = r.ob;
        std.debug.assert(ob.nsegs > 0);
        ob.cur_bytes += recSize(r.len);
        ob.stored += recSize(r.len);
        ob.segs[ob.nsegs - 1].bytes = ob.cur_bytes;
        ob.next_seq = r.seq + 1;
        switch (sync) {
            .now => {
                if (std.c.fsync(ob.fd) != 0) return error.OutboxSync;
                ob.dirty = false;
            },
            .batch => ob.dirty = true,
            .none => {},
        }
    }
};

/// Reads the stored lines back for the event stream. The position is a byte
/// of the outbox as a stream: a record header, then the bytes of its line.
pub const Reader = struct {
    /// The segment index and the byte offset of the next byte to read.
    seg: u32 = 0,
    off: u64 = 0,
    /// Records with a seq up to this one are skipped (the `after` of the
    /// stream client).
    skip: u64 = 0,
    /// Bytes that are left of the line that is being sent.
    line_left: u32 = 0,
    /// The seq of the record of that line.
    line_seq: u64 = 0,
    in_line: bool = false,
    buf: []u8,
    /// Bytes of `buf` that the spans of this pass hold.
    used: usize = 0,
    spans: [max_slices][]const u8 = undefined,
    /// The seq of the record that each span belongs to.
    span_seq: [max_slices]u64 = undefined,
    /// The span ends its record.
    span_last: [max_slices]bool = undefined,
    nspans: usize = 0,
    cur: usize = 0,
    /// Bytes of `spans[cur]` that the client has.
    sent: usize = 0,
    /// The last record that the client has in full: the stream sends the
    /// best-effort lines after it (spec 9.2).
    sent_seq: u64 = 0,
    /// The last stored seq when the client connected: its replay goes first.
    replay_until: u64 = 0,
    fd: c_int = -1,
    /// The first seq of the segment that `fd` reads.
    fd_first: u64 = 0,

    fn closeFd(rd: *Reader) void {
        if (rd.fd >= 0) {
            _ = std.c.close(rd.fd);
            rd.fd = -1;
        }
    }

    /// The segments at the front went: the position moves with them.
    fn onDropped(rd: *Reader, k: u32, ob: *const Outbox) void {
        if (rd.seg >= k) {
            // The lines in the buffer are ahead of the acked seq: they stay.
            rd.seg -= k;
        } else {
            // Nothing of the old front is unsent.
            rd.seg = 0;
            rd.off = 0;
            rd.in_line = false;
            rd.line_left = 0;
            rd.nspans = 0;
            rd.cur = 0;
            rd.sent = 0;
        }
        if (rd.seg > ob.nsegs) rd.seg = ob.nsegs;
        rd.closeFd();
    }

    /// Read the next lines into the buffer. 0: nothing to send now (the
    /// client is at the tail, or the outbox holds no more lines).
    pub fn fill(rd: *Reader, ob: *const Outbox) usize {
        std.debug.assert(rd.nspans == 0);
        rd.cur = 0;
        rd.sent = 0;
        rd.used = 0;
        var guard: u32 = 0;
        while (rd.nspans < max_slices and guard < fill_bound) : (guard += 1) {
            if (rd.seg >= ob.nsegs) return rd.nspans;
            const sg = ob.segs[rd.seg];
            std.debug.assert(rd.off <= sg.bytes);
            if (rd.off == sg.bytes) {
                // The end of the segment: on to the next one, or wait.
                if (rd.seg + 1 < ob.nsegs) {
                    rd.seg += 1;
                    rd.off = 0;
                    continue;
                }
                return rd.nspans;
            }
            if (rd.in_line) {
                std.debug.assert(rd.line_left > 0);
                std.debug.assert(@as(u64, rd.line_left) <= sg.bytes - rd.off);
                const room = rd.buf.len - rd.used;
                if (room == 0) return rd.nspans;
                const want: usize = @intCast(@min(@as(u64, rd.line_left), room));
                const fd = rd.openSeg(ob) orelse return rd.nspans;
                const k = readAt(fd, rd.buf[rd.used..][0..want], rd.off);
                if (k == 0) return rd.nspans;
                rd.spans[rd.nspans] = rd.buf[rd.used..][0..k];
                rd.span_seq[rd.nspans] = rd.line_seq;
                rd.used += k;
                rd.nspans += 1;
                rd.off += k;
                rd.line_left -= @intCast(k);
                if (rd.line_left == 0) rd.in_line = false;
                rd.span_last[rd.nspans - 1] = !rd.in_line;
                if (k < want) return rd.nspans;
                continue;
            }
            // A record header.
            if (sg.bytes - rd.off < header_bytes) return rd.nspans;
            var hdr: [header_bytes]u8 = undefined;
            const fd = rd.openSeg(ob) orelse return rd.nspans;
            if (readAt(fd, &hdr, rd.off) != hdr.len) return rd.nspans;
            const h = parseHeader(&hdr) orelse return rd.nspans;
            rd.off += header_bytes;
            std.debug.assert(rd.off + h.len <= sg.bytes);
            if (h.seq <= rd.skip) {
                rd.off += h.len;
                continue;
            }
            rd.line_left = h.len;
            rd.line_seq = h.seq;
            rd.in_line = h.len > 0;
        }
        return rd.nspans;
    }

    fn openSeg(rd: *Reader, ob: *const Outbox) ?c_int {
        if (rd.seg >= ob.nsegs) return null;
        const first = ob.segs[rd.seg].first_seq;
        if (rd.fd >= 0 and rd.fd_first == first) return rd.fd;
        rd.closeFd();
        var pb: [path_bytes]u8 = undefined;
        const p = ob.segPath(&pb, first) catch return null;
        const fd = std.c.open(p, .{ .ACCMODE = .RDONLY }, @as(std.c.mode_t, 0));
        if (fd < 0) return null;
        rd.fd = fd;
        rd.fd_first = first;
        return fd;
    }

    /// The lines that wait, oldest first, as up to `out.len` slices.
    pub fn slices(rd: *Reader, out: [][]const u8) usize {
        var n: usize = 0;
        var i = rd.cur;
        var skip = rd.sent;
        while (i < rd.nspans and n < out.len) : (i += 1) {
            out[n] = rd.spans[i][skip..];
            skip = 0;
            n += 1;
        }
        return n;
    }

    /// The lines that wait and belong to records up to `upto`, oldest first,
    /// as up to `out.len` slices. A record stays whole: the order holds.
    pub fn slicesUpTo(rd: *Reader, out: [][]const u8, upto: u64) usize {
        var n: usize = 0;
        var i = rd.cur;
        var skip = rd.sent;
        while (i < rd.nspans and n < out.len) : (i += 1) {
            if (rd.span_seq[i] > upto) break;
            out[n] = rd.spans[i][skip..];
            skip = 0;
            n += 1;
        }
        return n;
    }

    /// The client took `n` bytes.
    pub fn consume(rd: *Reader, n_in: usize) void {
        var n = n_in;
        while (n > 0) {
            std.debug.assert(rd.cur < rd.nspans);
            const s = rd.spans[rd.cur];
            std.debug.assert(rd.sent < s.len);
            const k = @min(n, s.len - rd.sent);
            rd.sent += k;
            n -= k;
            if (rd.sent == s.len) {
                if (rd.span_last[rd.cur]) rd.sent_seq = rd.span_seq[rd.cur];
                rd.cur += 1;
                rd.sent = 0;
            }
        }
        if (rd.cur == rd.nspans) {
            rd.nspans = 0;
            rd.cur = 0;
            rd.sent = 0;
        }
    }
};

fn parseHeader(hdr: *const [header_bytes]u8) ?RecordHeader {
    const seq = std.mem.readInt(u64, hdr[0..8], .little);
    const len = std.mem.readInt(u32, hdr[8..12], .little);
    if (seq == 0 or len > max_line_bytes) return null;
    return .{ .seq = seq, .len = len };
}

/// The seq of a segment file of `shard`, from `outbox-<shard>-<seq>.seg`.
fn parseSegName(name: []const u8, shard: u32) ?u64 {
    const prefix = "outbox-";
    const suffix = ".seg";
    if (!std.mem.startsWith(u8, name, prefix) or !std.mem.endsWith(u8, name, suffix)) return null;
    const body = name[prefix.len .. name.len - suffix.len];
    const dash = std.mem.indexOfScalar(u8, body, '-') orelse return null;
    const n = std.fmt.parseInt(u32, body[0..dash], 10) catch return null;
    if (n != shard) return null;
    const first = std.fmt.parseInt(u64, body[dash + 1 ..], 10) catch return null;
    return if (first == 0) null else first;
}

fn writeAll(fd: c_int, b: []const u8) error{OutboxWrite}!void {
    var off: usize = 0;
    while (off < b.len) {
        const n = std.c.write(fd, b[off..].ptr, b.len - off);
        if (n <= 0) return error.OutboxWrite;
        off += @intCast(n);
    }
}

/// Exactly `buf.len` bytes at `off`, or fewer at the end of the file.
fn readAt(fd: c_int, buf: []u8, off: u64) usize {
    if (buf.len == 0) return 0;
    const n = std.c.pread(fd, buf.ptr, buf.len, @intCast(off));
    return if (n <= 0) 0 else @intCast(n);
}

fn fileSize(fd: c_int) u64 {
    const n = std.c.lseek(fd, 0, 2); // SEEK_END
    return if (n < 0) 0 else @intCast(n);
}

fn dirPath(dir: []const u8, buf: []u8) [*:0]const u8 {
    std.debug.assert(dir.len < buf.len);
    @memcpy(buf[0..dir.len], dir);
    buf[dir.len] = 0;
    return buf[0..dir.len :0];
}

/// Create the log dir (0700) when it is not there.
fn ensureDir(dir: []const u8) !void {
    var b: [path_bytes]u8 = undefined;
    if (std.c.mkdir(dirPath(dir, &b), @as(std.c.mode_t, 0o700)) == 0) return;
    if (std.c.errno(@as(c_int, -1)) != .EXIST) return error.OutboxDir;
}

fn syncDir(dir: []const u8) void {
    var b: [path_bytes]u8 = undefined;
    const fd = std.c.open(dirPath(dir, &b), .{ .ACCMODE = .RDONLY }, @as(std.c.mode_t, 0));
    if (fd < 0) return;
    _ = std.c.fsync(fd);
    _ = std.c.close(fd);
}

// ---- tests ------------------------------------------------------------------------

const TestDir = struct {
    tmp: std.testing.TmpDir,
    path: [:0]const u8,

    fn make(arena: std.mem.Allocator) !TestDir {
        var tmp = std.testing.tmpDir(.{});
        var buf: [path_bytes]u8 = undefined;
        const n = try tmp.dir.realPath(std.testing.io, &buf);
        const path = try arena.allocSentinel(u8, n, 0);
        @memcpy(path, buf[0..n]);
        return .{ .tmp = tmp, .path = path };
    }

    fn deinit(t: *TestDir) void {
        t.tmp.cleanup();
    }
};

fn appendLine(ob: *Outbox, line: []const u8, sync: Sync) !u64 {
    const seq = ob.nextSeq();
    var rec = try ob.begin(seq, @intCast(line.len));
    try rec.put(line);
    try rec.finish(sync);
    return seq;
}

/// The stored lines from `after`, all of them.
fn readAll(ob: *Outbox, after: u64, out: *std.ArrayList(u8), arena: std.mem.Allocator) !void {
    ob.startStream(after);
    var guard: u32 = 0;
    while (guard < 1000) : (guard += 1) {
        if (ob.rd.fill(ob) == 0) return;
        var bufs: [max_slices][]const u8 = undefined;
        const n = ob.rd.slices(&bufs);
        var i: usize = 0;
        while (i < n) : (i += 1) try out.appendSlice(arena, bufs[i]);
        var total: usize = 0;
        for (bufs[0..n]) |b| total += b.len;
        ob.rd.consume(total);
    }
}

test "outbox: write, read back, and read from an after seq" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var td = try TestDir.make(a);
    defer td.deinit();
    var ob = try Outbox.init(a, .{ .dir = td.path, .shard = 0, .max_bytes = 1 << 20, .segment_bytes = 512 });
    defer ob.deinit();
    const t = std.testing;
    try t.expectEqual(@as(u64, 1), ob.nextSeq());
    try t.expectEqual(@as(u64, 1), try appendLine(&ob, "one\n", .none));
    try t.expectEqual(@as(u64, 2), try appendLine(&ob, "two\n", .batch));
    try t.expectEqual(@as(u64, 3), try appendLine(&ob, "three\n", .now));
    try t.expectEqual(@as(u64, 4), ob.nextSeq());
    try t.expect(!ob.full());
    const st = ob.status();
    try t.expectEqual(@as(u64, 1), st.first);
    try t.expectEqual(@as(u64, 3), st.last);
    try t.expectEqual(@as(u64, 0), st.acked);
    try t.expectEqual(@as(u64, 20 + 20 + 22), st.bytes);

    var all: std.ArrayList(u8) = .empty;
    try readAll(&ob, 0, &all, a);
    try t.expectEqualStrings("one\ntwo\nthree\n", all.items);
    // From a seq: the records after it.
    var from2: std.ArrayList(u8) = .empty;
    try readAll(&ob, 2, &from2, a);
    try t.expectEqualStrings("three\n", from2.items);
    // A line larger than the read buffer goes in pieces.
    const big = try a.alloc(u8, read_bytes + 100);
    @memset(big, 'x');
    big[big.len - 1] = '\n';
    _ = try appendLine(&ob, big, .none);
    var big_out: std.ArrayList(u8) = .empty;
    try readAll(&ob, 3, &big_out, a);
    try t.expectEqualStrings(big, big_out.items);
}

test "outbox: a torn last record is cut on start" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var td = try TestDir.make(a);
    defer td.deinit();
    const t = std.testing;
    {
        var ob = try Outbox.init(a, .{ .dir = td.path, .shard = 0, .max_bytes = 1 << 20, .segment_bytes = 4096 });
        _ = try appendLine(&ob, "kept\n", .now);
        ob.deinit();
        // A crash in the middle of the next record.
        var pb: [path_bytes]u8 = undefined;
        const p = try ob.segPath(&pb, 1);
        const fd = std.c.open(p, .{ .ACCMODE = .WRONLY, .APPEND = true }, @as(std.c.mode_t, 0o600));
        try t.expect(fd >= 0);
        defer _ = std.c.close(fd);
        var junk: [7]u8 = @splat(7);
        try writeAll(fd, &junk);
    }
    var again = try Outbox.init(a, .{ .dir = td.path, .shard = 0, .max_bytes = 1 << 20, .segment_bytes = 4096 });
    defer again.deinit();
    // The seq continues after the last whole record, and the line reads back.
    try t.expectEqual(@as(u64, 2), again.nextSeq());
    var all: std.ArrayList(u8) = .empty;
    try readAll(&again, 0, &all, a);
    try t.expectEqualStrings("kept\n", all.items);
    try t.expectEqual(@as(u64, 5 + 16), again.status().bytes);
}

test "outbox: an ack deletes whole segments only" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var td = try TestDir.make(a);
    defer td.deinit();
    var ob = try Outbox.init(a, .{ .dir = td.path, .shard = 0, .max_bytes = 1 << 20, .segment_bytes = 48 });
    defer ob.deinit();
    const t = std.testing;
    // A record of "line\n" takes 16 + 5 bytes: two records fill a segment.
    var i: u32 = 0;
    while (i < 6) : (i += 1) _ = try appendLine(&ob, "line\n", .none);
    try t.expectEqual(@as(u32, 3), ob.nsegs);
    // The middle of the first segment: nothing goes.
    try ob.ack(1);
    try t.expectEqual(@as(u32, 3), ob.nsegs);
    // The last record of the first segment: that segment goes.
    try ob.ack(2);
    try t.expectEqual(@as(u32, 2), ob.nsegs);
    try t.expectEqual(@as(u64, 3), ob.segs[0].first_seq);
    // A second ack of the same seq changes nothing, and one beyond the last
    // written seq is refused.
    try ob.ack(2);
    try t.expectEqual(@as(u32, 2), ob.nsegs);
    try std.testing.expectError(error.AckBeyond, ob.ack(ob.nextSeq()));
    try t.expectEqual(@as(u64, 2), ob.ackedSeq());
    // The whole outbox can go; the seq still grows.
    try ob.ack(6);
    try t.expectEqual(@as(u32, 0), ob.nsegs);
    try t.expectEqual(@as(u64, 0), ob.status().bytes);
    try t.expectEqual(@as(u64, 7), try appendLine(&ob, "next\n", .now));
}

test "outbox: a restart keeps the seq and the unacked records" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    var td = try TestDir.make(a);
    defer td.deinit();
    const t = std.testing;
    {
        var ob = try Outbox.init(a, .{ .dir = td.path, .shard = 0, .max_bytes = 1 << 20, .segment_bytes = 512 });
        _ = try appendLine(&ob, "a\n", .now);
        _ = try appendLine(&ob, "b\n", .none);
        try ob.ack(1);
        ob.deinit();
    }
    var again = try Outbox.init(a, .{ .dir = td.path, .shard = 0, .max_bytes = 1 << 20, .segment_bytes = 512 });
    defer again.deinit();
    try t.expectEqual(@as(u64, 3), again.nextSeq());
    try t.expectEqual(@as(u64, 1), again.ackedSeq());
    // The client asks after the seq it handled: only the second record comes.
    var all: std.ArrayList(u8) = .empty;
    try readAll(&again, again.ackedSeq(), &all, a);
    try t.expectEqualStrings("b\n", all.items);
    // The records go on in the same segment.
    try t.expectEqual(@as(u64, 3), try appendLine(&again, "c\n", .now));
    try t.expectEqual(@as(u32, 1), again.nsegs);
}

test "outbox: a full outbox says so, and files and dirs keep their modes" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    // The dir does not exist yet: the outbox makes it 0700.
    var td = try TestDir.make(a);
    defer td.deinit();
    const sub = try std.fmt.allocPrintSentinel(a, "{s}/log", .{td.path}, 0);
    var ob = try Outbox.init(a, .{ .dir = sub, .shard = 3, .max_bytes = 100, .segment_bytes = 64 });
    defer ob.deinit();
    const t = std.testing;
    try t.expectEqual(@as(c_uint, 0o700), try modeOf(sub));
    _ = try appendLine(&ob, "one\n", .now);
    try t.expect(!ob.full());
    var pb: [path_bytes]u8 = undefined;
    try t.expectEqual(@as(c_uint, 0o600), try modeOf(try ob.segPath(&pb, 1)));
    try ob.ack(1);
    var ab: [path_bytes]u8 = undefined;
    try t.expectEqual(@as(c_uint, 0o600), try modeOf(try ob.ackPath(&ab)));
    // Two records reach the limit of 100 bytes.
    var i: u32 = 0;
    while (i < 6) : (i += 1) _ = try appendLine(&ob, "line\n", .none);
    try t.expect(ob.full());
}

/// The permission bits of a file or dir.
fn modeOf(path: []const u8) !c_uint {
    var b: [path_bytes]u8 = undefined;
    const z = dirPath(path, &b);
    return sys.fileMode(z);
}
