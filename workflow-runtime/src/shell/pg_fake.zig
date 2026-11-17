//! A scripted PostgreSQL backend for the tests of the `sql` effect that run
//! without a database. It listens on a loopback port and runs on the poller
//! and in the thread of the test: no thread and no sleep, so a test is one
//! exact order of events.
//!
//! The script is a list of rules. A rule gives, for one statement text, the
//! columns, the rows and the command tag, or an error at Parse or at
//! Execute, or says that the server gives no answer or closes. The server
//! keeps the transaction state of a session as PostgreSQL does, and writes
//! a line into `log` for each login, Parse, Bind, Execute, text of the
//! simple protocol (BEGIN, COMMIT, ROLLBACK, a simple statement) and cancel
//! request, so a test can say what the client sent. A simple text is split
//! at each `;`, and each part is the text of a rule.
const std = @import("std");
const pgwire = @import("core").pgwire;
const sys = @import("sys.zig");

const Sha256 = std.crypto.hash.sha2.Sha256;
const Hmac = std.crypto.auth.hmac.sha2.HmacSha256;

pub const Auth = enum(u8) { trust, clear, md5, scram };
pub const Col = struct { name: []const u8, oid: u32 };
pub const Fail = struct { code: []const u8, message: []const u8 };
pub const Row = []const ?[]const u8;
pub const Act = enum(u8) { answer, hang, close };

pub const Rule = struct {
    text: []const u8,
    cols: []const Col = &.{},
    rows: []const Row = &.{},
    /// The rows go out this many times.
    repeat: u32 = 1,
    tag: []const u8 = "SELECT 0",
    parse_fail: ?Fail = null,
    run_fail: ?Fail = null,
    /// The parameters that the server reports; null: those that the client declared.
    params: ?u16 = null,
    /// What Execute does.
    act: Act = .answer,
    /// The commit of the statement fails (a deferred constraint): at COMMIT,
    /// or at Sync when the statement runs outside a transaction block.
    commit_fail: ?Fail = null,
    /// The command cannot run in a transaction block (`VACUUM`). Only for a simple text.
    no_block: bool = false,
};

const max_conns = 8;
const stmt_slots = 32;
const listener_idx: u32 = 0xFFFF;
const scram_salt = "c2FsdHNhbHRzYWx0c2FsdA==";
const scram_rounds = 4096;
const md5_salt: [4]u8 = .{ 9, 8, 7, 6 };

const Phase = enum(u8) { free, startup, password, sasl_first, sasl_final, ready, hung };
const Tx = enum(u8) { idle, open, failed };
const Prepared = struct { rule: ?u16 = null, params: u16 = 0 };

/// The bytes that wait for the client. A message that does not fit sets `full`.
const Buf = struct {
    data: []u8,
    len: usize = 0,
    at: usize = 0,
    full: bool = false,

    fn bytes(b: *Buf, s: []const u8) void {
        if (s.len > b.data.len - b.len) {
            b.full = true;
            return;
        }
        @memcpy(b.data[b.len..][0..s.len], s);
        b.len += s.len;
    }

    fn byte(b: *Buf, c: u8) void {
        b.bytes(&.{c});
    }

    fn cstr(b: *Buf, s: []const u8) void {
        b.bytes(s);
        b.byte(0);
    }

    fn int16(b: *Buf, v: u16) void {
        var x: [2]u8 = @splat(0);
        std.mem.writeInt(u16, &x, v, .big);
        b.bytes(&x);
    }

    fn int32(b: *Buf, v: u32) void {
        var x: [4]u8 = @splat(0);
        std.mem.writeInt(u32, &x, v, .big);
        b.bytes(&x);
    }

    fn open(b: *Buf, tag: u8) void {
        b.byte(tag);
        b.at = b.len;
        b.int32(0);
    }

    fn close(b: *Buf) void {
        if (b.full) return;
        std.debug.assert(b.len >= b.at + 4);
        std.mem.writeInt(u32, b.data[b.at..][0..4], std.math.cast(u32, b.len - b.at) orelse 0, .big);
    }
};

