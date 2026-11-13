//! XML to values, as xml2js 0.5 with its default options builds them on the
//! events of sax 1.2.4 in strict mode: the parser of rss-parser and of n8n's
//! XML node (`XML.parse`, spec section 4.3).
//!
//! The result of `<a x="1">t<b/></a>` is `{ a: { _: 't', $: { x: '1' }, b: [''] } }`:
//! text under `_` (left out when it is only white space), attributes under
//! `$`, each child name an array in order of first appearance. An element
//! with only text is that text. The first error ends the parse with the
//! message of sax (`Line`, `Column` and `Char` included); content after the
//! root element is not read, as xml2js returns at the end of the root.
//!
//! The parser is one state machine over the input, with an explicit stack of
//! open elements (depth cap `max_depth`, a limit). Each character costs a
//! fixed amount of work, so the input length bounds the run.
const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const ops = @import("ops.zig");
const ent = @import("xmlent.zig");
const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;

/// Nesting of elements.
pub const max_depth = 256;
/// Longest entity name; a longer one cannot be in the tables or a number.
const max_entity = 64;

/// Where and why the parse failed, as sax reports it.
pub const Failure = struct {
    message: []const u8 = "",
    line: u32 = 0,
    column: u32 = 0,
    /// The UTF-16 unit at the error, as WTF-8 (empty at the end of input).
    char: [3]u8 = undefined,
    char_len: u8 = 0,
    /// `String.fromCodePoint` threw (a numeric entity above U+10FFFF).
    code_point: ?u64 = null,
    /// A message with a name in it (`Unmatched closing tag: x`).
    msg_buf: [160]u8 = undefined,
};

pub const Error = Err || error{XmlSyntax};

const State = enum {
    begin,
    begin_whitespace,
    text,
    text_entity,
    open_waka,
    sgml_decl,
    sgml_decl_quoted,
    doctype,
    doctype_quoted,
    doctype_dtd,
    doctype_dtd_quoted,
    comment,
    comment_ending,
    comment_ended,
    cdata,
    cdata_ending,
    cdata_ending_2,
    proc_inst,
    proc_inst_body,
    proc_inst_ending,
    open_tag,
    open_tag_slash,
    attrib,
    attrib_name,
    attrib_name_saw_white,
    attrib_value,
    attrib_value_quoted,
    attrib_value_closed,
    attrib_value_entity_q,
    close_tag,
    close_tag_saw_white,
};

const Frame = struct {
    name: []const u8,
    /// `$` and the children, in order; none until the first one.
    obj: Value = value.undef,
    /// The text so far (a region string), or none.
    text: Value = value.undef,
    cdata: bool = false,
};

fn isWs(u: u21) bool {
    return u == ' ' or u == '\n' or u == '\r' or u == '\t';
}

/// sax `nameStart` on one UTF-16 unit.
fn nameStart(u: u21) bool {
    return switch (u) {
        ':', '_', 'A'...'Z', 'a'...'z' => true,
        0xC0...0xD6, 0xD8...0xF6, 0xF8...0x2FF, 0x370...0x37D, 0x37F...0x1FFF, 0x200C...0x200D => true,
        0x2070...0x218F, 0x2C00...0x2FEF, 0x3001...0xD7FF, 0xF900...0xFDCF, 0xFDF0...0xFFFD => true,
        else => false,
    };
}

/// sax `nameBody`.
fn nameBody(u: u21) bool {
    return nameStart(u) or switch (u) {
        0xB7, 0x300...0x36F, 0x203F...0x2040, '.', '0'...'9', '-' => true,
        else => false,
    };
}

/// JavaScript `\s`, for xml2js's white-space test of text.
fn jsSpace(cp: u21) bool {
    return switch (cp) {
        '\t', '\n', 0x0B, 0x0C, '\r', ' ', 0xA0, 0x1680, 0x2000...0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF => true,
        else => false,
    };
}

