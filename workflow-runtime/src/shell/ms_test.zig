//! Tests of the SQL Server client. The `mssql fake` tests run against the
//! scripted server of `ms_fake.zig`, in the thread of the test, without a
//! database. Its replies are the vectors that the codec is proven on
//! (`core/tdscase_tables.zig`). The `mssql live` tests run against a real
//! server when `WFRT_TEST_MS` names one (`host:port`, user `sa`, password
//! in `WFRT_TEST_MS_PASSWORD`), and are skipped without it.
const std = @import("std");
const core_lib = @import("core");
const tds = @import("wire").tdswire;
const cases = @import("wire").tdscase_tables;
const sys = @import("sys.zig");
const creds = @import("creds.zig");
const ms = @import("ms.zig");
const fake = @import("ms_fake.zig");

const kind_conn: u8 = 21;
const kind_dns: u8 = 22;
const kind_fake: u8 = 15;

const Target = struct { host: []const u8, port: []const u8, password: []const u8 };

fn target() ?Target {
    const hp = sys.getenv("WFRT_TEST_MS") orelse return null;
    const colon = std.mem.lastIndexOfScalar(u8, hp, ':') orelse return null;
    return .{ .host = hp[0..colon], .port = hp[colon + 1 ..], .password = sys.getenv("WFRT_TEST_MS_PASSWORD") orelse "" };
}

const Answer = struct { ok: bool, text: []const u8 };

