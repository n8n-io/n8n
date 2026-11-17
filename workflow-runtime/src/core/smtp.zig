//! The SMTP client of the `smtp` effect: a pure state machine. It follows
//! SMTPConnection of nodemailer 10.1.4 as the Send Email node of n8n uses
//! it (`docs/smtp-effect.md` has the statement of v1, with file and line).
//!
//! Nothing here reads a socket or a clock. The shell owns the connection,
//! frames the replies with `takeReply`, gives each one to `onReply`, writes
//! the bytes of `out`, and does what the answer says: wait, start TLS, send
//! the message, or stop. Every buffer has a fixed size. A text that does
//! not fit ends the call with a limit, never with a part of the text.
const std = @import("std");
const pgwire = @import("pgwire.zig");

pub const Out = pgwire.Out;

/// A part of the notes buffer of one client.
const Span = struct { at: u32 = 0, len: u32 = 0 };

/// The `code` of a nodemailer error.
pub const Code = enum(u8) { protocol, connection, tls, auth, envelope, message, timeout, socket, dns };

pub fn codeName(code: Code) []const u8 {
    return switch (code) {
        .protocol => "EPROTOCOL",
        .connection => "ECONNECTION",
        .tls => "ETLS",
        .auth => "EAUTH",
        .envelope => "EENVELOPE",
        .message => "EMESSAGE",
        .timeout => "ETIMEDOUT",
        .socket => "ESOCKET",
        .dns => "EDNS",
    };
}

/// The phase whose timer ended (`_startPhase` and the socket timeout).
pub const Timeout = enum(u8) { connect, greeting, upgrade, socket };

/// What the shell does after a call of the client.
pub const Next = enum(u8) {
    /// Write `out`, then read the next reply.
    wait,
    /// Drop the bytes that are read, start TLS on the socket, then call `onSecured`.
    tls,
    /// Write `out`, send the message through a `Stuffer`, then read the next reply.
    data,
    /// The server took the message. `writeResult` gives the result.
    done,
    /// The call failed. `writeFailure` gives the error.
    failed,
};

pub const RcptState = enum(u8) { queued, sent, accepted, rejected };

/// One recipient of the envelope. The shell owns the list; the client
/// writes the state and the reply of a rejection.
pub const Rcpt = struct {
    addr: []const u8,
    state: RcptState = .queued,
    reply: Span = .{},
};

pub const Config = struct {
    /// The name after EHLO. The client drops CR and LF from it.
    name: []const u8,
    /// The socket has TLS from the start (`secure` of the credential).
    secure: bool,
    /// `ignoreTLS`: no STARTTLS when the server offers it.
    ignore_tls: bool,
    /// The credential has a user or a password.
    auth: bool,
    user: []const u8,
    pass: []const u8,
    /// The sender of the envelope, trimmed. Empty when the message has none.
    from: []const u8,
};

const State = enum(u8) { greeting, ehlo, helo, starttls, upgrading, login_user, login_pass, auth_end, mail, rcpt, data, empty_end, stream, done, failed };

const Method = enum(u8) { plain, login, cram_md5 };

fn methodName(m: Method) []const u8 {
    return switch (m) {
        .plain => "PLAIN",
        .login => "LOGIN",
        .cram_md5 => "CRAM-MD5",
    };
}

fn authCommand(m: Method) []const u8 {
    return switch (m) {
        .plain => "AUTH PLAIN",
        .login => "AUTH LOGIN",
        .cram_md5 => "AUTH CRAM-MD5",
    };
}

pub const Failure = struct {
    code: Code = .protocol,
    message: Span = .{},
    response: ?Span = null,
    command: []const u8 = "CONN",
    /// Every recipient was rejected: the error has `rejected` and `rejectedErrors`.
    all_rejected: bool = false,
    /// A limit of this client, not an error of nodemailer.
    limit: bool = false,
};

/// The most replies with code 334 that the end of a login takes.
const max_auth_rounds = 8;