fn onlySpace(bytes: []const u8) bool {
    var i: usize = 0;
    while (i < bytes.len) {
        const n = std.unicode.utf8ByteSequenceLength(bytes[i]) catch return false;
        if (i + n > bytes.len) return false;
        const cp = if (n == 1) bytes[i] else std.unicode.utf8Decode(bytes[i..][0..n]) catch return false;
        if (!jsSpace(cp)) return false;
        i += n;
    }
    return true;
}

/// n8n's `sanitizeXmlName`, the tag and attribute name processor of its XML parsing.
fn sanitized(vm: *Vm, name: []const u8) Err!Value {
    for ([_][]const u8{ "__proto__", "constructor", "prototype" }) |bad| {
        if (std.mem.eql(u8, name, bad)) {
            var buf: [32]u8 = undefined;
            return vm.newStr(std.fmt.bufPrint(&buf, "sanitized_{s}", .{name}) catch unreachable);
        }
    }
    return vm.newStr(name);
}

/// Region string `cur ++ bytes` (`cur` none: a new string). Long text grows
/// a string buffer, so many text pieces of one element stay linear.
fn appendText(vm: *Vm, cur: Value, bytes: []const u8) Err!Value {
    if (value.kindOf(cur) != .string) return vm.newStr(bytes);
    const old = vm.str(cur);
    if (old.len + bytes.len >= heap.strbuf_min) return vm.r.appendStr(cur, old, vm.utf16Len(cur), bytes);
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    try b.append(old);
    try b.append(bytes);
    return vm.newStr(b.bytes());
}

/// xml2js `assignOrPush` with `explicitArray`: `obj[key]` is an array.
fn assignOrPush(vm: *Vm, obj: *Value, key: Value, v: Value) Err!void {
    if (value.kindOf(obj.*) != .object) obj.* = try vm.r.newObject(4);
    const off = value.payload(obj.*);
    if (vm.objFind(off, vm.str(key))) |i| {
        const arr = vm.r.objEntries(off)[i * 2 + 1];
        std.debug.assert(value.kindOf(arr) == .array);
        return vm.r.arrPush(value.payload(arr), v);
    }
    const arr = try vm.r.newArray(1);
    try vm.r.arrPush(value.payload(arr), v);
    try vm.objSet(value.payload(obj.*), key, arr);
}

/// xml2js `onclosetag`: the value of a closed element.
fn closeValue(vm: *Vm, f: *const Frame) Err!Value {
    const text = if (value.kindOf(f.text) == .string) vm.str(f.text) else "";
    const keep_text = f.cdata or !onlySpace(text);
    const work_count: u32 = if (value.kindOf(f.obj) == .object) @intCast(vm.r.objEntries(value.payload(f.obj)).len / 2) else 0;
    if (work_count == 0) {
        // Only text: the text. Nothing, or white space: that white space.
        if (value.kindOf(f.text) == .string) return f.text;
        return vm.newStr("");
    }
    if (!keep_text) return f.obj;
    // `_` was the first key of the object, before `$` and the children.
    const out = try vm.r.newObject(work_count + 1);
    try vm.objSet(value.payload(out), try vm.newStr("_"), f.text);
    const es = vm.r.objEntries(value.payload(f.obj));
    var i: usize = 0;
    while (i < es.len) : (i += 2) try vm.objSet(value.payload(out), es[i], es[i + 1]);
    return out;
}

/// sax `parseEntity`: the text of `&name;`, or null when it is not valid.
fn entityText(name: []const u8, buf: *[8]u8, fail: *Failure) ?[]const u8 {
    if (lookup(&ent.sax, name)) |v| return v;
    var lower: [max_entity]u8 = undefined;
    const lc = std.ascii.lowerString(lower[0..name.len], name);
    if (lookup(&ent.sax, lc)) |v| return v;
    if (lc.len < 2 or lc[0] != '#') return null;
    const hex = lc[1] == 'x';
    var digits = lc[if (hex) 2 else 1..];
    // parseInt reads the longest prefix of digits; all of them must be digits,
    // and without leading zeros they must give the number back.
    while (digits.len > 0 and digits[0] == '0') digits = digits[1..];
    if (digits.len == 0) return null;
    var num: u64 = 0;
    for (digits) |c| {
        const d = std.fmt.charToDigit(c, if (hex) 16 else 10) catch return null;
        num = std.math.mul(u64, num, if (hex) 16 else 10) catch return null;
        num += d;
    }
    if (num > 0x10FFFF) {
        fail.code_point = num;
        return null;
    }
    const cp: u21 = @intCast(num);
    const n = wtf8(cp, buf);
    return buf[0..n];
}

