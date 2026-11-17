//! The data of one `sql` effect with the dialect `mysql` (spec section
//! 9.10): the arguments that the core sends, the columns of a result set
//! and the JSON of a row. Everything here works on buffers that the
//! client (`my.zig`) owns; nothing here touches a socket.
const std = @import("std");
const mywire = @import("core").mywire;
const http = @import("http.zig");

pub const Mode = enum(u8) { single, independently, transaction };

/// A result set with more columns runs in the fallback host: the check for
/// two columns of one name compares every pair.
const max_columns = 512;

pub const Call = struct {
    /// The name of the credential slot.
    credential: []const u8 = "",
    mode: Mode = .single,
    /// The raw JSON array of the statements.
    statements: []const u8 = "",
    count: u32 = 0,
    options: mywire.Options = .{},
    /// 0: the default of the client.
    connect_ms: u32 = 0,
    timeout_ms: u32 = 0,
};

/// True when the arguments name the dialect `mysql`.
pub fn isMysql(args: []const u8) bool {
    const dialect = http.plainString(http.member(args, "dialect") orelse "") orelse "";
    return std.mem.eql(u8, dialect, "mysql");
}

/// Read and check the arguments. The answer is null, or the text of the
/// error (a constant: it names no value of the call).
pub fn parseCall(args: []const u8, max_statements: u32, call: *Call) ?[]const u8 {
    std.debug.assert(max_statements > 0);
    if (!isMysql(args)) return "sql: the dialect must be 'mysql'";
    call.credential = http.plainString(http.member(args, "credential") orelse "") orelse "";
    if (call.credential.len == 0) return "sql: the call needs a credential slot";
    call.mode = parseMode(http.member(args, "mode")) orelse return "sql: the mode must be 'single', 'independently' or 'transaction'";
    call.options = .{
        .big_strings = isText(http.member(args, "largeNumbers"), "text"),
        .decimal_numbers = isText(http.member(args, "decimals"), "numbers"),
        .date_strings = !isText(http.member(args, "dates"), "legacy"),
    };
    call.connect_ms = parseMs(http.member(args, "connectTimeoutMs")) orelse return "sql: connectTimeoutMs must be a whole number of milliseconds";
    call.timeout_ms = parseMs(http.member(args, "timeoutMs")) orelse return "sql: timeoutMs must be a whole number of milliseconds";
    call.statements = http.member(args, "statements") orelse return "sql: the call needs statements";
    return checkStatements(call, max_statements);
}

fn checkStatements(call: *Call, max_statements: u32) ?[]const u8 {
    var it = Statements.init(call.statements) orelse return "sql: statements must be an array";
    var n: u32 = 0;
    // One statement more than the limit ends the loop.
    while (n <= max_statements) : (n += 1) {
        const st = it.next() orelse break;
        if (st.text.len < 2 or st.text[0] != '"') return "sql: the text of a statement must be a string";
        if (!st.simple) return "sql: a statement for mysql must have simple: true";
        if (st.has_values) return "sql: a statement for mysql takes no bind values";
        if (st.bad_group) return "sql: group of a statement must be a whole number";
    }
    if (n == 0) return "sql: the call has no statement";
    if (n > max_statements) return "sql: the call has more statements than --sql-max-statements (limit: sql-statement)";
    call.count = n;
    return null;
}

fn parseMode(raw: ?[]const u8) ?Mode {
    const text = http.plainString(raw orelse return .single) orelse return null;
    inline for (@typeInfo(Mode).@"enum".field_names, 0..) |name, i| {
        if (std.mem.eql(u8, text, name)) return @as(Mode, @fromBackingInt(i));
    }
    return null;
}

fn isText(raw: ?[]const u8, want: []const u8) bool {
    const text = http.plainString(raw orelse return false) orelse return false;
    return std.mem.eql(u8, text, want);
}

/// A member that is absent or `null` is 0.
fn parseMs(raw: ?[]const u8) ?u32 {
    const text = raw orelse return 0;
    if (std.mem.eql(u8, text, "null")) return 0;
    return std.fmt.parseInt(u32, text, 10) catch null; // not a whole number: the caller reports it
}

pub const Statement = struct {
    /// The raw JSON string of the text.
    text: []const u8,
    simple: bool,
    has_values: bool,
    /// Statements of one group stop at the first failure (`independently`).
    /// Null: the statement is a group of its own.
    group: ?u32,
    bad_group: bool,
};