pub const Client = struct {
    cfg: Config,
    rcpts: []Rcpt,
    /// The commands to write.
    out: Out,
    /// The texts the result needs: the EHLO reply, the replies of
    /// rejections, the last reply and the message of the error.
    notes: Out,
    state: State = .greeting,
    secure: bool,
    allows_auth: bool = false,
    pipelining: bool = false,
    smtputf8: bool = false,
    has_plain: bool = false,
    has_login: bool = false,
    has_cram: bool = false,
    method: Method = .plain,
    pipelined: bool = false,
    using_utf8: bool = false,
    sent: u32 = 0,
    replied: u32 = 0,
    accepted: u32 = 0,
    auth_rounds: u8 = 0,
    sent_message: bool = false,
    ehlo: ?Span = null,
    mail_reply: ?Span = null,
    response: Span = .{},
    failure: Failure = .{},

    pub fn init(cfg: Config, rcpts: []Rcpt, out_buf: []u8, notes_buf: []u8) Client {
        return .{ .cfg = cfg, .rcpts = rcpts, .out = .{ .buf = out_buf }, .notes = .{ .buf = notes_buf }, .secure = cfg.secure };
    }

    /// True when a part of the message can be with the server: the fallback
    /// host must not send the message again.
    pub fn messageSent(c: *const Client) bool {
        return c.sent_message;
    }

    fn text(c: *const Client, s: Span) []const u8 {
        std.debug.assert(s.at + s.len <= c.notes.len);
        return c.notes.buf[s.at..][0..s.len];
    }

    fn keep(c: *Client, s: []const u8) error{NoSpace}!Span {
        const at = std.math.cast(u32, c.notes.len) orelse return error.NoSpace;
        const len = std.math.cast(u32, s.len) orelse return error.NoSpace;
        try c.notes.put(s);
        return .{ .at = at, .len = len };
    }

    /// A limit of this client ends the call.
    fn limit(c: *Client, what: []const u8) Next {
        c.failure = .{ .limit = true, .command = what };
        c.state = .failed;
        return .failed;
    }

    /// `_formatError`: the message, then `: ` and the reply when there is one.
    fn fail(c: *Client, code: Code, parts: []const []const u8, reply: ?[]const u8, command: []const u8) Next {
        const at = c.notes.len;
        for (parts) |p| c.notes.put(p) catch return c.limit("the text of the error");
        var response: ?Span = null;
        if (reply) |r| {
            c.notes.put(": ") catch return c.limit("the text of the error");
            response = c.keep(r) catch return c.limit("the text of the error");
        }
        // The notes buffer is smaller than 4 GiB: `keep` checks it.
        const len = std.math.cast(u32, c.notes.len - at) orelse return c.limit("the text of the error");
        const start = std.math.cast(u32, at) orelse return c.limit("the text of the error");
        c.failure = .{ .code = code, .message = .{ .at = start, .len = len }, .response = response, .command = command };
        c.state = .failed;
        return .failed;
    }

    /// One command line. CR and LF never come from a value: `clean` drops them.
    fn putLine(c: *Client, parts: []const []const u8) error{NoSpace}!void {
        for (parts) |p| try c.out.put(p);
        try c.out.put("\r\n");
    }

    fn send(c: *Client, parts: []const []const u8, then: State) Next {
        c.putLine(parts) catch return c.limit("the commands");
        c.state = then;
        return .wait;
    }

    fn hello(c: *Client, verb: []const u8, then: State) Next {
        c.out.put(verb) catch return c.limit("the commands");
        for (c.cfg.name) |b| {
            if (b == '\r' or b == '\n') continue;
            c.out.byte(b) catch return c.limit("the commands");
        }
        c.out.put("\r\n") catch return c.limit("the commands");
        c.state = then;
        return .wait;
    }

    /// One complete reply of the server, as `takeReply` gives it.
    pub fn onReply(c: *Client, str: []const u8) Next {
        std.debug.assert(str.len > 0);
        const next: Next = switch (c.state) {
            .greeting => c.onGreeting(str),
            .ehlo => c.onEhlo(str),
            .helo => c.onHelo(str),
            .starttls => c.onStartTls(str),
            .login_user => c.onLoginStep(str, "Invalid login sequence while waiting for \"334 VXNlcm5hbWU6\"", c.cfg.user, .login_pass),
            .login_pass => c.onLoginStep(str, "Invalid login sequence while waiting for \"334 UGFzc3dvcmQ6\"", c.cfg.pass, .auth_end),
            .auth_end => c.onAuthEnd(str),
            .mail => c.onMail(str),
            .rcpt => c.onRcpt(str),
            .data => c.onData(str),
            .empty_end => c.allRejected(),
            .stream => c.onStream(str),
            // The shell reads no reply in these states.
            .upgrading, .done, .failed => return c.limit("a reply out of order"),
        };
        if (next != .wait or !c.inEnvelope() or !closing(str)) return next;
        // `_onServerClosing`: a 421 reply ends the message that is in flight.
        if (c.mail_reply) |m| return c.mailError(m);
        return c.fail(.connection, &.{"Server closed the connection"}, str, "CONN");
    }

    fn inEnvelope(c: *const Client) bool {
        return switch (c.state) {
            .mail, .rcpt, .data, .empty_end, .stream => true,
            .greeting, .ehlo, .helo, .starttls, .upgrading, .login_user, .login_pass, .auth_end, .done, .failed => false,
        };
    }

    fn onGreeting(c: *Client, str: []const u8) Next {
        if (!std.mem.startsWith(u8, str, "220")) return c.fail(.protocol, &.{ "Invalid greeting. response=", str }, str, "CONN");
        return c.hello("EHLO ", .ehlo);
    }

    fn onEhlo(c: *Client, str: []const u8) Next {
        if (std.mem.startsWith(u8, str, "421")) return c.fail(.connection, &.{ "Server terminates connection. response=", str }, str, "EHLO");
        if (str[0] != '2') return c.hello("HELO ", .helo);
        if (!c.secure and !c.cfg.ignore_tls and hasKeyword(str, "STARTTLS")) return c.send(&.{"STARTTLS"}, .starttls);
        // The lines of the reply go into the result after `trim` of
        // JavaScript: only ASCII has the same form here.
        for (str) |b| if (b >= 0x80) return c.limit("an EHLO reply that is not ASCII");
        c.ehlo = c.keep(str) catch return c.limit("the EHLO reply");
        c.smtputf8 = hasKeyword(str, "SMTPUTF8");
        c.pipelining = hasKeyword(str, "PIPELINING");
        c.allows_auth = hasKeyword(str, "AUTH");
        c.readMechanisms(str);
        return c.connected();
    }

    /// The mechanisms of the `AUTH` lines after the first line of the reply.
    fn readMechanisms(c: *Client, str: []const u8) void {
        var lines = EhloLines{ .rest = str };
        // The first line has the name of the server.
        if (lines.next() == null) return;
        while (lines.next()) |line| {
            if (line.len < 5 or !std.ascii.eqlIgnoreCase(line[0..4], "AUTH") or !isAuthGap(line[4])) continue;
            var words = std.mem.tokenizeAny(u8, line[5..], " \t\x0b\x0c=");
            while (words.next()) |w| {
                if (std.ascii.eqlIgnoreCase(w, "PLAIN")) c.has_plain = true;
                if (std.ascii.eqlIgnoreCase(w, "LOGIN")) c.has_login = true;
                if (std.ascii.eqlIgnoreCase(w, "CRAM-MD5")) c.has_cram = true;
            }
        }
    }

    fn onHelo(c: *Client, str: []const u8) Next {
        if (str[0] != '2') return c.fail(.protocol, &.{ "Invalid HELO. response=", str }, str, "HELO");
        c.allows_auth = true;
        return c.connected();
    }

    fn onStartTls(c: *Client, str: []const u8) Next {
        if (str[0] != '2') return c.fail(.tls, &.{"Error upgrading connection with STARTTLS"}, str, "STARTTLS");
        c.state = .upgrading;
        return .tls;
    }

    /// The socket has TLS now: the session starts again.
    pub fn onSecured(c: *Client) Next {
        std.debug.assert(c.state == .upgrading);
        c.secure = true;
        return c.hello("EHLO ", .ehlo);
    }

    /// The `connect` event: log in when the credential has a user or a
    /// password and the server allows it, then send the envelope.
    fn connected(c: *Client) Next {
        if (!c.cfg.auth or !c.allows_auth) return c.envelope();
        c.method = if (c.has_plain) .plain else if (c.has_login) .login else if (c.has_cram) .cram_md5 else .plain;
        if (c.cfg.user.len == 0 or c.cfg.pass.len == 0) {
            return c.fail(.auth, &.{ "Missing credentials for \"", methodName(c.method), "\"" }, null, "API");
        }
        return switch (c.method) {
            .plain => c.authPlain(),
            .login => c.send(&.{"AUTH LOGIN"}, .login_user),
            // Nothing of the message is sent: the fallback host can run the call.
            .cram_md5 => c.limit("a server that offers only CRAM-MD5"),
        };
    }

    fn authPlain(c: *Client) Next {
        c.out.put("AUTH PLAIN ") catch return c.limit("the commands");
        var enc = Base64Out{ .out = &c.out };
        enc.put(&.{0}) catch return c.limit("the commands");
        enc.put(c.cfg.user) catch return c.limit("the commands");
        enc.put(&.{0}) catch return c.limit("the commands");
        enc.put(c.cfg.pass) catch return c.limit("the commands");
        enc.end() catch return c.limit("the commands");
        c.out.put("\r\n") catch return c.limit("the commands");
        c.state = .auth_end;
        return .wait;
    }

    fn onLoginStep(c: *Client, str: []const u8, message: []const u8, value: []const u8, then: State) Next {
        if (!(std.mem.startsWith(u8, str, "334 ") or std.mem.startsWith(u8, str, "334-"))) return c.fail(.auth, &.{message}, str, "AUTH LOGIN");
        var enc = Base64Out{ .out = &c.out };
        enc.put(value) catch return c.limit("the commands");
        enc.end() catch return c.limit("the commands");
        c.out.put("\r\n") catch return c.limit("the commands");
        c.state = then;
        return .wait;
    }

    fn onAuthEnd(c: *Client, str: []const u8) Next {
        if (std.mem.startsWith(u8, str, "334")) {
            // nodemailer answers each 334 with an empty line, without a bound.
            c.auth_rounds += 1;
            if (c.auth_rounds > max_auth_rounds) return c.limit("a login with more than 8 challenges");
            return c.send(&.{""}, .auth_end);
        }
        if (str[0] != '2') return c.fail(.auth, &.{"Invalid login"}, str, authCommand(c.method));
        return c.envelope();
    }

    /// `_setEnvelope`: check the addresses, then send MAIL FROM, and with
    /// PIPELINING also every RCPT TO and DATA.
    fn envelope(c: *Client) Next {
        std.debug.assert(c.sent == 0 and c.replied == 0);
        if (c.rcpts.len == 0) return c.fail(.envelope, &.{"No recipients defined"}, null, "API");
        if (badAddress(c.cfg.from)) return c.invalid("Invalid sender ", c.cfg.from);
        var utf8 = !isAscii(c.cfg.from);
        for (c.rcpts) |r| {
            if (r.addr.len == 0 or badAddress(r.addr)) return c.invalid("Invalid recipient ", r.addr);
            utf8 = utf8 or !isAscii(r.addr);
        }
        c.pipelined = c.pipelining;
        c.using_utf8 = utf8 and c.smtputf8;
        const arg: []const u8 = if (c.using_utf8) " SMTPUTF8" else "";
        c.putLine(&.{ "MAIL FROM:<", c.cfg.from, ">", arg }) catch return c.limit("the commands");
        c.state = .mail;
        if (!c.pipelined) return .wait;
        for (c.rcpts) |*r| {
            c.putLine(&.{ "RCPT TO:<", r.addr, ">" }) catch return c.limit("the commands");
            r.state = .sent;
        }
        c.sent = std.math.cast(u32, c.rcpts.len) orelse return c.limit("the recipients");
        c.putLine(&.{"DATA"}) catch return c.limit("the commands");
        return .wait;
    }

    fn invalid(c: *Client, what: []const u8, addr: []const u8) Next {
        const at = c.notes.len;
        c.notes.put(what) catch return c.limit("the text of the error");
        jsQuote(&c.notes, addr) catch return c.limit("the text of the error");
        const start = std.math.cast(u32, at) orelse return c.limit("the text of the error");
        const len = std.math.cast(u32, c.notes.len - at) orelse return c.limit("the text of the error");
        c.failure = .{ .code = .envelope, .message = .{ .at = start, .len = len }, .command = "API" };
        c.state = .failed;
        return .failed;
    }

    fn sendRcpt(c: *Client) Next {
        std.debug.assert(c.sent < c.rcpts.len);
        const r = &c.rcpts[c.sent];
        c.putLine(&.{ "RCPT TO:<", r.addr, ">" }) catch return c.limit("the commands");
        r.state = .sent;
        c.sent += 1;
        c.state = .rcpt;
        return .wait;
    }

    fn mailError(c: *Client, reply: Span) Next {
        const str = c.text(reply);
        const intl = c.using_utf8 and std.mem.startsWith(u8, str, "550 ") and !isAscii(c.cfg.from);
        const message: []const u8 = if (intl) "Internationalized mailbox name not allowed" else "Mail command failed";
        return c.fail(.envelope, &.{message}, str, "MAIL FROM");
    }

    fn onMail(c: *Client, str: []const u8) Next {
        if (str[0] != '2') c.mail_reply = c.keep(str) catch return c.limit("the reply to MAIL FROM");
        if (c.pipelined) {
            c.state = .rcpt;
            return .wait;
        }
        if (c.mail_reply) |m| return c.mailError(m);
        return c.sendRcpt();
    }

    fn onRcpt(c: *Client, str: []const u8) Next {
        std.debug.assert(c.replied < c.sent);
        const r = &c.rcpts[c.replied];
        c.replied += 1;
        if (str[0] == '2') {
            r.state = .accepted;
            c.accepted += 1;
        } else {
            r.state = .rejected;
            r.reply = c.keep(str) catch return c.limit("the reply to RCPT TO");
        }
        if (c.pipelined) {
            if (c.replied == c.rcpts.len) c.state = .data;
            return .wait;
        }
        if (c.sent < c.rcpts.len) return c.sendRcpt();
        if (c.accepted == 0) return c.allRejected();
        return c.send(&.{"DATA"}, .data);
    }

    /// `_envelopeError` without an accepted recipient: the reply of the
    /// first deferred recipient, or of the last rejected one.
    fn allRejected(c: *Client) Next {
        std.debug.assert(c.accepted == 0 and c.rcpts.len > 0);
        var reply: ?Span = null;
        for (c.rcpts) |r| {
            if (r.state != .rejected) continue;
            const code = responseCode(c.text(r.reply));
            if (code > 0 and code < 500) {
                reply = r.reply;
                break;
            }
        }
        const last = c.rcpts[c.rcpts.len - 1].reply;
        const next = c.fail(.envelope, &.{"Can't send mail - all recipients were rejected"}, c.text(reply orelse last), "RCPT TO");
        c.failure.all_rejected = !c.failure.limit;
        return next;
    }

    fn onData(c: *Client, str: []const u8) Next {
        if (c.pipelined and (c.mail_reply != null or c.accepted == 0)) {
            if (c.mail_reply) |m| return c.mailError(m);
            // The server took DATA without a recipient: end the empty message.
            if (str[0] == '3') return c.send(&.{"."}, .empty_end);
            return c.allRejected();
        }
        if (str[0] != '2' and str[0] != '3') return c.fail(.envelope, &.{"Data command failed"}, str, "DATA");
        c.state = .stream;
        c.sent_message = true;
        return .data;
    }

    fn onStream(c: *Client, str: []const u8) Next {
        if (str[0] != '2') return c.fail(.message, &.{"Message failed"}, str, "DATA");
        c.response = c.keep(str) catch return c.limit("the last reply");
        c.state = .done;
        return .done;
    }

    /// `_onClose`: the server closed the connection. `remainder` holds the
    /// bytes after the last complete line.
    pub fn onClose(c: *Client, remainder: []const u8) Next {
        if (c.state == .done or c.state == .failed) return if (c.state == .done) .done else .failed;
        const rest = jsTrim(remainder);
        const is_failure = rest.len >= 4 and (rest[0] == '4' or rest[0] == '5') and std.ascii.isDigit(rest[1]) and std.ascii.isDigit(rest[2]) and (rest[3] == ' ' or rest[3] == '-');
        const code: Code = if (c.state == .upgrading) .tls else .connection;
        return c.fail(code, &.{"Connection closed unexpectedly"}, if (is_failure) rest else null, "CONN");
    }

    pub fn onTimeout(c: *Client, which: Timeout) Next {
        const message: []const u8 = switch (which) {
            .connect => "Connection timeout",
            .greeting => "Greeting never received",
            .upgrade => "TLS handshake timed out",
            .socket => "Timeout",
        };
        return c.fail(.timeout, &.{message}, null, "CONN");
    }

    /// An error of the socket, of the name lookup or of TLS, with the text
    /// that Node.js gives.
    pub fn onTransportError(c: *Client, code: Code, parts: []const []const u8) Next {
        std.debug.assert(code == .socket or code == .dns or code == .tls);
        const cmd: []const u8 = if (c.state == .upgrading) "STARTTLS" else "CONN";
        return c.fail(code, parts, null, cmd);
    }

    fn writeList(c: *const Client, o: *Out, key: []const u8, want: RcptState) error{NoSpace}!void {
        try o.put(key);
        var first = true;
        for (c.rcpts) |r| {
            if (r.state != want) continue;
            if (!first) try o.byte(',');
            first = false;
            try o.string(r.addr);
        }
        try o.byte(']');
    }

    /// The `rejectedErrors` of nodemailer, as JSON gives an error: the
    /// properties that can be listed, without `message`.
    fn writeRejectedErrors(c: *const Client, o: *Out) error{NoSpace}!void {
        try o.put(",\"rejectedErrors\":[");
        var first = true;
        for (c.rcpts) |r| {
            if (r.state != .rejected) continue;
            if (!first) try o.byte(',');
            first = false;
            const reply = c.text(r.reply);
            try o.put("{\"code\":\"EENVELOPE\",\"response\":");
            try o.string(reply);
            try writeResponseCode(o, reply);
            try o.put(",\"command\":\"RCPT TO\",\"recipient\":");
            try o.string(r.addr);
            try o.byte('}');
        }
        try o.byte(']');
    }

    /// The `info` object of `connection.send`, without `envelope` and
    /// `messageId`, which the node adds. The shell gives the times and the
    /// count of the bytes of the message on the wire.
    pub fn writeResult(c: *const Client, o: *Out, envelope_ms: u64, message_ms: u64, message_size: u64) error{NoSpace}!void {
        std.debug.assert(c.state == .done);
        try c.writeList(o, "{\"accepted\":[", .accepted);
        try c.writeList(o, ",\"rejected\":[", .rejected);
        if (c.ehlo) |e| try writeEhlo(o, c.text(e));
        if (c.accepted < c.rcpts.len) try c.writeRejectedErrors(o);
        try o.put(",\"envelopeTime\":");
        try putDecimal(o, envelope_ms);
        try o.put(",\"messageTime\":");
        try putDecimal(o, message_ms);
        try o.put(",\"messageSize\":");
        try putDecimal(o, message_size);
        try o.put(",\"response\":");
        try o.string(c.text(c.response));
        try o.byte('}');
    }

    /// The error of nodemailer: `{"error":{...}}`. A limit has no such form:
    /// the shell reports it with `limitText`.
    pub fn writeFailure(c: *const Client, o: *Out) error{NoSpace}!void {
        std.debug.assert(c.state == .failed and !c.failure.limit);
        const f = c.failure;
        try o.put("{\"error\":{\"message\":");
        try o.string(c.text(f.message));
        try o.put(",\"code\":");
        try o.string(codeName(f.code));
        if (f.response) |r| {
            try o.put(",\"response\":");
            try o.string(c.text(r));
            try writeResponseCode(o, c.text(r));
        }
        try o.put(",\"command\":");
        try o.string(f.command);
        if (f.all_rejected) {
            try c.writeList(o, ",\"rejected\":[", .rejected);
            try c.writeRejectedErrors(o);
        }
        try o.put("}}");
    }

    /// What the client could not do, when the call ended at a limit.
    pub fn limitText(c: *const Client) ?[]const u8 {
        if (c.state != .failed or !c.failure.limit) return null;
        return c.failure.command;
    }
};

