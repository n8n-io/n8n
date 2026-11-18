//! The `smtp` effect on the event loop of the shard: one connection for
//! each call, as nodemailer without a pool. A call slot owns the socket,
//! the TLS session, every buffer and the `Session` (`smtp_call.zig`), which
//! runs the pure client of `core/smtp.zig`.
//!
//! The credential is read here, when the call starts. Node code gives only
//! the name of the slot. The user and the password leave the memory of the
//! call when the login ends, and again when the call ends.
//!
//! An outcome that this client cannot give exactly as nodemailer ends the
//! call with the marker `smtp-host`, and the fallback host runs the v1
//! node. The marker is given only while no MAIL command was written: see
//! `hostOnly`. `docs/smtp-effect.md` has the limits.
const std = @import("std");
const core_lib = @import("core");
const smtp = core_lib.smtp;
const mail = core_lib.mail;
const sys = @import("sys.zig");
const tls = @import("tls.zig");
const dns = @import("dns.zig");
const creds = @import("creds.zig");
const http = @import("http.zig");
const smtp_call = @import("smtp_call.zig");
const binary_store = @import("binary_store.zig");
const sql_net = @import("sql_net.zig");

const cred_bytes = 1024;
const read_passes = 256;
const marker_host = " (limit: smtp-host)";
/// The files of one message.
const max_files = 16;
/// The text fields of a call, in the order of `mail.Fields`.
const field_names = [_][]const u8{ "from", "to", "cc", "bcc", "replyTo", "subject", "text", "html", "inReplyTo", "references" };
/// The session of a slot that has no call.
const no_call: smtp.Config = .{ .name = "", .secure = false, .ignore_tls = false, .auth = false, .user = "", .pass = "", .from = "" };

pub const Config = struct {
    /// Calls in flight (`--smtp-max-requests`).
    max_reqs: u32 = 16,
    /// The arguments of one call, with the message (`--smtp-max-message-kb`).
    max_request: u32 = 8 << 20,
    /// Recipients of one message.
    max_rcpts: u32 = 256,
    /// The time limits of nodemailer.
    connect_ms: u32 = 120_000,
    greeting_ms: u32 = 30_000,
    socket_ms: u32 = 600_000,
    insecure_tls: bool = false,
    ca_file: ?[:0]const u8 = null,
    dns_servers: ?[:0]const u8 = null,
    credentials: ?*const creds.Store = null,
    /// The random bytes and the time of each message, for a test. Null takes
    /// them from the system.
    entropy: ?mail.Entropy = null,
};

const Counters = struct {
    started: u64 = 0,
    refused: u64 = 0,
    connects: u64 = 0,
    sent: u64 = 0,
    timeouts: u64 = 0,
    host: u64 = 0,
};

const State = enum(u8) { free, resolving, connecting, handshaking, talk, upgrading, done };

const Req = struct {
    state: State = .free,
    exec_id: u64 = 0,
    seq: u32 = 0,
    fd: c_int = -1,
    gen: u32 = 0,
    tls_session: ?tls.Session = null,
    insecure: bool = false,
    write_armed: bool = false,
    wsent: usize = 0,
    dns_id: u16 = 0,
    addrs: dns.Addrs = .{ .list = @splat(.{}) },
    addr_i: u8 = 0,
    port: u16 = 0,
    secure: bool = false,
    /// The end of connecting, of the current phase, and of silence on the socket.
    connect_deadline_ms: i64 = 0,
    phase_deadline_ms: i64 = 0,
    idle_deadline_ms: i64 = 0,
    started_ms: i64 = 0,
    envelope_ms: i64 = 0,
    body_ms: i64 = 0,
    wiped: bool = false,
    /// The copy of the arguments.
    args: []u8 = &.{},
    /// The fields of the message and the bytes of its files, decoded.
    text: []u8 = &.{},
    /// The message that the builder made.
    msg: []u8 = &.{},
    /// The addresses of the envelope and the Message-ID.
    env: []u8 = &.{},
    from: []const u8 = "",
    message_id: []const u8 = "",
    rcpts: []smtp.Rcpt = &.{},
    rbuf: []u8 = &.{},
    wbuf: []u8 = &.{},
    reply: []u8 = &.{},
    notes: []u8 = &.{},
    /// The result JSON, or the text of the error.
    out: []u8 = &.{},
    out_len: usize = 0,
    ok: bool = false,
    /// Host, user and password of the credential, and the EHLO name.
    cred: [cred_bytes]u8 = @splat(0),
    host_len: u16 = 0,
    wbuf_wiped: bool = false,
    sess: smtp_call.Session,

    fn host(r: *const Req) []const u8 {
        return r.cred[0..r.host_len];
    }
};

