//! The message of the Send Email node, built from its fields, byte for byte
//! as nodemailer 10.1.4 builds it (`mail-composer`, `mime-node`, `mime-funcs`,
//! `qp`, `base64`, `addressparser`). `docs/smtp-effect.md` states the rules.
//!
//! The bytes that nodemailer takes from a random source or the clock come
//! from `Entropy`, in the format of nodemailer: 8 bytes for the boundary,
//! 16 bytes for the Message-ID, and the time for the Date header.
//!
//! The builder takes a subset of the inputs: the address forms `a@b`,
//! `<a@b>`, `Name <a@b>` and `"Name" <a@b>` with an ASCII address, and file
//! names in printable ASCII. For any other input the answer is
//! `error.HostOnly`: the v1 node must build that message. The answer is
//! never a message that differs from nodemailer.
const std = @import("std");
const smtp = @import("smtp.zig");
const mime_table = @import("mailmime_tables.zig");

pub const Error = error{ NoSpace, HostOnly };

/// One file. An empty `cid` is no content id. An empty `content_type` is
/// the type that nodemailer finds for the file name.
pub const Attachment = struct { filename: []const u8, cid: []const u8 = "", content: []const u8, content_type: []const u8 = "" };

/// The mail options of the node. An empty text is an option that is not set:
/// nodemailer tests each for truth.
pub const Fields = struct {
    from: []const u8 = "",
    to: []const u8 = "",
    cc: []const u8 = "",
    bcc: []const u8 = "",
    reply_to: []const u8 = "",
    subject: []const u8 = "",
    text: []const u8 = "",
    html: []const u8 = "",
    attachments: []const Attachment = &.{},
    /// `inReplyTo` and `references` of the mail options (the Gmail node).
    in_reply_to: []const u8 = "",
    references: []const u8 = "",
    /// `keepBcc` of the compiled message: the Bcc header is written.
    keep_bcc: bool = false,
};

pub const Rcpt = smtp.Rcpt;

pub const Entropy = struct { boundary: [8]u8, id: [16]u8, now_ms: i64 };

/// The buffers of one build. `scratch` has `scratch_min` bytes or more.
pub const Work = struct {
    out: []u8,
    scratch: []u8,
    /// The addresses of the envelope and the Message-ID.
    notes: []u8,
    rcpts: []Rcpt,
};

pub const Built = struct {
    message: []const u8,
    /// The sender of the envelope, or empty.
    from: []const u8,
    rcpts: usize,
    message_id: []const u8,
};

const qp_slice = 64 << 10;
const line_max = 76;
/// One slice of quoted-printable text and the line before it.
pub const scratch_min = 4 * (qp_slice + line_max);

const Out = smtp.Out;
const Encoding = enum(u8) { seven_bit, quoted, base64 };
const Role = enum(u8) { from, rcpt, reply_to };

pub fn build(f: Fields, e: Entropy, w: Work) Error!Built {
    std.debug.assert(w.scratch.len >= scratch_min);
    const half = w.scratch.len / 2;
    var b: Builder = .{
        .f = f,
        .e = e,
        .out = .{ .buf = w.out },
        .notes = .{ .buf = w.notes },
        .rcpts = w.rcpts,
        .scratch = w.scratch,
        .line = .{ .buf = w.scratch[0..half] },
        .tmp = .{ .buf = w.scratch[half..][0 .. half / 2] },
        .tmp2 = .{ .buf = w.scratch[half + half / 2 ..] },
    };
    for (f.attachments) |a| {
        if (f.html.len > 0 and a.cid.len > 0) b.related += 1 else b.attached += 1;
    }
    const texts = [_][]const u8{ f.from, f.to, f.cc, f.bcc, f.reply_to, f.subject, f.text, f.html, f.in_reply_to, f.references };
    for (texts) |t| if (!validUtf8(t)) return error.HostOnly;
    try b.root();
    const last = if (b.out.len > 0) b.out.buf[b.out.len - 1] else 0;
    if (last != '\n') try b.out.put(if (last == '\r') "\n" else "\r\n");
    std.debug.assert(b.out.len >= 4);
    return .{ .message = b.out.buf[0..b.out.len], .from = b.from, .rcpts = b.nrcpts, .message_id = b.message_id };
}