const Harness = struct {
    arena: std.heap.ArenaAllocator,
    poller: sys.Poller,
    client: *ms.Client,
    store: creds.Store,
    /// The scripted server, or null for a real one.
    server: ?*fake.Server = null,
    next_seq: u32 = 1,

    /// The slots: `db` (the test server), and slots that differ in one value.
    /// The harness lives in its own arena: `destroy` frees all of it.
    fn create(t: ?Target, cfg: ms.Config) !*Harness {
        var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        errdefer arena.deinit();
        const a = arena.allocator();
        const h = try a.create(Harness);
        h.* = .{ .arena = arena, .poller = try sys.Poller.init(), .client = try a.create(ms.Client), .store = try creds.Store.parse(a, "{}") };
        var live = t;
        // A real server asks for encryption; the scripted one does when a test says so.
        const tls_text: []const u8 = if (t == null) "false" else "true";
        if (t == null) {
            const server = try a.create(fake.Server);
            try server.init(a, &h.poller, kind_fake);
            server.password = "secret";
            h.server = server;
            live = .{ .host = "127.0.0.1", .port = try std.fmt.allocPrint(a, "{d}", .{server.port}), .password = "secret" };
        }
        const doc = try std.fmt.allocPrint(a,
            \\{{"db":{{"type":"microsoftSql","data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","database":"master","tls":{3s},"allowUnauthorizedCerts":true}}}},
            \\"defaults":{{"data":{{"server":"{0s}","port":"{1s}","password":"{2s}","tls":{3s},"allowUnauthorizedCerts":true,"connectTimeout":"","requestTimeout":null,"domain":""}}}},
            \\"wrong":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"not-the-password","tls":{3s},"allowUnauthorizedCerts":true}}}},
            \\"v73":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","tls":{3s},"allowUnauthorizedCerts":true,"tdsVersion":"7_3_B"}}}},
            \\"fast":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","tls":{3s},"allowUnauthorizedCerts":true,"requestTimeout":150}}}},
            \\"secure":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","tls":true,"allowUnauthorizedCerts":true}}}},
            \\"verify":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","tls":true,"allowUnauthorizedCerts":false}}}},
            \\"clear":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","tls":false}}}},
            \\"refused":{{"data":{{"server":"127.0.0.1","port":1,"user":"u","password":"p","tls":false}}}},
            \\"nohost":{{"data":{{"server":"wfrt-no-such-host.invalid","port":1433,"user":"u","password":"p"}}}},
            \\"domain":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","domain":"CORP"}}}},
            \\"old":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","tdsVersion":"7_1"}}}},
            \\"instance":{{"data":{{"server":"host\\sql1","user":"sa","password":"{2s}"}}}},
            \\"badtime":{{"data":{{"server":"{0s}","port":{1s},"user":"sa","password":"{2s}","requestTimeout":"soon"}}}}}}
        , .{ live.?.host, live.?.port, live.?.password, tls_text });
        h.store = try creds.Store.parse(a, doc);
        try h.client.init(a, cfg, &h.poller, kind_conn, kind_dns);
        // The arena as it is after the last allocation above.
        h.arena = arena;
        return h;
    }

    fn destroy(h: *Harness) void {
        h.client.deinit();
        if (h.server) |s| s.deinit();
        h.poller.deinit();
        var arena = h.arena;
        arena.deinit();
    }

    fn begin(h: *Harness, args: []const u8) !u32 {
        const seq = h.next_seq;
        h.next_seq += 1;
        if (h.client.start(7, seq, args, &h.store, sys.nowMs())) |msg| {
            std.debug.print("start refused: {s}\n", .{msg});
            return error.Refused;
        }
        return seq;
    }

    /// One round of the event loop.
    fn turn(h: *Harness) void {
        var ready: [64]sys.Ready = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false });
        const n = h.poller.wait(&ready, 5);
        for (ready[0..n]) |ev| {
            const idx: u32 = @truncate(ev.token);
            const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
            switch (ev.token >> 56) {
                kind_conn => h.client.onConn(idx, gen, ev, sys.nowMs()),
                kind_fake => h.server.?.onReady(ev),
                else => h.client.onDns(@intCast(idx), ev),
            }
        }
        h.client.afterEvents(sys.nowMs());
    }

    /// Run the event loop until one call ends; give its seq and its answer.
    fn wait(h: *Harness, seq_out: *u32) !Answer {
        for (0..6000) |_| {
            if (h.client.nextDone()) |d| {
                const text = try h.arena.allocator().dupe(u8, d.payload);
                seq_out.* = d.seq;
                h.client.release(d.req);
                return .{ .ok = d.ok, .text = text };
            }
            h.turn();
        }
        return error.NoAnswer;
    }

    /// Close the idle connections, and wait until no connection is open.
    fn settle(h: *Harness) !void {
        const idle = h.client.cfg.idle_ms;
        h.client.cfg.idle_ms = 0;
        defer h.client.cfg.idle_ms = idle;
        for (0..400) |_| {
            if (h.client.ncfree == h.client.cfg.max_conns) return;
            h.turn();
        }
        return error.ConnectionsStayOpen;
    }

    fn call(h: *Harness, comptime slot: []const u8, comptime rest: []const u8) !Answer {
        var seq: u32 = 0;
        _ = try h.begin("{\"credential\":\"" ++ slot ++ "\",\"dialect\":\"mssql\"," ++ rest ++ "}");
        return h.wait(&seq);
    }

    fn expectResult(h: *Harness, comptime slot: []const u8, comptime rest: []const u8, want: []const u8) !void {
        const a = try h.call(slot, rest);
        if (!a.ok) std.debug.print("effect error: {s}\n", .{a.text});
        try std.testing.expect(a.ok);
        try std.testing.expectEqualStrings(want, a.text);
    }

    fn expectError(h: *Harness, comptime slot: []const u8, comptime rest: []const u8, want_part: []const u8) !void {
        const a = try h.call(slot, rest);
        if (a.ok or std.mem.indexOf(u8, a.text, want_part) == null) std.debug.print("got ok={}: {s}\n", .{ a.ok, a.text });
        try std.testing.expect(!a.ok);
        try std.testing.expect(std.mem.indexOf(u8, a.text, want_part) != null);
    }

    fn expectPart(h: *Harness, comptime slot: []const u8, comptime rest: []const u8, want_part: []const u8) !void {
        const a = try h.call(slot, rest);
        if (!a.ok or std.mem.indexOf(u8, a.text, want_part) == null) std.debug.print("got ok={}: {s}\n", .{ a.ok, a.text });
        try std.testing.expect(a.ok);
        try std.testing.expect(std.mem.indexOf(u8, a.text, want_part) != null);
    }
};

/// One statement of a call, without bind values.
fn one(comptime text: []const u8) []const u8 {
    return "\"statements\":[{\"text\":\"" ++ text ++ "\"}]";
}

fn unhex(a: std.mem.Allocator, text: []const u8) ![]u8 {
    const out = try a.alloc(u8, text.len / 2);
    for (out, 0..) |*b, i| b.* = try std.fmt.parseInt(u8, text[i * 2 ..][0..2], 16);
    return out;
}