pub const Done = sql_net.Done;

pub const Client = struct {
    cfg: Config,
    poller: *sys.Poller,
    kind_conn: u8,
    tls_verify: tls.Context,
    tls_insecure: tls.Context,
    resolver: *dns.Resolver,
    reqs: []Req,
    /// Finished calls, oldest first: a ring of request indexes.
    done: []u32,
    done_head: u32 = 0,
    ndone: u32 = 0,
    /// The EHLO name when the credential has none: the rule of nodemailer.
    name_buf: [260]u8 = @splat(0),
    name_len: usize = 0,
    /// The work space of the message builder. A build ends before the next starts.
    scratch: []u8 = &.{},
    more_pending: bool = false,
    now_ms: i64 = 0,
    last_scan_ms: i64 = 0,
    counters: Counters = .{},

    /// Reserve every buffer. `c` must not move afterwards.
    pub fn init(c: *Client, gpa: std.mem.Allocator, cfg: Config, poller: *sys.Poller, kind_conn: u8, kind_dns: u8) !void {
        std.debug.assert(cfg.max_reqs > 0 and cfg.max_rcpts > 0);
        const reserve = core_lib.arena.reserve;
        c.* = .{
            .cfg = cfg,
            .poller = poller,
            .kind_conn = kind_conn,
            .tls_verify = try tls.Context.client(cfg.insecure_tls, cfg.ca_file),
            .tls_insecure = try tls.Context.client(true, null),
            .resolver = try gpa.create(dns.Resolver),
            .reqs = try gpa.alloc(Req, cfg.max_reqs),
            .done = try gpa.alloc(u32, cfg.max_reqs),
        };
        try c.resolver.init(poller, kind_dns, cfg.dns_servers);
        c.scratch = try reserve(gpa, u8, mail.scratch_min);
        for (c.reqs) |*r| {
            const rbuf = try reserve(gpa, u8, 64 << 10);
            // MAIL FROM, every RCPT TO and DATA go in one write.
            const wbuf = try reserve(gpa, u8, (64 << 10) + 300 * @as(usize, cfg.max_rcpts));
            const reply = try reserve(gpa, u8, 64 << 10);
            const notes = try reserve(gpa, u8, 256 << 10);
            r.* = .{
                .sess = smtp_call.Session.init(no_call, &.{}, "", rbuf, wbuf, reply, notes),
                .rbuf = rbuf,
                .wbuf = wbuf,
                .reply = reply,
                .notes = notes,
                .args = try reserve(gpa, u8, cfg.max_request),
                .text = try reserve(gpa, u8, cfg.max_request),
                .msg = try reserve(gpa, u8, cfg.max_request),
                .env = try reserve(gpa, u8, 64 + 300 * @as(usize, cfg.max_rcpts)),
                .rcpts = try gpa.alloc(smtp.Rcpt, cfg.max_rcpts),
                // The result of a call that builds only is the message in base64.
                .out = try reserve(gpa, u8, @max(512 << 10, std.base64.url_safe_no_pad.Encoder.calcSize(cfg.max_request) + 1024)),
            };
        }
        c.name_len = defaultName(&c.name_buf).len;
    }

    pub fn deinit(c: *Client) void {
        for (c.reqs) |*r| {
            if (r.tls_session) |s| s.deinit();
            r.tls_session = null;
            if (r.fd >= 0) sys.close(r.fd);
            r.fd = -1;
        }
        c.resolver.deinit();
        c.tls_verify.deinit();
        c.tls_insecure.deinit();
    }

    // ---- entry points ---------------------------------------------------------

    /// Start the call of one `smtp` effect. `args` is copied. The answer is
    /// null, or the text of an error when no call slot is free: every
    /// other outcome comes through `nextDone`.
    pub fn start(c: *Client, exec_id: u64, seq: u32, args: []const u8, store: ?*const creds.Store, now_ms: i64) ?[]const u8 {
        c.now_ms = now_ms;
        c.counters.started += 1;
        const ri = c.freeReq() orelse {
            c.counters.refused += 1;
            return "smtp: too many calls in flight (--smtp-max-requests); the step can run again (limit)";
        };
        const r = &c.reqs[ri];
        r.state = .resolving;
        r.exec_id = exec_id;
        r.seq = seq;
        r.out_len = 0;
        r.ok = false;
        r.wiped = false;
        r.wbuf_wiped = false;
        r.wsent = 0;
        r.addr_i = 0;
        r.started_ms = now_ms;
        r.envelope_ms = now_ms;
        r.body_ms = 0;
        r.connect_deadline_ms = now_ms + c.cfg.connect_ms;
        r.phase_deadline_ms = r.connect_deadline_ms;
        r.idle_deadline_ms = std.math.maxInt(i64);
        if (c.prepare(ri, args, store)) |msg| {
            c.failText(ri, &.{msg});
            return null;
        }
        // A call that builds only has its result now.
        if (r.ok) c.pushDone(ri) else c.open(ri);
        return null;
    }

    fn freeReq(c: *const Client) ?u32 {
        for (c.reqs, 0..) |*r, i| {
            if (r.state == .free) return std.math.cast(u32, i);
        }
        return null;
    }

    /// Check the call, read its credential and make its session. The
    /// answer is the text of an error, or null.
    fn prepare(c: *Client, ri: u32, args: []const u8, store: ?*const creds.Store) ?[]const u8 {
        const r = &c.reqs[ri];
        if (args.len > r.args.len) return "smtp: the call is larger than --smtp-max-message-kb" ++ marker_host;
        @memcpy(r.args[0..args.len], args);
        var call: smtp_call.Call = .{};
        if (smtp_call.parseCall(r.args[0..args.len], &call)) |msg| return msg;
        if (call.build) {
            const built = switch (c.compose(r, r.args[0..args.len])) {
                .message => |m| m,
                .refused => |msg| return msg,
            };
            return writeBuilt(r, built);
        }
        const st = store orelse c.cfg.credentials orelse return "smtp: the runtime has no credentials";
        var set: smtp_call.Settings = .{};
        if (smtp_call.loadSettings(st, call.credential, &set)) |msg| return msg;
        const name = if (set.name.len > 0) set.name else c.name_buf[0..c.name_len];
        // The values of the credential are copied: the store can change while the call runs.
        var cred: creds.Out = .{ .buf = &r.cred };
        const parts = [_][]const u8{ set.host, set.user, set.pass, name };
        for (parts) |p| cred.put(p) catch return "smtp: a value of the credential is too long" ++ marker_host;
        r.host_len = std.math.cast(u16, set.host.len) orelse 0;
        if (r.host_len == 0 or r.host_len > dns.max_host) return "smtp: the host of the credential is too long" ++ marker_host;
        const user = r.cred[set.host.len..][0..set.user.len];
        const pass = r.cred[set.host.len + set.user.len ..][0..set.pass.len];
        r.port = set.port;
        r.secure = set.secure;
        r.insecure = call.insecure;
        const built = switch (c.compose(r, r.args[0..args.len])) {
            .message => |m| m,
            .refused => |msg| return msg,
        };
        r.from = built.from;
        r.message_id = built.message_id;
        const cfg: smtp.Config = .{
            .name = r.cred[set.host.len + set.user.len + set.pass.len ..][0..name.len],
            .secure = set.secure,
            .ignore_tls = set.ignore_tls,
            .auth = set.auth,
            .user = user,
            .pass = pass,
            .from = built.from,
        };
        r.sess = smtp_call.Session.init(cfg, r.rcpts[0..built.rcpts], built.message, r.rbuf, r.wbuf, r.reply, r.notes);
        return null;
    }

    const Composed = union(enum) { message: mail.Built, refused: []const u8 };

    /// Build the message from the fields of the call. A call that the
    /// builder does not take goes to the host: no connection is open yet.
    fn compose(c: *Client, r: *Req, raw: []const u8) Composed {
        var text: creds.Out = .{ .buf = r.text };
        var values: [field_names.len][]const u8 = @splat("");
        for (field_names, &values) |name, *v| {
            const member = std.mem.trim(u8, http.member(raw, name) orelse continue, " \t\r\n");
            if (std.mem.eql(u8, member, "null")) continue;
            v.* = decode(&text, member) orelse return .{ .refused = "smtp: a field of the call must be a string" };
        }
        var files: [max_files]mail.Attachment = @splat(.{ .filename = "", .content = "" });
        const nfiles = readFiles(&text, raw, &files) catch |e| return .{ .refused = fileError(e) };
        const fields: mail.Fields = .{
            .from = values[0],
            .to = values[1],
            .cc = values[2],
            .bcc = values[3],
            .reply_to = values[4],
            .subject = values[5],
            .text = values[6],
            .html = values[7],
            .attachments = files[0..nfiles],
            .in_reply_to = values[8],
            .references = values[9],
            .keep_bcc = std.mem.eql(u8, std.mem.trim(u8, http.member(raw, "keepBcc") orelse "false", " \t\r\n"), "true"),
        };
        const work: mail.Work = .{ .out = r.msg, .scratch = c.scratch, .notes = r.env, .rcpts = r.rcpts };
        const built = mail.build(fields, c.cfg.entropy orelse freshEntropy(c.now_ms), work) catch |e| return .{ .refused = switch (e) {
            error.HostOnly => "smtp: the native client does not build this message" ++ marker_host,
            error.NoSpace => "smtp: the message is larger than --smtp-max-message-kb" ++ marker_host,
        } };
        return .{ .message = built };
    }

    /// A readiness event of the connection of a call.
    pub fn onConn(c: *Client, idx: u32, gen: u32, ev: sys.Ready, now_ms: i64) void {
        c.now_ms = now_ms;
        if (idx >= c.reqs.len) return;
        const r = &c.reqs[idx];
        if (r.fd < 0 or (r.gen & 0xFFFFFF) != gen) return;
        // kqueue write interest is one-shot; epoll keeps it until cleared.
        if (ev.writable and !sys.is_linux) r.write_armed = false;
        switch (r.state) {
            .free, .resolving, .done => {},
            .connecting => if (ev.writable or ev.eof) c.onConnected(idx),
            .handshaking, .upgrading => c.doHandshake(idx),
            .talk => {
                if (ev.writable) c.flush(idx);
                const same = r.fd >= 0 and (r.gen & 0xFFFFFF) == gen and r.state == .talk;
                if (same and (ev.readable or ev.eof)) c.readMore(idx);
            },
        }
    }

    pub fn onDns(c: *Client, fd: c_int, ev: sys.Ready) void {
        c.resolver.onReady(fd, ev);
    }

    /// Work after a round of events: finished name lookups, bytes that a
    /// TLS session holds, time limits. Call once per loop iteration.
    pub fn afterEvents(c: *Client, now_ms: i64) void {
        c.now_ms = now_ms;
        c.resolver.tick(now_ms);
        // Each lookup that ends frees its query: the query table bounds the loop.
        for (0..dns.max_queries + 1) |_| {
            const d = c.resolver.takeDone() orelse break;
            c.onResolved(d);
        }
        if (c.more_pending) c.readPending();
        if (now_ms - c.last_scan_ms >= 100) {
            c.last_scan_ms = now_ms;
            c.scanTimeouts();
        }
    }

    pub fn hasWork(c: *const Client) bool {
        return c.more_pending or c.ndone > 0 or c.resolver.hasDone();
    }

    /// The oldest finished call, or null. Give it back with `release`.
    pub fn nextDone(c: *const Client) ?Done {
        if (c.ndone == 0) return null;
        const ri = c.done[c.done_head];
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .done);
        return .{ .req = ri, .exec_id = r.exec_id, .seq = r.seq, .ok = r.ok, .payload = r.out[0..r.out_len] };
    }

    /// Free the call that `nextDone` gave.
    pub fn release(c: *Client, ri: u32) void {
        std.debug.assert(c.ndone > 0 and c.done[c.done_head] == ri);
        const r = &c.reqs[ri];
        c.done_head = (c.done_head + 1) % c.cfg.max_reqs;
        c.ndone -= 1;
        if (r.out_len > 64 << 10) sys.releasePages(r.out[0..r.out_len]);
        r.state = .free;
    }

    // ---- the end of a call ------------------------------------------------------

    /// The user and the password leave the memory of the call.
    fn wipe(r: *Req) void {
        if (r.wiped) return;
        @memset(&r.cred, 0);
        r.wiped = true;
    }

    /// The login commands leave the write buffer, when nothing waits in it.
    fn wipeCommands(r: *Req) void {
        if (r.wbuf_wiped or r.sess.pending().len != 0) return;
        @memset(r.wbuf[0..@min(r.wbuf.len, 4 * cred_bytes)], 0);
        r.wbuf_wiped = true;
    }

    fn closeSocket(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        if (r.tls_session) |s| s.deinit();
        r.tls_session = null;
        if (r.fd >= 0) {
            c.poller.remove(r.fd);
            sys.close(r.fd);
        }
        r.fd = -1;
        r.gen +%= 1;
        r.write_armed = false;
    }

    fn pushDone(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state != .free and r.state != .done and c.ndone < c.done.len);
        c.closeSocket(ri);
        @memset(&r.cred, 0);
        @memset(r.wbuf[0..@min(r.wbuf.len, 4 * cred_bytes)], 0);
        r.wiped = true;
        r.wbuf_wiped = true;
        // The pages of a large message go back to the system.
        sys.releasePages(r.args);
        sys.releasePages(r.text);
        r.state = .done;
        c.done[(c.done_head + c.ndone) % c.cfg.max_reqs] = ri;
        c.ndone += 1;
    }

    /// End a call with an error text: the step fails, or, with a marker,
    /// the fallback host runs it.
    fn failText(c: *Client, ri: u32, parts: []const []const u8) void {
        const r = &c.reqs[ri];
        var o: creds.Out = .{ .buf = r.out };
        // A text that does not fit the result buffer: a short one takes its place.
        for (parts) |p| o.put(p) catch {
            o.len = 0;
            break;
        };
        const short = "smtp: error";
        if (o.len == 0) {
            o.len = @min(short.len, r.out.len);
            @memcpy(r.out[0..o.len], short[0..o.len]);
        }
        r.out_len = o.len;
        r.ok = false;
        c.pushDone(ri);
    }

    /// This client has no exact form for what happened. No MAIL command
    /// was written (the callers are the name lookup, the connect, the TLS
    /// handshakes and the limits before the envelope), so the fallback
    /// host can send the message: it goes out once.
    fn hostOnly(c: *Client, ri: u32, what: []const u8) void {
        std.debug.assert(!c.reqs[ri].sess.client.envelopeStarted());
        c.counters.host += 1;
        c.failText(ri, &.{ "smtp: the native client cannot do this: ", what, marker_host });
    }

    /// The session ended: the outcome is the result of the call.
    fn finish(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        var o: smtp.Out = .{ .buf = r.out };
        const env: u64 = @intCast(@max(0, (if (r.body_ms > 0) r.body_ms else c.now_ms) - r.envelope_ms));
        const msg: u64 = @intCast(@max(0, if (r.body_ms > 0) c.now_ms - r.body_ms else 0));
        const outcome = r.sess.writeOutcome(&o, env, msg) catch {
            return c.failText(ri, &.{"smtp: the result does not fit its buffer (limit)"});
        };
        if (outcome == .result and r.sess.client.succeeded()) {
            writeEnvelope(r, &o) catch return c.failText(ri, &.{"smtp: the result does not fit its buffer (limit)"});
        }
        r.out_len = o.len;
        r.ok = outcome == .result;
        if (r.ok and r.sess.client.succeeded()) c.counters.sent += 1;
        if (!r.ok and !r.sess.client.messageSent()) c.counters.host += 1;
        c.pushDone(ri);
    }

    fn act(c: *Client, ri: u32, step: smtp_call.Step) void {
        const r = &c.reqs[ri];
        if (r.sess.client.envelopeStarted()) {
            wipe(r);
        } else {
            r.envelope_ms = c.now_ms;
        }
        if (r.body_ms == 0 and r.sess.client.messageSent()) r.body_ms = c.now_ms;
        switch (step) {
            .io => c.flush(ri),
            .tls => c.upgrade(ri),
            .ended => c.finish(ri),
        }
    }

    // ---- connect ------------------------------------------------------------------

    fn token(c: *const Client, ri: u32) u64 {
        return sys.makeToken(c.kind_conn, c.reqs[ri].gen, ri);
    }

    fn armWrite(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        if (r.write_armed) return;
        // Without the interest the write would wait for ever: the time limit of the socket ends it.
        c.poller.wantWrite(r.fd, c.token(ri)) catch return;
        r.write_armed = true;
    }

    fn disarmWrite(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        if (!sys.is_linux or !r.write_armed) return;
        c.poller.doneWrite(r.fd, c.token(ri));
        r.write_armed = false;
    }

    fn open(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .resolving and r.fd < 0);
        if (sys.numericAddr(r.host(), r.port)) |a| {
            r.addrs.n = 1;
            r.addrs.list[0] = a;
            r.state = .connecting;
            return c.connectNext(ri);
        }
        switch (c.resolver.lookup(r.host(), c.now_ms)) {
            .hit => |a| c.onAddrs(ri, a),
            .pending => |id| r.dns_id = id,
            // nodemailer has its own resolver and its own text for this.
            .err => c.hostOnly(ri, "a host name without an address"),
        }
    }

    fn onAddrs(c: *Client, ri: u32, addrs: dns.Addrs) void {
        const r = &c.reqs[ri];
        r.addrs = addrs;
        for (r.addrs.list[0..r.addrs.n]) |*a| a.port = r.port;
        r.addr_i = 0;
        r.state = .connecting;
        c.connectNext(ri);
    }

    fn onResolved(c: *Client, d: dns.Resolver.Done) void {
        for (c.reqs, 0..) |*r, i| {
            if (r.state != .resolving or r.dns_id != d.id) continue;
            const ri = std.math.cast(u32, i) orelse continue;
            switch (d.result) {
                .hit => |a| c.onAddrs(ri, a),
                .pending, .err => c.hostOnly(ri, "a host name without an address"),
            }
        }
    }

    fn connectNext(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .connecting and r.fd < 0);
        // Each pass takes one address.
        for (0..dns.max_addrs) |_| {
            if (r.addr_i >= r.addrs.n) break;
            const addr = r.addrs.list[r.addr_i];
            r.addr_i += 1;
            // This address has no route: the next one is tried.
            const fd = sys.connectAddr(addr) catch continue;
            r.fd = fd;
            c.poller.addRead(fd, c.token(ri)) catch return c.connectError(ri, 0);
            return c.armWrite(ri);
        }
        c.connectError(ri, 0);
    }

    /// The connect to the last address failed with the errno `code`.
    fn connectError(c: *Client, ri: u32, code: c_int) void {
        const r = &c.reqs[ri];
        c.closeSocket(ri);
        // With more than one address, Node.js reports all of them in one error.
        if (r.addrs.n != 1 or code <= 0) return c.hostOnly(ri, "a connect error for more than one address");
        var ab: [64]u8 = @splat(0);
        const step = r.sess.onTransportError(.socket, &.{ "connect ", sys.errnoName(code), " ", sql_net.addrText(r.addrs.list[0], &ab) });
        c.act(ri, step);
    }

    fn onConnected(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        const err = sys.socketError(r.fd);
        if (err != 0) {
            if (r.addr_i >= r.addrs.n) return c.connectError(ri, err);
            c.closeSocket(ri);
            return c.connectNext(ri);
        }
        c.disarmWrite(ri);
        c.counters.connects += 1;
        if (!r.secure) return c.connected(ri);
        if (!c.startTls(ri)) return;
        r.state = .handshaking;
        c.doHandshake(ri);
    }

    /// The socket is ready for the session: the greeting has its time limit.
    fn connected(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        r.state = .talk;
        r.phase_deadline_ms = c.setupDeadline(r);
        r.idle_deadline_ms = c.now_ms + c.cfg.socket_ms;
    }

    /// `_remainingSetupTime`: the greeting time, cut by what is left of the connection time.
    fn setupDeadline(c: *const Client, r: *const Req) i64 {
        return c.now_ms + @min(@as(i64, c.cfg.greeting_ms), @max(r.connect_deadline_ms - c.now_ms, 1));
    }

    fn startTls(c: *Client, ri: u32) bool {
        const r = &c.reqs[ri];
        const ctx = if (r.insecure) c.tls_insecure else c.tls_verify;
        const name = r.host();
        const is_ip = sys.numericAddr(name, 0) != null;
        r.tls_session = tls.Session.connect(ctx, r.fd, name, is_ip, "") catch {
            c.tlsFailed(ri);
            return false;
        };
        return true;
    }

    /// STARTTLS was taken: the handshake has the time limit of the upgrade.
    fn upgrade(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        std.debug.assert(r.state == .talk and r.tls_session == null);
        if (!c.startTls(ri)) return;
        r.state = .upgrading;
        r.phase_deadline_ms = c.setupDeadline(r);
        c.doHandshake(ri);
    }

    fn doHandshake(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        const s = r.tls_session orelse return c.tlsFailed(ri);
        switch (s.handshake()) {
            .n => {
                c.disarmWrite(ri);
                const was_upgrade = r.state == .upgrading;
                c.connected(ri);
                if (was_upgrade) c.afterSecured(ri);
            },
            .want_read => {},
            .want_write => c.armWrite(ri),
            .closed, .failed => c.tlsFailed(ri),
        }
    }

    /// The socket has TLS after STARTTLS: EHLO goes again.
    fn afterSecured(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        r.phase_deadline_ms = std.math.maxInt(i64);
        switch (r.sess.onSecured()) {
            .io => c.flush(ri),
            .ended => c.finish(ri),
            // The session asks for TLS once.
            .tls => {},
        }
    }

    /// The server closed the connection: the session ends with the error of nodemailer.
    fn closed(c: *Client, ri: u32) void {
        switch (c.reqs[ri].sess.onClose()) {
            .ended => c.finish(ri),
            // A close ends every session.
            .io, .tls => {},
        }
    }

    /// The text of a TLS error of Node.js has no native form.
    fn tlsFailed(c: *Client, ri: u32) void {
        c.hostOnly(ri, "a TLS handshake that failed");
    }

    // ---- bytes ------------------------------------------------------------------------

    fn ioRead(r: *const Req, buf: []u8) sql_net.IoStep {
        return sql_net.ioRead(r.tls_session, r.fd, buf);
    }

    fn ioWrite(r: *const Req, buf: []const u8) sql_net.IoStep {
        return sql_net.ioWrite(r.tls_session, r.fd, buf);
    }

    /// Write what is pending, and the parts of the message after it.
    fn flush(c: *Client, ri: u32) void {
        const r = &c.reqs[ri];
        if (r.state != .talk) return;
        // Each pass writes bytes, takes the next part of the message, or ends.
        for (0..r.text.len + r.wbuf.len + 16) |_| {
            const p = r.sess.pending();
            if (p.len == 0) break;
            if (r.wsent == p.len) {
                r.wsent = 0;
                r.sess.wrote();
                continue;
            }
            switch (ioWrite(r, p[r.wsent..])) {
                .n => |n| {
                    r.wsent += n;
                    r.idle_deadline_ms = c.now_ms + c.cfg.socket_ms;
                },
                .again, .want_write => return c.armWrite(ri),
                .closed => return c.closed(ri),
            }
        }
        c.disarmWrite(ri);
        if (r.sess.client.envelopeStarted()) wipeCommands(r);
    }

    fn readMore(c: *Client, ri: u32) void {
        const gen = c.reqs[ri].gen;
        for (0..read_passes) |_| {
            const r = &c.reqs[ri];
            if (r.gen != gen or r.state != .talk) return;
            switch (ioRead(r, r.sess.readSpace())) {
                .n => |n| {
                    r.idle_deadline_ms = c.now_ms + c.cfg.socket_ms;
                    // The greeting came: its time limit ends.
                    r.phase_deadline_ms = std.math.maxInt(i64);
                    c.act(ri, r.sess.onBytes(n));
                },
                .again => return,
                .want_write => return c.armWrite(ri),
                .closed => return c.closed(ri),
            }
        }
        // The TLS session can hold more: `afterEvents` reads again.
        c.more_pending = true;
    }

    fn readPending(c: *Client) void {
        c.more_pending = false;
        for (c.reqs, 0..) |*r, i| {
            const s = r.tls_session orelse continue;
            if (r.state == .talk and s.hasPending()) c.readMore(std.math.cast(u32, i) orelse continue);
        }
    }

    // ---- time limits ---------------------------------------------------------------

    fn scanTimeouts(c: *Client) void {
        for (c.reqs, 0..) |*r, i| {
            const ri = std.math.cast(u32, i) orelse continue;
            const which: smtp.Timeout = switch (r.state) {
                .free, .done => continue,
                .resolving, .connecting, .handshaking => if (c.now_ms >= r.connect_deadline_ms) .connect else continue,
                .upgrading => if (c.now_ms >= r.phase_deadline_ms) .upgrade else continue,
                .talk => if (c.now_ms >= r.phase_deadline_ms) .greeting else if (c.now_ms >= r.idle_deadline_ms) .socket else continue,
            };
            c.counters.timeouts += 1;
            c.act(ri, r.sess.onTimeout(which));
        }
    }
};