const Builder = struct {
    f: Fields,
    e: Entropy,
    out: Out,
    notes: Out,
    rcpts: []smtp.Rcpt,
    nrcpts: usize = 0,
    from: []const u8 = "",
    message_id: []const u8 = "",
    scratch: []u8,
    /// One header line before the fold.
    line: Out,
    tmp: Out,
    tmp2: Out,
    /// `_nodeId` of nodemailer: the count of MIME nodes so far.
    nodes: u32 = 0,
    headers: u32 = 0,
    attached: usize = 0,
    related: usize = 0,

    fn hasText(b: *const Builder) bool {
        return b.f.text.len > 0;
    }

    fn hasHtml(b: *const Builder) bool {
        return b.f.html.len > 0;
    }

    fn useAlternative(b: *const Builder) bool {
        return b.hasText() and b.hasHtml();
    }

    // ---- the structure (`compile` of MailComposer) ------------------------------

    fn root(b: *Builder) Error!void {
        const alternatives = @as(usize, @intFromBool(b.hasText())) + @intFromBool(b.hasHtml());
        if (b.attached > 1 or (alternatives > 0 and b.attached == 1)) return b.mixed();
        if (b.useAlternative()) return b.alternative(true);
        if (b.related > 0) return b.relatedPart(true);
        if (b.hasText()) return b.textPart(b.f.text, "text/plain; charset=utf-8", true);
        if (b.hasHtml()) return b.textPart(b.f.html, "text/html; charset=utf-8", true);
        if (b.attached == 1) return b.attachmentPart(b.f.attachments[0], true);
        // No body at all: an empty text/plain node without an encoding.
        b.nodes += 1;
        try b.rootHeaders();
        try b.tailHeaders("text/plain");
        try b.out.put("\r\n\r\n");
    }

    fn mixed(b: *Builder) Error!void {
        std.debug.assert(b.nodes == 0);
        b.nodes += 1;
        const id = b.nodes;
        try b.multipartHeaders("multipart/mixed", id, true);
        var first = true;
        if (b.useAlternative()) {
            try b.delimiter(id, &first);
            try b.alternative(false);
        } else if (b.related > 0) {
            try b.delimiter(id, &first);
            try b.relatedPart(false);
        } else if (b.hasText()) {
            try b.delimiter(id, &first);
            try b.textPart(b.f.text, "text/plain; charset=utf-8", false);
        } else if (b.hasHtml()) {
            try b.delimiter(id, &first);
            try b.textPart(b.f.html, "text/html; charset=utf-8", false);
        }
        for (b.f.attachments) |a| {
            if (b.isRelated(a)) continue;
            try b.delimiter(id, &first);
            try b.attachmentPart(a, false);
        }
        try b.close(id);
    }

    fn alternative(b: *Builder, is_root: bool) Error!void {
        b.nodes += 1;
        const id = b.nodes;
        try b.multipartHeaders("multipart/alternative", id, is_root);
        var first = true;
        try b.delimiter(id, &first);
        try b.textPart(b.f.text, "text/plain; charset=utf-8", false);
        try b.delimiter(id, &first);
        if (b.related > 0) try b.relatedPart(false) else try b.textPart(b.f.html, "text/html; charset=utf-8", false);
        try b.close(id);
    }

    fn relatedPart(b: *Builder, is_root: bool) Error!void {
        b.nodes += 1;
        const id = b.nodes;
        try b.multipartHeaders("multipart/related; type=\"text/html\"", id, is_root);
        var first = true;
        try b.delimiter(id, &first);
        try b.textPart(b.f.html, "text/html; charset=utf-8", false);
        for (b.f.attachments) |a| {
            if (!b.isRelated(a)) continue;
            try b.delimiter(id, &first);
            try b.attachmentPart(a, false);
        }
        try b.close(id);
    }

    fn isRelated(b: *const Builder, a: Attachment) bool {
        return b.hasHtml() and a.cid.len > 0;
    }

    fn putBoundary(b: *const Builder, o: *Out, id: u32) Error!void {
        try o.put("--_NmP-");
        try putHex(o, &b.e.boundary);
        try o.put("-Part_");
        try putDecimal(o, id);
    }

    fn delimiter(b: *Builder, id: u32, first: *bool) Error!void {
        try b.out.put(if (first.*) "--" else "\r\n--");
        first.* = false;
        try b.putBoundary(&b.out, id);
        try b.out.put("\r\n");
    }

    fn close(b: *Builder, id: u32) Error!void {
        try b.out.put("\r\n--");
        try b.putBoundary(&b.out, id);
        try b.out.put("--\r\n");
    }

    // ---- the headers (`buildHeaders` of MimeNode) --------------------------------

    /// Fold the header in `line` into the message. A value that is blank
    /// after `trim` gives no header.
    fn endHeader(b: *Builder, key_len: usize) Error!void {
        const text = b.line.buf[0..b.line.len];
        std.debug.assert(key_len <= text.len);
        if (std.mem.trim(u8, text[key_len..], " \t").len == 0) return;
        if (b.headers > 0) try b.out.put("\r\n");
        b.headers += 1;
        try fold(text, &b.out);
    }

    fn plainHeader(b: *Builder, key: []const u8, value: []const u8) Error!void {
        b.line.len = 0;
        try b.line.put(key);
        try b.line.put(value);
        try b.endHeader(key.len);
    }

    fn multipartHeaders(b: *Builder, kind: []const u8, id: u32, is_root: bool) Error!void {
        b.headers = 0;
        if (is_root) try b.rootHeaders();
        if (is_root) try b.datedHeaders();
        b.line.len = 0;
        try b.line.put("Content-Type: ");
        try b.line.put(kind);
        try b.line.put("; boundary=\"");
        try b.putBoundary(&b.line, id);
        try b.line.byte('"');
        try b.endHeader(14);
        try b.out.put("\r\n\r\n");
    }

    /// From, To, Cc, Bcc (when it is kept), Reply-To, In-Reply-To, References,
    /// Subject and Message-ID, and the envelope.
    fn rootHeaders(b: *Builder) Error!void {
        std.debug.assert(b.nrcpts == 0 and b.message_id.len == 0);
        try b.addressHeader("From: ", b.f.from, .from, true);
        try b.addressHeader("To: ", b.f.to, .rcpt, true);
        try b.addressHeader("Cc: ", b.f.cc, .rcpt, true);
        // Bcc gives recipients, and a header only when the message keeps it.
        try b.addressHeader("Bcc: ", b.f.bcc, .rcpt, b.f.keep_bcc);
        try b.addressHeader("Reply-To: ", b.f.reply_to, .reply_to, true);
        try b.inReplyToHeader();
        try b.referencesHeader();
        try b.subjectHeader();
        const at = b.notes.len;
        try b.notes.byte('<');
        const groups = [_][2]u8{ .{ 0, 4 }, .{ 4, 6 }, .{ 6, 8 }, .{ 8, 10 }, .{ 10, 16 } };
        for (groups, 0..) |g, i| {
            if (i > 0) try b.notes.byte('-');
            try putHex(&b.notes, b.e.id[g[0]..g[1]]);
        }
        try b.notes.byte('@');
        const sender = if (b.from.len > 0) b.from else "localhost";
        const domain_at = if (std.mem.lastIndexOfScalar(u8, sender, '@')) |i| i + 1 else 0;
        try b.notes.put(sender[domain_at..]);
        try b.notes.byte('>');
        b.message_id = b.notes.buf[at..b.notes.len];
        try b.plainHeader("Message-ID: ", b.message_id);
    }

    fn datedHeaders(b: *Builder) Error!void {
        b.line.len = 0;
        try b.line.put("Date: ");
        try putDate(&b.line, b.e.now_ms);
        try b.endHeader(6);
        try b.plainHeader("MIME-Version: ", "1.0");
    }

    /// Date, MIME-Version and Content-Type: the last headers of a root that is not multipart.
    fn tailHeaders(b: *Builder, content_type: []const u8) Error!void {
        try b.datedHeaders();
        try b.plainHeader("Content-Type: ", content_type);
    }

    /// `In-Reply-To`: the value in `<` and `>` (`_encodeHeaderValue`).
    fn inReplyToHeader(b: *Builder) Error!void {
        const v = b.f.in_reply_to;
        if (v.len == 0) return;
        if (!idTextTaken(v)) return error.HostOnly;
        b.line.len = 0;
        try b.line.put("In-Reply-To: ");
        if (v[0] != '<') try b.line.byte('<');
        try b.line.put(v);
        if (v[v.len - 1] != '>') try b.line.byte('>');
        try b.endHeader(13);
    }

    /// `References`: the ids between the spaces, each in `<` and `>`, with
    /// one space between them. An id in `<` and `>` loses its spaces first.
    fn referencesHeader(b: *Builder) Error!void {
        std.debug.assert(b.tmp2.buf.len > 0);
        if (b.f.references.len == 0) return;
        if (!idTextTaken(b.f.references)) return error.HostOnly;
        const v = std.mem.trim(u8, b.f.references, " ");
        // `<[^>]*>` of nodemailer: a `<` opens a part that ends at the next `>`.
        // Without that `>`, the `<` is a plain character.
        b.tmp2.len = 0;
        var open = false;
        for (v, 0..) |c, i| {
            if (!open and c == '<' and std.mem.indexOfScalarPos(u8, v, i + 1, '>') != null) open = true;
            if (open and c == '>') open = false;
            if (open and c == ' ') continue;
            try b.tmp2.byte(c);
        }
        b.line.len = 0;
        try b.line.put("References: ");
        var ids = std.mem.tokenizeScalar(u8, b.tmp2.buf[0..b.tmp2.len], ' ');
        var count: usize = 0;
        // Each id has one byte or more: the text bounds the loop.
        for (0..b.tmp2.len + 1) |_| {
            const id = ids.next() orelse break;
            if (count > 0) try b.line.byte(' ');
            count += 1;
            if (id[0] != '<') try b.line.byte('<');
            try b.line.put(id);
            if (id[id.len - 1] != '>') try b.line.byte('>');
        }
        // A value of spaces only is one empty id.
        if (count == 0) try b.line.put("<>");
        try b.endHeader(12);
    }

    fn subjectHeader(b: *Builder) Error!void {
        std.debug.assert(b.tmp2.buf.len > 0);
        if (b.f.subject.len == 0) return;
        // A line break of the value becomes one space.
        b.tmp2.len = 0;
        var i: usize = 0;
        var special = false;
        const s = b.f.subject;
        for (0..s.len) |_| {
            if (i >= s.len) break;
            const c = s[i];
            i += if (c == '\r' and i + 1 < s.len and s[i + 1] == '\n') 2 else 1;
            const out: u8 = if (c == '\r' or c == '\n') ' ' else c;
            if (out == '"' or out >= 0x80 or out == 0x7f or (out < 0x20 and out != '\t')) special = true;
            try b.tmp2.byte(out);
        }
        b.line.len = 0;
        try b.line.put("Subject: ");
        const value = b.tmp2.buf[0..b.tmp2.len];
        if (special) try encodedWord(&b.line, &b.tmp, value) else try b.line.put(value);
        try b.endHeader(9);
    }

    // ---- addresses ------------------------------------------------------------------

    fn addressHeader(b: *Builder, key: []const u8, field: []const u8, role: Role, visible: bool) Error!void {
        std.debug.assert(key.len > 2 and key[key.len - 1] == ' ');
        if (field.len == 0) return;
        for (field) |c| if (c < 0x20 or c == 0x7f) return error.HostOnly;
        b.line.len = 0;
        try b.line.put(key);
        var pos: usize = 0;
        var count: usize = 0;
        // Each entry ends with a comma or the end of the field.
        for (0..field.len + 1) |_| {
            const raw = nextEntry(field, &pos) orelse break;
            const entry = try parseEntry(raw) orelse continue;
            const at = b.notes.len;
            try b.notes.put(entry.local);
            try b.notes.byte('@');
            for (entry.domain) |c| try b.notes.byte(std.ascii.toLower(c));
            const addr = b.notes.buf[at..b.notes.len];
            if (count > 0) try b.line.put(", ");
            try b.putAddress(entry.name, addr);
            if (!try b.keep(addr, role, count)) b.notes.len = at;
            count += 1;
        }
        if (visible) try b.endHeader(key.len);
    }

    fn putAddress(b: *Builder, name: []const u8, addr: []const u8) Error!void {
        std.debug.assert(addr.len >= 3);
        if (name.len == 0) return b.line.put(addr);
        var word = true;
        var printable = true;
        for (name) |c| {
            if (!std.ascii.isAlphanumeric(c) and c != '_' and c != ' ') word = false;
            if (c >= 0x7f) printable = false;
        }
        if (word) {
            try b.line.put(name);
        } else if (printable) {
            try b.line.byte('"');
            try b.line.put(name);
            try b.line.byte('"');
        } else {
            try encodedWord(&b.line, &b.tmp, name);
        }
        try b.line.put(" <");
        try b.line.put(addr);
        try b.line.byte('>');
    }

    /// Add the address to the envelope. The answer is false when the
    /// envelope does not keep the text.
    fn keep(b: *Builder, addr: []const u8, role: Role, index: usize) Error!bool {
        switch (role) {
            .from, .reply_to => {
                if (index > 0 or b.from.len > 0) return false;
                b.from = addr;
                return true;
            },
            .rcpt => {
                for (b.rcpts[0..b.nrcpts]) |r| if (std.mem.eql(u8, r.addr, addr)) return false;
                if (b.nrcpts == b.rcpts.len) return error.HostOnly;
                b.rcpts[b.nrcpts] = .{ .addr = addr };
                b.nrcpts += 1;
                return true;
            },
        }
    }

    // ---- the parts ------------------------------------------------------------------

    fn textPart(b: *Builder, content: []const u8, content_type: []const u8, is_root: bool) Error!void {
        std.debug.assert(content.len > 0);
        b.nodes += 1;
        b.headers = 0;
        const stats = scan(content);
        const encoding: Encoding = if (stats.plain and !stats.long) .seven_bit else if (stats.other < stats.latin) .quoted else .base64;
        const name = switch (encoding) {
            .seven_bit => "7bit",
            .quoted => "quoted-printable",
            .base64 => "base64",
        };
        if (is_root) {
            try b.rootHeaders();
            try b.plainHeader("Content-Transfer-Encoding: ", name);
            try b.tailHeaders(content_type);
        } else {
            try b.plainHeader("Content-Type: ", content_type);
            try b.plainHeader("Content-Transfer-Encoding: ", name);
        }
        try b.out.put("\r\n\r\n");
        switch (encoding) {
            .seven_bit => try b.out.put(content),
            .quoted => try b.quotedBody(content),
            .base64 => try putBase64Lines(&b.out, content),
        }
    }

    fn attachmentPart(b: *Builder, a: Attachment, is_root: bool) Error!void {
        std.debug.assert(!is_root or b.nodes == 0);
        b.nodes += 1;
        b.headers = 0;
        if (!fileNameTaken(a.filename)) return error.HostOnly;
        for (a.cid) |c| if (c < 0x20 or c >= 0x7f or c == '"') return error.HostOnly;
        if (a.content_type.len > 0 and !typeTaken(a.content_type)) return error.HostOnly;
        const kind = if (a.content_type.len > 0) a.content_type else contentType(a.filename);
        if (startsWithIgnoreCase(kind, "message/")) return error.HostOnly;
        const quote = needsQuotes(a.filename);
        if (!is_root) try b.typeHeader(kind, a.filename, quote);
        if (a.cid.len > 0) {
            b.line.len = 0;
            try b.line.put("Content-ID: <");
            for (a.cid) |c| if (c != '<' and c != '>') try b.line.byte(c);
            try b.line.byte('>');
            try b.endHeader(12);
        }
        try b.plainHeader("Content-Transfer-Encoding: ", "base64");
        const inline_image = a.cid.len > 0 and startsWithIgnoreCase(kind, "image/");
        b.line.len = 0;
        try b.line.put(if (inline_image) "Content-Disposition: inline; filename=" else "Content-Disposition: attachment; filename=");
        try putParam(&b.line, a.filename, quote);
        try b.endHeader(21);
        if (is_root) {
            try b.rootHeaders();
            try b.datedHeaders();
            try b.typeHeader(kind, a.filename, quote);
        }
        try b.out.put("\r\n\r\n");
        try putBase64Lines(&b.out, a.content);
    }

    fn typeHeader(b: *Builder, kind: []const u8, filename: []const u8, quote: bool) Error!void {
        b.line.len = 0;
        try b.line.put("Content-Type: ");
        try b.line.put(kind);
        try b.line.put("; name=");
        try putParam(&b.line, filename, quote);
        try b.endHeader(14);
    }

    // ---- quoted-printable (`qp.Encoder`) --------------------------------------------

    /// The encoder of nodemailer takes the text in one chunk. It keeps the
    /// white space at the end apart, and encodes slices of 64 KiB.
    fn quotedBody(b: *Builder, content: []const u8) Error!void {
        var end = content.len;
        for (0..content.len) |_| {
            if (end == 0 or !isBlank(content[end - 1])) break;
            end -= 1;
        }
        const apart = content.len - end <= qp_slice;
        const body = if (apart) content[0..end] else content;
        var carry: usize = 0;
        try b.quotedSlices(body, &carry);
        if (apart) try b.quotedSlices(content[end..], &carry);
        try b.out.put(b.scratch[0..carry]);
    }

    fn quotedSlices(b: *Builder, buf: []const u8, carry: *usize) Error!void {
        var start: usize = 0;
        for (0..buf.len / qp_slice + 1) |_| {
            if (start >= buf.len) break;
            const end = @min(start + qp_slice, buf.len);
            var enc: Out = .{ .buf = b.scratch, .len = carry.* };
            const next: ?u8 = if (end < buf.len) buf[end] else null;
            try quotedBytes(&enc, buf[start..end], next);
            const mark = b.out.len;
            try wrap(enc.buf[0..enc.len], &b.out);
            const wrapped = b.out.buf[mark..b.out.len];
            const keep_from = if (std.mem.lastIndexOfScalar(u8, wrapped, '\n')) |i| i + 1 else 0;
            const tail = wrapped[keep_from..];
            std.debug.assert(tail.len <= b.scratch.len);
            @memcpy(b.scratch[0..tail.len], tail);
            carry.* = tail.len;
            b.out.len = mark + keep_from;
            start = end;
        }
    }
};