const Conn = struct {
    fd: c_int = -1,
    phase: Phase = .free,
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    out: Buf = .{ .data = &.{} },
    tx: Tx = .idle,
    /// An error in the extended protocol: messages are dropped until Sync.
    skip: bool = false,
    stmts: [stmt_slots]Prepared = @splat(.{}),
    portal: ?u16 = null,
    /// A statement of the open transaction has `commit_fail`.
    commit_fail: ?Fail = null,
    user: [64]u8 = @splat(0),
    user_len: usize = 0,
    /// The SCRAM messages that the signatures cover.
    first_bare: [96]u8 = @splat(0),
    first_bare_len: usize = 0,
    server_first: [160]u8 = @splat(0),
    server_first_len: usize = 0,
};

pub const Server = struct {
    poller: *sys.Poller,
    kind: u8,
    lfd: c_int = -1,
    port: u16 = 0,
    auth: Auth = .trust,
    password: []const u8 = "",
    datestyle: []const u8 = "ISO, MDY",
    intervalstyle: []const u8 = "postgres",
    rules: []const Rule = &.{},
    conns: [max_conns]Conn = @splat(.{}),
    log: []u8 = &.{},
    log_len: usize = 0,
    logins: u32 = 0,
    cancels: u32 = 0,
    cancel_pid: u32 = 0,
    cancel_key: u32 = 0,
    /// The fake could not do what the script says (a buffer is full).
    failed: bool = false,

    pub const secret_key: u32 = 0x5eed;

    /// Listen on a free loopback port and watch it with `poller`. Events
    /// whose token has `kind` in the top byte go to `onReady`.
    pub fn init(s: *Server, gpa: std.mem.Allocator, poller: *sys.Poller, kind: u8) !void {
        s.* = .{ .poller = poller, .kind = kind, .log = try gpa.alloc(u8, 16 << 10) };
        for (&s.conns) |*cn| {
            cn.rbuf = try gpa.alloc(u8, 64 << 10);
            cn.out.data = try gpa.alloc(u8, 256 << 10);
        }
        // A base that depends on the process, apart from the other test servers.
        const base: u16 = 42000 + std.math.cast(u16, sys.processId() % 2000).?;
        for (0..3000) |i| {
            const p = base + std.math.cast(u16, i).?;
            // Another process has this port: the next one is tried.
            s.lfd = sys.listenTcp(.{ 127, 0, 0, 1 }, p, false) catch continue;
            s.port = p;
            break;
        }
        if (s.lfd < 0) return error.NoPort;
        try poller.addRead(s.lfd, sys.makeToken(kind, 0, listener_idx));
    }

    pub fn deinit(s: *Server) void {
        for (&s.conns, 0..) |*cn, i| {
            if (cn.fd >= 0) s.closeConn(std.math.cast(u32, i).?);
        }
        if (s.lfd >= 0) {
            s.poller.remove(s.lfd);
            sys.close(s.lfd);
        }
        s.lfd = -1;
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
            if (cn.phase == .ready or cn.phase == .hung) n += 1;
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
            const keep: Conn = .{ .fd = fd, .phase = .startup, .rbuf = cn.rbuf, .out = .{ .data = cn.out.data } };
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

    /// Handle every whole message of the read buffer, then send the answers.
    fn consume(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        var off: usize = 0;
        // Each message has four bytes or more.
        for (0..cn.rbuf.len / 4 + 1) |_| {
            if (cn.fd < 0) return;
            // A session without an answer reads nothing more.
            if (cn.phase == .hung) off = cn.rlen;
            const size = s.one(i, cn.rbuf[off..cn.rlen]) orelse break;
            off += size;
        }
        if (cn.fd < 0) return;
        std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - off], cn.rbuf[off..cn.rlen]);
        cn.rlen -= off;
        s.flush(i);
    }

    /// Handle the message at the start of `buf`: its size, or null when
    /// the buffer holds only a part of it.
    fn one(s: *Server, i: u32, buf: []const u8) ?usize {
        const cn = &s.conns[i];
        if (cn.phase == .startup) {
            if (buf.len < 8) return null;
            const len: usize = std.mem.readInt(u32, buf[0..4], .big);
            if (len < 8 or len > cn.rbuf.len) return s.broken(i);
            if (buf.len < len) return null;
            s.onStartup(i, buf[4..len]);
            return len;
        }
        const m = pgwire.next(buf, cn.rbuf.len) catch return s.broken(i);
        const msg = m orelse return null;
        s.onMessage(i, msg) catch return s.broken(i);
        return msg.size;
    }

    /// The client sent bytes that the fake cannot read: the test fails.
    fn broken(s: *Server, i: u32) ?usize {
        s.failed = true;
        s.closeConn(i);
        return null;
    }

    fn flush(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        if (cn.out.full) s.failed = true;
        var sent: usize = 0;
        // Each pass writes bytes or ends.
        for (0..cn.out.len + 1) |_| {
            if (sent >= cn.out.len) break;
            switch (sys.writeSome(cn.fd, cn.out.data[sent..cn.out.len])) {
                .n => |n| sent += n,
                // The answers of a test fit the socket buffer; more is a fault of the script.
                .again => {
                    s.failed = true;
                    break;
                },
                .closed => return s.closeConn(i),
            }
        }
        cn.out.len = 0;
    }

    // ---- startup and login ------------------------------------------------------

    fn onStartup(s: *Server, i: u32, body: []const u8) void {
        const cn = &s.conns[i];
        const code = std.mem.readInt(u32, body[0..4], .big);
        switch (code) {
            // SSLRequest: the fake has no TLS.
            80877103 => cn.out.byte('N'),
            80877102 => s.onCancel(i, body[4..]),
            196608 => s.onLogin(i, body[4..]),
            // Another protocol: the test fails.
            else => _ = s.broken(i),
        }
    }

    fn onCancel(s: *Server, i: u32, body: []const u8) void {
        if (body.len == 8) {
            s.cancels += 1;
            s.cancel_pid = std.mem.readInt(u32, body[0..4], .big);
            s.cancel_key = std.mem.readInt(u32, body[4..8], .big);
            s.note("cancel", "");
        }
        s.closeConn(i);
    }

    fn onLogin(s: *Server, i: u32, params: []const u8) void {
        const cn = &s.conns[i];
        var it = std.mem.splitScalar(u8, params, 0);
        // Each name and value takes at least one byte.
        for (0..params.len + 1) |_| {
            const name = it.next() orelse break;
            const value = it.next() orelse break;
            if (!std.mem.eql(u8, name, "user") or value.len > cn.user.len) continue;
            @memcpy(cn.user[0..value.len], value);
            cn.user_len = value.len;
        }
        if (s.auth == .trust) return s.welcome(i);
        const out = &cn.out;
        out.open('R');
        switch (s.auth) {
            .trust, .clear => out.int32(3),
            .md5 => {
                out.int32(5);
                out.bytes(&md5_salt);
            },
            .scram => {
                out.int32(10);
                out.cstr(pgwire.Scram.mechanism);
                out.byte(0);
            },
        }
        out.close();
        cn.phase = if (s.auth == .scram) .sasl_first else .password;
    }

    /// AuthenticationOk, the parameters, the key of the session and ReadyForQuery.
    fn welcome(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        const out = &cn.out;
        out.open('R');
        out.int32(0);
        out.close();
        const params = [_][2][]const u8{ .{ "server_version", "17.0" }, .{ "DateStyle", s.datestyle }, .{ "IntervalStyle", s.intervalstyle } };
        for (params) |p| {
            out.open('S');
            out.cstr(p[0]);
            out.cstr(p[1]);
            out.close();
        }
        out.open('K');
        out.int32(1000 + i);
        out.int32(secret_key);
        out.close();
        cn.phase = .ready;
        s.logins += 1;
        s.note("login", cn.user[0..cn.user_len]);
        sendReady(cn);
    }

    fn refuseLogin(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        sendError(&cn.out, "FATAL", .{ .code = "28P01", .message = "password authentication failed for user \"fake\"" });
        s.note("refused", cn.user[0..cn.user_len]);
        s.flush(i);
        if (cn.fd >= 0) s.closeConn(i);
    }

    fn onPassword(s: *Server, i: u32, body: []const u8) pgwire.Error!void {
        const cn = &s.conns[i];
        var rd: pgwire.Reader = .{ .s = body };
        switch (cn.phase) {
            .password => {
                const given = try rd.cstr();
                var want: [35]u8 = @splat(0);
                pgwire.md5Password(cn.user[0..cn.user_len], s.password, md5_salt, &want);
                const ok = std.mem.eql(u8, given, if (s.auth == .md5) &want else s.password);
                if (ok) s.welcome(i) else s.refuseLogin(i);
            },
            .sasl_first => {
                if (!std.mem.eql(u8, try rd.cstr(), pgwire.Scram.mechanism)) return error.Malformed;
                const len = try rd.int32();
                try s.saslFirst(cn, try rd.take(len));
            },
            .sasl_final => s.saslFinal(i, body),
            .free, .startup, .ready, .hung => return error.Malformed,
        }
    }

    /// The client-first message: answer with the nonce, the salt and the rounds.
    fn saslFirst(s: *const Server, cn: *Conn, first: []const u8) pgwire.Error!void {
        std.debug.assert(s.auth == .scram);
        if (!std.mem.startsWith(u8, first, "n,,") or first.len - 3 > cn.first_bare.len) return error.Malformed;
        const bare = first[3..];
        const at = std.mem.indexOf(u8, bare, "r=") orelse return error.Malformed;
        @memcpy(cn.first_bare[0..bare.len], bare);
        cn.first_bare_len = bare.len;
        var b: Buf = .{ .data = &cn.server_first };
        b.bytes("r=");
        b.bytes(bare[at + 2 ..]);
        b.bytes("fakeservernonce,s=" ++ scram_salt ++ ",i=4096");
        if (b.full) return error.NoSpace;
        cn.server_first_len = b.len;
        cn.out.open('R');
        cn.out.int32(11);
        cn.out.bytes(cn.server_first[0..b.len]);
        cn.out.close();
        cn.phase = .sasl_final;
    }

    /// The client-final message: check the proof with the password of the
    /// script, then show the signature of the server.
    fn saslFinal(s: *Server, i: u32, final: []const u8) void {
        const cn = &s.conns[i];
        const at = std.mem.indexOf(u8, final, ",p=") orelse return s.refuseLogin(i);
        var salt: [16]u8 = @splat(0);
        // The salt of the script is valid base64.
        std.base64.standard.Decoder.decode(&salt, scram_salt) catch return s.refuseLogin(i);
        var salted: [32]u8 = @splat(0);
        // The output has the size of one block of the function.
        std.crypto.pwhash.pbkdf2(&salted, s.password, &salt, scram_rounds, Hmac) catch return s.refuseLogin(i);
        const sigs = signatures(cn, salted, final[0..at]);
        var proof: [44]u8 = @splat(0);
        const want = std.base64.standard.Encoder.encode(&proof, &sigs.proof);
        if (!std.mem.eql(u8, want, final[at + 3 ..])) return s.refuseLogin(i);
        var sig: [44]u8 = @splat(0);
        cn.out.open('R');
        cn.out.int32(12);
        cn.out.bytes("v=");
        cn.out.bytes(std.base64.standard.Encoder.encode(&sig, &sigs.server));
        cn.out.close();
        s.welcome(i);
    }

    const Signatures = struct { proof: [32]u8, server: [32]u8 };

    /// The proof that the client must send and the signature of the server (RFC 5802).
    fn signatures(cn: *const Conn, salted: [32]u8, final_bare: []const u8) Signatures {
        std.debug.assert(cn.first_bare_len > 0 and cn.server_first_len > 0);
        var client_key: [32]u8 = @splat(0);
        Hmac.create(&client_key, "Client Key", &salted);
        var stored: [32]u8 = @splat(0);
        Sha256.hash(&client_key, &stored, .{});
        var server_key: [32]u8 = @splat(0);
        Hmac.create(&server_key, "Server Key", &salted);
        var out: Signatures = .{ .proof = @splat(0), .server = @splat(0) };
        var client_sig: [32]u8 = @splat(0);
        for ([_]struct { key: *const [32]u8, out: *[32]u8 }{ .{ .key = &stored, .out = &client_sig }, .{ .key = &server_key, .out = &out.server } }) |m| {
            var h = Hmac.init(m.key);
            h.update(cn.first_bare[0..cn.first_bare_len]);
            h.update(",");
            h.update(cn.server_first[0..cn.server_first_len]);
            h.update(",");
            h.update(final_bare);
            h.final(m.out);
        }
        for (&out.proof, client_key, client_sig) |*p, k, g| p.* = k ^ g;
        return out;
    }

    // ---- statements -------------------------------------------------------------

    fn onMessage(s: *Server, i: u32, m: pgwire.Msg) pgwire.Error!void {
        const cn = &s.conns[i];
        if (cn.phase != .ready) {
            if (m.tag != 'p') return error.Malformed;
            return s.onPassword(i, m.body);
        }
        switch (m.tag) {
            'S' => {
                cn.skip = false;
                // Outside a transaction block, Sync commits the statement.
                if (cn.tx == .idle) commitNow(cn);
                return sendReady(cn);
            },
            'Q' => return s.onQuery(i, m.body),
            // CopyFail: the fake has no COPY.
            'f' => return,
            'X' => return s.closeConn(i),
            // The messages of the extended protocol follow.
            else => {},
        }
        if (cn.skip) return;
        // A failed transaction takes no statement, as PostgreSQL does.
        if (cn.tx == .failed) return fail(cn, .{ .code = "25P02", .message = "current transaction is aborted, commands ignored until end of transaction block" });
        switch (m.tag) {
            'P' => try s.onParse(cn, m.body),
            'D' => try s.onDescribe(cn, m.body),
            'B' => try s.onBind(cn, m.body),
            'E' => s.onExecute(i),
            'C' => {
                cn.out.open('3');
                cn.out.close();
                s.note("close-statement", "");
            },
            // A message that the client of the runtime never sends.
            else => return error.Malformed,
        }
    }

    fn fail(cn: *Conn, f: Fail) void {
        sendError(&cn.out, "ERROR", f);
        cn.skip = true;
        if (cn.tx == .open) cn.tx = .failed;
    }

    /// A text of the simple protocol: each command (the text between `;`)
    /// is BEGIN, COMMIT, ROLLBACK or the text of a rule. A command that
    /// fails ends the text. The log gets the whole text.
    fn onQuery(s: *Server, i: u32, body: []const u8) pgwire.Error!void {
        const cn = &s.conns[i];
        var rd: pgwire.Reader = .{ .s = body };
        const text = try rd.cstr();
        s.note(text, "");
        var it = std.mem.tokenizeScalar(u8, text, ';');
        var commands: u32 = 0;
        // Each command takes one byte or more of the text.
        for (0..text.len + 1) |_| {
            const cmd = std.mem.trim(u8, it.next() orelse break, " \n");
            if (cmd.len == 0) continue;
            commands += 1;
            const good = try s.oneCommand(i, cmd);
            if (cn.fd < 0 or cn.phase == .hung) return;
            if (!good) break;
        }
        if (commands == 0) {
            cn.out.open('I');
            cn.out.close();
        }
        // Outside a transaction block, the end of the text commits it.
        if (cn.tx == .idle) commitNow(cn);
        sendReady(cn);
    }

    /// One command of a simple text. False: it failed or gave no answer,
    /// and the rest of the text is dropped.
    fn oneCommand(s: *Server, i: u32, cmd: []const u8) pgwire.Error!bool {
        const cn = &s.conns[i];
        if (std.mem.eql(u8, cmd, "BEGIN") or std.mem.eql(u8, cmd, "COMMIT") or std.mem.eql(u8, cmd, "ROLLBACK")) return txCommand(cn, cmd);
        if (cn.tx == .failed) return simpleFail(cn, .{ .code = "25P02", .message = "current transaction is aborted, commands ignored until end of transaction block" });
        const ri = s.ruleFor(cmd) orelse return simpleFail(cn, .{ .code = "42601", .message = "the script has no rule for this text" });
        const rule = s.rules[ri];
        if (rule.parse_fail orelse rule.run_fail) |f| return simpleFail(cn, f);
        if (rule.no_block and cn.tx != .idle) return simpleFail(cn, .{ .code = "25001", .message = "VACUUM cannot run inside a transaction block" });
        switch (rule.act) {
            .answer => {},
            .hang => {
                cn.phase = .hung;
                return false;
            },
            .close => {
                s.closeConn(i);
                return false;
            },
        }
        if (rule.cols.len > 0) try sendCols(&cn.out, rule.cols);
        for (0..rule.repeat) |_| {
            for (rule.rows) |row| sendRow(&cn.out, row);
        }
        if (rule.commit_fail) |f| cn.commit_fail = f;
        cn.out.open('C');
        cn.out.cstr(rule.tag);
        cn.out.close();
        return true;
    }

    /// BEGIN, COMMIT or ROLLBACK. False: the commit failed.
    fn txCommand(cn: *Conn, cmd: []const u8) bool {
        std.debug.assert(cmd.len > 0);
        var tag = cmd;
        if (cmd[0] == 'B') {
            cn.tx = .open;
        } else {
            // COMMIT of a failed transaction rolls back, as PostgreSQL does.
            if (cn.tx == .failed) tag = "ROLLBACK";
            const commits = cn.tx == .open and cmd[0] == 'C';
            cn.tx = .idle;
            if (commits and cn.commit_fail != null) {
                commitNow(cn);
                return false;
            }
            cn.commit_fail = null;
        }
        cn.out.open('C');
        cn.out.cstr(tag);
        cn.out.close();
        return true;
    }

    /// The error of a command of a simple text: always false.
    fn simpleFail(cn: *Conn, f: Fail) bool {
        sendError(&cn.out, "ERROR", f);
        if (cn.tx == .open) cn.tx = .failed;
        return false;
    }

    fn slotOf(name: []const u8) pgwire.Error!usize {
        if (name.len != 3 or name[0] != 's') return error.Malformed;
        const n = std.fmt.parseInt(usize, name[1..], 10) catch return error.Malformed;
        if (n >= stmt_slots) return error.Malformed;
        return n;
    }

    fn onParse(s: *Server, cn: *Conn, body: []const u8) pgwire.Error!void {
        var rd: pgwire.Reader = .{ .s = body };
        const slot = try slotOf(try rd.cstr());
        const text = try rd.cstr();
        const declared = try rd.count();
        s.note("parse", text);
        const ri = s.ruleFor(text) orelse return fail(cn, .{ .code = "42601", .message = "the script has no rule for this text" });
        if (s.rules[ri].parse_fail) |f| return fail(cn, f);
        cn.stmts[slot] = .{ .rule = ri, .params = s.rules[ri].params orelse declared };
        cn.out.open('1');
        cn.out.close();
    }

    fn ruleFor(s: *const Server, text: []const u8) ?u16 {
        for (s.rules, 0..) |r, i| {
            if (std.mem.eql(u8, r.text, text)) return std.math.cast(u16, i);
        }
        return null;
    }

    fn onDescribe(s: *Server, cn: *Conn, body: []const u8) pgwire.Error!void {
        var rd: pgwire.Reader = .{ .s = body };
        const what = (try rd.take(1))[0];
        const name = try rd.cstr();
        var ri = cn.portal;
        if (what == 'S') {
            const p = cn.stmts[try slotOf(name)];
            ri = p.rule;
            cn.out.open('t');
            cn.out.int16(p.params);
            for (0..p.params) |_| cn.out.int32(25);
            cn.out.close();
        }
        const rule = s.rules[ri orelse return fail(cn, .{ .code = "26000", .message = "the statement does not exist" })];
        if (rule.cols.len == 0) {
            cn.out.open('n');
            return cn.out.close();
        }
        try sendCols(&cn.out, rule.cols);
    }

    /// Bind: the log gets the values, so a test can show that they went as binds.
    fn onBind(s: *Server, cn: *Conn, body: []const u8) pgwire.Error!void {
        var rd: pgwire.Reader = .{ .s = body };
        if ((try rd.cstr()).len != 0) return error.Malformed;
        const p = cn.stmts[try slotOf(try rd.cstr())];
        const formats = try rd.count();
        // The client sends every value as text: the format codes say nothing more.
        _ = try rd.take(@as(usize, formats) * 2);
        const n = try rd.count();
        var line: [512]u8 = @splat(0);
        var b: Buf = .{ .data = &line };
        for (0..n) |k| {
            const len = try rd.int32();
            if (k > 0) b.byte('|');
            b.bytes(if (len == 0xFFFF_FFFF) "NULL" else try rd.take(len));
        }
        s.note("bind", line[0..b.len]);
        cn.portal = p.rule orelse return fail(cn, .{ .code = "26000", .message = "the statement does not exist" });
        cn.out.open('2');
        cn.out.close();
    }

    fn onExecute(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        const rule = s.rules[cn.portal orelse return fail(cn, .{ .code = "34000", .message = "the portal does not exist" })];
        s.note("run", rule.text);
        if (rule.run_fail) |f| return fail(cn, f);
        switch (rule.act) {
            .answer => {},
            .hang => {
                cn.phase = .hung;
                return;
            },
            .close => return s.closeConn(i),
        }
        for (0..rule.repeat) |_| {
            for (rule.rows) |row| sendRow(&cn.out, row);
        }
        if (rule.commit_fail) |f| cn.commit_fail = f;
        cn.out.open('C');
        cn.out.cstr(rule.tag);
        cn.out.close();
    }
};