/// The result of a call that builds only: `{"raw":…,"messageId":…}`. `raw`
/// is the message in base64 with `-` and `_`, and without padding, as the
/// Gmail node of n8n writes it (`encodeEmail`). The answer is null, or the text of a limit.
fn writeBuilt(r: *Req, built: mail.Built) ?[]const u8 {
    std.debug.assert(built.message.len > 0 and !r.ok);
    const enc = std.base64.url_safe_no_pad.Encoder;
    const head = "{\"raw\":\"";
    const size = enc.calcSize(built.message.len);
    if (head.len + size + built.message_id.len * 6 + 32 > r.out.len) return "smtp: the message is larger than --smtp-max-message-kb" ++ marker_host;
    @memcpy(r.out[0..head.len], head);
    const text = enc.encode(r.out[head.len..][0..size], built.message);
    std.debug.assert(text.len == size);
    var o: smtp.Out = .{ .buf = r.out, .len = head.len + size };
    o.put("\",\"messageId\":") catch return "smtp: the result does not fit its buffer (limit)";
    o.string(built.message_id) catch return "smtp: the result does not fit its buffer (limit)";
    o.byte('}') catch return "smtp: the result does not fit its buffer (limit)";
    r.out_len = o.len;
    r.ok = true;
    return null;
}

