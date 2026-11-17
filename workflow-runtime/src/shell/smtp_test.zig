//! Tests of the SMTP client on the event loop, against the scripted server
//! of `smtp_fake.zig` on a loopback socket, in the thread of the test.
const std = @import("std");
const sys = @import("sys.zig");
const creds = @import("creds.zig");
const smtp = @import("smtp.zig");
const fake = @import("smtp_fake.zig");

const kind_conn: u8 = 19;
const kind_dns: u8 = 20;
const kind_fake: u8 = 21;

const Answer = struct { ok: bool, text: []const u8 };

const Harness = struct {
    arena: std.heap.ArenaAllocator,
    poller: sys.Poller,
    client: *smtp.Client,
    server: *fake.Server,
    store: creds.Store,
    next_seq: u32 = 1,

    /// The slots: `plain` (no TLS, with a login), `open` (no login),
    /// `secure` (TLS from the first byte) and `refused` (no server).
    fn create(cfg: smtp.Config) !*Harness {
        var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        errdefer arena.deinit();
        const a = arena.allocator();
        const h = try a.create(Harness);
        h.* = .{
            .arena = arena,
            .poller = try sys.Poller.init(),
            .client = try a.create(smtp.Client),
            .server = try a.create(fake.Server),
            .store = try creds.Store.parse(a, "{}"),
        };
        try h.server.init(a, &h.poller, kind_fake);
        const doc = try std.fmt.allocPrint(a,
            \\{{"plain":{{"data":{{"host":"127.0.0.1","port":{0d},"secure":false,"user":"user","password":"secret","hostName":"client.test"}}}},
            \\"open":{{"data":{{"host":"127.0.0.1","port":{0d},"secure":false,"user":"","password":"","hostName":"client.test"}}}},
            \\"secure":{{"data":{{"host":"127.0.0.1","port":{0d},"secure":true,"user":"","password":"","hostName":"client.test"}}}},
            \\"refused":{{"data":{{"host":"127.0.0.1","port":1,"secure":false,"hostName":"client.test"}}}}}}
        , .{h.server.port});
        h.store = try creds.Store.parse(a, doc);
        try h.client.init(a, cfg, &h.poller, kind_conn, kind_dns);
        // The arena as it is after the last allocation above.
        h.arena = arena;
        return h;
    }

    fn destroy(h: *Harness) void {
        h.client.deinit();
        h.server.deinit();
        h.poller.deinit();
        var arena = h.arena;
        arena.deinit();
    }

    /// Start a call and run the event loop until it ends.
    fn call(h: *Harness, args: []const u8) !Answer {
        const seq = h.next_seq;
        h.next_seq += 1;
        if (h.client.start(7, seq, args, &h.store, sys.nowMs())) |msg| return .{ .ok = false, .text = msg };
        var ready: [64]sys.Ready = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false });
        for (0..4000) |_| {
            if (h.client.nextDone()) |d| {
                const text = try h.arena.allocator().dupe(u8, d.payload);
                h.client.release(d.req);
                return .{ .ok = d.ok, .text = text };
            }
            const n = h.poller.wait(&ready, 5);
            for (ready[0..n]) |ev| {
                const idx: u32 = @truncate(ev.token);
                const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
                switch (ev.token >> 56) {
                    kind_conn => h.client.onConn(idx, gen, ev, sys.nowMs()),
                    kind_fake => h.server.onReady(ev),
                    // The other tokens are those of the name lookups.
                    else => h.client.onDns(@intCast(idx), ev),
                }
            }
            h.client.afterEvents(sys.nowMs());
        }
        return error.NoAnswer;
    }
};

const message = "Subject: hi\\r\\n\\r\\n.one\\nline two";
const message_wire = "Subject: hi\r\n\r\n..one\r\nline two\r\n.\r\n";

fn masked(a: std.mem.Allocator, text: []const u8) ![]const u8 {
    // The two times of the result depend on the run.
    const env = std.mem.indexOf(u8, text, ",\"envelopeTime\":") orelse return text;
    const size = std.mem.indexOf(u8, text, ",\"messageSize\":") orelse return text;
    return std.mem.concat(a, u8, &.{ text[0..env], text[size..] });
}

