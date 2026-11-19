//! A scripted MySQL server for the tests of the `sql` effect that run
//! without a database. It listens on a loopback port and runs on the poller
//! and in the thread of the test: no thread and no sleep, so a test is one
//! exact order of events.
//!
//! The script is a list of rules. A rule gives, for the text of one
//! command, a result set (columns and rows), an OK packet or an error, or
//! says that the server gives no answer, closes, or asks for a local file.
//! A statement text is split at each `;`, and each part is the text of a
//! rule. The server keeps the transaction state of a session, and writes a
//! line into `log` for each login, command text, reset, quit and
//! `KILL QUERY`, so a test can say what the client sent.
const std = @import("std");
const mywire = @import("wire").mywire;
const sys = @import("sys.zig");

/// What the server does at a login.
pub const Auth = enum(u8) {
    native,
    /// `caching_sha2_password`, the password is in the cache.
    caching_fast,
    /// `caching_sha2_password`, the full login with the RSA key.
    caching_full,
    /// The handshake names `caching_sha2_password`, then the server changes to `mysql_native_password`.
    switch_native,
    /// The server changes to a method that the client does not have.
    switch_unknown,
};
pub const Col = struct { name: []const u8, type: u8, charset: u16 = 63 };
pub const Fail = struct { code: u16, state: []const u8, message: []const u8 };
pub const Row = []const ?[]const u8;
pub const Act = enum(u8) { answer, hang, close };

pub const Rule = struct {
    text: []const u8,
    /// With columns the answer is a result set; without, an OK packet.
    cols: []const Col = &.{},
    rows: []const Row = &.{},
    /// The rows go out this many times.
    repeat: u32 = 1,
    affected: u64 = 0,
    insert_id: u64 = 0,
    info: []const u8 = "",
    fail: ?Fail = null,
    act: Act = .answer,
    /// The command ends the open transaction (a DDL command).
    implicit_commit: bool = false,
    /// The command changes the session: the OK packet has `SERVER_SESSION_STATE_CHANGED`.
    state_changed: bool = false,
    /// The server asks for this local file (`LOAD DATA LOCAL INFILE`).
    infile: ?[]const u8 = null,
};

const max_conns = 8;
const listener_idx: u32 = 0xFFFF;
const nonce = "abcdefghijklmnopqrst";
const nonce2 = "ABCDEFGHIJKLMNOPQRST";
/// A public key that nothing has the private key of: the fake takes each ciphertext.
const rsa_key =
    \\-----BEGIN PUBLIC KEY-----
    \\MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAomIVpsujOGBR9f/Mp8y4
    \\RNeugAkHXa244QREqBrJoQxfvw23XET8rz1iTSaqcbJ0H3m0X1wLpbAWWYcMzmQU
    \\DYeTdiMiJqv7lInZUnz8B3JBlfuxKo8uDj+qtB5a9G1O3AI14q5JgUGt1xAlJqP3
    \\QEWaKtWOY+l/mjC35JDRloMJPx93AMaKzU1czorohUcs+vBIAaZKtiKjpThYClZo
    \\CeXXhG5zjxjmbUWftZddUJp0lC24ss/8DpClSybEiHjLlhIEwWIxXk/QJ4c0juAd
    \\zfpXD/mJyuVX9Y2e/H/VDuZ6hlsLEXRpujrab+q/dcvSW6RstCjii+XwTqlWhqk/
    \\3QIDAQAB
    \\-----END PUBLIC KEY-----
    \\
;

const Phase = enum(u8) { free, login, switched, full_wait, key_wait, ready, infile, hung };

/// The packets that wait for the client. A packet that does not fit sets `full`.
const Buf = struct {
    data: []u8,
    len: usize = 0,
    at: usize = 0,
    seq: u8 = 0,
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

    fn int(b: *Buf, comptime T: type, v: T) void {
        var x: [@divExact(@typeInfo(T).int.bits, 8)]u8 = @splat(0);
        std.mem.writeInt(T, &x, v, .little);
        b.bytes(&x);
    }

    fn lenenc(b: *Buf, v: u64) void {
        if (v < 0xFB) return b.byte(@truncate(v));
        if (v <= 0xFFFF) {
            b.byte(0xFC);
            return b.int(u16, @truncate(v));
        }
        b.byte(0xFE);
        b.int(u64, v);
    }

    fn str(b: *Buf, s: []const u8) void {
        b.lenenc(s.len);
        b.bytes(s);
    }

    /// Start a packet with the next sequence number.
    fn open(b: *Buf) void {
        b.at = b.len;
        b.bytes(&.{ 0, 0, 0, b.seq });
        b.seq +%= 1;
    }

    fn close(b: *Buf) void {
        if (b.full) return;
        std.debug.assert(b.len >= b.at + 4);
        std.mem.writeInt(u24, b.data[b.at..][0..3], std.math.cast(u24, b.len - b.at - 4) orelse 0, .little);
    }
};