fn lookup(table: []const ent.Entry, name: []const u8) ?[]const u8 {
    var lo: usize = 0;
    var hi: usize = table.len;
    while (lo < hi) {
        const mid = (lo + hi) / 2;
        switch (std.mem.order(u8, table[mid].name, name)) {
            .eq => return table[mid].value,
            .lt => lo = mid + 1,
            .gt => hi = mid,
        }
    }
    return null;
}

/// WTF-8 of a code point (a lone surrogate as three bytes).
pub fn wtf8(cp: u21, buf: *[8]u8) usize {
    if (cp < 0x80) {
        buf[0] = @intCast(cp);
        return 1;
    }
    if (cp < 0x800) {
        buf[0] = @intCast(0xC0 | (cp >> 6));
        buf[1] = @intCast(0x80 | (cp & 0x3F));
        return 2;
    }
    if (cp < 0x10000) {
        buf[0] = @intCast(0xE0 | (cp >> 12));
        buf[1] = @intCast(0x80 | ((cp >> 6) & 0x3F));
        buf[2] = @intCast(0x80 | (cp & 0x3F));
        return 3;
    }
    buf[0] = @intCast(0xF0 | (cp >> 18));
    buf[1] = @intCast(0x80 | ((cp >> 12) & 0x3F));
    buf[2] = @intCast(0x80 | ((cp >> 6) & 0x3F));
    buf[3] = @intCast(0x80 | (cp & 0x3F));
    return 4;
}