fn putDecimal(o: *Out, v: u64) error{NoSpace}!void {
    const digits = "0123456789";
    var buf: [20]u8 = @splat('0');
    var i: usize = buf.len;
    var x = v;
    while (x > 0) : (x /= 10) {
        i -= 1;
        buf[i] = digits[x % 10];
    }
    try o.put(buf[@min(i, buf.len - 1)..]);
}

/// `,"responseCode":n` when the reply starts with digits that are not zero.
fn writeResponseCode(o: *Out, reply: []const u8) error{NoSpace}!void {
    const code = responseCode(reply);
    if (code == 0) return;
    try o.put(",\"responseCode\":");
    try putDecimal(o, code);
}

/// The number at the start of a reply, or 0. More than 15 digits have no
/// exact number in JavaScript: the value stops at 15.
fn responseCode(reply: []const u8) u64 {
    var v: u64 = 0;
    for (reply[0..@min(reply.len, 15)]) |b| {
        if (!std.ascii.isDigit(b)) break;
        v = v * 10 + (b - '0');
    }
    return v;
}

/// The lines of an EHLO reply, each without its code and trimmed; empty
/// lines are left out (`_ehloLines` before `slice(1)`).
const EhloLines = struct {
    rest: []const u8,
    done: bool = false,

    fn next(it: *EhloLines) ?[]const u8 {
        while (!it.done) {
            const end = std.mem.indexOfScalar(u8, it.rest, '\n');
            var line = it.rest[0 .. end orelse it.rest.len];
            if (end) |e| it.rest = it.rest[e + 1 ..] else it.done = true;
            var digits: usize = 0;
            while (digits < line.len and std.ascii.isDigit(line[digits])) digits += 1;
            if (digits > 0 and digits < line.len and (line[digits] == ' ' or line[digits] == '-')) line = line[digits + 1 ..];
            line = jsTrim(line);
            if (line.len > 0) return line;
        }
        return null;
    }
};

