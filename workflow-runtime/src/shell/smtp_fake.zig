//! A scripted SMTP server for tests, on a loopback socket. It runs on the
//! poller and in the thread of the test, as `pg_fake.zig` does. The script
//! is a list of turns: the bytes that the client must send, and the bytes
//! that the server then sends. A turn can start TLS after its answer
//! (STARTTLS), close the connection, or give no answer. The server keeps
//! every byte that it reads, so a test can check what went on the wire.
const std = @import("std");
const mail = @import("core").mail;
const sys = @import("sys.zig");
const tls = @import("tls.zig");
const sql_net = @import("sql_net.zig");

pub const Turn = struct {
    /// The bytes of the client since the turn before. Empty: the turn goes at once (the greeting).
    expect: []const u8 = "",
    reply: []const u8 = "",
    /// After the answer, the server waits for a TLS handshake.
    tls: bool = false,
    close: bool = false,
};

const listener_idx: u32 = 0xFFFF;

pub const Server = struct {
    poller: *sys.Poller,
    kind: u8,
    lfd: c_int = -1,
    port: u16 = 0,
    turns: []const Turn = &.{},
    turn: usize = 0,
    /// TLS from the first byte (`secure` of the credential).
    tls_first: bool = false,
    ctx: ?tls.Context = null,
    fd: c_int = -1,
    session: ?tls.Session = null,
    handshaking: bool = false,
    /// A turn asked for TLS: `onReady` starts the handshake.
    want_tls: bool = false,
    rbuf: []u8 = &.{},
    rlen: usize = 0,
    /// Every byte of every client, in order.
    seen: []u8 = &.{},
    seen_len: usize = 0,
    connections: u32 = 0,
    /// The client sent bytes that the script does not expect, or a buffer is full.
    failed: bool = false,

    /// Listen on a free loopback port and watch it with `poller`. Events
    /// whose token has `kind` in the top byte go to `onReady`.
    pub fn init(s: *Server, gpa: std.mem.Allocator, poller: *sys.Poller, kind: u8) !void {
        s.* = .{ .poller = poller, .kind = kind, .rbuf = try gpa.alloc(u8, 256 << 10), .seen = try gpa.alloc(u8, 256 << 10) };
        // A base that depends on the process, apart from the other test servers.
        const base: u16 = 46000 + (std.math.cast(u16, sys.processId() % 2000) orelse 0);
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

    /// Take the certificate of the tests. An error means that this build has no TLS.
    pub fn useTls(s: *Server, cert: [*:0]const u8, key: [*:0]const u8) tls.Error!void {
        s.ctx = try tls.Context.server(cert, key);
    }

    pub fn deinit(s: *Server) void {
        s.closeConn();
        if (s.ctx) |*c| c.deinit();
        s.ctx = null;
        if (s.lfd >= 0) {
            s.poller.remove(s.lfd);
            sys.close(s.lfd);
        }
        s.lfd = -1;
    }

    /// Start a new script. The bytes that were seen are dropped.
    pub fn script(s: *Server, turns: []const Turn, tls_first: bool) void {
        s.closeConn();
        s.turns = turns;
        s.turn = 0;
        s.tls_first = tls_first;
        s.seen_len = 0;
        s.failed = false;
    }

    pub fn seenText(s: *const Server) []const u8 {
        return s.seen[0..s.seen_len];
    }

    /// True when the script ran to its end.
    pub fn finished(s: *const Server) bool {
        return !s.failed and s.turn == s.turns.len;
    }

    pub fn onReady(s: *Server, ev: sys.Ready) void {
        const idx: u32 = @truncate(ev.token);
        if (idx == listener_idx) return s.acceptOne();
        if (s.fd < 0) return;
        if (s.handshaking) return s.handshake();
        s.readConn();
        if (s.want_tls and s.fd >= 0) s.startTls();
    }

    fn acceptOne(s: *Server) void {
        const fd = sys.acceptOne(s.lfd) orelse return;
        // The script has one connection at a time.
        if (s.fd >= 0) {
            s.failed = true;
            return sys.close(fd);
        }
        s.fd = fd;
        s.want_tls = false;
        s.rlen = 0;
        s.connections += 1;
        s.poller.addRead(fd, sys.makeToken(s.kind, 0, 0)) catch {
            s.failed = true;
        };
        if (s.tls_first) return s.startTls();
        s.advance();
        if (s.want_tls and s.fd >= 0) s.startTls();
    }

    fn startTls(s: *Server) void {
        const ctx = s.ctx orelse {
            s.failed = true;
            return;
        };
        s.session = tls.Session.accept(ctx, s.fd) catch {
            s.failed = true;
            return;
        };
        s.want_tls = false;
        s.handshaking = true;
        s.handshake();
    }

    fn handshake(s: *Server) void {
        const session = s.session orelse return;
        switch (session.handshake()) {
            .n => {
                s.handshaking = false;
                s.advance();
                s.readConn();
            },
            .want_read, .want_write => {},
            .closed, .failed => s.closeConn(),
        }
    }

    fn closeConn(s: *Server) void {
        if (s.session) |session| session.deinit();
        s.session = null;
        s.handshaking = false;
        if (s.fd >= 0) {
            s.poller.remove(s.fd);
            sys.close(s.fd);
        }
        s.fd = -1;
    }

    fn readConn(s: *Server) void {
        // Each pass takes bytes or ends: the buffer bounds the loop.
        for (0..s.rbuf.len) |_| {
            if (s.fd < 0 or s.handshaking or s.want_tls) return;
            if (s.rlen == s.rbuf.len) {
                s.failed = true;
                return s.closeConn();
            }
            switch (sql_net.ioRead(s.session, s.fd, s.rbuf[s.rlen..])) {
                .n => |n| {
                    s.note(s.rbuf[s.rlen..][0..n]);
                    s.rlen += n;
                    s.advance();
                },
                .again, .want_write => return,
                .closed => return s.closeConn(),
            }
        }
    }

    fn note(s: *Server, bytes: []const u8) void {
        if (bytes.len > s.seen.len - s.seen_len) {
            s.failed = true;
            return;
        }
        @memcpy(s.seen[s.seen_len..][0..bytes.len], bytes);
        s.seen_len += bytes.len;
    }

    /// Run each turn whose bytes are here.
    fn advance(s: *Server) void {
        for (0..s.turns.len + 1) |_| {
            if (s.fd < 0 or s.handshaking or s.want_tls or s.turn >= s.turns.len) return;
            const t = s.turns[s.turn];
            if (s.rlen < t.expect.len) return;
            if (!std.mem.eql(u8, t.expect, s.rbuf[0..t.expect.len])) {
                s.failed = true;
                return s.closeConn();
            }
            std.mem.copyForwards(u8, s.rbuf[0 .. s.rlen - t.expect.len], s.rbuf[t.expect.len..s.rlen]);
            s.rlen -= t.expect.len;
            s.turn += 1;
            s.send(t.reply);
            if (t.close) return s.closeConn();
            s.want_tls = t.tls;
        }
    }

    fn send(s: *Server, bytes: []const u8) void {
        var at: usize = 0;
        // An answer of the script is small: the socket takes it in a few writes.
        for (0..64) |_| {
            if (at == bytes.len) return;
            switch (sql_net.ioWrite(s.session, s.fd, bytes[at..])) {
                .n => |n| at += n,
                .again, .want_write => {},
                .closed => return,
            }
        }
        s.failed = true;
    }
};

/// The random bytes and the time of the messages of a test.
pub const entropy: mail.Entropy = .{ .boundary = @splat(1), .id = @splat(2), .now_ms = 0 };

/// The bytes after DATA for a text message from `a@x.test` with the subject
/// `hi` and `entropy`. `body` is the text as the client writes it.
pub fn textMessage(comptime to: []const u8, comptime body: []const u8) []const u8 {
    return "From: a@x.test\r\nTo: " ++ to ++ "\r\nSubject: hi\r\n" ++
        "Message-ID: <02020202-0202-0202-0202-020202020202@x.test>\r\nContent-Transfer-Encoding: 7bit\r\n" ++
        "Date: Thu, 01 Jan 1970 00:00:00 +0000\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n" ++
        body ++ "\r\n.\r\n";
}