/// A reply of the codec's vectors: its token stream, and the entry that
/// tedious and `mssql` give for it.
const Vector = struct { reply: []const u8, want: []const u8 };

fn vector(a: std.mem.Allocator, name: []const u8) !Vector {
    for (cases.replies) |case| {
        if (std.mem.eql(u8, case.name, name)) return .{ .reply = try unhex(a, case.hex), .want = try unhex(a, case.want) };
    }
    return error.NoVector;
}

const Fake = struct {
    h: *Harness,
    s: *fake.Server,
    one_row: Vector,
    two_sets: Vector,
    update: Vector,
    two_errors: Vector,
    xml: Vector,
};

/// A harness with the scripted server and the rules of the tests.
fn fakeHarness(cfg: ms.Config) !Fake {
    const h = try Harness.create(null, cfg);
    errdefer h.destroy();
    const a = h.arena.allocator();
    const f: Fake = .{
        .h = h,
        .s = h.server.?,
        .one_row = try vector(a, "tinyint 1"),
        .two_sets = try vector(a, "two sets"),
        .update = try vector(a, "update"),
        .two_errors = try vector(a, "two errors"),
        .xml = try vector(a, "xml column"),
    };
    const rules = try a.alloc(fake.Rule, 10);
    const bound = try a.dupe(tds.Param, &.{
        .{ .name = "p2", .value = .{ .string = "a\"b" } },
        .{ .name = "p1", .value = .{ .number = 7 } },
    });
    const flags = try a.dupe(tds.Param, &.{
        .{ .name = "p3", .value = .{ .boolean = true } },
        .{ .name = "p2", .value = .null },
        .{ .name = "p1", .value = .{ .number = 1.5 } },
    });
    const row = try a.dupe(tds.Param, &.{.{ .name = "r0v0", .value = .{ .number = 1 } }});
    rules[0] = .{ .sql = "select 1 as v", .reply = f.one_row.reply };
    rules[1] = .{ .sql = "select @p1, @p2", .params = bound, .reply = f.two_sets.reply };
    rules[2] = .{ .sql = "select @p1, @p2, @p3", .params = flags, .reply = f.one_row.reply };
    rules[3] = .{ .sql = "update t set a = 1", .reply = f.update.reply };
    rules[4] = .{ .sql = "INSERT INTO [t] ([a]) VALUES (@r0v0);", .params = row, .reply = f.two_errors.reply };
    rules[5] = .{ .sql = "select x from docs", .reply = f.xml.reply };
    rules[6] = .{ .sql = "select hang", .act = .hang };
    rules[7] = .{ .sql = "select close", .act = .close };
    rules[8] = .{ .sql = "delete from t", .reply = f.xml.reply };
    rules[9] = .{ .sql = "select boom", .reply = f.two_errors.reply };
    f.s.rules = rules;
    return f;
}

fn results(a: std.mem.Allocator, entries: []const []const u8) ![]const u8 {
    return std.fmt.allocPrint(a, "{{\"results\":[{s}]}}", .{try std.mem.join(a, ",", entries)});
}

test "mssql fake: the login, a wrong password, and a credential that stays in the host" {
    const f = try fakeHarness(.{});
    defer f.h.destroy();
    const a = f.h.arena.allocator();
    const want = try results(a, &.{f.one_row.want});
    try f.h.expectResult("db", one("select 1 as v"), want);
    try std.testing.expectEqualStrings("prelogin\nlogin sa\nbatch initial\nrpc select 1 as v\n", f.s.logText());
    // Absent values are the defaults of the credential type: user `sa`, TDS 7.4.
    try f.h.expectResult("defaults", one("select 1 as v"), want);
    try f.h.expectResult("v73", one("select 1 as v"), want);
    // The server refuses the login: the result has the message of the server and the code of tedious.
    try f.h.expectResult("wrong", one("select 1 as v"), "{\"results\":[],\"connect\":{\"message\":\"no\",\"code\":\"ELOGIN\"}}");
    try f.h.expectResult("refused", one("select 1 as v"), "{\"results\":[],\"connect\":{\"message\":\"Failed to connect to 127.0.0.1:1 - Could not connect (sequence)\",\"code\":\"ESOCKET\"}}");
    // No connection opens for a credential that tedious uses in a way that the client does not have.
    const logins = f.s.logins;
    f.s.clearLog();
    try f.h.expectError("domain", one("select 1 as v"), "NTLM login) (limit: sql-credential)");
    try f.h.expectError("old", one("select 1 as v"), "TDS version of the credential has no native client (limit: sql-credential)");
    try f.h.expectError("instance", one("select 1 as v"), "names an instance (limit: sql-credential)");
    try f.h.expectError("badtime", one("select 1 as v"), "requestTimeout of the credential is not a whole number (limit: sql-credential)");
    try f.h.expectError("nope", one("select 1 as v"), "not in the credentials");
    try std.testing.expectEqual(logins, f.s.logins);
    try std.testing.expectEqualStrings("", f.s.logText());
    // A server that sends the client to another server.
    try f.h.settle();
    f.s.routed = true;
    try f.h.expectError("db", one("select 1 as v"), "another server (limit: sql-credential)");
    try std.testing.expect(!f.s.failed);
}