fn writeEhlo(o: *Out, reply: []const u8) error{NoSpace}!void {
    var lines = EhloLines{ .rest = reply };
    // The first line has the name of the server.
    if (lines.next() == null) return;
    const mark = o.len;
    try o.put(",\"ehlo\":[");
    var count: usize = 0;
    while (lines.next()) |line| : (count += 1) {
        if (count > 0) try o.byte(',');
        try o.string(line);
    }
    try o.byte(']');
    // nodemailer adds `ehlo` only when it has a line.
    if (count == 0) o.len = mark;
}

/// `/[ -]WORD\b/i`: the word after a space or `-`, and no word character after it.
fn hasKeyword(str: []const u8, word: []const u8) bool {
    var i: usize = 1;
    while (i + word.len <= str.len) : (i += 1) {
        if (str[i - 1] != ' ' and str[i - 1] != '-') continue;
        if (!std.ascii.eqlIgnoreCase(str[i..][0..word.len], word)) continue;
        const end = i + word.len;
        if (end == str.len or !(std.ascii.isAlphanumeric(str[end]) or str[end] == '_')) return true;
    }
    return false;
}

/// `/^421[ -]/`
fn closing(str: []const u8) bool {
    return str.len >= 4 and std.mem.startsWith(u8, str, "421") and (str[3] == ' ' or str[3] == '-');
}