/// The commit of a statement with `commit_fail` gives its error.
fn commitNow(cn: *Conn) void {
    const f = cn.commit_fail orelse return;
    sendError(&cn.out, "ERROR", f);
    cn.commit_fail = null;
}

fn sendReady(cn: *Conn) void {
    cn.out.open('Z');
    cn.out.byte(switch (cn.tx) {
        .idle => 'I',
        .open => 'T',
        .failed => 'E',
    });
    cn.out.close();
}

/// A RowDescription.
fn sendCols(out: *Buf, cols: []const Col) pgwire.Error!void {
    out.open('T');
    out.int16(std.math.cast(u16, cols.len) orelse return error.Malformed);
    for (cols) |col| {
        out.cstr(col.name);
        out.bytes(&.{ 0, 0, 0, 0, 0, 0 });
        out.int32(col.oid);
        out.bytes(&.{ 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0, 0 });
    }
    out.close();
}

fn sendRow(out: *Buf, row: Row) void {
    out.open('D');
    out.int16(std.math.cast(u16, row.len) orelse 0);
    for (row) |v| {
        const text = v orelse {
            out.int32(0xFFFF_FFFF);
            continue;
        };
        out.int32(std.math.cast(u32, text.len) orelse 0);
        out.bytes(text);
    }
    out.close();
}

fn sendError(out: *Buf, severity: []const u8, f: Fail) void {
    out.open('E');
    const fields = [_]struct { code: u8, text: []const u8 }{
        .{ .code = 'S', .text = severity },
        .{ .code = 'V', .text = severity },
        .{ .code = 'C', .text = f.code },
        .{ .code = 'M', .text = f.message },
    };
    for (fields) |field| {
        out.byte(field.code);
        out.cstr(field.text);
    }
    out.byte(0);
    out.close();
}
