//! The allowed domains of a credential: which hosts a request with the
//! credential may go to. The rules are those of n8n (`isDomainAllowed` in
//! `credential-domain-restrictions.ts`): a list of host names with commas
//! between them; a name matches the same host; `*.name` matches each host
//! that ends with `.name`, and never `name` itself. Letter case and a dot
//! at the end do not count.
const std = @import("std");

/// The most entries of a list that are read. A host that only a later
/// entry names is refused.
pub const max_entries = 256;

/// How a credential limits the hosts of a request.
pub const Mode = enum { all, domains, none };

/// The mode of a JSON text value; `all` for a value that names no mode.
pub fn modeOf(text: []const u8) Mode {
    std.debug.assert(text.len <= std.math.maxInt(u32));
    if (std.mem.eql(u8, text, "domains")) return .domains;
    if (std.mem.eql(u8, text, "none")) return .none;
    return .all;
}

/// A name without the spaces around it and without one dot at its end.
fn clean(name: []const u8) []const u8 {
    const t = std.mem.trim(u8, name, " \t\r\n");
    std.debug.assert(t.len <= name.len);
    return if (t.len > 0 and t[t.len - 1] == '.') t[0 .. t.len - 1] else t;
}

/// True when the list has no entry: n8n then refuses each request.
pub fn isEmpty(list: []const u8) bool {
    std.debug.assert(list.len <= std.math.maxInt(u32));
    return std.mem.trim(u8, list, " \t\r\n").len == 0;
}

/// True when `host` (a host name without a port) matches an entry of `list`.
pub fn allowed(host_raw: []const u8, list: []const u8) bool {
    const host = clean(host_raw);
    std.debug.assert(host.len <= host_raw.len);
    if (host.len == 0) return false;
    var it = std.mem.splitScalar(u8, list, ',');
    var n: u32 = 0;
    while (n < max_entries) : (n += 1) {
        const entry = clean(it.next() orelse return false);
        if (entry.len == 0) continue;
        if (std.mem.startsWith(u8, entry, "*.")) {
            const suffix = entry[2..];
            if (suffix.len == 0 or host.len < suffix.len + 2) continue;
            const tail = host[host.len - suffix.len ..];
            if (host[host.len - suffix.len - 1] == '.' and std.ascii.eqlIgnoreCase(tail, suffix)) return true;
        } else if (std.ascii.eqlIgnoreCase(host, entry)) {
            return true;
        }
    }
    return false;
}

test "a name matches the same host only" {
    try std.testing.expect(allowed("example.com", "example.com"));
    try std.testing.expect(!allowed("api.example.com", "example.com"));
    try std.testing.expect(!allowed("example.com.evil.test", "example.com"));
    try std.testing.expect(!allowed("notexample.com", "example.com"));
}

test "a wildcard matches the hosts below the name, never the name" {
    try std.testing.expect(allowed("api.example.com", "*.example.com"));
    try std.testing.expect(allowed("a.b.example.com", "*.example.com"));
    try std.testing.expect(!allowed("example.com", "*.example.com"));
    try std.testing.expect(!allowed("badexample.com", "*.example.com"));
    try std.testing.expect(!allowed("api.example.com", "*."));
}

test "letter case, spaces and a dot at the end do not count" {
    try std.testing.expect(allowed("API.Example.COM", " example.org ,  api.example.com. "));
    try std.testing.expect(allowed("api.example.com.", "API.EXAMPLE.COM"));
    try std.testing.expect(allowed("x.Example.com", "*.EXAMPLE.com."));
}

test "each entry of the list counts, and an empty entry matches nothing" {
    try std.testing.expect(allowed("b.test", "a.test,,b.test"));
    try std.testing.expect(!allowed("c.test", "a.test,,b.test"));
    try std.testing.expect(!allowed("", "a.test"));
    try std.testing.expect(!allowed("a.test", ""));
    try std.testing.expect(isEmpty("  \t"));
    try std.testing.expect(!isEmpty(" a.test "));
}

test "the mode of a credential" {
    try std.testing.expectEqual(Mode.domains, modeOf("domains"));
    try std.testing.expectEqual(Mode.none, modeOf("none"));
    try std.testing.expectEqual(Mode.all, modeOf("all"));
    try std.testing.expectEqual(Mode.all, modeOf(""));
}