// ---- text ---------------------------------------------------------------------------

fn isBlank(c: u8) bool {
    return c == ' ' or c == '\t';
}

fn isHex(c: u8) bool {
    return std.ascii.isHex(c);
}

fn hexValue(c: u8) u8 {
    return if (c <= '9') c - '0' else (c | 0x20) - 'a' + 10;
}

fn putHex(o: *Out, bytes: []const u8) Error!void {
    const digits = "0123456789abcdef";
    for (bytes) |c| {
        try o.byte(digits[c >> 4]);
        try o.byte(digits[c & 15]);
    }
}

fn putEscape(o: *Out, c: u8) Error!void {
    const digits = "0123456789ABCDEF";
    try o.byte('=');
    try o.byte(digits[c >> 4]);
    try o.byte(digits[c & 15]);
}

fn putDecimal(o: *Out, n: u64) Error!void {
    var digits: [20]u8 = @splat(0);
    var at: usize = digits.len;
    var rest = n;
    for (0..digits.len) |_| {
        at -= 1;
        digits[at] = '0' + (std.math.cast(u8, rest % 10) orelse unreachable); // rest % 10 < 10
        rest /= 10;
        if (rest == 0) break;
    }
    try o.put(digits[at..]);
}

fn putTwo(o: *Out, n: u64) Error!void {
    std.debug.assert(n < 100);
    try o.byte('0' + (std.math.cast(u8, n / 10) orelse unreachable)); // n < 100
    try o.byte('0' + (std.math.cast(u8, n % 10) orelse unreachable)); // n < 100
}