test "mssql fake: each statement is sp_executesql with its bind values, and its entry is the result of mssql" {
    const f = try fakeHarness(.{});
    defer f.h.destroy();
    const a = f.h.arena.allocator();
    // The server takes only the bytes that tedious sends for the same text and values.
    try f.h.expectResult("db", "\"statements\":[{\"text\":\"select @p1, @p2\",\"params\":[{\"name\":\"p2\",\"value\":\"a\\\"b\"},{\"name\":\"p1\",\"value\":7}]}]", try results(a, &.{f.two_sets.want}));
    try f.h.expectResult("db", "\"statements\":[{\"text\":\"select @p1, @p2, @p3\",\"params\":[{\"name\":\"p3\",\"value\":true},{\"name\":\"p2\",\"value\":null},{\"name\":\"p1\",\"value\":1.5}]}]", try results(a, &.{f.one_row.want}));
    try f.h.expectResult("db", one("update t set a = 1"), try results(a, &.{f.update.want}));
    // The ERROR tokens of the server are data of the entry: the node throws the last one.
    try f.h.expectResult("db", "\"statements\":[{\"text\":\"INSERT INTO [t] ([a]) VALUES (@r0v0);\",\"params\":[{\"name\":\"r0v0\",\"value\":1}]}]", try results(a, &.{f.two_errors.want}));
    // `single`: the result ends with the first statement that has an error.
    const three = "\"statements\":[{\"text\":\"select 1 as v\"},{\"text\":\"select boom\"},{\"text\":\"select 1 as v\"}]";
    try f.h.expectResult("db", three, try results(a, &.{ f.one_row.want, f.two_errors.want }));
    try f.h.expectResult("db", "\"mode\":\"independently\"," ++ three, try results(a, &.{ f.one_row.want, f.two_errors.want, f.one_row.want }));
    try std.testing.expect(!f.s.failed);
    try std.testing.expectEqual(@as(u32, 1), f.s.logins);
}

test "mssql fake: a call that has no exact native form ends with a marker before a statement that writes is sent" {
    const f = try fakeHarness(.{});
    defer f.h.destroy();
    // Decided when the call starts: nothing is sent, and no connection opens.
    try f.h.expectError("db", one("exec p"), "(limit: sql-statement)");
    try f.h.expectError("db", one("insert into t output inserted.id values (1)"), "(limit: sql-statement)");
    try f.h.expectError("db", "\"statements\":[{\"text\":\"update t set a = 1\"},{\"text\":\"select x from docs\"}]", "after a statement that writes (limit: sql-statement)");
    try f.h.expectError("db", "\"statements\":[{\"text\":\"update t set a = 1\"},{\"text\":\"select @p1\",\"params\":[{\"name\":\"p1\",\"value\":1}]}]", "(limit: sql-statement)");
    try f.h.expectError("db", "\"statements\":[{\"text\":\"select @p1\",\"params\":[{\"name\":\"p1\",\"value\":1e30}]}]", "no exact native form (limit: sql-statement)");
    try f.h.expectError("db", "\"statements\":[{\"text\":\"select @p1\",\"params\":[{\"name\":\"p1\",\"value\":[1]}]}]", "a string, a number, a boolean or null");
    try f.h.expectError("db", "\"mode\":\"transaction\"," ++ comptime one("select 1 as v"), "the mode for mssql");
    try std.testing.expectEqual(@as(u32, 0), f.s.logins);
    // Decided by the reply: a column of a type without a native form. The
    // statement only reads, and no statement that writes ran before it.
    try f.h.expectError("db", one("select x from docs"), "without a native form (limit: sql-type)");
    try f.h.expectError("db", "\"statements\":[{\"text\":\"select 1 as v\"},{\"text\":\"select x from docs\"},{\"text\":\"update t set a = 1\"}]", "(limit: sql-type)");
    try std.testing.expectEqual(@as(u32, 0), f.s.count("rpc update t set a = 1"));
    // Rows of a trigger, in the reply to a statement that writes: the
    // statement ran, so the error has no marker.
    try f.h.expectError("db", one("delete from t"), "without a native form (limit)");
    // The connection is in use again after each of these.
    try std.testing.expectEqual(@as(u32, 1), f.s.logins);
    try std.testing.expect(!f.s.failed);
}