/// Parse `input`. Returns the xml2js result, `null` for an input with no
/// root element, or `error.XmlSyntax` with `fail` set.
pub fn parse(vm: *Vm, input_in: []const u8, fail: *Failure) Error!Value {
    var input = input_in;
    // xml2js: an input of only white space gives null; then the BOM goes.
    if (onlySpace(input)) return value.null_;
    if (std.mem.startsWith(u8, input, "\xEF\xBB\xBF")) input = input[3..];

    var stack: [max_depth]Frame = undefined;
    var depth: usize = 0;
    var state: State = .begin;
    var saw_root = false;
    var saw_doctype = false;
    var line: u32 = 0;
    var column: u32 = 0;
    var q: u21 = 0;
    // Markers into the input: tag and attribute names, entity names, text runs.
    var name_start: usize = 0;
    var name_end: usize = 0;
    var attr_start: usize = 0;
    var attr_end: usize = 0;
    var ent_start: usize = 0;
    var text_start: usize = 0;
    var cdata_start: usize = 0;
    var sgml: [8]u8 = undefined;
    var sgml_len: usize = 0;
    // The attribute value under construction, in scratch.
    var attr_buf: [4096]u8 = undefined;
    var attr_len: usize = 0;
    var attr_big: Value = value.undef;
    // The open tag: its attributes object before it opens.
    var tag_attrs: Value = value.undef;

    var i: usize = 0;
    // The UTF-16 unit the error names: the code point, or its high half.
    var unit: u21 = 0;
    var pending_low: bool = false;

    const Local = struct {
        fn failAt(f: *Failure, msg: []const u8, ln: u32, col: u32, u: ?u21) Error {
            f.message = msg;
            f.line = ln;
            f.column = col;
            if (u) |c| {
                var buf: [8]u8 = undefined;
                const n = wtf8(c, &buf);
                @memcpy(f.char[0..n], buf[0..n]);
                f.char_len = @intCast(n);
            } else f.char_len = 0;
            return error.XmlSyntax;
        }
    };

    // Each pass reads one code point, so the input length bounds the loop.
    while (i < input.len) {
        const n = std.unicode.utf8ByteSequenceLength(input[i]) catch 1;
        const at = i;
        const cp: u21 = blk: {
            if (n == 1 or i + n > input.len) break :blk input[i];
            if (n == 3 and input[i] == 0xED and input[i + 1] >= 0xA0) {
                break :blk (@as(u21, input[i] & 0x0F) << 12) | (@as(u21, input[i + 1] & 0x3F) << 6) | (input[i + 2] & 0x3F);
            }
            break :blk std.unicode.utf8Decode(input[i..][0..n]) catch 0xFFFD;
        };
        i += if (i + n > input.len) 1 else n;
        // An astral character is two units: the high half is the one the
        // checks see; both move the column.
        unit = if (cp >= 0x10000) 0xD800 + ((cp - 0x10000) >> 10) else cp;
        pending_low = cp >= 0x10000;
        if (cp == '\n') {
            line += 1;
            column = 0;
        } else column += 1;
        const c = unit;
        defer if (pending_low) {
            column += 1;
        };

        switch (state) {
            .begin, .begin_whitespace => {
                if (state == .begin and c == 0xFEFF) {
                    state = .begin_whitespace;
                    continue;
                }
                state = .begin_whitespace;
                if (c == '<') {
                    state = .open_waka;
                } else if (!isWs(c)) {
                    return Local.failAt(fail, "Non-whitespace before first tag.", line, column, c);
                }
            },
            .text => {
                if (saw_root) {
                    // Inside the root: the text runs to the next `<` or `&`.
                    if (c != '<' and c != '&') continue;
                    try flushText(vm, &stack, depth, input[text_start..at]);
                } else if (c != '<' and !isWs(c)) {
                    return Local.failAt(fail, "Text data outside of root node.", line, column, c);
                }
                if (c == '<') {
                    state = .open_waka;
                } else if (c == '&') {
                    if (!saw_root) return Local.failAt(fail, "Text data outside of root node.", line, column, c);
                    state = .text_entity;
                    ent_start = i;
                }
            },
            .text_entity, .attrib_value_entity_q => {
                if (c == ';') {
                    const name = input[ent_start..at];
                    var buf: [8]u8 = undefined;
                    const text = if (name.len <= max_entity) entityText(name, &buf, fail) else null;
                    if (fail.code_point != null) return error.XmlSyntax;
                    if (text == null) return Local.failAt(fail, "Invalid character entity", line, column, c);
                    if (state == .text_entity) {
                        try flushText(vm, &stack, depth, text.?);
                        state = .text;
                        text_start = i;
                    } else {
                        try attrAppend(vm, &attr_buf, &attr_len, &attr_big, text.?);
                        state = .attrib_value_quoted;
                        ent_start = i;
                    }
                } else if ((at == ent_start and (c == '#' or nameStart(c))) or (at > ent_start and (c == '#' or nameBody(c)))) {
                    // The entity name grows.
                } else {
                    return Local.failAt(fail, "Invalid character in entity name", line, column, c);
                }
            },
            .open_waka => {
                if (c == '!') {
                    state = .sgml_decl;
                    sgml_len = 0;
                } else if (isWs(c)) {} else if (nameStart(c)) {
                    state = .open_tag;
                    name_start = at;
                } else if (c == '/') {
                    state = .close_tag;
                    name_start = i;
                    name_end = i;
                } else if (c == '?') {
                    state = .proc_inst;
                } else {
                    return Local.failAt(fail, "Unencoded <", line, column, c);
                }
            },
            .sgml_decl => {
                if (sgml_len < sgml.len and c < 0x80) sgml[sgml_len] = @intCast(c);
                sgml_len += 1;
                const decl = sgml[0..@min(sgml_len, sgml.len)];
                if (sgml_len == 7 and std.ascii.eqlIgnoreCase(decl, "[CDATA[")) {
                    state = .cdata;
                    cdata_start = i;
                } else if (sgml_len == 2 and std.mem.eql(u8, decl, "--")) {
                    state = .comment;
                } else if (sgml_len == 7 and std.ascii.eqlIgnoreCase(decl, "DOCTYPE")) {
                    state = .doctype;
                    if (saw_doctype or saw_root) {
                        return Local.failAt(fail, "Inappropriately located doctype declaration", line, column, c);
                    }
                } else if (c == '>') {
                    state = .text;
                    text_start = i;
                } else if (c == '"' or c == '\'') {
                    state = .sgml_decl_quoted;
                    q = c;
                }
            },
            .sgml_decl_quoted => {
                sgml_len += 1;
                if (c == q) state = .sgml_decl;
            },
            .doctype => {
                if (c == '>') {
                    state = .text;
                    text_start = i;
                    saw_doctype = true;
                } else if (c == '[') {
                    state = .doctype_dtd;
                } else if (c == '"' or c == '\'') {
                    state = .doctype_quoted;
                    q = c;
                }
            },
            .doctype_quoted => if (c == q) {
                state = .doctype;
            },
            .doctype_dtd => {
                if (c == ']') state = .doctype else if (c == '"' or c == '\'') {
                    state = .doctype_dtd_quoted;
                    q = c;
                }
            },
            .doctype_dtd_quoted => if (c == q) {
                state = .doctype_dtd;
            },
            .comment => if (c == '-') {
                state = .comment_ending;
            },
            .comment_ending => state = if (c == '-') .comment_ended else .comment,
            .comment_ended => {
                if (c != '>') return Local.failAt(fail, "Malformed comment", line, column, c);
                state = .text;
                text_start = i;
            },
            .cdata => if (c == ']') {
                state = .cdata_ending;
            },
            .cdata_ending => state = if (c == ']') .cdata_ending_2 else .cdata,
            .cdata_ending_2 => {
                if (c == '>') {
                    // The content is the input up to the closing `]]>`.
                    const content = input[cdata_start .. at - 2];
                    if (content.len > 0 and depth > 0) {
                        try flushText(vm, &stack, depth, content);
                        stack[depth - 1].cdata = true;
                    }
                    state = .text;
                    text_start = i;
                } else if (c != ']') {
                    state = .cdata;
                }
            },
            .proc_inst => {
                if (c == '?') state = .proc_inst_ending else if (isWs(c)) state = .proc_inst_body;
            },
            .proc_inst_body => if (c == '?') {
                state = .proc_inst_ending;
            },
            .proc_inst_ending => {
                if (c == '>') {
                    state = .text;
                    text_start = i;
                } else state = .proc_inst_body;
            },
            .open_tag => {
                if (nameBody(c)) continue;
                name_end = at;
                tag_attrs = value.undef;
                if (c == '>') {
                    if (try openTag(vm, &stack, &depth, input[name_start..name_end], tag_attrs)) |_| {} else return Local.failAt(fail, "Element nesting too deep", line, column, c);
                    saw_root = true;
                    state = .text;
                    text_start = i;
                } else if (c == '/') {
                    state = .open_tag_slash;
                } else {
                    if (!isWs(c)) return Local.failAt(fail, "Invalid character in tag name", line, column, c);
                    state = .attrib;
                }
            },
            .open_tag_slash => {
                if (c != '>') return Local.failAt(fail, "Forward-slash in opening tag not followed by >", line, column, c);
                if (try openTag(vm, &stack, &depth, input[name_start..name_end], tag_attrs)) |_| {} else return Local.failAt(fail, "Element nesting too deep", line, column, c);
                saw_root = true;
                if (try closeTop(vm, &stack, &depth)) |root| return root;
                state = .text;
                text_start = i;
            },
            .attrib => {
                if (isWs(c)) continue;
                if (c == '>') {
                    if (try openTag(vm, &stack, &depth, input[name_start..name_end], tag_attrs)) |_| {} else return Local.failAt(fail, "Element nesting too deep", line, column, c);
                    saw_root = true;
                    state = .text;
                    text_start = i;
                } else if (c == '/') {
                    state = .open_tag_slash;
                } else if (nameStart(c)) {
                    attr_start = at;
                    state = .attrib_name;
                } else {
                    return Local.failAt(fail, "Invalid attribute name", line, column, c);
                }
            },
            .attrib_name => {
                if (c == '=') {
                    attr_end = at;
                    state = .attrib_value;
                } else if (c == '>') {
                    return Local.failAt(fail, "Attribute without value", line, column, c);
                } else if (isWs(c)) {
                    attr_end = at;
                    state = .attrib_name_saw_white;
                } else if (!nameBody(c)) {
                    return Local.failAt(fail, "Invalid attribute name", line, column, c);
                }
            },
            .attrib_name_saw_white => {
                if (c == '=') state = .attrib_value else if (!isWs(c)) return Local.failAt(fail, "Attribute without value", line, column, c);
            },
            .attrib_value => {
                if (isWs(c)) continue;
                if (c != '"' and c != '\'') return Local.failAt(fail, "Unquoted attribute value", line, column, c);
                q = c;
                state = .attrib_value_quoted;
                attr_len = 0;
                attr_big = value.undef;
                ent_start = i;
            },
            .attrib_value_quoted => {
                if (c == q) {
                    // The run since the last entity, then the attribute.
                    try attrAppend(vm, &attr_buf, &attr_len, &attr_big, input[ent_start..at]);
                    try addAttr(vm, &tag_attrs, input[attr_start..attr_end], attr_buf[0..attr_len], attr_big);
                    state = .attrib_value_closed;
                } else if (c == '&') {
                    try attrAppend(vm, &attr_buf, &attr_len, &attr_big, input[ent_start..at]);
                    state = .attrib_value_entity_q;
                    ent_start = i;
                }
            },
            .attrib_value_closed => {
                if (isWs(c)) {
                    state = .attrib;
                } else if (c == '>') {
                    if (try openTag(vm, &stack, &depth, input[name_start..name_end], tag_attrs)) |_| {} else return Local.failAt(fail, "Element nesting too deep", line, column, c);
                    saw_root = true;
                    state = .text;
                    text_start = i;
                } else if (c == '/') {
                    state = .open_tag_slash;
                } else if (nameStart(c)) {
                    return Local.failAt(fail, "No whitespace between attributes", line, column, c);
                } else {
                    return Local.failAt(fail, "Invalid attribute name", line, column, c);
                }
            },
            .close_tag => {
                if (name_end == name_start) {
                    if (isWs(c)) {
                        name_start = i;
                        name_end = i;
                        continue;
                    }
                    if (!nameStart(c)) return Local.failAt(fail, "Invalid tagname in closing tag.", line, column, c);
                    name_start = at;
                    name_end = i;
                } else if (c == '>') {
                    if (try closeTag(vm, &stack, &depth, input[name_start..name_end], fail, line, column)) |root| return root;
                    state = .text;
                    text_start = i;
                } else if (nameBody(c)) {
                    name_end = i;
                } else {
                    if (!isWs(c)) return Local.failAt(fail, "Invalid tagname in closing tag", line, column, c);
                    state = .close_tag_saw_white;
                }
            },
            .close_tag_saw_white => {
                if (isWs(c)) continue;
                if (c != '>') return Local.failAt(fail, "Invalid characters in closing tag", line, column, c);
                if (try closeTag(vm, &stack, &depth, input[name_start..name_end], fail, line, column)) |root| return root;
                state = .text;
                text_start = i;
            },
        }
    }
    // The end of input (sax `end`), with an empty `Char`.
    if (saw_root) return Local.failAt(fail, "Unclosed root tag", line, column, null);
    if (state != .begin and state != .begin_whitespace and state != .text) {
        return Local.failAt(fail, "Unexpected end", line, column, null);
    }
    return value.null_;
}

