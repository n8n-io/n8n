//! The `smtp` effect, without the event loop: the settings that the
//! credential gives (`configureTransport` of the v1 node and the defaults
//! of nodemailer), and the session of one message over byte buffers. A
//! connection of the shard owns a `Session`: it reads into `readSpace`,
//! calls `onBytes`, writes `pending`, and does what the step says.
//! `docs/smtp-effect.md` states what v1 does.
const std = @import("std");
const smtp = @import("core").smtp;
const creds = @import("creds.zig");
const http = @import("http.zig");
const sql_net = @import("sql_net.zig");

const marker_host = " (limit: smtp-host)";

/// How to reach the server and log in. The texts point into the
/// credentials document: they are valid while the call holds its store.
pub const Settings = struct {
    host: []const u8 = "localhost",
    port: u16 = 587,
    secure: bool = false,
    ignore_tls: bool = false,
    /// `hostName` of the credential, or empty: the name of this machine.
    name: []const u8 = "",
    auth: bool = false,
    user: []const u8 = "",
    pass: []const u8 = "",
};

/// Read the `smtp` credential of the slot `name`. The answer is null, or
/// the text of an error (a constant: it names no value of the credential).
pub fn loadSettings(st: *const creds.Store, name: []const u8, out: *Settings) ?[]const u8 {
    const slot = st.slot(name) orelse return "smtp: the credential slot of the call is not in the credentials";
    if (slot.data != .object) return "smtp: the credential of the call is not an object";
    const d = slot.data.object;
    const secure = d.get("secure");
    // nodemailer takes any value as true or false: only a boolean has one meaning here.
    if (secure) |v| if (v != .bool) return "smtp: 'secure' of the credential is not a boolean" ++ marker_host;
    const port_text = sql_net.textOf(d.get("port")) orelse "";
    // `Number(port) || default`: a text that is not a port number gives the default port.
    const port = std.fmt.parseInt(u32, port_text, 10) catch 0;
    if (port > 65535) return "smtp: the port of the credential is not a port number" ++ marker_host;
    var s: Settings = .{};
    s.secure = if (secure) |v| v.bool else port == 465;
    s.port = std.math.cast(u16, port) orelse 0;
    if (s.port == 0) s.port = if (s.secure) 465 else 587;
    const host = sql_net.textOf(d.get("host")) orelse "";
    if (host.len > 0) s.host = host;
    s.ignore_tls = secure != null and !s.secure and sql_net.isOn(d.get("disableStartTls"));
    s.name = sql_net.textOf(d.get("hostName")) orelse "";
    s.user = sql_net.textOf(d.get("user")) orelse "";
    s.pass = sql_net.textOf(d.get("password")) orelse "";
    s.auth = s.user.len > 0 or s.pass.len > 0;
    out.* = s;
    return null;
}

/// The arguments of a call that the session needs. The fields of the
/// message stay in the call: `smtp.zig` gives them to the message builder.
pub const Call = struct {
    /// The name of the credential slot.
    credential: []const u8 = "",
    /// `allowUnauthorizedCerts` of the node.
    insecure: bool = false,
    /// `build`: the call wants the message only. It needs no credential,
    /// and no connection is made.
    build: bool = false,
};

/// Read the arguments. The answer is null, or the text of the error (a
/// constant: it names no value of the call).
pub fn parseCall(args: []const u8, call: *Call) ?[]const u8 {
    call.build = std.mem.eql(u8, std.mem.trim(u8, http.member(args, "build") orelse "false", " \t\r\n"), "true");
    call.credential = http.plainString(http.member(args, "credential") orelse "") orelse "";
    if (call.credential.len == 0 and !call.build) return "smtp: the call needs a credential slot";
    const insecure = http.member(args, "allowUnauthorizedCerts") orelse "false";
    call.insecure = std.mem.eql(u8, insecure, "true");
    return null;
}

/// What the connection does next.
pub const Step = enum(u8) {
    /// Write `pending`, call `wrote`, and read.
    io,
    /// Start TLS on the socket, then call `onSecured`.
    tls,
    /// The call ended: close the socket and call `writeOutcome`.
    ended,
};

pub const Outcome = enum(u8) {
    /// The payload is the result of the effect: `info`, or `{"error":…}`.
    result,
    /// The payload is the text of a limit. With the marker, the fallback
    /// host runs the call: no part of the message went to the server.
    limit,
};