test "mssql fake: a result over the limit gives the marker for a statement that reads" {
    const f = try fakeHarness(.{ .max_result = 96 });
    defer f.h.destroy();
    const large = "\"statements\":[{\"text\":\"select @p1, @p2\",\"params\":[{\"name\":\"p2\",\"value\":\"a\\\"b\"},{\"name\":\"p1\",\"value\":7}]}]";
    try f.h.expectError("db", large, "larger than 0 KB (--sql-max-result-kb) (limit: sql-max-result)");
    try f.h.expectPart("db", one("select 1 as v"), "\"v\":1");
    try std.testing.expect(!f.s.failed);
}

test "mssql fake: a used connection is made new before the next call" {
    const f = try fakeHarness(.{});
    defer f.h.destroy();
    try f.h.expectPart("db", one("select 1 as v"), "\"v\":1");
    try f.h.expectPart("db", one("select 1 as v"), "\"v\":1");
    try f.h.expectPart("db", one("select 1 as v"), "\"v\":1");
    // One login; the second and the third call send the batch of tedious with the reset flag.
    try std.testing.expectEqual(@as(u32, 1), f.s.logins);
    try std.testing.expectEqual(@as(u32, 2), f.s.count("reset"));
    try std.testing.expectEqual(@as(u32, 3), f.s.count("batch initial"));
    try std.testing.expectEqual(@as(u64, 2), f.h.client.counters.reused);
    // A server that refuses the reset: the call takes a new connection.
    f.s.no_reset = true;
    try f.h.expectPart("db", one("select 1 as v"), "\"v\":1");
    try std.testing.expectEqual(@as(u32, 2), f.s.logins);
    try std.testing.expect(!f.s.failed);
}

test "mssql fake: calls over a limit wait in order or fail" {
    const f = try fakeHarness(.{ .pool_conns = 1, .max_reqs = 3 });
    defer f.h.destroy();
    const args = "{\"credential\":\"db\",\"dialect\":\"mssql\"," ++ comptime one("select 1 as v") ++ "}";
    const first = try f.h.begin(args);
    const second = try f.h.begin(args);
    const third = try f.h.begin(args);
    // No call slot is free: the fourth call fails at once.
    try std.testing.expect(std.mem.indexOf(u8, f.h.client.start(7, 99, args, &f.h.store, sys.nowMs()).?, "--sql-max-requests") != null);
    var seq: u32 = 0;
    const order = [_]u32{ first, second, third };
    for (order) |want| {
        const a = try f.h.wait(&seq);
        try std.testing.expect(a.ok);
        try std.testing.expectEqual(want, seq);
    }
    // One connection served the three calls.
    try std.testing.expectEqual(@as(u32, 1), f.s.logins);
    try std.testing.expectEqual(@as(u64, 2), f.h.client.counters.waited);
    try std.testing.expectEqual(@as(u64, 1), f.h.client.counters.refused);
    try std.testing.expect(!f.s.failed);
}