test "smtp fake: login, a rejected recipient among accepted ones, and the message on the wire" {
    const h = try Harness.create(.{});
    defer h.destroy();
    h.server.script(&.{
        .{ .reply = "220 mx.test ESMTP\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250-PIPELINING\r\n250 AUTH LOGIN PLAIN\r\n" },
        .{ .expect = "AUTH PLAIN AHVzZXIAc2VjcmV0\r\n", .reply = "235 ok\r\n" },
        .{ .expect = "MAIL FROM:<a@x.test>\r\nRCPT TO:<b@x.test>\r\nRCPT TO:<c@x.test>\r\nDATA\r\n", .reply = "250 ok\r\n550 5.1.1 no such user\r\n250 ok\r\n354 go\r\n" },
        .{ .expect = message_wire, .reply = "250 2.0.0 queued\r\n" },
    }, false);
    const a = try h.call("{\"credential\":\"plain\",\"from\":\"a@x.test\",\"to\":[\"b@x.test\",\"c@x.test\"],\"message\":\"" ++ message ++ "\"}");
    try std.testing.expect(a.ok);
    try std.testing.expectEqualStrings(
        "{\"accepted\":[\"c@x.test\"],\"rejected\":[\"b@x.test\"],\"ehlo\":[\"PIPELINING\",\"AUTH LOGIN PLAIN\"]," ++
            "\"rejectedErrors\":[{\"message\":\"Recipient command failed: 550 5.1.1 no such user\",\"code\":\"EENVELOPE\"," ++
            "\"response\":\"550 5.1.1 no such user\",\"responseCode\":550,\"command\":\"RCPT TO\",\"recipient\":\"b@x.test\"}]" ++
            ",\"messageSize\":35,\"response\":\"250 2.0.0 queued\"}",
        try masked(h.arena.allocator(), a.text),
    );
    try std.testing.expect(h.server.finished());
    try std.testing.expectEqual(@as(u32, 1), h.server.connections);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.sent);
    // The client sends no QUIT, as nodemailer.
    try std.testing.expect(std.mem.indexOf(u8, h.server.seenText(), "QUIT") == null);
}

test "smtp fake: errors of the server and of the socket have the form of nodemailer" {
    const h = try Harness.create(.{});
    defer h.destroy();
    h.server.script(&.{
        .{ .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250 AUTH LOGIN\r\n" },
        .{ .expect = "AUTH LOGIN\r\n", .reply = "334 VXNlcm5hbWU6\r\n" },
        .{ .expect = "dXNlcg==\r\n", .reply = "334 UGFzc3dvcmQ6\r\n" },
        .{ .expect = "c2VjcmV0\r\n", .reply = "535 5.7.8 no\r\n" },
    }, false);
    const args = "{\"credential\":\"plain\",\"from\":\"a@x.test\",\"to\":[\"b@x.test\"],\"message\":\"x\"}";
    const refused = try h.call(args);
    try std.testing.expect(refused.ok);
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Invalid login: 535 5.7.8 no\",\"code\":\"EAUTH\",\"response\":\"535 5.7.8 no\",\"responseCode\":535,\"command\":\"AUTH LOGIN\"}}",
        refused.text,
    );
    // The server closes with a last reply that has no line end.
    h.server.script(&.{
        .{ .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "554 5.7.1 go away", .close = true },
    }, false);
    const closed = try h.call(args);
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Connection closed unexpectedly: 554 5.7.1 go away\",\"code\":\"ECONNECTION\"," ++
            "\"response\":\"554 5.7.1 go away\",\"responseCode\":554,\"command\":\"CONN\"}}",
        closed.text,
    );
    const none = try h.call("{\"credential\":\"refused\",\"from\":\"a@x.test\",\"to\":[\"b@x.test\"],\"message\":\"x\"}");
    try std.testing.expect(none.ok);
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"connect ECONNREFUSED 127.0.0.1:1\",\"code\":\"ESOCKET\",\"command\":\"CONN\"}}", none.text);
}

