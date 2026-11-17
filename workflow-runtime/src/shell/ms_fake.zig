//! A scripted Microsoft SQL Server for tests, on a loopback socket. It
//! runs on the poller and in the thread of the test, as `pg_fake.zig`
//! does. It speaks TDS with the codec `core/tdswire.zig`: the PRELOGIN
//! answer, the TLS handshake inside PRELOGIN packets, LOGIN7 (it checks
//! the user and the password), the SQL batch after the login, the RPC
//! `sp_executesql` and ATTENTION.
//!
//! A rule gives the reply (a token stream) to one request. The server
//! builds the request of the rule with the codec and compares the bytes,
//! so a rule matches only the exact request that tedious sends. The
//! replies of the tests are the vectors that the codec is proven on
//! (`core/tdscase_tables.zig`). The server writes a log line for each
//! login, batch, request and ATTENTION.
const std = @import("std");
const tds = @import("core").tdswire;
const sys = @import("sys.zig");
const tls = @import("tls.zig");

pub const Act = enum(u8) { answer, hang, close };

pub const Rule = struct {
    sql: []const u8,
    params: []const tds.Param = &.{},
    /// The token stream of the reply.
    reply: []const u8 = "",
    act: Act = .answer,
};

const max_conns = 8;
const listener_idx: u32 = 0xFFFF;
const kind_attention: u8 = 0x06;
const cipher_bytes = 32 << 10;
/// The collation of the login reply: Latin1_General_CI_AS.
pub const collation = [_]u8{ 0x09, 0x04, 0xd0, 0x00, 0x34 };

/// VERSION and ENCRYPTION; the last byte is the encryption mode.
const prelogin_reply = "\x00\x00\x0b\x00\x06\x01\x00\x11\x00\x01\xff\x0f\x00\x07\xd0\x00\x00";
/// ENVCHANGE (database), INFO, ENVCHANGE (collation), LOGINACK, ENVCHANGE
/// (packet size 8000), FEATUREEXTACK and DONE, as MS-TDS section 4.2 shows.
const login_ok = "\xe3\x0b\x00\x01\x02m\x00a\x00\x02t\x00e\x00" ++
    "\xab\x14\x00\x45\x16\x00\x00\x02\x00\x02\x00h\x00i\x00\x01s\x00\x00\x01\x00\x00\x00" ++
    "\xe3\x08\x00\x07\x05\x09\x04\xd0\x00\x34\x00" ++
    "\xad\x10\x00\x01\x74\x00\x00\x04\x03S\x00Q\x00L\x00\x0f\x00\x07\xd0" ++
    "\xe3\x13\x00\x04\x048\x000\x000\x000\x00\x044\x000\x009\x006\x00" ++
    "\xae\x0a\x01\x00\x00\x00\x01\xff" ++
    "\xfd\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
/// ERROR 18456 with the message "no", then DONE with the error flag.
const login_refused = "\xaa\x14\x00\x18\x48\x00\x00\x01\x0e\x02\x00n\x00o\x00\x01s\x00\x00\x01\x00\x00\x00" ++
    "\xfd\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
/// ENVCHANGE (routing): the server sends the client to another server.
const routing = "\xe3\x03\x00\x14\x00\x00";
pub const done = "\xfd\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
const done_attention = "\xfd\x20\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";

const Phase = enum(u8) { free, prelogin, tls, login, ready };

const Conn = struct {
    fd: c_int = -1,
    phase: Phase = .free,
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    /// The message that arrives, without packet headers.
    msg: []u8 = &.{},
    mlen: usize = 0,
    /// The status byte of the first packet of the message.
    status: u8 = 0,
    out: []u8 = &.{},
    session: ?tls.Session = null,
    bio: tls.BioBuf = .{},
    /// The whole stream is TLS.
    raw: bool = false,
    packet: u32 = tds.packet_size,
};