const Phase = enum(u8) { talk, body, body_end, ended };

/// One message on one connection. The buffers belong to the connection.
pub const Session = struct {
    client: smtp.Client,
    stuffer: smtp.Stuffer = .{},
    rbuf: []u8,
    rlen: usize = 0,
    /// One reply, decoded.
    reply: []u8,
    message: []const u8,
    msg_at: usize = 0,
    phase: Phase = .talk,

    pub fn init(cfg: smtp.Config, rcpts: []smtp.Rcpt, message: []const u8, rbuf: []u8, wbuf: []u8, reply: []u8, notes: []u8) Session {
        std.debug.assert(rbuf.len > 0 and wbuf.len >= 8 and reply.len > 0);
        return .{ .client = smtp.Client.init(cfg, rcpts, wbuf, notes), .rbuf = rbuf, .reply = reply, .message = message };
    }

    /// Where the next bytes of the server go.
    pub fn readSpace(s: *Session) []u8 {
        return s.rbuf[s.rlen..];
    }

    /// The bytes to write now.
    pub fn pending(s: *const Session) []const u8 {
        return s.client.out.buf[0..s.client.out.len];
    }

    /// All of `pending` is written. More of the message can be pending after it.
    pub fn wrote(s: *Session) void {
        s.client.out.len = 0;
        s.fill();
    }

    /// Put the next part of the message in the write buffer.
    fn fill(s: *Session) void {
        if (s.phase != .body and s.phase != .body_end) return;
        if (s.phase == .body) {
            s.msg_at += s.stuffer.feed(s.message[s.msg_at..], &s.client.out);
            if (s.msg_at == s.message.len) s.phase = .body_end;
        }
        if (s.phase != .body_end) return;
        // The end of the message waits for the next write when it does not fit.
        s.stuffer.finish(&s.client.out) catch return;
        s.phase = .talk;
    }

    fn end(s: *Session) Step {
        s.phase = .ended;
        return .ended;
    }

    /// `n` bytes are in `readSpace`: give each complete reply to the client.
    pub fn onBytes(s: *Session, n: usize) Step {
        std.debug.assert(n <= s.rbuf.len - s.rlen);
        if (s.phase == .ended) return .ended;
        s.rlen += n;
        var off: usize = 0;
        // Each pass takes one reply of two bytes or more.
        for (0..s.rbuf.len) |_| {
            var text: smtp.Out = .{ .buf = s.reply };
            const used = smtp.takeReply(s.rbuf[off..s.rlen], &text) catch {
                s.client.onLimit("a reply that is larger than the buffer");
                return s.end();
            } orelse break;
            off += used;
            if (text.len == 0) continue;
            switch (s.client.onReply(text.buf[0..text.len])) {
                .wait => {},
                .data => {
                    // The DATA command is written: the buffer is free for the message.
                    s.phase = .body;
                    s.fill();
                },
                .tls => {
                    // RFC 3207: bytes that came before the handshake are dropped.
                    s.rlen = 0;
                    return .tls;
                },
                .done, .failed => return s.end(),
            }
        }
        std.mem.copyForwards(u8, s.rbuf[0 .. s.rlen - off], s.rbuf[off..s.rlen]);
        s.rlen -= off;
        if (s.rlen == s.rbuf.len) {
            s.client.onLimit("a reply that is larger than the buffer");
            return s.end();
        }
        return .io;
    }

    /// The socket has TLS after STARTTLS.
    pub fn onSecured(s: *Session) Step {
        return s.after(s.client.onSecured());
    }

    /// The server closed the connection.
    pub fn onClose(s: *Session) Step {
        return s.after(s.client.onClose(s.rbuf[0..s.rlen]));
    }

    pub fn onTimeout(s: *Session, which: smtp.Timeout) Step {
        return s.after(s.client.onTimeout(which));
    }

    /// An error of the socket (`ESOCKET`), of the name lookup (`EDNS`) or
    /// of TLS (`ETLS`), with the text that Node.js gives for it.
    pub fn onTransportError(s: *Session, code: smtp.Code, parts: []const []const u8) Step {
        return s.after(s.client.onTransportError(code, parts));
    }

    fn after(s: *Session, next: smtp.Next) Step {
        return switch (next) {
            .wait, .data, .tls => .io,
            .done, .failed => s.end(),
        };
    }

    /// The payload of the call that ended. The times are those of the
    /// envelope and of the message, in milliseconds.
    pub fn writeOutcome(s: *const Session, o: *smtp.Out, envelope_ms: u64, message_ms: u64) error{NoSpace}!Outcome {
        std.debug.assert(s.phase == .ended);
        if (s.client.limitText()) |what| {
            try o.put("smtp: the native client cannot do this: ");
            try o.put(what);
            // The fallback host sends the message only when no MAIL command went out.
            try o.put(if (s.client.envelopeStarted()) " (limit)" else marker_host);
            return .limit;
        }
        if (s.client.succeeded()) {
            try s.client.writeResult(o, envelope_ms, message_ms, s.stuffer.out_count);
        } else {
            try s.client.writeFailure(o);
        }
        return .result;
    }
};

