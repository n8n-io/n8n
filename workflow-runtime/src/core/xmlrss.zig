//! The text helpers of rss-parser 3.13 that the RSS Feed Read node needs
//! (spec section 4.3):
//!
//! - `XML.snippet(html)`: `getSnippet`, the tags stripped as its two regular
//!   expressions do, HTML entities decoded as entities 2.2 `decodeHTML`
//!   does, then trimmed as JavaScript `trim` does.
//! - `XML.content(value)`: `getContent`, the `_` text of an element, or the
//!   element rendered as XML by xml2js's Builder (headless, root `div`, not
//!   pretty), with an explicit stack.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const ent = @import("xmlent.zig");
const xml = @import("xml.zig");
const Builder = @import("arena.zig").Builder;
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

/// One code point of WTF-8 at `i` and its byte length.
fn next(s: []const u8, i: usize) struct { cp: u21, n: usize } {
    const n = std.unicode.utf8ByteSequenceLength(s[i]) catch return .{ .cp = 0xFFFD, .n = 1 };
    if (n == 1 or i + n > s.len) return .{ .cp = s[i], .n = 1 };
    if (n == 3 and s[i] == 0xED and s[i + 1] >= 0xA0) {
        return .{ .cp = (@as(u21, s[i] & 0x0F) << 12) | (@as(u21, s[i + 1] & 0x3F) << 6) | (s[i + 2] & 0x3F), .n = 3 };
    }
    return .{ .cp = std.unicode.utf8Decode(s[i..][0..n]) catch 0xFFFD, .n = n };
}

/// Characters that `.` in a regular expression does not match, besides `\n`.
fn breaksDot(cp: u21) bool {
    return cp == '\r' or cp == 0x2028 or cp == 0x2029;
}

const block_tags = [_][]const u8{ "h", "br", "p", "ul", "ol", "li", "blockquote", "section", "table", "tr", "div" };

/// `str.replace(/([^\n])<\/?(h|br|…|div)(?:.|\n)*?>([^\n])/gm, '$1\n$3')`.
fn breakBlocks(b: *Builder, s: []const u8) Err!void {
    var p: usize = 0;
    // Each pass moves `p` forward, so the length bounds the loop.
    while (p < s.len) {
        const g1 = next(s, p);
        if (g1.cp != '\n') if (blockEnd(s, p + g1.n)) |m| {
            try b.append(s[p .. p + g1.n]);
            try b.byte('\n');
            try b.append(s[m.g3 .. m.g3 + m.g3_len]);
            p = m.g3 + m.g3_len;
            continue;
        };
        try b.append(s[p .. p + g1.n]);
        p += g1.n;
    }
}

/// The rest of the block pattern from `<` at `i`: the position and length of `([^\n])`.
fn blockEnd(s: []const u8, i: usize) ?struct { g3: usize, g3_len: usize } {
    if (i >= s.len or s[i] != '<') return null;
    var k = i + 1;
    if (k < s.len and s[k] == '/') k += 1;
    var named = false;
    for (block_tags) |t| {
        if (std.mem.startsWith(u8, s[k..], t)) {
            named = true;
            k += t.len;
            break;
        }
    }
    if (!named) return null;
    // `(?:.|\n)*?>` then a character that is not `\n`: the first `>` that
    // has one after it, without a character that `.` does not match before.
    while (k < s.len) {
        const c = next(s, k);
        if (breaksDot(c.cp)) return null;
        if (c.cp == '>' and k + 1 < s.len) {
            const g3 = next(s, k + 1);
            if (g3.cp != '\n') return .{ .g3 = k + 1, .g3_len = g3.n };
        }
        k += c.n;
    }
    return null;
}

/// `str.replace(/<(?:.|\n)*?>/gm, '')`.
fn dropTags(b: *Builder, s: []const u8) Err!void {
    var p: usize = 0;
    while (p < s.len) {
        if (s[p] == '<') if (tagEnd(s, p + 1)) |end| {
            p = end;
            continue;
        };
        const c = next(s, p);
        try b.append(s[p .. p + c.n]);
        p += c.n;
    }
}

fn tagEnd(s: []const u8, from: usize) ?usize {
    var k = from;
    while (k < s.len) {
        const c = next(s, k);
        if (breaksDot(c.cp)) return null;
        if (c.cp == '>') return k + 1;
        k += c.n;
    }
    return null;
}