/// `envelope` and `messageId` of `info`, at the end of the result.
fn writeEnvelope(r: *const Req, o: *smtp.Out) error{NoSpace}!void {
    std.debug.assert(o.len > 0 and o.buf[o.len - 1] == '}');
    o.len -= 1;
    try o.put(",\"envelope\":{\"from\":");
    if (r.from.len > 0) try o.string(r.from) else try o.put("false");
    try o.put(",\"to\":[");
    for (r.sess.client.rcpts, 0..) |rcpt, i| {
        if (i > 0) try o.byte(',');
        try o.string(rcpt.addr);
    }
    try o.put("]},\"messageId\":");
    try o.string(r.message_id);
    try o.byte('}');
}

/// The random bytes of a message, and its time.
fn freshEntropy(now_ms: i64) mail.Entropy {
    var bytes: [24]u8 = @splat(0);
    sys.randomBytes(&bytes);
    return .{ .boundary = bytes[0..8].*, .id = bytes[8..24].*, .now_ms = now_ms };
}

const FileError = error{ BadFile, TooMany, NoStore, Missing, TooLarge };

fn fileError(e: FileError) []const u8 {
    return switch (e) {
        error.BadFile => "smtp: a file of the call needs 'filename', and 'data' in base64 or a stored 'id'",
        error.TooMany => "smtp: the message has more files than the client takes" ++ marker_host,
        error.NoStore => "smtp: the runtime cannot read the stored file of the call" ++ marker_host,
        error.Missing => "smtp: a stored file of the call is missing" ++ marker_host,
        error.TooLarge => "smtp: the files are larger than --smtp-max-message-kb" ++ marker_host,
    };
}