const Conn = struct {
    fd: c_int = -1,
    phase: Phase = .free,
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    out: Buf = .{ .data = &.{} },
    in_tx: bool = false,
    caps: u32 = 0,
    user: [64]u8 = @splat(0),
    user_len: usize = 0,
};

pub const Server = struct {
    poller: *sys.Poller,
    kind: u8,
    lfd: c_int = -1,
    port: u16 = 0,
    auth: Auth = .native,
    password: []const u8 = "",
    /// The capability flags that the handshake leaves out.
    without_caps: u32 = 0,
    /// The server has no `COM_RESET_CONNECTION`.
    no_reset: bool = false,
    rules: []const Rule = &.{},
    conns: [max_conns]Conn = @splat(.{}),
    log: []u8 = &.{},
    log_len: usize = 0,
    logins: u32 = 0,
    kills: u32 = 0,
    /// The fake could not do what the script says (a buffer is full).
    failed: bool = false,

    /// Listen on a free loopback port and watch it with `poller`. Events
    /// whose token has `kind` in the top byte go to `onReady`.
    pub fn init(s: *Server, gpa: std.mem.Allocator, poller: *sys.Poller, kind: u8) !void {
        s.* = .{ .poller = poller, .kind = kind, .log = try gpa.alloc(u8, 16 << 10) };
        for (&s.conns) |*cn| {
            cn.rbuf = try gpa.alloc(u8, 64 << 10);
            cn.out.data = try gpa.alloc(u8, 256 << 10);
        }
        // A base that depends on the process, apart from the other test servers.
        const base: u16 = 46000 + std.math.cast(u16, sys.processId() % 2000).?;
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
            if (cn.phase == .ready or cn.phase == .hung or cn.phase == .infile) n += 1;
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
            const keep: Conn = .{ .fd = fd, .phase = .login, .rbuf = cn.rbuf, .out = .{ .data = cn.out.data } };
            cn.* = keep;
            s.poller.addRead(fd, sys.makeToken(s.kind, 0, slot)) catch {
                s.failed = true;
            };
            s.greet(slot);
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

    /// The handshake (protocol 10). The id of the session is 100 plus its slot.
    fn greet(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        const caps: u32 = (mywire.client_caps | mywire.needed_caps | mywire.cap.connect_with_db | mywire.cap.multi_statements) & ~s.without_caps;
        const b = &cn.out;
        b.open();
        b.byte(10);
        b.bytes("8.4.0-fake\x00");
        b.int(u32, 100 + i);
        b.bytes(nonce[0..8]);
        b.byte(0);
        b.int(u16, @truncate(caps));
        b.byte(255);
        b.int(u16, 2);
        b.int(u16, @truncate(caps >> 16));
        b.byte(21);
        b.bytes(&@as([10]u8, @splat(0)));
        b.bytes(nonce[8..]);
        b.byte(0);
        b.bytes(if (s.auth == .native) mywire.native_name else mywire.caching_name);
        b.byte(0);
        b.close();
        s.flush(i);
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

    /// Handle every whole packet of the read buffer, then send the answers.
    fn consume(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        var off: usize = 0;
        // Each packet has four bytes or more.
        for (0..cn.rbuf.len / 4 + 1) |_| {
            if (cn.fd < 0) return;
            // A session without an answer reads nothing more.
            if (cn.phase == .hung) off = cn.rlen;
            // The buffer bounds each packet.
            const p = (mywire.next(cn.rbuf[off..cn.rlen], cn.rbuf.len) catch null) orelse break;
            cn.out.seq = p.seq +% 1;
            s.onPacket(i, p.body);
            off += p.size;
        }
        if (cn.fd < 0) return;
        std.mem.copyForwards(u8, cn.rbuf[0 .. cn.rlen - off], cn.rbuf[off..cn.rlen]);
        cn.rlen -= off;
        s.flush(i);
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

    fn onPacket(s: *Server, i: u32, body: []const u8) void {
        const cn = &s.conns[i];
        switch (cn.phase) {
            .login => s.onLogin(i, body),
            .switched => s.checkAnswer(i, .native, nonce2, body),
            .full_wait => {
                // The client asks for the RSA key.
                if (!std.mem.eql(u8, body, "\x02")) return s.refuse(i);
                cn.out.open();
                cn.out.byte(0x01);
                cn.out.bytes(rsa_key);
                cn.out.close();
                cn.phase = .key_wait;
            },
            .key_wait => {
                // The password, encrypted with the key: 256 bytes for a key of 2048 bits.
                s.note("rsa", if (body.len == 256) "256" else "bad");
                if (body.len != 256) return s.refuse(i);
                s.welcome(i);
            },
            .ready => s.onCommand(i, body),
            .infile => {
                s.note("infile", if (body.len == 0) "empty" else "data");
                cn.phase = .ready;
                s.sendOk(i, .{ .text = "" }, false);
            },
            .free, .hung => {},
        }
    }

    // ---- login ------------------------------------------------------------------

    fn onLogin(s: *Server, i: u32, body: []const u8) void {
        const cn = &s.conns[i];
        var r: mywire.Reader = .{ .s = body };
        // A login that cannot be read fails the test.
        s.readLogin(cn, &r) catch {
            s.failed = true;
            return s.closeConn(i);
        };
        // The same: the answer of the login method, with its length.
        const answer = r.lenencStr() catch "";
        switch (s.auth) {
            .native => s.checkAnswer(i, .native, nonce, answer),
            .caching_fast => {
                if (!s.matches(.caching_sha2, nonce, answer)) return s.refuse(i);
                cn.out.open();
                cn.out.bytes("\x01\x03");
                cn.out.close();
                s.welcome(i);
            },
            .caching_full => {
                cn.out.open();
                cn.out.bytes("\x01\x04");
                cn.out.close();
                cn.phase = .full_wait;
            },
            .switch_native, .switch_unknown => {
                cn.out.open();
                cn.out.byte(0xFE);
                cn.out.bytes(if (s.auth == .switch_native) mywire.native_name else "sha256_password");
                cn.out.byte(0);
                cn.out.bytes(nonce2 ++ "\x00");
                cn.out.close();
                cn.phase = .switched;
            },
        }
    }

    fn readLogin(s: *Server, cn: *Conn, r: *mywire.Reader) mywire.Error!void {
        cn.caps = try r.int(u32);
        const rest = try r.take(28);
        if (rest[4] != mywire.charset_utf8mb4) s.failed = true;
        const user = try r.cstr();
        cn.user_len = @min(user.len, cn.user.len);
        @memcpy(cn.user[0..cn.user_len], user[0..cn.user_len]);
    }

    fn matches(s: *const Server, plugin: mywire.Plugin, salt: *const [20]u8, answer: []const u8) bool {
        var out: [32]u8 = @splat(0);
        return std.mem.eql(u8, mywire.scramble(plugin, s.password, salt.*, &out), answer);
    }

    fn checkAnswer(s: *Server, i: u32, plugin: mywire.Plugin, salt: *const [20]u8, answer: []const u8) void {
        if (!s.matches(plugin, salt, answer)) return s.refuse(i);
        s.welcome(i);
    }

    fn welcome(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        s.logins += 1;
        s.note("login", cn.user[0..cn.user_len]);
        cn.phase = .ready;
        s.sendOk(i, .{ .text = "" }, false);
    }

    fn refuse(s: *Server, i: u32) void {
        const cn = &s.conns[i];
        s.note("refused", cn.user[0..cn.user_len]);
        s.sendErr(i, .{ .code = 1045, .state = "28000", .message = "Access denied for user 'u'@'localhost' (using password: YES)" });
        s.flush(i);
        if (cn.fd >= 0) s.closeConn(i);
    }

    // ---- commands ---------------------------------------------------------------

    fn statusOf(cn: *const Conn, more: bool, changed: bool) u16 {
        var st: u16 = 2;
        if (cn.in_tx) st |= mywire.status.in_trans;
        if (more) st |= mywire.status.more_results;
        if (changed) st |= 0x4000;
        return st;
    }

    fn sendOk(s: *Server, i: u32, rule: Rule, more: bool) void {
        const cn = &s.conns[i];
        const b = &cn.out;
        b.open();
        b.byte(0);
        b.lenenc(rule.affected);
        b.lenenc(rule.insert_id);
        b.int(u16, statusOf(cn, more, rule.state_changed));
        b.int(u16, 0);
        if (cn.caps & mywire.cap.session_track != 0) {
            b.str(rule.info);
            // A session state change that the client drops.
            if (rule.state_changed) b.bytes("\x05\x01\x03\x02ab");
        } else b.bytes(rule.info);
        b.close();
    }

    fn sendErr(s: *Server, i: u32, f: Fail) void {
        const b = &s.conns[i].out;
        b.open();
        b.byte(0xFF);
        b.int(u16, f.code);
        b.byte('#');
        b.bytes(f.state);
        b.bytes(f.message);
        b.close();
    }

    fn sendEof(s: *Server, i: u32, more: bool) void {
        const cn = &s.conns[i];
        cn.out.open();
        cn.out.byte(0xFE);
        cn.out.int(u16, 0);
        cn.out.int(u16, statusOf(cn, more, false));
        cn.out.close();
    }

    fn onCommand(s: *Server, i: u32, body: []const u8) void {
        const cn = &s.conns[i];
        if (body.len == 0) return;
        switch (body[0]) {
            0x01 => {
                s.note("quit", "");
                s.closeConn(i);
            },
            0x03 => s.onQuery(i, body[1..]),
            0x1f => {
                s.note("reset", "");
                cn.in_tx = false;
                if (s.no_reset) return s.sendErr(i, .{ .code = 1047, .state = "08S01", .message = "Unknown command" });
                s.sendOk(i, .{ .text = "" }, false);
            },
            // The client sends no other command.
            else => s.failed = true,
        }
    }

    /// Run each command of the text, in order, until one fails.
    fn onQuery(s: *Server, i: u32, text: []const u8) void {
        const cn = &s.conns[i];
        s.note("query", text);
        if (std.mem.trim(u8, text, " ;").len == 0) return s.sendErr(i, .{ .code = 1065, .state = "42000", .message = "Query was empty" });
        var it = std.mem.splitScalar(u8, text, ';');
        // Each part takes at least one byte of the text.
        for (0..text.len + 1) |_| {
            const part = std.mem.trim(u8, it.next() orelse return, " ");
            if (part.len == 0) continue;
            const more = std.mem.trim(u8, it.rest(), " ;").len > 0;
            if (!s.runOne(i, part, more)) return;
            if (cn.fd < 0 or cn.phase != .ready) return;
        }
    }

    /// The answer to one command; false when the text ends here.
    fn runOne(s: *Server, i: u32, text: []const u8, more: bool) bool {
        const cn = &s.conns[i];
        if (std.mem.eql(u8, text, "START TRANSACTION")) cn.in_tx = true;
        if (std.mem.eql(u8, text, "COMMIT") or std.mem.eql(u8, text, "ROLLBACK")) cn.in_tx = false;
        if (std.mem.startsWith(u8, text, "KILL QUERY ")) {
            s.kills += 1;
            s.note("kill", text["KILL QUERY ".len..]);
        }
        const own = std.mem.startsWith(u8, text, "KILL QUERY ") or std.mem.eql(u8, text, "START TRANSACTION") or
            std.mem.eql(u8, text, "COMMIT") or std.mem.eql(u8, text, "ROLLBACK");
        const rule = s.ruleFor(text) orelse {
            if (own) s.sendOk(i, .{ .text = "" }, more) else s.sendErr(i, .{ .code = 1064, .state = "42000", .message = "You have an error in your SQL syntax" });
            return own;
        };
        if (rule.act == .close) {
            s.closeConn(i);
            return false;
        }
        if (rule.act == .hang) {
            cn.phase = .hung;
            return false;
        }
        if (rule.fail) |f| {
            s.sendErr(i, f);
            return false;
        }
        if (rule.infile) |name| {
            cn.out.open();
            cn.out.byte(0xFB);
            cn.out.bytes(name);
            cn.out.close();
            cn.phase = .infile;
            return false;
        }
        if (rule.implicit_commit) cn.in_tx = false;
        if (rule.cols.len == 0) s.sendOk(i, rule, more) else s.sendRows(i, rule, more);
        return true;
    }

    fn ruleFor(s: *const Server, text: []const u8) ?Rule {
        for (s.rules) |rule| {
            if (std.mem.eql(u8, rule.text, text)) return rule;
        }
        return null;
    }

    fn sendRows(s: *Server, i: u32, rule: Rule, more: bool) void {
        const b = &s.conns[i].out;
        b.open();
        b.lenenc(rule.cols.len);
        b.close();
        for (rule.cols) |col| {
            b.open();
            b.str("def");
            b.str("db");
            b.str("t");
            b.str("t");
            b.str(col.name);
            b.str(col.name);
            b.byte(0x0c);
            b.int(u16, col.charset);
            b.int(u32, 255);
            b.byte(col.type);
            b.int(u16, 0);
            b.byte(0);
            b.int(u16, 0);
            b.close();
        }
        s.sendEof(i, false);
        for (0..rule.repeat) |_| {
            for (rule.rows) |row| {
                b.open();
                for (row) |v| {
                    if (v) |text| b.str(text) else b.byte(0xFB);
                }
                b.close();
            }
        }
        s.sendEof(i, more);
    }
};