/// `[\s=]` after `AUTH`, for a line that is ASCII.
fn isAuthGap(b: u8) bool {
    return b == ' ' or b == '=' or (b >= 0x09 and b <= 0x0d);
}

fn isAscii(s: []const u8) bool {
    for (s) |b| if (b >= 0x80) return false;
    return true;
}

/// `/[\r\n<>]/`
fn badAddress(s: []const u8) bool {
    return std.mem.indexOfAny(u8, s, "\r\n<>") != null;
}

/// White space of JavaScript among the bytes of a text in Latin-1.
fn isJsSpace(b: u8) bool {
    return b == ' ' or b == 0xa0 or (b >= 0x09 and b <= 0x0d);
}

/// `trim` of JavaScript on a text where each byte is one character.
fn jsTrim(s: []const u8) []const u8 {
    var a: usize = 0;
    var b: usize = s.len;
    while (a < b and isJsSpace(s[a])) a += 1;
    while (b > a and isJsSpace(s[b - 1])) b -= 1;
    return s[a..b];
}

/// `JSON.stringify` of a string.
fn jsQuote(o: *Out, s: []const u8) error{NoSpace}!void {
    const hex = "0123456789abcdef";
    try o.byte('"');
    for (s) |b| {
        switch (b) {
            '"' => try o.put("\\\""),
            '\\' => try o.put("\\\\"),
            0x08 => try o.put("\\b"),
            0x0c => try o.put("\\f"),
            '\n' => try o.put("\\n"),
            '\r' => try o.put("\\r"),
            '\t' => try o.put("\\t"),
            0...7, 0x0b, 0x0e...0x1f => try o.put(&.{ '\\', 'u', '0', '0', hex[b >> 4], hex[b & 15] }),
            0x20...0x21, 0x23...0x5b, 0x5d...0xff => try o.byte(b),
        }
    }
    try o.byte('"');
}

/// Base64 into a bounded buffer, for input that comes in parts.
const Base64Out = struct {
    out: *Out,
    held: [3]u8 = @splat(0),
    n: u8 = 0,

    fn put(e: *Base64Out, s: []const u8) error{NoSpace}!void {
        for (s) |b| {
            e.held[e.n] = b;
            e.n += 1;
            if (e.n == 3) try e.flush();
        }
    }

    fn flush(e: *Base64Out) error{NoSpace}!void {
        var buf: [4]u8 = @splat(0);
        const text = std.base64.standard.Encoder.encode(&buf, e.held[0..e.n]);
        try e.out.put(text);
        e.n = 0;
    }

    fn end(e: *Base64Out) error{NoSpace}!void {
        if (e.n > 0) try e.flush();
    }
};

/// Take one complete reply from the bytes that are read: the lines of the
/// reply with `\n` between them, in `text`, as `_onData` and
/// `_processResponse` build it. The result is the count of the bytes that
/// the reply used, or null when the reply is not complete. An empty `text`
/// with a count is a blank line: nodemailer skips it.
pub fn takeReply(buf: []const u8, text: *Out) error{NoSpace}!?usize {
    text.len = 0;
    var pos: usize = 0;
    var first = true;
    while (std.mem.indexOfScalarPos(u8, buf, pos, '\n')) |nl| {
        var line = buf[pos..nl];
        if (line.len > 0 and line[line.len - 1] == '\r') line = line[0 .. line.len - 1];
        if (!first) try text.byte('\n');
        first = false;
        try text.put(line);
        pos = nl + 1;
        if (isPartialLine(line)) continue;
        if (jsTrim(text.buf[0..text.len]).len == 0) text.len = 0;
        try decodeReply(text);
        return pos;
    }
    return null;
}

/// `/^\d+-/`
fn isPartialLine(line: []const u8) bool {
    var i: usize = 0;
    while (i < line.len and std.ascii.isDigit(line[i])) i += 1;
    return i > 0 and i < line.len and line[i] == '-';
}

/// `decodeServerResponse`: the bytes are UTF-8 when they are valid UTF-8
/// without U+FFFD. If not, each byte is one character (Latin-1).
fn decodeReply(text: *Out) error{NoSpace}!void {
    const s = text.buf[0..text.len];
    if (isAscii(s)) return;
    if (std.unicode.utf8ValidateSlice(s) and std.mem.indexOf(u8, s, "\xef\xbf\xbd") == null) return;
    var high: usize = 0;
    for (s) |b| high += @intFromBool(b >= 0x80);
    if (high > text.buf.len - text.len) return error.NoSpace;
    // Each high byte takes two bytes: write from the end, so no byte is
    // read after its place is written.
    var w = text.len + high;
    var r = text.len;
    text.len = w;
    while (r > 0) {
        r -= 1;
        const b = text.buf[r];
        if (b < 0x80) {
            w -= 1;
            text.buf[w] = b;
        } else {
            w -= 2;
            text.buf[w] = 0xc0 | (b >> 6);
            text.buf[w + 1] = 0x80 | (b & 0x3f);
        }
    }
    std.debug.assert(w == 0);
}

/// DataStream of nodemailer: the message as the DATA command sends it. A
/// lone CR or LF becomes CRLF, and a dot at the start of a line gets a
/// second dot. `finish` ends the message with `.` on its own line.
pub const Stuffer = struct {
    /// The last byte of the input, or 256 before the first byte.
    last: u16 = 256,
    out_count: u64 = 0,

    /// Encode bytes of `in` while `out` has room. The result is the count
    /// of the input bytes that are used.
    pub fn feed(s: *Stuffer, in: []const u8, out: *Out) usize {
        std.debug.assert(s.last <= 256 and out.len <= out.buf.len);
        for (in, 0..) |byte, i| {
            // One byte of the input gives three bytes at most.
            if (out.buf.len - out.len < 3) return i;
            const at = out.len;
            if (s.last == '\r' and byte != '\n') {
                out.buf[out.len] = '\n';
                out.len += 1;
                if (byte == '.') {
                    out.buf[out.len] = '.';
                    out.len += 1;
                }
            } else if (byte == '\n' and s.last != '\r') {
                out.buf[out.len] = '\r';
                out.len += 1;
            } else if (byte == '.' and (s.last == '\n' or s.last == 256)) {
                out.buf[out.len] = '.';
                out.len += 1;
            }
            out.buf[out.len] = byte;
            out.len += 1;
            s.out_count += out.len - at;
            s.last = byte;
        }
        return in.len;
    }

    pub fn finish(s: *Stuffer, out: *Out) error{NoSpace}!void {
        const end: []const u8 = if (s.last == '\n') ".\r\n" else if (s.last == '\r') "\n.\r\n" else "\r\n.\r\n";
        try out.put(end);
        s.out_count += end.len;
    }
};

