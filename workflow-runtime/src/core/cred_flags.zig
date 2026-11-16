//! Credential flags: the outcome of one condition on a credential, a
//! boolean under a name (`f` and eight hex digits). n8n computes a flag
//! where the credential is. The shell gives the flags of a workflow to the
//! core as one document, `{"<slot>":{"<name>":true,...},...}`, in a
//! `credential_flags` event. The event is in the log, so a replay has the
//! same flags. An execution copies the document when it starts, so a later
//! change of the credential does not change its branches.
//!
//! The document has one form only: no white space, each slot once as the
//! shell wrote it, each value `true` or `false`. `scan` is the one reader
//! of that form, for the check at the event and for the read by node code.
const std = @import("std");

/// The length of a flag name: `f` and eight hex digits.
pub const name_len: usize = 9;

/// The bytes of one workflow's document. A node instance has at most 16
/// flags of 18 bytes each; this holds about 200 flags.
pub const doc_bytes: u32 = 4096;

/// The message that node code gets when a flag is not there. It is the
/// text of the reference (`CREDENTIAL_FLAG_MISSING` in workflow-lang).
pub const missing_message = "The credential has no value for a condition of this node";

pub fn isName(s: []const u8) bool {
    if (s.len != name_len or s[0] != 'f') return false;
    for (s[1..]) |c| {
        const digit = (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f');
        if (!digit) return false;
    }
    return true;
}

pub const Found = enum { invalid, absent, no, yes };

/// Read the document. With a slot and a name: the flag (`yes`, `no`), or
/// `absent`. A document of another form is `invalid`, whatever was found.
pub fn scan(doc: []const u8, slot: []const u8, name: []const u8) Found {
    // A reader asks for a flag by a name of the one form, or for none.
    std.debug.assert(name.len == 0 or isName(name));
    var found: Found = .absent;
    if (doc.len < 2 or doc[0] != '{') return .invalid;
    var i: usize = 1;
    if (doc[i] == '}') return if (doc.len == 2) .absent else .invalid;
    // Each round reads one slot of at least 5 bytes (`"":{}`).
    var rounds: usize = 0;
    while (rounds < doc.len) : (rounds += 1) {
        const key_end = stringEnd(doc, i) orelse return .invalid;
        const is_slot = std.mem.eql(u8, doc[i + 1 .. key_end], slot);
        i = key_end + 1;
        if (i + 1 >= doc.len or doc[i] != ':' or doc[i + 1] != '{') return .invalid;
        i += 2;
        if (i < doc.len and doc[i] == '}') {
            i += 1;
        } else {
            // Each round reads one flag of at least 16 bytes.
            var flags: usize = 0;
            while (flags < doc.len) : (flags += 1) {
                if (i + name_len + 3 > doc.len or doc[i] != '"' or doc[i + name_len + 1] != '"' or doc[i + name_len + 2] != ':') return .invalid;
                const flag = doc[i + 1 ..][0..name_len];
                if (!isName(flag)) return .invalid;
                i += name_len + 3;
                const rest = doc[i..];
                const on = std.mem.startsWith(u8, rest, "true");
                if (!on and !std.mem.startsWith(u8, rest, "false")) return .invalid;
                i += if (on) 4 else 5;
                // The first one counts, as for a JSON reader that stops at a match.
                if (is_slot and found == .absent and std.mem.eql(u8, flag, name)) found = if (on) .yes else .no;
                if (i >= doc.len) return .invalid;
                if (doc[i] == '}') break;
                if (doc[i] != ',') return .invalid;
                i += 1;
            } else return .invalid;
            i += 1;
        }
        if (i >= doc.len) return .invalid;
        if (doc[i] == '}') return if (i + 1 == doc.len) found else .invalid;
        if (doc[i] != ',') return .invalid;
        i += 1;
    }
    return .invalid;
}

/// True for a document of the one form.
pub fn valid(doc: []const u8) bool {
    return scan(doc, "", "") != .invalid;
}

/// The index of the closing quote of the JSON string that starts at `i`.
/// A control character is not text of a string.
fn stringEnd(doc: []const u8, start: usize) ?usize {
    if (start >= doc.len or doc[start] != '"') return null;
    var i = start + 1;
    while (i < doc.len) : (i += 1) {
        const c = doc[i];
        if (c == '"') return i;
        if (c < 0x20) return null;
        if (c == '\\') i += 1;
    }
    return null;
}

/// True when the list of a module's META (`credentialFlags`, a JSON array
/// of names) has the name. The loader checked the list with `validList`.
pub fn declared(list: []const u8, name: []const u8) bool {
    std.debug.assert(isName(name));
    if (list.len < 2) return false;
    var i: usize = 1;
    // Each entry is a name in quotes and one separator.
    while (i + name_len + 2 < list.len + 1) : (i += name_len + 3) {
        if (std.mem.eql(u8, list[i + 1 ..][0..name_len], name)) return true;
    }
    return false;
}

/// True for `["f0123abcd","f89abcdef"]`: names only, no white space. An
/// empty list is not a list of flags.
pub fn validList(list: []const u8) bool {
    const entry = name_len + 3;
    if (list.len < entry + 1 or list[0] != '[' or (list.len - 1) % entry != 0) return false;
    var i: usize = 1;
    while (i < list.len) : (i += entry) {
        if (list[i] != '"' or list[i + name_len + 1] != '"' or !isName(list[i + 1 ..][0..name_len])) return false;
        const last = i + entry == list.len;
        if (list[i + name_len + 2] != @as(u8, if (last) ']' else ',')) return false;
    }
    return true;
}

test "flag names" {
    try std.testing.expect(isName("f0123abcd"));
    try std.testing.expect(!isName("f0123abc"));
    try std.testing.expect(!isName("d0123abcd"));
    try std.testing.expect(!isName("f0123ABCD"));
    try std.testing.expect(!isName("f0123abcde"));
}

test "scan reads a flag of a slot and refuses each other form" {
    const doc = "{\"a\":{\"f00000001\":true,\"f00000002\":false},\"b\":{},\"c\":{\"f00000001\":false}}";
    const t = std.testing;
    try t.expect(valid(doc));
    try t.expectEqual(Found.yes, scan(doc, "a", "f00000001"));
    try t.expectEqual(Found.no, scan(doc, "a", "f00000002"));
    try t.expectEqual(Found.no, scan(doc, "c", "f00000001"));
    try t.expectEqual(Found.absent, scan(doc, "b", "f00000001"));
    try t.expectEqual(Found.absent, scan(doc, "a", "f00000003"));
    try t.expectEqual(Found.absent, scan(doc, "f00000001", "f00000001"));
    try t.expectEqual(Found.absent, scan("{}", "a", "f00000001"));
    for ([_][]const u8{
        "",
        "{",
        "[]",
        "{} ",
        "{\"a\":true}",
        "{\"a\":{\"f00000001\":1}}",
        "{\"a\":{\"f00000001\":\"true\"}}",
        "{\"a\":{\"f00000001\":true,}}",
        "{\"a\":{\"token\":true}}",
        "{\"a\":{\"f00000001\": true}}",
        "{\"a\":{\"f00000001\":true}",
        "{\"a\":{\"f00000001\":true}}x",
        "{\"a\":{\"f00000001\":true},}",
        "{\"a\":{\"f00000001\":null}}",
        "{\"a\n\":{}}",
    }) |bad| try t.expect(!valid(bad));
}

test "the list of a module" {
    const t = std.testing;
    try t.expect(validList("[\"f00000001\"]"));
    try t.expect(validList("[\"f00000001\",\"f00000002\"]"));
    try t.expect(!validList("[]"));
    try t.expect(!validList("[\"f00000001\", \"f00000002\"]"));
    try t.expect(!validList("[\"f00000001\",\"token\"]"));
    try t.expect(!validList("[\"f00000001\",]"));
    try t.expect(declared("[\"f00000001\",\"f00000002\"]", "f00000002"));
    try t.expect(!declared("[\"f00000001\",\"f00000002\"]", "f00000003"));
    try t.expect(!declared("", "f00000001"));
}