/// The statements of a call, in order.
pub const Statements = struct {
    it: http.Elements,

    pub fn init(raw: []const u8) ?Statements {
        return .{ .it = http.Elements.init(raw) orelse return null };
    }

    pub fn next(s: *Statements) ?Statement {
        const el = s.it.next() orelse return null;
        const values = http.member(el, "values");
        const group = http.member(el, "group");
        const no_group = group == null or std.mem.eql(u8, group.?, "null");
        // A text that is no whole number: `bad_group` reports it.
        const number: ?u32 = if (no_group) null else std.fmt.parseInt(u32, group.?, 10) catch null;
        return .{
            .text = http.member(el, "text") orelse "",
            .simple = std.mem.eql(u8, http.member(el, "simple") orelse "", "true"),
            .has_values = values != null and !std.mem.eql(u8, values.?, "null"),
            .group = number,
            .bad_group = !no_group and number == null,
        };
    }
};

/// The columns of the result set that is read now: for each one its class
/// and the JSON key (`"name":`), so that a row costs no look at the names.
pub const Desc = struct {
    buf: []u8,
    len: usize = 0,
    columns: u32 = 0,
    /// A column type without a native form, or more than `max_columns` columns.
    unsupported: bool = false,

    pub const Error = error{ Malformed, NoSpace };

    const head = 6;

    pub fn reset(d: *Desc) void {
        d.len = 0;
        d.columns = 0;
        d.unsupported = false;
    }

    /// Add the column of one column definition packet.
    pub fn add(d: *Desc, body: []const u8, opt: mywire.Options) Error!void {
        const col = mywire.column(body) catch return error.Malformed;
        const class = mywire.classOf(col, opt);
        var o: mywire.Out = .{ .buf = d.buf, .len = d.len };
        // The class, "an earlier column has this name", the column that gives the value, the key length.
        try o.put(&.{ @backingInt(class), 0, 0, 0, 0, 0 });
        const at = o.len;
        try o.string(col.name);
        try o.byte(':');
        const index = std.math.cast(u16, d.columns) orelse return error.NoSpace;
        std.mem.writeInt(u16, d.buf[at - 4 ..][0..2], index, .little);
        std.mem.writeInt(u16, d.buf[at - 2 ..][0..2], std.math.cast(u16, o.len - at) orelse return error.NoSpace, .little);
        d.len = o.len;
        d.columns += 1;
        d.unsupported = d.unsupported or class == .unsupported or d.columns > max_columns;
    }

    const Entry = struct { class: mywire.Class, shadowed: bool, source: u16, key: []const u8, next: usize };

    fn entry(d: *const Desc, at: usize) Entry {
        std.debug.assert(at + head <= d.len);
        const n = std.mem.readInt(u16, d.buf[at + 4 ..][0..2], .little);
        return .{
            .class = @fromBackingInt(d.buf[at]),
            .shadowed = d.buf[at + 1] != 0,
            .source = std.mem.readInt(u16, d.buf[at + 2 ..][0..2], .little),
            .key = d.buf[at + head ..][0..n],
            .next = at + head + n,
        };
    }

    /// All columns are added. When two columns have one name, the row
    /// object of JavaScript keeps the place of the first and the value of
    /// the last: the first column takes the value of the last one, and the
    /// later ones are left out.
    pub fn finish(d: *Desc) void {
        if (d.unsupported) return;
        var a: usize = 0;
        while (a < d.len) {
            const ea = d.entry(a);
            var b = ea.next;
            var index: u16 = std.mem.readInt(u16, d.buf[a + 2 ..][0..2], .little);
            while (b < d.len and !ea.shadowed) {
                const eb = d.entry(b);
                index += 1;
                if (std.mem.eql(u8, ea.key, eb.key)) {
                    std.mem.writeInt(u16, d.buf[a + 2 ..][0..2], index, .little);
                    d.buf[b + 1] = 1;
                }
                b = eb.next;
            }
            a = ea.next;
        }
    }

    pub const RowError = error{ Malformed, NoSpace, Unsupported };

    /// Write one text row as a JSON object.
    pub fn writeRow(d: *const Desc, o: *mywire.Out, body: []const u8, opt: mywire.Options) RowError!void {
        var vals = mywire.Values.init(body);
        try o.byte('{');
        var at: usize = 0;
        var index: u16 = 0;
        var wrote = false;
        while (at < d.len) : (index += 1) {
            const e = d.entry(at);
            at = e.next;
            const v = (vals.next() catch return error.Malformed) orelse return error.Malformed;
            if (e.shadowed) continue;
            if (wrote) try o.byte(',');
            wrote = true;
            try o.put(e.key);
            if (e.source == index) try writeOne(o, e.class, v.text, opt) else try d.writeFrom(o, body, e.source, opt);
        }
        if ((vals.next() catch return error.Malformed) != null) return error.Malformed;
        try o.byte('}');
    }

    fn writeOne(o: *mywire.Out, class: mywire.Class, text: ?[]const u8, opt: mywire.Options) RowError!void {
        const t = text orelse return o.put("null");
        try mywire.writeValue(o, class, t, opt);
    }

    /// Write the value of the column `source` of the row.
    fn writeFrom(d: *const Desc, o: *mywire.Out, body: []const u8, source: u16, opt: mywire.Options) RowError!void {
        var vals = mywire.Values.init(body);
        var at: usize = 0;
        var index: u16 = 0;
        while (at < d.len) : (index += 1) {
            const e = d.entry(at);
            at = e.next;
            const v = (vals.next() catch return error.Malformed) orelse return error.Malformed;
            if (index == source) return writeOne(o, e.class, v.text, opt);
        }
        return error.Malformed;
    }
};