// ---- tests ----------------------------------------------------------------------

const Line = struct { reply: []const u8, sends: []const u8 = "", next: Next = .wait };

const Bench = struct {
    out: [2048]u8 = @splat(0),
    notes: [4096]u8 = @splat(0),
    reply: [1024]u8 = @splat(0),
    json: [4096]u8 = @splat(0),
    rcpts: [4]Rcpt = @splat(.{ .addr = "" }),
    c: Client = Client.init(plain, &.{}, &.{}, &.{}),

    fn start(b: *Bench, cfg: Config, to: []const []const u8) void {
        for (to, 0..) |addr, i| b.rcpts[i] = .{ .addr = addr };
        b.c = Client.init(cfg, b.rcpts[0..to.len], &b.out, &b.notes);
    }

    /// Give each reply to the client, and check what it writes and answers.
    fn play(b: *Bench, lines: []const Line) error{ NoSpace, Mismatch }!void {
        for (lines) |l| {
            b.c.out.len = 0;
            var text: Out = .{ .buf = &b.reply };
            var rest = l.reply;
            var next: Next = .wait;
            while (try takeReply(rest, &text)) |used| {
                rest = rest[used..];
                if (text.len == 0) continue;
                next = b.c.onReply(text.buf[0..text.len]);
                if (next != .wait) break;
            }
            if (!std.mem.eql(u8, l.sends, b.c.out.buf[0..b.c.out.len]) or l.next != next) return error.Mismatch;
        }
    }

    fn failure(b: *Bench) error{NoSpace}![]const u8 {
        var o: Out = .{ .buf = &b.json };
        try b.c.writeFailure(&o);
        return o.buf[0..o.len];
    }

    fn result(b: *Bench) error{NoSpace}![]const u8 {
        var o: Out = .{ .buf = &b.json };
        try b.c.writeResult(&o, 3, 5, 42);
        return o.buf[0..o.len];
    }
};

const plain: Config = .{ .name = "client.test", .secure = false, .ignore_tls = false, .auth = false, .user = "", .pass = "", .from = "a@x.test" };
const with_auth: Config = .{ .name = "client.test", .secure = true, .ignore_tls = false, .auth = true, .user = "user", .pass = "secret", .from = "a@x.test" };

test "smtp: a message without login, one command at a time" {
    var b: Bench = .{};
    b.start(plain, &.{ "b@x.test", "c@x.test" });
    try b.play(&.{
        .{ .reply = "220 mx.test ESMTP\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250-mx.test\r\n250-SIZE 1000\r\n250 8BITMIME\r\n", .sends = "MAIL FROM:<a@x.test>\r\n" },
        .{ .reply = "250 ok\r\n", .sends = "RCPT TO:<b@x.test>\r\n" },
        .{ .reply = "250 ok\r\n", .sends = "RCPT TO:<c@x.test>\r\n" },
        .{ .reply = "250 ok\r\n", .sends = "DATA\r\n" },
        .{ .reply = "354 go\r\n", .next = .data },
        .{ .reply = "250 2.0.0 queued as 1\r\n", .next = .done },
    });
    try std.testing.expect(b.c.messageSent());
    try std.testing.expectEqualStrings(
        "{\"accepted\":[\"b@x.test\",\"c@x.test\"],\"rejected\":[],\"ehlo\":[\"SIZE 1000\",\"8BITMIME\"]," ++
            "\"envelopeTime\":3,\"messageTime\":5,\"messageSize\":42,\"response\":\"250 2.0.0 queued as 1\"}",
        try b.result(),
    );
}

test "smtp: STARTTLS, a second EHLO, AUTH PLAIN and a pipelined envelope" {
    var b: Bench = .{};
    var cfg = with_auth;
    cfg.secure = false;
    b.start(cfg, &.{ "b@x.test", "c@x.test" });
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250-mx.test\r\n250-AUTH LOGIN\r\n250 STARTTLS\r\n", .sends = "STARTTLS\r\n" },
        .{ .reply = "220 ready\r\n", .next = .tls },
    });
    b.c.out.len = 0;
    try std.testing.expectEqual(Next.wait, b.c.onSecured());
    try std.testing.expectEqualStrings("EHLO client.test\r\n", b.c.out.buf[0..b.c.out.len]);
    try b.play(&.{
        // AHVzZXIAc2VjcmV0 is base64 of "\0user\0secret".
        .{ .reply = "250-mx.test\r\n250-PIPELINING\r\n250 AUTH LOGIN PLAIN\r\n", .sends = "AUTH PLAIN AHVzZXIAc2VjcmV0\r\n" },
        .{ .reply = "235 ok\r\n", .sends = "MAIL FROM:<a@x.test>\r\nRCPT TO:<b@x.test>\r\nRCPT TO:<c@x.test>\r\nDATA\r\n" },
        .{ .reply = "250 ok\r\n550 5.1.1 no such user\r\n250 ok\r\n354 go\r\n", .next = .data },
        .{ .reply = "250 done\r\n", .next = .done },
    });
    try std.testing.expectEqualStrings(
        "{\"accepted\":[\"c@x.test\"],\"rejected\":[\"b@x.test\"],\"ehlo\":[\"PIPELINING\",\"AUTH LOGIN PLAIN\"]," ++
            "\"rejectedErrors\":[{\"code\":\"EENVELOPE\",\"response\":\"550 5.1.1 no such user\",\"responseCode\":550," ++
            "\"command\":\"RCPT TO\",\"recipient\":\"b@x.test\"}]," ++
            "\"envelopeTime\":3,\"messageTime\":5,\"messageSize\":42,\"response\":\"250 done\"}",
        try b.result(),
    );
}

test "smtp: AUTH LOGIN when the server does not offer PLAIN, and a refused login" {
    var b: Bench = .{};
    b.start(with_auth, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250-mx.test\r\n250 AUTH=LOGIN CRAM-MD5\r\n", .sends = "AUTH LOGIN\r\n" },
        .{ .reply = "334 VXNlcm5hbWU6\r\n", .sends = "dXNlcg==\r\n" },
        .{ .reply = "334 UGFzc3dvcmQ6\r\n", .sends = "c2VjcmV0\r\n" },
        .{ .reply = "535 5.7.8 bad credentials\r\n", .next = .failed },
    });
    try std.testing.expect(!b.c.messageSent());
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Invalid login: 535 5.7.8 bad credentials\",\"code\":\"EAUTH\"," ++
            "\"response\":\"535 5.7.8 bad credentials\",\"responseCode\":535,\"command\":\"AUTH LOGIN\"}}",
        try b.failure(),
    );
}