/// `toUTCString` with `+0000` for `GMT`.
fn putDate(o: *Out, now_ms: i64) Error!void {
    const secs: u64 = std.math.cast(u64, @divFloor(@max(now_ms, 0), 1000)) orelse unreachable; // now_ms is a valid timestamp
    const days = secs / 86400;
    const rem = secs % 86400;
    // The civil date of a day count (the algorithm of Howard Hinnant).
    const z = days + 719468;
    const era = z / 146097;
    const doe = z - era * 146097;
    const yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    const doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    const mp = (5 * doy + 2) / 153;
    const day = doy - (153 * mp + 2) / 5 + 1;
    const month = if (mp < 10) mp + 3 else mp - 9;
    const year = yoe + era * 400 + @intFromBool(month <= 2);
    std.debug.assert(month >= 1 and month <= 12 and day >= 1 and day <= 31);
    try o.put("ThuFriSatSunMonTueWed"[(days % 7) * 3 ..][0..3]);
    try o.put(", ");
    try putTwo(o, day);
    try o.byte(' ');
    try o.put("JanFebMarAprMayJunJulAugSepOctNovDec"[(month - 1) * 3 ..][0..3]);
    try o.byte(' ');
    if (year < 1000) try o.byte('0');
    try putDecimal(o, year);
    try o.byte(' ');
    try putTwo(o, rem / 3600);
    try o.byte(':');
    try putTwo(o, rem % 3600 / 60);
    try o.byte(':');
    try putTwo(o, rem % 60);
    try o.put(" +0000");
}