fn findHtml(name: []const u8) ?ent.HtmlEntry {
    var lo: usize = 0;
    var hi: usize = ent.html.len;
    while (lo < hi) {
        const mid = (lo + hi) / 2;
        switch (std.mem.order(u8, ent.html[mid].name, name)) {
            .eq => return ent.html[mid],
            .lt => lo = mid + 1,
            .gt => hi = mid,
        }
    }
    return null;
}

/// entities 2.2 `decodeCodePoint`.
fn codePoint(b: *Builder, num: u64) Err!void {
    var cp: u64 = num;
    if ((cp >= 0xD800 and cp <= 0xDFFF) or cp > 0x10FFFF) cp = 0xFFFD;
    for (ent.remap) |r| {
        if (r[0] == cp) {
            cp = r[1];
            break;
        }
    }
    var buf: [8]u8 = undefined;
    const n = xml.wtf8(@intCast(cp), &buf);
    try b.append(buf[0..n]);
}

/// entities 2.2 `decodeHTML`.
fn decodeHtml(b: *Builder, s: []const u8) Err!void {
    var p: usize = 0;
    while (p < s.len) {
        if (s[p] == '&') if (try entityAt(b, s, p + 1)) |end| {
            p = end;
            continue;
        };
        try b.append(s[p .. p + 1]);
        p += 1;
    }
}

/// The reference after `&` at `i`: writes its text and returns its end.
fn entityAt(b: *Builder, s: []const u8, i: usize) Err!?usize {
    var run = i;
    while (run < s.len and std.ascii.isAlphanumeric(s[run])) run += 1;
    // Named: the longest name that ends with `;`, or that needs none.
    var len = run - i;
    while (len > 0) : (len -= 1) {
        const e = findHtml(s[i .. i + len]) orelse continue;
        const semi = i + len < s.len and s[i + len] == ';';
        if (semi) {
            try b.append(e.value);
            return i + len + 1;
        }
        if (e.legacy) {
            try b.append(e.value);
            return i + len;
        }
    }
    if (i < s.len and s[i] == '#') {
        const hex = i + 1 < s.len and (s[i + 1] == 'x' or s[i + 1] == 'X');
        const start = i + if (hex) @as(usize, 2) else 1;
        var k = start;
        while (k < s.len and (if (hex) std.ascii.isHex(s[k]) else std.ascii.isDigit(s[k]))) k += 1;
        if (k == start) return null;
        var num: u64 = 0;
        for (s[start..k]) |c| {
            const d = std.fmt.charToDigit(c, if (hex) 16 else 10) catch unreachable;
            num = std.math.mul(u64, num, if (hex) 16 else 10) catch std.math.maxInt(u64);
            num +|= d;
        }
        try codePoint(b, num);
        return if (k < s.len and s[k] == ';') k + 1 else k;
    }
    return null;
}

/// JavaScript `trim` (the white space and line terminators of `\s`).
fn jsTrim(s: []const u8) []const u8 {
    var a: usize = 0;
    while (a < s.len) {
        const c = next(s, a);
        if (!isJsSpace(c.cp)) break;
        a += c.n;
    }
    var z = s.len;
    while (z > a) {
        var k = z - 1;
        while (k > a and s[k] & 0xC0 == 0x80) k -= 1;
        const c = next(s, k);
        if (!isJsSpace(c.cp)) break;
        z = k;
    }
    return s[a..z];
}

fn isJsSpace(cp: u21) bool {
    return switch (cp) {
        '\t', '\n', 0x0B, 0x0C, '\r', ' ', 0xA0, 0x1680, 0x2000...0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF => true,
        else => false,
    };
}

pub fn snippet(vm: *Vm, html: []const u8) Err!Value {
    const t = vm.scratch.begin();
    defer t.end();
    var b1 = vm.scratch.builder();
    try breakBlocks(&b1, html);
    const one = b1.finish();
    var b2 = vm.scratch.builder();
    try dropTags(&b2, one);
    const two = b2.finish();
    var b3 = vm.scratch.builder();
    try decodeHtml(&b3, two);
    vm.charge(html.len / 4);
    return vm.newStr(jsTrim(b3.bytes()));
}

// ---- getContent: xml2js Builder --------------------------------------------

fn escapeText(b: *Builder, s: []const u8) Err!void {
    for (s) |c| switch (c) {
        '&' => try b.append("&amp;"),
        '<' => try b.append("&lt;"),
        '>' => try b.append("&gt;"),
        '\r' => try b.append("&#xD;"),
        else => try b.byte(c),
    };
}