// ---- tests ----------------------------------------------------------------------

/// A scripted server in memory: for each step, the bytes that the client
/// must write, and the bytes that the server then sends.
const Turn = struct { expect: []const u8, reply: []const u8, tls: bool = false, close: bool = false };

const Rig = struct {
    rbuf: [512]u8 = @splat(0),
    wbuf: [64]u8 = @splat(0),
    reply: [512]u8 = @splat(0),
    notes: [2048]u8 = @splat(0),
    json: [2048]u8 = @splat(0),
    wire: [4096]u8 = @splat(0),
    rcpts: [2]smtp.Rcpt = @splat(.{ .addr = "" }),

    /// Run the script. The server sends its bytes three at a time, and the
    /// client writes until nothing is pending. The answer is the payload.
    fn run(g: *Rig, cfg: smtp.Config, to: []const []const u8, message: []const u8, turns: []const Turn) error{ NoSpace, Mismatch }![]const u8 {
        for (to, 0..) |addr, i| g.rcpts[i] = .{ .addr = addr };
        var s = Session.init(cfg, g.rcpts[0..to.len], message, &g.rbuf, &g.wbuf, &g.reply, &g.notes);
        var step: Step = .io;
        for (turns) |t| {
            var sent: usize = 0;
            // Each pass writes the bytes that are pending.
            for (0..g.wire.len) |_| {
                const p = s.pending();
                if (p.len == 0) break;
                if (p.len > g.wire.len - sent) return error.NoSpace;
                @memcpy(g.wire[sent..][0..p.len], p);
                sent += p.len;
                s.wrote();
            }
            if (!std.mem.eql(u8, t.expect, g.wire[0..sent])) return error.Mismatch;
            var at: usize = 0;
            while (at < t.reply.len and step == .io) {
                const n = @min(3, t.reply.len - at);
                @memcpy(s.readSpace()[0..n], t.reply[at..][0..n]);
                at += n;
                step = s.onBytes(n);
            }
            if (t.close) step = s.onClose();
            if ((step == .tls) != t.tls) return error.Mismatch;
            if (step == .tls) step = s.onSecured();
        }
        if (step != .ended) return error.Mismatch;
        var o: smtp.Out = .{ .buf = &g.json };
        const outcome = try s.writeOutcome(&o, 1, 2);
        if (outcome == .limit and std.mem.indexOf(u8, o.buf[0..o.len], "smtp:") == null) return error.Mismatch;
        return o.buf[0..o.len];
    }
};

const base: smtp.Config = .{ .name = "client.test", .secure = false, .ignore_tls = false, .auth = true, .user = "user", .pass = "secret", .from = "a@x.test" };