// ---- tests --------------------------------------------------------------------

test "mysql call: arguments are checked before anything runs" {
    var call: Call = .{};
    const ok = "{\"credential\":\"db\",\"dialect\":\"mysql\",\"mode\":\"independently\",\"largeNumbers\":\"text\",\"decimals\":\"numbers\",\"timeoutMs\":500," ++
        "\"statements\":[{\"text\":\"select 1\",\"simple\":true,\"group\":3},{\"text\":\"select 2\",\"simple\":true}]}";
    try std.testing.expectEqual(@as(?[]const u8, null), parseCall(ok, 4, &call));
    try std.testing.expectEqual(Mode.independently, call.mode);
    try std.testing.expectEqual(@as(u32, 2), call.count);
    try std.testing.expect(call.options.big_strings and call.options.decimal_numbers and call.options.date_strings);
    try std.testing.expectEqual(@as(u32, 500), call.timeout_ms);
    var it = Statements.init(call.statements).?;
    try std.testing.expectEqual(@as(?u32, 3), it.next().?.group);
    try std.testing.expectEqual(@as(?u32, null), it.next().?.group);
    const legacy = "{\"credential\":\"db\",\"dialect\":\"mysql\",\"dates\":\"legacy\",\"statements\":[{\"text\":\"select 1\",\"simple\":true}]}";
    try std.testing.expectEqual(@as(?[]const u8, null), parseCall(legacy, 4, &call));
    try std.testing.expect(!call.options.date_strings and !call.options.big_strings);
    const bad = [_][]const u8{
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select 1\",\"simple\":true}]}",
        "{\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select 1\",\"simple\":true}]}",
        "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[]}",
        "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":5,\"simple\":true}]}",
        "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select 1\"}]}",
        "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select ?\",\"simple\":true,\"values\":[1]}]}",
        "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select 1\",\"simple\":true,\"group\":\"a\"}]}",
        "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select 1\",\"simple\":true,\"group\":-1}]}",
        "{\"credential\":\"db\",\"dialect\":\"mysql\",\"mode\":\"batch\",\"statements\":[{\"text\":\"select 1\",\"simple\":true}]}",
    };
    for (bad) |args| try std.testing.expect(parseCall(args, 4, &call) != null);
}

fn testColumn(comptime name: []const u8, comptime col_type: u8, comptime charset: u8) []const u8 {
    const n = [_]u8{name.len};
    return "\x03def\x00\x00\x00" ++ n ++ name ++ "\x00\x0c" ++ [_]u8{ charset, 0 } ++ "\x0b\x00\x00\x00" ++ [_]u8{col_type} ++ "\x00\x00\x00\x00\x00";
}

test "mysql call: rows become JSON objects, and a later column of one name wins" {
    var dbuf: [256]u8 = @splat(0);
    var d: Desc = .{ .buf = &dbuf };
    try d.add(testColumn("id", 3, 63), .{});
    try d.add(testColumn("na\"me", 253, 224), .{});
    try d.add(testColumn("big", 8, 63), .{});
    d.finish();
    try std.testing.expect(!d.unsupported and d.columns == 3);
    var obuf: [256]u8 = @splat(0);
    var o: mywire.Out = .{ .buf = &obuf };
    try d.writeRow(&o, "\x0242\xfb\x1418446744073709551615", .{});
    try std.testing.expectEqualStrings("{\"id\":42,\"na\\\"me\":null,\"big\":\"18446744073709551615\"}", obuf[0..o.len]);
    try std.testing.expectError(error.Malformed, d.writeRow(&o, "\x0242\xfb", .{}));
    try std.testing.expectError(error.Malformed, d.writeRow(&o, "\x0242\xfb\x011\x011", .{}));
    // `select 1 as a, 'x' as b, 2 as a`: the key `a` has the place of the first and the value of the last.
    d.reset();
    try d.add(testColumn("a", 3, 63), .{});
    try d.add(testColumn("b", 253, 224), .{});
    try d.add(testColumn("a", 8, 63), .{});
    d.finish();
    o.len = 0;
    try d.writeRow(&o, "\x011\x01x\x012", .{});
    try std.testing.expectEqualStrings("{\"a\":2,\"b\":\"x\"}", obuf[0..o.len]);
    // A geometry column has no native form.
    d.reset();
    try d.add(testColumn("g", 255, 63), .{});
    try std.testing.expect(d.unsupported);
    try std.testing.expectError(error.Malformed, d.add("\x03def", .{}));
}