fn flushText(vm: *Vm, stack: *[max_depth]Frame, depth: usize, bytes: []const u8) Err!void {
    if (depth == 0 or bytes.len == 0) return;
    const f = &stack[depth - 1];
    f.text = try appendText(vm, f.text, bytes);
}

fn attrAppend(vm: *Vm, buf: *[4096]u8, len: *usize, big: *Value, bytes: []const u8) Err!void {
    if (value.kindOf(big.*) != .string and len.* + bytes.len <= buf.len) {
        @memcpy(buf[len.*..][0..bytes.len], bytes);
        len.* += bytes.len;
        return;
    }
    // A long value goes to a region string.
    if (value.kindOf(big.*) != .string) big.* = try vm.newStr(buf[0..len.*]);
    big.* = try appendText(vm, big.*, bytes);
}

/// sax `attrib`: the first of two attributes with one name wins.
fn addAttr(vm: *Vm, attrs: *Value, name_raw: []const u8, small: []const u8, big: Value) Err!void {
    const key = try sanitized(vm, name_raw);
    if (value.kindOf(attrs.*) != .object) attrs.* = try vm.r.newObject(4);
    if (vm.objFind(value.payload(attrs.*), vm.str(key)) != null) return;
    const v = if (value.kindOf(big) == .string) big else try vm.newStr(small);
    try vm.objSet(value.payload(attrs.*), key, v);
}