test "smtp: AUTH PLAIN refused, and a credential without a password" {
    var b: Bench = .{};
    b.start(with_auth, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250-mx.test\r\n250 AUTH PLAIN\r\n", .sends = "AUTH PLAIN AHVzZXIAc2VjcmV0\r\n" },
        .{ .reply = "535 no\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Invalid login: 535 no\",\"code\":\"EAUTH\",\"response\":\"535 no\",\"responseCode\":535,\"command\":\"AUTH PLAIN\"}}",
        try b.failure(),
    );
    var cfg = with_auth;
    cfg.pass = "";
    b.start(cfg, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250-mx.test\r\n250 AUTH LOGIN\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"Missing credentials for \\\"LOGIN\\\"\",\"code\":\"EAUTH\",\"command\":\"API\"}}", try b.failure());
    // A server without AUTH gets no login: the message goes without it.
    b.start(with_auth, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250 mx.test\r\n", .sends = "MAIL FROM:<a@x.test>\r\n" },
    });
}

test "smtp: each failure point before the envelope" {
    var b: Bench = .{};
    b.start(plain, &.{"b@x.test"});
    try b.play(&.{.{ .reply = "554 no service\r\n", .next = .failed }});
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Invalid greeting. response=554 no service: 554 no service\",\"code\":\"EPROTOCOL\"," ++
            "\"response\":\"554 no service\",\"responseCode\":554,\"command\":\"CONN\"}}",
        try b.failure(),
    );
    b.start(plain, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "421 busy\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Server terminates connection. response=421 busy: 421 busy\",\"code\":\"ECONNECTION\"," ++
            "\"response\":\"421 busy\",\"responseCode\":421,\"command\":\"EHLO\"}}",
        try b.failure(),
    );
    // A refused EHLO gives HELO, and a refused HELO ends the call.
    b.start(plain, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "502 what\r\n", .sends = "HELO client.test\r\n" },
        .{ .reply = "500 no\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Invalid HELO. response=500 no: 500 no\",\"code\":\"EPROTOCOL\",\"response\":\"500 no\",\"responseCode\":500,\"command\":\"HELO\"}}",
        try b.failure(),
    );
}

test "smtp: STARTTLS refused, and STARTTLS not used" {
    var b: Bench = .{};
    b.start(plain, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250-mx.test\r\n250 STARTTLS\r\n", .sends = "STARTTLS\r\n" },
        .{ .reply = "454 4.7.0 not now\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Error upgrading connection with STARTTLS: 454 4.7.0 not now\",\"code\":\"ETLS\"," ++
            "\"response\":\"454 4.7.0 not now\",\"responseCode\":454,\"command\":\"STARTTLS\"}}",
        try b.failure(),
    );
    var cfg = plain;
    cfg.ignore_tls = true;
    b.start(cfg, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250-mx.test\r\n250 STARTTLS\r\n", .sends = "MAIL FROM:<a@x.test>\r\n" },
    });
    // After a refused EHLO the session has no STARTTLS and no list of mechanisms.
    b.start(with_auth, &.{"b@x.test"});
    try b.play(&.{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "500 no\r\n", .sends = "HELO client.test\r\n" },
        .{ .reply = "250 hi\r\n", .sends = "AUTH PLAIN AHVzZXIAc2VjcmV0\r\n" },
    });
}