/// The length of the UTF-8 sequence at `i`, or null when it is not valid.
fn sequence(s: []const u8, i: usize) ?usize {
    const c = s[i];
    if (c < 0x80) return 1;
    const n: usize = if (c >= 0xc2 and c <= 0xdf) 2 else if (c >= 0xe0 and c <= 0xef) 3 else if (c >= 0xf0 and c <= 0xf4) 4 else return null;
    if (i + n > s.len) return null;
    for (s[i + 1 .. i + n]) |t| if (t & 0xc0 != 0x80) return null;
    const second = s[i + 1];
    if (c == 0xe0 and second < 0xa0) return null;
    if (c == 0xed and second > 0x9f) return null;
    if (c == 0xf0 and second < 0x90) return null;
    if (c == 0xf4 and second > 0x8f) return null;
    return n;
}

fn validUtf8(s: []const u8) bool {
    var i: usize = 0;
    for (0..s.len) |_| {
        if (i >= s.len) break;
        i += sequence(s, i) orelse return false;
    }
    return true;
}

const Stats = struct {
    /// `isPlainText`: ASCII without the control characters that are not white space.
    plain: bool = true,
    /// `hasLongerLines`: a line over 76, or more than 128 KiB.
    long: bool = false,
    /// `_getTextEncoding`: the letters of ASCII, and the UTF-16 units that need encoding.
    latin: usize = 0,
    other: usize = 0,
};

/// The facts of a valid UTF-8 text that select its encoding.
fn scan(s: []const u8) Stats {
    var st: Stats = .{ .long = s.len > 128 << 10 };
    var run: usize = 0;
    for (s, 0..) |c, i| {
        if (c == '\n' or c == '\r') run = 0 else run += 1;
        if (run > line_max) st.long = true;
        if (std.ascii.isAlphabetic(c)) {
            st.latin += 1;
        } else if (c >= 0x80) {
            st.plain = false;
            // A lead byte counts the UTF-16 units of its character.
            if (c >= 0xc0) st.other += if (sequence(s, i) == 4) 2 else 1;
        } else if (c < 0x20 and c != '\t' and c != '\n' and c != '\r') {
            st.plain = false;
            st.other += 1;
        }
    }
    return st;
}

/// The white space of JavaScript outside ASCII: `trim` of the address
/// parser removes it from a name.
fn hasWideSpace(s: []const u8) bool {
    const spaces = [_][]const u8{ "\u{a0}", "\u{1680}", "\u{2028}", "\u{2029}", "\u{202f}", "\u{205f}", "\u{3000}", "\u{feff}" };
    for (spaces) |sp| if (std.mem.indexOf(u8, s, sp) != null) return true;
    var i: usize = 0;
    for (0..s.len) |_| {
        i = std.mem.indexOfPos(u8, s, i, "\u{2000}"[0..2]) orelse return false;
        if (i + 2 < s.len and s[i + 2] >= 0x80 and s[i + 2] <= 0x8a) return true;
        i += 2;
    }
    return false;
}

fn startsWithIgnoreCase(s: []const u8, prefix: []const u8) bool {
    return s.len >= prefix.len and std.ascii.eqlIgnoreCase(s[0..prefix.len], prefix);
}

// ---- addresses (`addressparser`, `_normalizeAddress`) ---------------------------------

const Entry = struct { name: []const u8, local: []const u8, domain: []const u8 };

/// The next part of the field up to a comma that is not in quotes, or null at the end.
fn nextEntry(field: []const u8, pos: *usize) ?[]const u8 {
    if (pos.* >= field.len) return null;
    const start = pos.*;
    var quoted = false;
    var i = start;
    for (start..field.len) |_| {
        if (field[i] == '"') quoted = !quoted;
        if (field[i] == ',' and !quoted) break;
        i += 1;
    }
    pos.* = i + 1;
    return field[start..i];
}

/// One address in a form that the builder takes, or null for a blank entry.
fn parseEntry(raw: []const u8) Error!?Entry {
    std.debug.assert(std.mem.indexOfScalar(u8, raw, 0) == null);
    const t = std.mem.trim(u8, raw, " ");
    if (t.len == 0) return null;
    var name: []const u8 = "";
    var rest = t;
    if (t[0] == '"') {
        const end = std.mem.indexOfScalarPos(u8, t, 1, '"') orelse return error.HostOnly;
        name = std.mem.trim(u8, t[1..end], " ");
        rest = std.mem.trim(u8, t[end + 1 ..], " ");
        if (!nameTaken(name, "\\@") or rest.len == 0 or rest[0] != '<') return error.HostOnly;
    } else if (std.mem.indexOfScalar(u8, t, '<')) |lt| {
        name = std.mem.trim(u8, t[0..lt], " ");
        rest = t[lt..];
        if (lt > 0 and !nameTaken(name, "\"(),:;<>@[]\\")) return error.HostOnly;
    }
    if (rest[0] == '<') {
        if (rest.len < 2 or rest[rest.len - 1] != '>') return error.HostOnly;
        rest = rest[1 .. rest.len - 1];
    }
    const at = std.mem.indexOfScalar(u8, rest, '@') orelse return error.HostOnly;
    const entry: Entry = .{ .name = name, .local = rest[0..at], .domain = rest[at + 1 ..] };
    if (!localTaken(entry.local) or !domainTaken(entry.domain)) return error.HostOnly;
    return entry;
}

fn nameTaken(name: []const u8, refused: []const u8) bool {
    if (name.len == 0 or hasWideSpace(name)) return false;
    return std.mem.indexOfAny(u8, name, refused) == null;
}

/// A dot-atom of ASCII: nodemailer keeps it as it is.
fn localTaken(local: []const u8) bool {
    if (local.len == 0 or local[0] == '.' or local[local.len - 1] == '.') return false;
    for (local, 0..) |c, i| {
        if (c == '.' and local[i - 1] == '.') return false;
        if (!std.ascii.isAlphanumeric(c) and std.mem.indexOfScalar(u8, ".!#$%&'*+-/=?^_`{|}~", c) == null) return false;
    }
    return true;
}

/// A host name that `domainToASCII` of Node.js only puts in lower case:
/// labels of letters, digits and hyphens, no IDNA label, and a last label
/// that is not a number.
fn domainTaken(domain: []const u8) bool {
    if (domain.len == 0 or domain.len > 253) return false;
    var start: usize = 0;
    var last: []const u8 = "";
    for (0..domain.len + 1) |_| {
        if (start > domain.len) break;
        const end = std.mem.indexOfScalarPos(u8, domain, start, '.') orelse domain.len;
        last = domain[start..end];
        if (last.len == 0 or last.len > 63 or last[0] == '-' or last[last.len - 1] == '-') return false;
        if (last.len >= 4 and last[2] == '-' and last[3] == '-') return false;
        for (last) |c| if (!std.ascii.isAlphanumeric(c) and c != '-') return false;
        start = end + 1;
    }
    if (startsWithIgnoreCase(last, "0x")) return false;
    for (last) |c| if (!std.ascii.isDigit(c)) return true;
    return false;
}