test "smtp session: STARTTLS, login and a message that is larger than the write buffer" {
    var g: Rig = .{};
    const message = "Subject: hi\r\n\r\n.one\n" ++ "012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789" ++ "\r\n.two";
    const wire = "Subject: hi\r\n\r\n..one\r\n" ++ "012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789" ++ "\r\n..two\r\n.\r\n";
    const payload = try g.run(base, &.{"b@x.test"}, message, &.{
        .{ .expect = "", .reply = "220 mx.test ESMTP\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250-STARTTLS\r\n250 AUTH PLAIN\r\n" },
        .{ .expect = "STARTTLS\r\n", .reply = "220 go\r\n250 injected\r\n", .tls = true },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250 AUTH PLAIN LOGIN\r\n" },
        .{ .expect = "AUTH PLAIN AHVzZXIAc2VjcmV0\r\n", .reply = "235 2.7.0 ok\r\n" },
        .{ .expect = "MAIL FROM:<a@x.test>\r\n", .reply = "250 ok\r\n" },
        .{ .expect = "RCPT TO:<b@x.test>\r\n", .reply = "250 ok\r\n" },
        .{ .expect = "DATA\r\n", .reply = "354 end with dot\r\n" },
        .{ .expect = wire, .reply = "250 2.0.0 queued\r\n" },
    });
    var want: [256]u8 = @splat(0);
    const text = try std.fmt.bufPrint(
        &want,
        "{{\"accepted\":[\"b@x.test\"],\"rejected\":[],\"ehlo\":[\"AUTH PLAIN LOGIN\"],\"envelopeTime\":1,\"messageTime\":2,\"messageSize\":{d},\"response\":\"250 2.0.0 queued\"}}",
        .{wire.len},
    );
    try std.testing.expectEqualStrings(text, payload);
}

test "smtp session: an error of the server, a close with a last reply, and a limit" {
    var g: Rig = .{};
    const refused = try g.run(base, &.{"b@x.test"}, "x", &.{
        .{ .expect = "", .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250 AUTH LOGIN\r\n" },
        .{ .expect = "AUTH LOGIN\r\n", .reply = "334 VXNlcm5hbWU6\r\n" },
        .{ .expect = "dXNlcg==\r\n", .reply = "334 UGFzc3dvcmQ6\r\n" },
        .{ .expect = "c2VjcmV0\r\n", .reply = "535 5.7.8 no\r\n" },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Invalid login: 535 5.7.8 no\",\"code\":\"EAUTH\",\"response\":\"535 5.7.8 no\",\"responseCode\":535,\"command\":\"AUTH LOGIN\"}}",
        refused,
    );
    const closed = try g.run(base, &.{"b@x.test"}, "x", &.{
        .{ .expect = "", .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "554 5.7.1 go away", .close = true },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Connection closed unexpectedly: 554 5.7.1 go away\",\"code\":\"ECONNECTION\"," ++
            "\"response\":\"554 5.7.1 go away\",\"responseCode\":554,\"command\":\"CONN\"}}",
        closed,
    );
    // A server with only CRAM-MD5 has no native form: the host runs the call.
    const host = try g.run(base, &.{"b@x.test"}, "x", &.{
        .{ .expect = "", .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250 AUTH CRAM-MD5\r\n" },
    });
    try std.testing.expectEqualStrings("smtp: the native client cannot do this: a server that offers only CRAM-MD5 (limit: smtp-host)", host);
}

test "smtp session: the settings of the credential follow configureTransport and nodemailer" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const doc =
        \\{"a":{"data":{"host":"mx.test","port":465,"secure":true,"disableStartTls":true,"user":"u","password":"p","hostName":"me.test"}},
        \\ "b":{"data":{"host":"","port":25,"secure":false,"disableStartTls":true,"user":"","password":""}},
        \\ "c":{"data":{"host":"mx.test","port":465}},
        \\ "d":{"data":{"host":"mx.test","secure":"yes"}}}
    ;
    const store = try creds.Store.parse(arena.allocator(), doc);
    var s: Settings = .{};
    try std.testing.expectEqual(@as(?[]const u8, null), loadSettings(&store, "a", &s));
    try std.testing.expect(s.secure and !s.ignore_tls and s.auth and s.port == 465);
    try std.testing.expectEqualStrings("me.test", s.name);
    try std.testing.expectEqual(@as(?[]const u8, null), loadSettings(&store, "b", &s));
    try std.testing.expect(!s.secure and s.ignore_tls and !s.auth and s.port == 25);
    try std.testing.expectEqualStrings("localhost", s.host);
    try std.testing.expectEqual(@as(?[]const u8, null), loadSettings(&store, "c", &s));
    try std.testing.expect(s.secure and !s.ignore_tls);
    try std.testing.expect(loadSettings(&store, "d", &s) != null);
    try std.testing.expect(loadSettings(&store, "none", &s) != null);
}