test "smtp: failures of the envelope and of the message" {
    var b: Bench = .{};
    const hello = [_]Line{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250 mx.test\r\n", .sends = "MAIL FROM:<a@x.test>\r\n" },
    };
    b.start(plain, &.{"b@x.test"});
    try b.play(&hello);
    try b.play(&.{.{ .reply = "550 sender refused\r\n", .next = .failed }});
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Mail command failed: 550 sender refused\",\"code\":\"EENVELOPE\"," ++
            "\"response\":\"550 sender refused\",\"responseCode\":550,\"command\":\"MAIL FROM\"}}",
        try b.failure(),
    );
    // Every recipient is rejected: the reply of the deferred one is reported.
    b.start(plain, &.{ "b@x.test", "c@x.test" });
    try b.play(&hello);
    try b.play(&.{
        .{ .reply = "250 ok\r\n", .sends = "RCPT TO:<b@x.test>\r\n" },
        .{ .reply = "451 later\r\n", .sends = "RCPT TO:<c@x.test>\r\n" },
        .{ .reply = "550 no\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Can't send mail - all recipients were rejected: 451 later\",\"code\":\"EENVELOPE\"," ++
            "\"response\":\"451 later\",\"responseCode\":451,\"command\":\"RCPT TO\",\"rejected\":[\"b@x.test\",\"c@x.test\"]," ++
            "\"rejectedErrors\":[{\"code\":\"EENVELOPE\",\"response\":\"451 later\",\"responseCode\":451,\"command\":\"RCPT TO\",\"recipient\":\"b@x.test\"}," ++
            "{\"code\":\"EENVELOPE\",\"response\":\"550 no\",\"responseCode\":550,\"command\":\"RCPT TO\",\"recipient\":\"c@x.test\"}]}}",
        try b.failure(),
    );
    b.start(plain, &.{"b@x.test"});
    try b.play(&hello);
    try b.play(&.{
        .{ .reply = "250 ok\r\n", .sends = "RCPT TO:<b@x.test>\r\n" },
        .{ .reply = "250 ok\r\n", .sends = "DATA\r\n" },
        .{ .reply = "554 no data\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Data command failed: 554 no data\",\"code\":\"EENVELOPE\",\"response\":\"554 no data\",\"responseCode\":554,\"command\":\"DATA\"}}",
        try b.failure(),
    );
    try std.testing.expect(!b.c.messageSent());
    b.start(plain, &.{"b@x.test"});
    try b.play(&hello);
    try b.play(&.{
        .{ .reply = "250 ok\r\n", .sends = "RCPT TO:<b@x.test>\r\n" },
        .{ .reply = "250 ok\r\n", .sends = "DATA\r\n" },
        .{ .reply = "354 go\r\n", .next = .data },
        .{ .reply = "552 too large\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Message failed: 552 too large\",\"code\":\"EMESSAGE\",\"response\":\"552 too large\",\"responseCode\":552,\"command\":\"DATA\"}}",
        try b.failure(),
    );
    try std.testing.expect(b.c.messageSent());
}

test "smtp: a pipelined envelope that the server refuses" {
    var b: Bench = .{};
    const hello = [_]Line{
        .{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" },
        .{ .reply = "250-mx.test\r\n250 PIPELINING\r\n", .sends = "MAIL FROM:<a@x.test>\r\nRCPT TO:<b@x.test>\r\nDATA\r\n" },
    };
    // No recipient, and the server took DATA: the client ends the empty message.
    b.start(plain, &.{"b@x.test"});
    try b.play(&hello);
    try b.play(&.{
        .{ .reply = "250 ok\r\n550 no\r\n354 go\r\n", .sends = ".\r\n" },
        .{ .reply = "250 ok\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Can't send mail - all recipients were rejected: 550 no\",\"code\":\"EENVELOPE\",\"response\":\"550 no\",\"responseCode\":550," ++
            "\"command\":\"RCPT TO\",\"rejected\":[\"b@x.test\"],\"rejectedErrors\":[{\"code\":\"EENVELOPE\",\"response\":\"550 no\",\"responseCode\":550," ++
            "\"command\":\"RCPT TO\",\"recipient\":\"b@x.test\"}]}}",
        try b.failure(),
    );
    // The sender is refused: the error of MAIL FROM, at the reply to DATA.
    b.start(plain, &.{"b@x.test"});
    try b.play(&hello);
    try b.play(&.{.{ .reply = "553 bad sender\r\n503 no\r\n503 no\r\n", .next = .failed }});
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Mail command failed: 553 bad sender\",\"code\":\"EENVELOPE\",\"response\":\"553 bad sender\",\"responseCode\":553,\"command\":\"MAIL FROM\"}}",
        try b.failure(),
    );
    // A 421 reply to a recipient ends the message.
    b.start(plain, &.{"b@x.test"});
    try b.play(&hello);
    try b.play(&.{.{ .reply = "250 ok\r\n421 4.3.2 closing\r\n", .next = .failed }});
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Server closed the connection: 421 4.3.2 closing\",\"code\":\"ECONNECTION\"," ++
            "\"response\":\"421 4.3.2 closing\",\"responseCode\":421,\"command\":\"CONN\"}}",
        try b.failure(),
    );
}

test "smtp: addresses that nodemailer refuses, and SMTPUTF8" {
    var b: Bench = .{};
    const hello = [_]Line{.{ .reply = "220 mx.test\r\n", .sends = "EHLO client.test\r\n" }};
    b.start(plain, &.{});
    try b.play(&hello);
    try b.play(&.{.{ .reply = "250 mx.test\r\n", .next = .failed }});
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"No recipients defined\",\"code\":\"EENVELOPE\",\"command\":\"API\"}}", try b.failure());
    b.start(plain, &.{"b<x\n"});
    try b.play(&hello);
    try b.play(&.{.{ .reply = "250 mx.test\r\n", .next = .failed }});
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"Invalid recipient \\\"b<x\\\\n\\\"\",\"code\":\"EENVELOPE\",\"command\":\"API\"}}", try b.failure());
    var cfg = plain;
    cfg.from = "a>x";
    b.start(cfg, &.{"b@x.test"});
    try b.play(&hello);
    try b.play(&.{.{ .reply = "250 mx.test\r\n", .next = .failed }});
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"Invalid sender \\\"a>x\\\"\",\"code\":\"EENVELOPE\",\"command\":\"API\"}}", try b.failure());
    cfg.from = "j\xc3\xbcrgen@x.test";
    b.start(cfg, &.{"b@x.test"});
    try b.play(&hello);
    try b.play(&.{
        .{ .reply = "250-mx.test\r\n250 SMTPUTF8\r\n", .sends = "MAIL FROM:<j\xc3\xbcrgen@x.test> SMTPUTF8\r\n" },
        .{ .reply = "550 no\r\n", .next = .failed },
    });
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Internationalized mailbox name not allowed: 550 no\",\"code\":\"EENVELOPE\",\"response\":\"550 no\",\"responseCode\":550,\"command\":\"MAIL FROM\"}}",
        try b.failure(),
    );
}

test "smtp: a closed connection and the time limits" {
    var b: Bench = .{};
    b.start(plain, &.{"b@x.test"});
    try std.testing.expectEqual(Next.failed, b.c.onClose(""));
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"Connection closed unexpectedly\",\"code\":\"ECONNECTION\",\"command\":\"CONN\"}}", try b.failure());
    b.start(plain, &.{"b@x.test"});
    try std.testing.expectEqual(Next.failed, b.c.onClose(" 554 5.7.1 blocked "));
    try std.testing.expectEqualStrings(
        "{\"error\":{\"message\":\"Connection closed unexpectedly: 554 5.7.1 blocked\",\"code\":\"ECONNECTION\"," ++
            "\"response\":\"554 5.7.1 blocked\",\"responseCode\":554,\"command\":\"CONN\"}}",
        try b.failure(),
    );
    b.start(plain, &.{"b@x.test"});
    try std.testing.expectEqual(Next.failed, b.c.onTimeout(.greeting));
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"Greeting never received\",\"code\":\"ETIMEDOUT\",\"command\":\"CONN\"}}", try b.failure());
    b.start(plain, &.{"b@x.test"});
    try std.testing.expectEqual(Next.failed, b.c.onTransportError(.socket, &.{ "connect ECONNREFUSED ", "127.0.0.1:25" }));
    try std.testing.expectEqualStrings("{\"error\":{\"message\":\"connect ECONNREFUSED 127.0.0.1:25\",\"code\":\"ESOCKET\",\"command\":\"CONN\"}}", try b.failure());
}

test "smtp: replies in parts, blank lines, and bytes that are not UTF-8" {
    var buf: [64]u8 = @splat(0);
    var text: Out = .{ .buf = &buf };
    try std.testing.expectEqual(@as(?usize, null), try takeReply("250-a\r\n250 b", &text));
    try std.testing.expectEqual(@as(?usize, 14), try takeReply("250-a\r\n250 b\r\n220 x\n", &text));
    try std.testing.expectEqualStrings("250-a\n250 b", text.buf[0..text.len]);
    try std.testing.expectEqual(@as(?usize, 3), try takeReply(" \r\n250 ok\r\n", &text));
    try std.testing.expectEqual(@as(usize, 0), text.len);
    try std.testing.expectEqual(@as(?usize, 10), try takeReply("250 gr\xfc\xdf\r\n", &text));
    try std.testing.expectEqualStrings("250 gr\xc3\xbc\xc3\x9f", text.buf[0..text.len]);
    try std.testing.expectEqual(@as(?usize, 10), try takeReply("250 \xc3\xbc ok\n", &text));
    try std.testing.expectEqualStrings("250 \xc3\xbc ok", text.buf[0..text.len]);
    var small: [4]u8 = @splat(0);
    var short: Out = .{ .buf = &small };
    try std.testing.expectError(error.NoSpace, takeReply("250 too long\r\n", &short));
}

test "smtp: the message on the wire has CRLF lines and doubled dots" {
    var buf: [128]u8 = @splat(0);
    var out: Out = .{ .buf = &buf };
    var s: Stuffer = .{};
    const parts = [_][]const u8{ ".a\r\n.b\n", ".c\r", ".d\rx\r", "\ne" };
    for (parts) |p| try std.testing.expectEqual(p.len, s.feed(p, &out));
    try s.finish(&out);
    try std.testing.expectEqualStrings("..a\r\n..b\r\n..c\r\n..d\r\nx\r\ne\r\n.\r\n", out.buf[0..out.len]);
    try std.testing.expectEqual(@as(u64, out.len), s.out_count);
    var tiny: [4]u8 = @splat(0);
    var o2: Out = .{ .buf = &tiny };
    var s2: Stuffer = .{};
    try std.testing.expectEqual(@as(usize, 2), s2.feed("abc", &o2));
    out.len = 0;
    try s2.finish(&out);
    try std.testing.expectEqualStrings("\r\n.\r\n", out.buf[0..out.len]);
}