// ---- encoded words (`encodeWord` with a length of 52) -------------------------------

const word_start_q = "=?UTF-8?Q?";
const word_start_b = "=?UTF-8?B?";
const q_max = 40;
const b_max = 30;

fn encodedWord(o: *Out, tmp: *Out, value: []const u8) Error!void {
    std.debug.assert(tmp.buf.len > 0);
    const stats = scan(value);
    if (stats.other >= stats.latin) return encodedWordB(o, value);
    tmp.len = 0;
    for (value, 0..) |c, i| {
        const literal = std.ascii.isAlphanumeric(c) or std.mem.indexOfScalar(u8, "!*+-/", c) != null;
        if (literal) try tmp.byte(c) else if (c == ' ' and i + 1 < value.len) try tmp.byte('_') else try putEscape(tmp, c);
    }
    var rest: []const u8 = tmp.buf[0..tmp.len];
    try o.put(word_start_q);
    if (rest.len > q_max) {
        // Each piece has one byte or more.
        for (0..rest.len) |n| {
            if (rest.len == 0) break;
            if (n > 0) try o.put("?= " ++ word_start_q);
            const piece = qPiece(rest);
            try o.put(piece);
            rest = rest[piece.len..];
        }
    } else try o.put(rest);
    try o.put("?=");
}

/// One line of `splitMimeEncodedString`: 40 characters, not cut inside an
/// escape, and not before a UTF-8 continuation byte.
fn qPiece(str: []const u8) []const u8 {
    std.debug.assert(str.len > 0);
    const whole = str[0..@min(q_max, str.len)];
    var cur = whole;
    if (cur[cur.len - 1] == '=') {
        cur = cur[0 .. cur.len - 1];
    } else if (cur.len >= 2 and cur[cur.len - 2] == '=' and isHex(cur[cur.len - 1])) {
        cur = cur[0 .. cur.len - 2];
    }
    const fallback = if (cur.len > 0) cur else whole;
    for (0..q_max) |_| {
        if (cur.len == 0) break;
        const after = str[cur.len..];
        if (after.len < 3 or after[0] != '=' or !isHex(after[1]) or !isHex(after[2])) break;
        const code = hexValue(after[1]) * 16 + hexValue(after[2]);
        if (code <= 0x7f or code >= 0xc2) break;
        cur = cur[0..cur.len -| 3];
    }
    return if (cur.len > 0) cur else fallback;
}

fn encodedWordB(o: *Out, value: []const u8) Error!void {
    std.debug.assert(o.len >= 0 and b_max % 3 == 0);
    try o.put(word_start_b);
    if ((value.len + 2) / 3 * 4 <= b_max) {
        try putBase64(o, value);
        return o.put("?=");
    }
    // Whole characters, 30 bytes or fewer for each word.
    var start: usize = 0;
    var i: usize = 0;
    for (0..value.len) |_| {
        if (i >= value.len) break;
        const n = sequence(value, i) orelse 1;
        if (i + n - start > b_max and i > start) {
            try putBase64(o, value[start..i]);
            try o.put("?= " ++ word_start_b);
            start = i;
        }
        i += n;
    }
    try putBase64(o, value[start..]);
    try o.put("?=");
}

// ---- header lines (`foldLines`) -----------------------------------------------------

/// Fold a header at 76 characters, at white space.
fn fold(str: []const u8, o: *Out) Error!void {
    std.debug.assert(std.mem.indexOfAny(u8, str, "\r\n") == null);
    var pos: usize = 0;
    // Each line takes one character or more.
    for (0..str.len + 1) |_| {
        if (pos >= str.len) break;
        var line = str[pos..@min(pos + line_max, str.len)];
        if (line.len < line_max) {
            try o.put(line);
            break;
        }
        const space = lastSpaceRun(line);
        if (space > 0) {
            line = line[0..space];
        } else {
            // No place to fold in the line: it ends before the next white space.
            const after = str[pos + line.len ..];
            const word = std.mem.indexOfAny(u8, after, " \t") orelse after.len;
            line = str[pos .. pos + line.len + word];
        }
        try o.put(line);
        pos += line.len;
        if (pos < str.len) try o.put("\r\n");
    }
}

/// Where the last run of white space of the line starts, or 0.
fn lastSpaceRun(line: []const u8) usize {
    var i = std.mem.lastIndexOfAny(u8, line, " \t") orelse return 0;
    for (0..line.len) |_| {
        if (i == 0 or !isBlank(line[i - 1])) break;
        i -= 1;
    }
    return i;
}

// ---- quoted-printable (`qp.encode`, `qp.wrap`) --------------------------------------

/// Encode text. `next` is the byte after the slice, or null at the end.
fn quotedBytes(o: *Out, buf: []const u8, next: ?u8) Error!void {
    for (buf, 0..) |c, i| {
        const following: ?u8 = if (i + 1 < buf.len) buf[i + 1] else next;
        const literal = c == '\t' or c == '\n' or c == '\r' or (c >= 0x20 and c <= 0x7e and c != '=');
        const at_end = if (following) |f| f == '\n' or f == '\r' else true;
        if (literal and !(isBlank(c) and at_end)) try o.byte(c) else try putEscape(o, c);
    }
}

fn endsWithEscape(line: []const u8) bool {
    const n = line.len;
    return n >= 3 and line[n - 3] == '=' and isHex(line[n - 2]) and isHex(line[n - 1]);
}

/// The whole line is one to four escapes.
fn onlyEscapes(line: []const u8) bool {
    if (line.len == 0 or line.len > 12 or line.len % 3 != 0) return false;
    var i: usize = 0;
    for (0..4) |_| {
        if (i >= line.len) break;
        if (!endsWithEscape(line[0 .. i + 3])) return false;
        i += 3;
    }
    return true;
}

/// Add soft line breaks, as `wrap` with a line length of 76.
fn wrap(str: []const u8, o: *Out) Error!void {
    if (str.len <= line_max) return o.put(str);
    var pos: usize = 0;
    // Each line takes one character or more.
    for (0..str.len + 1) |_| {
        if (pos >= str.len) break;
        const cut = wrapLine(str, pos);
        std.debug.assert(cut.take > 0);
        try o.put(str[pos..][0..cut.take]);
        if (cut.soft) try o.put("=\r\n");
        pos += cut.take;
    }
}

const Cut = struct { take: usize, soft: bool = false };