test "mssql fake: a statement over requestTimeout is cancelled with ATTENTION, and the connection stays in use" {
    const f = try fakeHarness(.{});
    defer f.h.destroy();
    const a = f.h.arena.allocator();
    const two = "\"mode\":\"independently\",\"statements\":[{\"text\":\"select hang\"},{\"text\":\"select 1 as v\"}]";
    try f.h.expectResult("fast", two, try results(a, &.{ "{\"timeout\":150}", f.one_row.want }));
    try std.testing.expectEqualStrings("prelogin\nlogin sa\nbatch initial\nrpc select hang\nattention\nrpc select 1 as v\n", f.s.logText());
    try std.testing.expectEqual(@as(u64, 1), f.h.client.counters.timeouts);
    // `single`: the time limit ends the result.
    try f.h.expectResult("fast", "\"statements\":[{\"text\":\"select hang\"},{\"text\":\"select 1 as v\"}]", "{\"results\":[{\"timeout\":150}]}");
    try std.testing.expectEqual(@as(u32, 1), f.s.logins);
    // A server that closes while a statement runs: the step fails.
    try f.h.expectError("db", one("select close"), "the connection to the database closed");
    try f.h.expectPart("db", one("select 1 as v"), "\"v\":1");
    try std.testing.expect(!f.s.failed);
}

test "mssql fake: the TLS handshake goes inside PRELOGIN packets, then the whole stream is TLS" {
    const f = try fakeHarness(.{});
    defer f.h.destroy();
    const a = f.h.arena.allocator();
    f.s.useTls("src/shell/testdata/tls-test-cert.pem", "src/shell/testdata/tls-test-key.pem") catch return error.SkipZigTest;
    // `trustServerCertificate`: the certificate of the test is not checked.
    try f.h.expectResult("secure", one("select 1 as v"), try results(a, &.{f.one_row.want}));
    try std.testing.expectEqualStrings("prelogin\ntls\nlogin sa\nbatch initial\nrpc select 1 as v\n", f.s.logText());
    try f.h.expectResult("secure", "\"statements\":[{\"text\":\"select @p1, @p2\",\"params\":[{\"name\":\"p2\",\"value\":\"a\\\"b\"},{\"name\":\"p1\",\"value\":7}]}]", try results(a, &.{f.two_sets.want}));
    try std.testing.expectEqual(@as(u32, 1), f.s.logins);
    // A certificate that does not verify: the text of OpenSSL is not the one of Node.js.
    try f.h.expectError("verify", one("select 1 as v"), "TLS handshake with the database failed (limit: sql-credential)");
    // `encrypt: false` and a server that wants encryption: the error of tedious.
    try f.h.expectResult("clear", one("select 1 as v"), "{\"results\":[],\"connect\":{\"message\":\"Server requires encryption, set 'encrypt' config option to true.\",\"code\":\"EENCRYPT\"}}");
    try std.testing.expect(!f.s.failed);
}

// ---- a real server ------------------------------------------------------------------

test "mssql live: login over TLS, bind values, a server error and the time limit of a statement" {
    const t = target() orelse return error.SkipZigTest;
    const h = try Harness.create(t, .{});
    defer h.destroy();
    try h.expectResult("db", one("select 1 as v"), "{\"results\":[{\"sets\":[[{\"v\":1}]],\"rowsAffected\":[1],\"errors\":[]}]}");
    try h.expectResult("db", "\"statements\":[{\"text\":\"select @p1 as s, @p2 as i, @p3 as f, @p4 as b, @p5 as n\",\"params\":[" ++
        "{\"name\":\"p5\",\"value\":null},{\"name\":\"p4\",\"value\":true},{\"name\":\"p3\",\"value\":1.5},{\"name\":\"p2\",\"value\":7},{\"name\":\"p1\",\"value\":\"é\"}]}]", "{\"results\":[{\"sets\":[[{\"s\":\"é\",\"i\":7,\"f\":1.5,\"b\":true,\"n\":null}]],\"rowsAffected\":[1],\"errors\":[]}]}");
    try h.expectPart("db", one("select * from wfrt_no_such_table"), "\"message\":\"Invalid object name 'wfrt_no_such_table'.\",\"number\":208");
    try h.expectPart("wrong", one("select 1 as v"), "\"code\":\"ELOGIN\"");
    try h.expectPart("refused", one("select 1 as v"), "Could not connect (sequence)");
    // The session is new for each call: a temporary table of one call is not there in the next.
    try h.expectPart("db", one("select object_id('tempdb..#wfrt') as id"), "\"id\":null");
    // A slow statement that only reads.
    try h.expectResult("fast", one("select count_big(*) as n from sys.all_columns a cross join sys.all_columns b cross join sys.all_columns c"), "{\"results\":[{\"timeout\":150}]}");
    try h.expectPart("fast", one("select 1 as v"), "\"v\":1");
}