fn escapeAttr(b: *Builder, s: []const u8) Err!void {
    for (s) |c| switch (c) {
        '&' => try b.append("&amp;"),
        '<' => try b.append("&lt;"),
        '"' => try b.append("&quot;"),
        '\t' => try b.append("&#x9;"),
        '\n' => try b.append("&#xA;"),
        '\r' => try b.append("&#xD;"),
        else => try b.byte(c),
    };
}

/// One open element of the render: its object and the next entry, or a
/// string child of an array.
const Open = struct {
    name: []const u8,
    obj: Value,
    /// Next entry of the object (for an object) or item (for an array of one key).
    pos: u32 = 0,
    /// The element's children so far; `/>` when none.
    has_children: bool = false,
    head_closed: bool = false,
    /// `<name` is written.
    started: bool = false,
};

const max_render_depth = 128;

/// `getContent(content)`: text, or the content rendered under `<div>`.
pub fn content(vm: *Vm, v: Value) Err!Value {
    if (value.kindOf(v) == .object) {
        const ch = vm.objGet(value.payload(v), "_");
        if (value.kindOf(ch) == .string) return ch;
    } else if (value.kindOf(v) != .array) {
        return v;
    }
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    try render(vm, &b, v);
    vm.charge(b.len / 4);
    return vm.newStr(b.bytes());
}

/// xml2js Builder `render` of the root `div`, without recursion.
fn render(vm: *Vm, b: *Builder, root: Value) Err!void {
    var stack: [max_render_depth]Open = undefined;
    var depth: usize = 1;
    stack[0] = .{ .name = "div", .obj = root };
    // Each pass writes one piece and pops or pushes at most a bounded number
    // of elements; the size of the value bounds the loop.
    while (depth > 0) {
        const top = &stack[depth - 1];
        if (!top.started) {
            try b.byte('<');
            try b.append(top.name);
            top.started = true;
        }
        if (value.kindOf(top.obj) != .object) {
            // A string child, or an array as the root (its items render as elements).
            if (value.kindOf(top.obj) == .array) {
                return vm.throwMsg(.@"error", "XML.content: an array is not an element", .{});
            }
            try closeHead(b, top);
            try escapeText(b, vm.str(try vm.toStr(top.obj)));
            top.has_children = true;
            try closeElement(b, top);
            depth -= 1;
            continue;
        }
        const es = vm.r.objEntries(value.payload(top.obj));
        // Attributes first, wherever `$` is: the head stays open until the first child.
        if (top.pos == 0 and !top.head_closed) {
            const attrs = vm.objGet(value.payload(top.obj), "$");
            if (value.kindOf(attrs) == .object) {
                const as = vm.r.objEntries(value.payload(attrs));
                var k: usize = 0;
                while (k < as.len) : (k += 2) {
                    try b.byte(' ');
                    try b.append(vm.str(as[k]));
                    try b.append("=\"");
                    try escapeAttr(b, vm.str(try vm.toStr(as[k + 1])));
                    try b.byte('"');
                }
            }
        }
        if (top.pos * 2 >= es.len) {
            try closeElement(b, top);
            depth -= 1;
            continue;
        }
        const key = vm.str(es[top.pos * 2]);
        const child = es[top.pos * 2 + 1];
        top.pos += 1;
        if (std.mem.eql(u8, key, "$")) continue;
        if (std.mem.eql(u8, key, "_")) {
            try closeHead(b, top);
            try escapeText(b, vm.str(try vm.toStr(child)));
            top.has_children = true;
            continue;
        }
        if (depth + 1 >= max_render_depth) return vm.limit(.depth);
        try closeHead(b, top);
        top.has_children = true;
        if (value.kindOf(child) == .array) {
            // Each item is an element `key`; push them in reverse so they render in order.
            const items = vm.r.arrItems(value.payload(child));
            if (depth + items.len >= max_render_depth) return vm.limit(.depth);
            var k = items.len;
            while (k > 0) {
                k -= 1;
                stack[depth] = .{ .name = key, .obj = items[k] };
                depth += 1;
            }
            continue;
        }
        stack[depth] = .{ .name = key, .obj = child };
        depth += 1;
    }
}

fn closeHead(b: *Builder, top: *Open) Err!void {
    if (top.head_closed) return;
    try b.byte('>');
    top.head_closed = true;
}

fn closeElement(b: *Builder, top: *Open) Err!void {
    if (!top.has_children) {
        try b.append("/>");
        return;
    }
    try closeHead(b, top);
    try b.append("</");
    try b.append(top.name);
    try b.byte('>');
}