fn wrapLine(str: []const u8, pos: usize) Cut {
    std.debug.assert(pos < str.len);
    const margin = line_max / 3;
    const window = str[pos..@min(pos + line_max, str.len)];
    var line = window;
    if (std.mem.indexOf(u8, line, "\r\n")) |i| return .{ .take = i + 2 };
    if (line[line.len - 1] == '\n') return .{ .take = line.len };
    const tail = line[line.len -| margin..];
    if (std.mem.lastIndexOfScalar(u8, tail, '\n')) |p| {
        if (std.mem.indexOfScalar(u8, tail[p + 1 ..], '\r') == null) return .{ .take = line.len - (tail.len - p - 1) };
    }
    const stop = if (line.len > line_max - margin) std.mem.lastIndexOfAny(u8, tail, " \t.,!?") else null;
    if (stop) |p| {
        line = line[0 .. line.len - (tail.len - p - 1)];
    } else {
        line = beforeEscape(line, str.len - pos);
    }
    if (line.len == 0) line = window;
    if (pos + line.len >= str.len or line[line.len - 1] == '\n') return .{ .take = line.len };
    if (line.len == line_max) line = line[0 .. line.len - @as(usize, if (endsWithEscape(line)) 3 else 1)];
    return .{ .take = line.len, .soft = true };
}

/// A line that ends in an escape, or in a part of one: do not cut the
/// escape, and do not cut a UTF-8 sequence. `left` is the text from the
/// start of the line to the end.
fn beforeEscape(full: []const u8, left: usize) []const u8 {
    var line = full;
    const n = line.len;
    const whole = endsWithEscape(line);
    const one = n >= 2 and line[n - 2] == '=' and isHex(line[n - 1]);
    const none = line[n - 1] == '=';
    if (!whole and !one and !none) return line;
    if (one) line = line[0 .. n - 2] else if (none) line = line[0 .. n - 1];
    for (0..line_max) |_| {
        if (line.len <= 3 or line.len >= left or onlyEscapes(line) or !endsWithEscape(line)) break;
        const code = hexValue(line[line.len - 2]) * 16 + hexValue(line[line.len - 1]);
        if (code < 128) break;
        line = line[0 .. line.len - 3];
        if (code >= 0xc0) break;
    }
    return line;
}

// ---- base64 -----------------------------------------------------------------------------

fn putBase64(o: *Out, bytes: []const u8) Error!void {
    const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var i: usize = 0;
    for (0..bytes.len / 3 + 1) |_| {
        if (i >= bytes.len) break;
        const left = bytes.len - i;
        const a = bytes[i];
        const b2: u8 = if (left > 1) bytes[i + 1] else 0;
        const c: u8 = if (left > 2) bytes[i + 2] else 0;
        try o.byte(table[a >> 2]);
        try o.byte(table[(a & 3) << 4 | b2 >> 4]);
        try o.byte(if (left > 1) table[(b2 & 15) << 2 | c >> 6] else '=');
        try o.byte(if (left > 2) table[c & 63] else '=');
        i += 3;
    }
}

/// Base64 in lines of 76, without a line break at the end.
fn putBase64Lines(o: *Out, bytes: []const u8) Error!void {
    const per_line = line_max / 4 * 3;
    var i: usize = 0;
    for (0..bytes.len / per_line + 1) |_| {
        if (i >= bytes.len) break;
        if (i > 0) try o.put("\r\n");
        const end = @min(i + per_line, bytes.len);
        try putBase64(o, bytes[i..end]);
        i = end;
    }
}

// ---- file names -------------------------------------------------------------------------

/// A name that nodemailer writes as a plain parameter: printable ASCII
/// without `"`, under 75 characters.
fn fileNameTaken(name: []const u8) bool {
    if (name.len == 0 or name.len >= 75 or name[name.len - 1] == '/') return false;
    for (name) |c| if (c < 0x20 or c >= 0x7f or c == '"') return false;
    return true;
}

/// A content type of a file that nodemailer writes as it is: `type/subtype`
/// in token characters, without a parameter.
fn typeTaken(kind: []const u8) bool {
    const slash = std.mem.indexOfScalar(u8, kind, '/') orelse return false;
    if (slash == 0 or slash + 1 == kind.len) return false;
    for (kind, 0..) |c, i| {
        if (i == slash) continue;
        if (!std.ascii.isAlphanumeric(c) and std.mem.indexOfScalar(u8, "!#$&^_.+-", c) == null) return false;
    }
    return true;
}

/// A value of In-Reply-To or References in printable ASCII: no line break
/// and no white space other than a space.
fn idTextTaken(value: []const u8) bool {
    for (value) |c| if (c < 0x20 or c >= 0x7f) return false;
    return true;
}

fn needsQuotes(name: []const u8) bool {
    return name[0] == '-' or std.mem.indexOfAny(u8, name, " '\\;:/=(),<>@[]?") != null;
}

fn putParam(o: *Out, name: []const u8, quote: bool) Error!void {
    if (!quote) return o.put(name);
    try o.byte('"');
    for (name) |c| {
        if (c == '\\') try o.byte('\\');
        try o.byte(c);
    }
    try o.byte('"');
}

/// `detectMimeType`: the type of the extension, or of the whole name when it has none.
fn contentType(filename: []const u8) []const u8 {
    std.debug.assert(filename.len > 0 and mime_table.rows.len < 1 << 16);
    const base = if (std.mem.lastIndexOfScalar(u8, filename, '/')) |i| filename[i + 1 ..] else filename;
    var key = base;
    if (std.mem.lastIndexOfScalar(u8, base, '.')) |dot| {
        if (dot > 0) key = if (dot + 1 < base.len) base[dot + 1 ..] else base[0..dot];
    }
    if (std.mem.indexOfScalar(u8, key, '?')) |q| key = key[0..q];
    key = std.mem.trim(u8, key, " ");
    var lo: usize = 0;
    var hi: usize = mime_table.rows.len;
    // A binary search: the table has fewer than 2^16 rows.
    for (0..16) |_| {
        if (lo >= hi) break;
        const mid = (lo + hi) / 2;
        switch (orderIgnoreCase(key, mime_table.rows[mid].ext)) {
            .eq => return mime_table.rows[mid].mime,
            .lt => hi = mid,
            .gt => lo = mid + 1,
        }
    }
    return "application/octet-stream";
}

/// The order of `key` in lower case against a row of the table.
fn orderIgnoreCase(key: []const u8, ext: []const u8) std.math.Order {
    const n = @min(key.len, ext.len);
    for (key[0..n], ext[0..n]) |k, e| {
        const lower = std.ascii.toLower(k);
        if (lower != e) return std.math.order(lower, e);
    }
    return std.math.order(key.len, ext.len);
}