pub const Server = struct {
    poller: *sys.Poller,
    kind: u8,
    lfd: c_int = -1,
    port: u16 = 0,
    user: []const u8 = "sa",
    password: []const u8 = "",
    /// The ENCRYPTION option of the PRELOGIN answer.
    encryption: u8 = tds.encryption.not_supported,
    /// The login reply sends the client to another server.
    routed: bool = false,
    /// The reply to a batch with the reset flag is an error.
    no_reset: bool = false,
    ctx: ?tls.Context = null,
    /// Gives the BIO type of the sessions.
    bio_ctx: ?tls.Context = null,
    rules: []const Rule = &.{},
    conns: [max_conns]Conn = @splat(.{}),
    scratch: []u8 = &.{},
    log: []u8 = &.{},
    log_len: usize = 0,
    logins: u32 = 0,
    /// The fake could not do what the script says, or a request has no rule.
    failed: bool = false,

    /// Listen on a free loopback port and watch it with `poller`. Events
    /// whose token has `kind` in the top byte go to `onReady`.
    pub fn init(s: *Server, gpa: std.mem.Allocator, poller: *sys.Poller, kind: u8) !void {
        s.* = .{ .poller = poller, .kind = kind, .log = try gpa.alloc(u8, 16 << 10), .scratch = try gpa.alloc(u8, 64 << 10) };
        for (&s.conns) |*cn| {
            cn.rbuf = try gpa.alloc(u8, 96 << 10);
            cn.msg = try gpa.alloc(u8, 64 << 10);
            cn.out = try gpa.alloc(u8, 256 << 10);
            cn.bio = .{ .in = try gpa.alloc(u8, cipher_bytes), .out = try gpa.alloc(u8, cipher_bytes) };
        }
        // A base that depends on the process, apart from the other test servers.
        const base: u16 = 49000 + (std.math.cast(u16, sys.processId() % 2000) orelse 0);
        for (0..3000) |i| {
            const p = base + (std.math.cast(u16, i) orelse 0);
            // Another process has this port: the next one is tried.
            s.lfd = sys.listenTcp(.{ 127, 0, 0, 1 }, p, false) catch continue;
            s.port = p;
            break;
        }
        if (s.lfd < 0) return error.NoPort;
        try poller.addRead(s.lfd, sys.makeToken(kind, 0, listener_idx));
    }

    /// The server asks for encryption, with this certificate.
    pub fn useTls(s: *Server, cert: [*:0]const u8, key: [*:0]const u8) tls.Error!void {
        s.ctx = try tls.Context.server(cert, key);
        s.bio_ctx = try tls.Context.client(true, null);
        s.encryption = tds.encryption.on;
    }

    pub fn deinit(s: *Server) void {
        for (&s.conns, 0..) |*cn, i| {
            if (cn.fd >= 0) s.closeConn(std.math.cast(u32, i) orelse 0);
        }
        if (s.lfd >= 0) {
            s.poller.remove(s.lfd);
            sys.close(s.lfd);
        }
        s.lfd = -1;
        if (s.ctx) |*c| c.deinit();
        if (s.bio_ctx) |*c| c.deinit();
    }

    /// The lines of the log, each with a newline.
    pub fn logText(s: *const Server) []const u8 {
        return s.log[0..s.log_len];
    }

    /// How many lines of the log are `line`.
    pub fn count(s: *const Server, line: []const u8) u32 {
        var n: u32 = 0;
        var it = std.mem.splitScalar(u8, s.logText(), '\n');
        // Each line takes at least one byte of the log.
        for (0..s.log_len + 1) |_| {
            const l = it.next() orelse break;
            if (std.mem.eql(u8, l, line)) n += 1;
        }
        return n;
    }

    pub fn clearLog(s: *Server) void {
        s.log_len = 0;
    }

    /// The open sessions (connections after the login).
    pub fn sessions(s: *const Server) u32 {
        var n: u32 = 0;
        for (&s.conns) |*cn| {
            if (cn.phase == .ready) n += 1;
        }
        return n;
    }

    fn note(s: *Server, what: []const u8, detail: []const u8) void {
        const parts = [_][]const u8{ what, if (detail.len > 0) " " else "", detail, "\n" };
        for (parts) |p| {
            if (p.len > s.log.len - s.log_len) {
                s.failed = true;
                return;
            }
            @memcpy(s.log[s.log_len..][0..p.len], p);
            s.log_len += p.len;
        }
    }

    /// A readiness event of the listener or of a connection.
    pub fn onReady(s: *Server, ev: sys.Ready) void {
        const idx: u32 = @truncate(ev.token);
        if (idx == listener_idx) return s.acceptAll();
        if (idx >= s.conns.len or s.conns[idx].fd < 0) return;
        s.readConn(idx);
    }

    fn acceptAll(s: *Server) void {
        for (0..max_conns) |_| {
            const fd = sys.acceptOne(s.lfd) orelse return;
            const slot = s.freeSlot() orelse {
                s.failed = true;
                return sys.close(fd);
            };
            const cn = &s.conns[slot];
            const keep: Conn = .{ .fd = fd, .phase = .prelogin, .rbuf = cn.rbuf, .msg = cn.msg, .out = cn.out, .bio = .{ .in = cn.bio.in, .out = cn.bio.out } };
            cn.* = keep;
            s.poller.addRead(fd, sys.makeToken(s.kind, 0, slot)) catch {
                s.failed = true;
            };
        }
    }

    fn freeSlot(s: *const Server) ?u32 {
        for (&s.conns, 0..) |*cn, i| {
            if (cn.fd < 0) return std.math.cast(u32, i);
        }
        return null;
    }

    fn closeConn(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        std.debug.assert(cn.fd >= 0);
        if (cn.session) |session| session.deinit();
        cn.session = null;
        s.poller.remove(cn.fd);
        sys.close(cn.fd);
        cn.fd = -1;
        cn.phase = .free;
    }

    fn readConn(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        // Each pass takes bytes or ends: the buffer bounds the loop.
        for (0..cn.rbuf.len) |_| {
            if (cn.fd < 0) return;
            if (cn.rlen == cn.rbuf.len) {
                s.failed = true;
                return s.closeConn(i);
            }
            if (cn.raw) {
                if (!s.readSecure(i)) return;
                continue;
            }
            switch (sys.readSome(cn.fd, cn.rbuf[cn.rlen..])) {
                .n => |n| {
                    cn.rlen += n;
                    s.consume(i);
                },
                .again => return,
                .closed => return s.closeConn(i),
            }
        }
    }

    /// Read TLS records from the socket, and the bytes that they hold.
    /// False when nothing more is there.
    fn readSecure(s: *Server, i: u32) bool {
        const cn = &s.conns[i];
        const session = cn.session orelse return false;
        var got = false;
        const room = cn.bio.inRoom();
        if (room.len > 0) switch (sys.readSome(cn.fd, room)) {
            .n => |n| {
                cn.bio.in_end += n;
                got = true;
            },
            .again => {},
            .closed => cn.bio.eof = true,
        };
        switch (session.read(cn.rbuf[cn.rlen..])) {
            .n => |n| {
                cn.rlen += n;
                s.consume(i);
                return true;
            },
            .want_read, .want_write => return got,
            .closed, .failed => {
                s.closeConn(i);
                return false;
            },
        }
    }

    /// Handle every whole packet of the read buffer.
    fn consume(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        var off: usize = 0;
        // Each packet has eight bytes or more.
        for (0..cn.rbuf.len / tds.header_len + 1) |_| {
            if (cn.fd < 0) return;
            // A packet that is not valid ends the loop: the test then gets no answer.
            const p = (tds.next(cn.rbuf[off..cn.rlen]) catch null) orelse break;
            off += p.size;
            if (cn.mlen == 0) cn.status = cn.rbuf[off - p.size + 1];
            if (p.body.len > cn.msg.len - cn.mlen) {
                s.failed = true;
                return s.closeConn(i);
            }
            @memcpy(cn.msg[cn.mlen..][0..p.body.len], p.body);
            cn.mlen += p.body.len;
            // The records of a handshake need no whole message.
            if (!p.last and cn.phase != .tls) continue;
            const was_raw = cn.raw;
            s.onMessage(i, p.kind);
            cn.mlen = 0;
            // The bytes after the handshake are TLS records, not packets.
            if (cn.raw and !was_raw) break;
        }
        if (cn.fd < 0) return;
        std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - off], cn.rbuf[off..cn.rlen]);
        cn.rlen -= off;
        if (cn.rlen > 0 and cn.raw and cn.bio.inPending() == 0 and cn.phase == .login and off > 0 and !s.failed) {
            // Records that came with the last packet of the handshake.
            const room = cn.bio.inRoom();
            if (cn.rlen <= room.len and cn.session != null) {
                @memcpy(room[0..cn.rlen], cn.rbuf[0..cn.rlen]);
                cn.bio.in_end += cn.rlen;
                cn.rlen = 0;
            }
        }
    }

    /// Send all of `bytes` on the socket.
    fn writeAll(s: *Server, i: u32, bytes: []const u8) void {
        const cn = &s.conns[i];
        var sent: usize = 0;
        // Each pass writes bytes or ends.
        for (0..bytes.len + 1) |_| {
            if (sent >= bytes.len) break;
            switch (sys.writeSome(cn.fd, bytes[sent..])) {
                .n => |n| sent += n,
                // The answers of a test fit the socket buffer; more is a fault of the script.
                .again => {
                    s.failed = true;
                    break;
                },
                .closed => return s.closeConn(i),
            }
        }
    }

    /// Send one message, through TLS when the stream has it.
    fn send(s: *Server, i: u32, message_kind: u8, payload: []const u8) void {
        const cn = &s.conns[i];
        var o: tds.Out = .{ .buf = cn.out };
        tds.frame(&o, message_kind, payload, cn.packet) catch {
            s.failed = true;
            return;
        };
        if (!cn.raw) return s.writeAll(i, cn.out[0..o.len]);
        const session = cn.session orelse return;
        var sent: usize = 0;
        // Each pass writes bytes or ends.
        for (0..o.len + 1) |_| {
            if (sent >= o.len or cn.fd < 0) break;
            switch (session.write(cn.out[sent..o.len])) {
                .n => |n| sent += n,
                .want_read, .want_write => {},
                .closed, .failed => return s.closeConn(i),
            }
            const records = cn.bio.outPending();
            s.writeAll(i, records);
            cn.bio.outSent(records.len);
        }
    }

    fn onMessage(s: *Server, i: u32, message_kind: u8) void {
        const cn = &s.conns[i];
        const msg = cn.msg[0..cn.mlen];
        switch (cn.phase) {
            .prelogin => s.onPrelogin(i),
            .tls => s.onRecords(i, msg),
            .login => s.onLogin(i, msg),
            .ready => switch (message_kind) {
                tds.kind.sql_batch => s.onBatch(i, msg),
                tds.kind.rpc => s.onRpc(i, msg),
                kind_attention => {
                    s.note("attention", "");
                    s.send(i, tds.kind.reply, done_attention);
                },
                else => s.failed = true,
            },
            .free => {},
        }
    }

    fn onPrelogin(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        s.note("prelogin", "");
        const wanted = s.encryption == tds.encryption.on or s.encryption == tds.encryption.required;
        var reply: [prelogin_reply.len + 1]u8 = @splat(0);
        @memcpy(reply[0..prelogin_reply.len], prelogin_reply);
        reply[prelogin_reply.len] = s.encryption;
        const ctx = s.ctx orelse {
            cn.phase = .login;
            return s.send(i, tds.kind.reply, &reply);
        };
        cn.phase = if (wanted) .tls else .login;
        // Without a session the next line records the failure.
        if (wanted) cn.session = tls.Session.acceptBio(ctx, s.bio_ctx orelse ctx, &cn.bio) catch null;
        if (wanted and cn.session == null) s.failed = true;
        s.send(i, tds.kind.reply, &reply);
    }

    /// TLS records of the client, inside a PRELOGIN packet.
    fn onRecords(s: *Server, i: u32, body: []const u8) void {
        const cn = &s.conns[i];
        const session = cn.session orelse return;
        const room = cn.bio.inRoom();
        if (body.len > room.len) {
            s.failed = true;
            return;
        }
        @memcpy(room[0..body.len], body);
        cn.bio.in_end += body.len;
        const step = session.handshake();
        const records = cn.bio.outPending();
        if (records.len > 0) {
            s.send(i, tds.kind.prelogin, records);
            if (cn.fd < 0) return;
            cn.bio.outSent(records.len);
        }
        switch (step) {
            .n => {
                s.note("tls", "");
                cn.raw = true;
                cn.phase = .login;
            },
            .want_read, .want_write => {},
            .closed, .failed => s.closeConn(i),
        }
    }

    /// The text at entry `index` of the offset table of LOGIN7, as ASCII.
    fn loginText(msg: []const u8, index: usize, buf: []u8) ?[]const u8 {
        const at = 36 + index * 4;
        if (msg.len < at + 4) return null;
        const start: usize = std.mem.readInt(u16, msg[at..][0..2], .little);
        const units: usize = std.mem.readInt(u16, msg[at + 2 ..][0..2], .little);
        if (units > buf.len or msg.len < start + units * 2) return null;
        for (buf[0..units], 0..) |*b, k| {
            var low = msg[start + k * 2];
            var high = msg[start + k * 2 + 1];
            if (index == 2) {
                // The password: XOR 0xA5, then the halves of each byte swapped.
                low ^= 0xA5;
                high ^= 0xA5;
                low = low << 4 | low >> 4;
                high = high << 4 | high >> 4;
            }
            if (high != 0) return null;
            b.* = low;
        }
        return buf[0..units];
    }

    fn onLogin(s: *Server, i: u32, msg: []const u8) void {
        const cn = &s.conns[i];
        var ub: [128]u8 = @splat(0);
        var pb: [128]u8 = @splat(0);
        const user = loginText(msg, 1, &ub) orelse "";
        const password = loginText(msg, 2, &pb) orelse "\xff";
        s.note("login", user);
        if (!std.mem.eql(u8, user, s.user) or !std.mem.eql(u8, password, s.password)) {
            return s.send(i, tds.kind.reply, login_refused);
        }
        s.logins += 1;
        cn.phase = .ready;
        s.send(i, tds.kind.reply, if (s.routed) routing ++ login_ok else login_ok);
        cn.packet = 8000;
    }

    fn onBatch(s: *Server, i: u32, msg: []const u8) void {
        const cn = &s.conns[i];
        var o: tds.Out = .{ .buf = s.scratch };
        // The text fits the buffer.
        tds.sqlBatch(&o, tds.initial_sql) catch return;
        const reset = cn.status & 0x08 != 0;
        if (reset) s.note("reset", "");
        s.note("batch", if (std.mem.eql(u8, msg, s.scratch[0..o.len])) "initial" else "other");
        if (reset and s.no_reset) return s.send(i, tds.kind.reply, login_refused);
        s.send(i, tds.kind.reply, done);
    }

    fn onRpc(s: *Server, i: u32, msg: []const u8) void {
        for (s.rules) |rule| {
            var o: tds.Out = .{ .buf = s.scratch };
            // A rule that the codec cannot build matches nothing.
            tds.executeSql(&o, rule.sql, rule.params, collation) catch continue;
            if (!std.mem.eql(u8, msg, s.scratch[0..o.len])) continue;
            s.note("rpc", rule.sql);
            switch (rule.act) {
                .answer => s.send(i, tds.kind.reply, rule.reply),
                .hang => {},
                .close => s.closeConn(i),
            }
            return;
        }
        s.note("rpc", "?");
        s.failed = true;
        s.send(i, tds.kind.reply, login_refused);
    }
};