test "smtp fake: a hand-over to the host comes before any mail command" {
    const h = try Harness.create(.{});
    defer h.destroy();
    h.server.script(&.{
        .{ .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250 AUTH CRAM-MD5\r\n" },
    }, false);
    const args = "{\"credential\":\"plain\",\"from\":\"a@x.test\",\"to\":[\"b@x.test\"],\"message\":\"x\"}";
    const cram = try h.call(args);
    try std.testing.expect(!cram.ok);
    try std.testing.expectEqualStrings("smtp: the native client cannot do this: a server that offers only CRAM-MD5 (limit: smtp-host)", cram.text);
    try std.testing.expectEqualStrings("EHLO client.test\r\n", h.server.seenText());
    h.server.script(&.{
        .{ .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250 X-NOTE gr\xc3\xbc\xc3\x9f\r\n" },
    }, false);
    const ehlo = try h.call(args);
    try std.testing.expect(!ehlo.ok);
    try std.testing.expect(std.mem.endsWith(u8, ehlo.text, "(limit: smtp-host)"));
    try std.testing.expectEqualStrings("EHLO client.test\r\n", h.server.seenText());
    // A call that is not well formed starts no connection.
    const before = h.server.connections;
    const bad = try h.call("{\"credential\":\"plain\",\"from\":\"a@x.test\",\"message\":\"x\"}");
    try std.testing.expect(!bad.ok);
    try std.testing.expectEqualStrings("smtp: the call needs 'to'", bad.text);
    try std.testing.expectEqual(before, h.server.connections);
}

test "smtp fake: the time limit of the greeting, and the limit of the call slots" {
    const h = try Harness.create(.{ .max_reqs = 1, .greeting_ms = 150 });
    defer h.destroy();
    // The server takes the connection and says nothing.
    h.server.script(&.{}, false);
    const args = "{\"credential\":\"open\",\"from\":\"a@x.test\",\"to\":[\"b@x.test\"],\"message\":\"x\"}";
    try std.testing.expectEqual(@as(?[]const u8, null), h.client.start(7, 90, args, &h.store, sys.nowMs()));
    const second = h.client.start(7, 91, args, &h.store, sys.nowMs()) orelse "";
    try std.testing.expect(std.mem.endsWith(u8, second, "the step can run again (limit)"));
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.refused);
    var ready: [16]sys.Ready = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false });
    var text: []const u8 = "";
    for (0..400) |_| {
        if (h.client.nextDone()) |d| {
            text = try h.arena.allocator().dupe(u8, d.payload);
            h.client.release(d.req);
            break;
        }
        const n = h.poller.wait(&ready, 5);
        for (ready[0..n]) |ev| {
            const idx: u32 = @truncate(ev.token);
            const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
            if (ev.token >> 56 == kind_conn) h.client.onConn(idx, gen, ev, sys.nowMs()) else h.server.onReady(ev);
        }
        h.client.afterEvents(sys.nowMs());
    }
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"Greeting never received\",\"code\":\"ETIMEDOUT\",\"command\":\"CONN\"}}", text);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.timeouts);
}

test "smtp fake: STARTTLS and TLS from the first byte, through the TLS path of the runtime" {
    const h = try Harness.create(.{});
    defer h.destroy();
    // A build without TLS has no server side for this test.
    h.server.useTls("src/shell/testdata/tls-test-cert.pem", "src/shell/testdata/tls-test-key.pem") catch return error.SkipZigTest;
    h.server.script(&.{
        .{ .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250 STARTTLS\r\n" },
        .{ .expect = "STARTTLS\r\n", .reply = "220 go\r\n", .tls = true },
        .{ .expect = "EHLO client.test\r\n", .reply = "250 mx.test\r\n" },
        .{ .expect = "MAIL FROM:<a@x.test>\r\n", .reply = "250 ok\r\n" },
        .{ .expect = "RCPT TO:<b@x.test>\r\n", .reply = "250 ok\r\n" },
        .{ .expect = "DATA\r\n", .reply = "354 go\r\n" },
        .{ .expect = message_wire, .reply = "250 queued\r\n" },
    }, false);
    const args = "{\"credential\":\"open\",\"allowUnauthorizedCerts\":true,\"from\":\"a@x.test\",\"to\":[\"b@x.test\"],\"message\":\"" ++ message ++ "\"}";
    const upgraded = try h.call(args);
    try std.testing.expect(upgraded.ok);
    try std.testing.expect(std.mem.endsWith(u8, upgraded.text, "\"messageSize\":35,\"response\":\"250 queued\"}"));
    try std.testing.expect(h.server.finished());
    h.server.script(&.{
        .{ .reply = "220 mx.test\r\n" },
        .{ .expect = "EHLO client.test\r\n", .reply = "250-mx.test\r\n250 STARTTLS\r\n" },
        .{ .expect = "MAIL FROM:<a@x.test>\r\n", .reply = "250 ok\r\n" },
        .{ .expect = "RCPT TO:<b@x.test>\r\n", .reply = "250 ok\r\n" },
        .{ .expect = "DATA\r\n", .reply = "354 go\r\n" },
        .{ .expect = message_wire, .reply = "250 queued\r\n" },
    }, true);
    const secure_args = "{\"credential\":\"secure\",\"allowUnauthorizedCerts\":true,\"from\":\"a@x.test\",\"to\":[\"b@x.test\"],\"message\":\"" ++ message ++ "\"}";
    const direct = try h.call(secure_args);
    try std.testing.expect(direct.ok);
    try std.testing.expect(std.mem.endsWith(u8, direct.text, "\"response\":\"250 queued\"}"));
    try std.testing.expect(h.server.finished());
    // The certificate of the test is not trusted: without the option the host takes the call.
    h.server.script(&.{.{ .reply = "220 mx.test\r\n" }}, true);
    const untrusted = try h.call("{\"credential\":\"secure\",\"from\":\"a@x.test\",\"to\":[\"b@x.test\"],\"message\":\"x\"}");
    try std.testing.expect(!untrusted.ok);
    try std.testing.expectEqualStrings("smtp: the native client cannot do this: a TLS handshake that failed (limit: smtp-host)", untrusted.text);
}