/// sax `openTag` and xml2js `onopentag`. Null when the stack is full.
fn openTag(vm: *Vm, stack: *[max_depth]Frame, depth: *usize, name: []const u8, attrs: Value) Err!?void {
    if (depth.* == max_depth) return null;
    var f: Frame = .{ .name = name };
    if (value.kindOf(attrs) == .object) {
        f.obj = try vm.r.newObject(4);
        try vm.objSet(value.payload(f.obj), try vm.newStr("$"), attrs);
    }
    stack[depth.*] = f;
    depth.* += 1;
}

/// Pop the top element into its parent. Returns the result when it was the root.
fn closeTop(vm: *Vm, stack: *[max_depth]Frame, depth: *usize) Err!?Value {
    std.debug.assert(depth.* > 0);
    const f = stack[depth.* - 1];
    const v = try closeValue(vm, &f);
    const key = try sanitized(vm, f.name);
    depth.* -= 1;
    if (depth.* == 0) {
        const root = try vm.r.newObject(1);
        try vm.objSet(value.payload(root), key, v);
        return root;
    }
    try assignOrPush(vm, &stack[depth.* - 1].obj, key, v);
    return null;
}

/// sax `closeTag` in strict mode: the name must be that of the open element.
fn closeTag(vm: *Vm, stack: *[max_depth]Frame, depth: *usize, name: []const u8, fail: *Failure, line: u32, column: u32) Error!?Value {
    if (depth.* == 0) {
        fail.* = .{ .message = "Unmatched closing tag", .line = line, .column = column };
        return unmatched(fail, name);
    }
    if (!std.mem.eql(u8, stack[depth.* - 1].name, name)) {
        fail.* = .{ .message = "Unexpected close tag", .line = line, .column = column, .char_len = 1 };
        fail.char[0] = '>';
        return error.XmlSyntax;
    }
    return closeTop(vm, stack, depth);
}

/// `Unmatched closing tag: <name>`, in the buffer of the failure.
fn unmatched(fail: *Failure, name: []const u8) Error {
    fail.message = std.fmt.bufPrint(&fail.msg_buf, "Unmatched closing tag: {s}", .{name[0..@min(name.len, 120)]}) catch "Unmatched closing tag";
    fail.char[0] = '>';
    fail.char_len = 1;
    return error.XmlSyntax;
}

/// The error message as sax builds it.
pub fn message(f: *const Failure, buf: []u8) []const u8 {
    if (f.code_point) |cp| return std.fmt.bufPrint(buf, "Invalid code point {d}", .{cp}) catch f.message;
    return std.fmt.bufPrint(buf, "{s}\nLine: {d}\nColumn: {d}\nChar: {s}", .{ f.message, f.line, f.column, f.char[0..f.char_len] }) catch f.message;
}