/// The files of the call, read into `text`. The answer is their count.
fn readFiles(text: *creds.Out, raw: []const u8, files: *[max_files]mail.Attachment) FileError!usize {
    const list = std.mem.trim(u8, http.member(raw, "attachments") orelse return 0, " \t\r\n");
    if (std.mem.eql(u8, list, "null")) return 0;
    var it = http.Elements.init(list) orelse return error.BadFile;
    var n: usize = 0;
    // One file more than the limit ends the loop.
    for (0..max_files + 1) |_| {
        const item = it.next() orelse break;
        if (n == max_files) return error.TooMany;
        files[n] = try readFile(text, item);
        n += 1;
    }
    return n;
}

fn stringOf(item: []const u8, name: []const u8) ?[]const u8 {
    const raw = std.mem.trim(u8, http.member(item, name) orelse return null, " \t\r\n");
    return if (std.mem.eql(u8, raw, "null")) null else raw;
}

/// One file of the call: `{filename, cid?, data, id?}`. `data` is base64,
/// or the mode name of n8n's binary data store with the file in `id`.
fn readFile(text: *creds.Out, item: []const u8) FileError!mail.Attachment {
    const filename = decode(text, stringOf(item, "filename") orelse return error.BadFile) orelse return error.BadFile;
    const cid = if (stringOf(item, "cid")) |raw| decode(text, raw) orelse return error.BadFile else "";
    const kind = if (stringOf(item, "contentType")) |raw| decode(text, raw) orelse return error.BadFile else "";
    const data = http.plainString(stringOf(item, "data") orelse return error.BadFile) orelse return error.BadFile;
    const space = text.buf[text.len..];
    if (binary_store.isStoredMarker(data)) {
        const id = http.plainString(stringOf(item, "id") orelse return error.BadFile) orelse return error.BadFile;
        const storage = binary_store.storagePath() orelse return error.NoStore;
        var fixed = std.heap.FixedBufferAllocator.init(space);
        const stored = binary_store.read(fixed.allocator(), storage, id, space.len) catch |e| return switch (e) {
            error.TooLarge, error.OutOfMemory => error.TooLarge,
            error.NotFound => error.Missing,
            error.NoStore, error.BadId, error.Io => error.NoStore,
        };
        text.len += stored.len;
        return .{ .filename = filename, .cid = cid, .content = stored, .content_type = kind };
    }
    const dec = std.base64.standard.Decoder;
    const n = dec.calcSizeForSlice(data) catch return error.BadFile;
    if (n > space.len) return error.TooLarge;
    dec.decode(space[0..n], data) catch return error.BadFile;
    text.len += n;
    return .{ .filename = filename, .cid = cid, .content = space[0..n], .content_type = kind };
}

/// A raw JSON string of the call, decoded into `out`.
fn decode(out: *creds.Out, raw: []const u8) ?[]const u8 {
    const at = out.len;
    http.unescape(raw, out) catch return null; // not a string, or too long: the caller reports it
    return out.buf[at..out.len];
}

/// `_getHostname` of nodemailer: the host name of the machine when it has
/// a dot, an IPv4 address in brackets, and `[127.0.0.1]` if not.
fn defaultName(buf: []u8) []const u8 {
    std.debug.assert(buf.len >= 16);
    const fallback = "[127.0.0.1]";
    const name = sys.hostName(buf[1 .. buf.len - 1]);
    if (name.len == 0 or std.mem.indexOfScalar(u8, name, '.') == null) {
        @memcpy(buf[0..fallback.len], fallback);
        return buf[0..fallback.len];
    }
    if (sys.parseIp4(name) == null) {
        std.mem.copyForwards(u8, buf[0..name.len], name);
        return buf[0..name.len];
    }
    buf[0] = '[';
    buf[name.len + 1] = ']';
    return buf[0 .. name.len + 2];
}