// ---- tests ------------------------------------------------------------------------------

const cases = @import("mailcase_tables.zig");

const Rig = struct {
    out: []u8,
    scratch: []u8,
    text: []u8,
    notes: [16 << 10]u8 = @splat(0),
    rcpts: [64]Rcpt = @splat(.{ .addr = "" }),
    at: usize = 0,
    attachments: [8]Attachment = @splat(.{ .filename = "", .content = "" }),

    fn init(gpa: std.mem.Allocator) !*Rig {
        const g = try gpa.create(Rig);
        g.* = .{ .out = try gpa.alloc(u8, 2 << 20), .scratch = try gpa.alloc(u8, scratch_min), .text = try gpa.alloc(u8, 1 << 20) };
        return g;
    }

    fn work(g: *Rig) Work {
        return .{ .out = g.out, .scratch = g.scratch, .notes = &g.notes, .rcpts = &g.rcpts };
    }

    /// The bytes of a hex text of the table, `count` times.
    fn bytes(g: *Rig, hex: []const u8, count: u32) []const u8 {
        const start = g.at;
        for (0..hex.len / 2) |i| {
            g.text[g.at] = hexValue(hex[2 * i]) * 16 + hexValue(hex[2 * i + 1]);
            g.at += 1;
        }
        const unit = g.at - start;
        for (1..@max(count, 1)) |_| {
            @memcpy(g.text[g.at..][0..unit], g.text[start..][0..unit]);
            g.at += unit;
        }
        return g.text[start..g.at];
    }

    fn fields(g: *Rig, v: cases.Vector) Fields {
        g.at = 0;
        for (v.attachments, 0..) |a, i| {
            g.attachments[i] = .{ .filename = g.bytes(a.filename, 1), .cid = g.bytes(a.cid, 1), .content = g.bytes(a.content, 1), .content_type = g.bytes(a.content_type, 1) };
        }
        return .{
            .from = g.bytes(v.from, 1),
            .to = g.bytes(v.to, 1),
            .cc = g.bytes(v.cc, 1),
            .bcc = g.bytes(v.bcc, 1),
            .reply_to = g.bytes(v.reply_to, 1),
            .subject = g.bytes(v.subject, 1),
            .text = g.bytes(v.text, v.text_count),
            .html = g.bytes(v.html, v.html_count),
            .attachments = g.attachments[0..v.attachments.len],
            .in_reply_to = g.bytes(v.in_reply_to, 1),
            .references = g.bytes(v.references, 1),
            .keep_bcc = v.keep_bcc,
        };
    }
};

fn entropyOf(g: *Rig, v: cases.Vector) Entropy {
    const random = g.bytes(v.random, 1);
    var e: Entropy = .{ .boundary = @splat(0), .id = @splat(0), .now_ms = v.now_ms };
    @memcpy(&e.boundary, random[0..8]);
    @memcpy(&e.id, random[8..24]);
    return e;
}

fn fnv(bytes: []const u8) u64 {
    var h: u64 = 0xcbf29ce484222325;
    for (bytes) |c| h = (h ^ c) *% 0x100000001b3;
    return h;
}

test "mail: the message, the envelope and the Message-ID equal nodemailer for each vector" {
    const gpa = std.testing.allocator;
    const g = try Rig.init(gpa);
    defer gpa.destroy(g);
    defer for ([_][]u8{ g.out, g.scratch, g.text }) |part| gpa.free(part);
    var built: usize = 0;
    // The vectors with the mail options of the Gmail node.
    var kept: usize = 0;
    var built_kept: usize = 0;
    for (cases.vectors, 0..) |v, n| {
        if (v.keep_bcc) kept += 1;
        const f = g.fields(v);
        const e = entropyOf(g, v);
        const got = build(f, e, g.work()) catch |err| {
            // A refusal sends the call to the v1 node. A message too large for the test buffers is a fault.
            try std.testing.expectEqual(error.HostOnly, err);
            continue;
        };
        built += 1;
        if (v.keep_bcc) built_kept += 1;
        errdefer std.debug.print("vector {d}\n", .{n});
        if (v.want.len > 0) try std.testing.expectEqualStrings(g.bytes(v.want, 1), got.message);
        try std.testing.expectEqual(@as(usize, v.want_len), got.message.len);
        try std.testing.expectEqual(v.want_hash, fnv(got.message));
        try std.testing.expectEqualStrings(g.bytes(v.envelope_from, 1), got.from);
        try std.testing.expectEqualStrings(g.bytes(v.message_id, 1), got.message_id);
        var to = std.mem.splitScalar(u8, g.bytes(v.envelope_to, 1), '\n');
        for (g.rcpts[0..got.rcpts]) |r| try std.testing.expectEqualStrings(to.next() orelse "", r.addr);
        try std.testing.expectEqualStrings("", to.rest());
    }
    // The vectors hold inputs outside the subset on purpose; most are inside.
    try std.testing.expect(built * 10 >= cases.vectors.len * 6);
    try std.testing.expect(kept >= 300 and built_kept * 10 >= kept * 6);
}

test "mail: a buffer that is too small is a limit, and no byte is written past it" {
    const gpa = std.testing.allocator;
    const g = try Rig.init(gpa);
    defer gpa.destroy(g);
    defer for ([_][]u8{ g.out, g.scratch, g.text }) |part| gpa.free(part);
    const f: Fields = .{ .from = "a@example.com", .to = "b@example.com", .subject = "s", .text = "Hello" };
    const e: Entropy = .{ .boundary = @splat(1), .id = @splat(2), .now_ms = 0 };
    var w = g.work();
    const full = try build(f, e, w);
    const size = full.message.len;
    g.out[size - 1] = 0x55;
    w.out = g.out[0 .. size - 1];
    try std.testing.expectError(error.NoSpace, build(f, e, w));
    try std.testing.expectEqual(@as(u8, 0x55), g.out[size - 1]);
    w = g.work();
    w.rcpts = g.rcpts[0..0];
    try std.testing.expectError(error.HostOnly, build(f, e, w));
}

test "mail: the Date header" {
    var buf: [40]u8 = @splat(0);
    var o: Out = .{ .buf = &buf };
    try putDate(&o, 1_794_909_600_123);
    try std.testing.expectEqualStrings("Tue, 17 Nov 2026 10:00:00 +0000", buf[0..o.len]);
    o.len = 0;
    try putDate(&o, 951_782_400_000);
    try std.testing.expectEqualStrings("Tue, 29 Feb 2000 00:00:00 +0000", buf[0..o.len]);
}
