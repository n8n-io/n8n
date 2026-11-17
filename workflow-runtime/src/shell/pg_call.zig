//! The data of one `sql` effect (spec section 9.10): the arguments that
//! the core sends, the bind values of a statement, and the JSON of the
//! result. Everything here works on buffers that the client (`pg.zig`)
//! owns; nothing here touches a socket.
const std = @import("std");
const pgwire = @import("core").pgwire;
const http = @import("http.zig");
const creds = @import("creds.zig");

pub const Mode = enum(u8) { single, independently, transaction };

/// The most bind values of one statement (the protocol counts them in 16 bits).
pub const max_params = 65535;
/// A result with more columns runs in the fallback host: the check for
/// two columns of one name compares every pair.
const max_columns = 512;

pub const Call = struct {
    /// The name of the credential slot.
    credential: []const u8 = "",
    mode: Mode = .single,
    /// The raw JSON array of the statements.
    statements: []const u8 = "",
    count: u32 = 0,
    numbers: bool = false,
    legacy_dates: bool = false,
    /// 0: the default of the client.
    connect_ms: u32 = 0,
    timeout_ms: u32 = 0,
};

/// Read and check the arguments. The answer is null, or the text of the
/// error (a constant: it names no value of the call).
pub fn parseCall(args: []const u8, max_statements: u32, call: *Call) ?[]const u8 {
    std.debug.assert(max_statements > 0);
    const dialect = http.plainString(http.member(args, "dialect") orelse "") orelse "";
    if (!std.mem.eql(u8, dialect, "postgres")) return "sql: the dialect must be 'postgres'";
    call.credential = http.plainString(http.member(args, "credential") orelse "") orelse "";
    if (call.credential.len == 0) return "sql: the call needs a credential slot";
    call.mode = parseMode(http.member(args, "mode")) orelse return "sql: the mode must be 'single', 'independently' or 'transaction'";
    call.numbers = isText(http.member(args, "largeNumbers"), "numbers");
    call.legacy_dates = isText(http.member(args, "dates"), "legacy");
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
        if (st.bad_simple) return "sql: simple of a statement must be true or false";
        if (st.simple and st.values != null) return "sql: a simple statement takes no bind values";
        if (countParams(st.values) == null) return "sql: a bind value must be a string, a number, a boolean or null";
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
    /// The raw JSON array of the bind values, or null.
    values: ?[]const u8,
    /// The text goes as it is with the simple query protocol: it can hold
    /// more than one command, and it has no bind values.
    simple: bool = false,
    /// `simple` is not a boolean.
    bad_simple: bool = false,
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
        const no_values = values == null or std.mem.eql(u8, values.?, "null");
        const simple = http.member(el, "simple") orelse "false";
        const on = std.mem.eql(u8, simple, "true");
        const off = std.mem.eql(u8, simple, "false") or std.mem.eql(u8, simple, "null");
        return .{ .text = http.member(el, "text") orelse "", .values = if (no_values) null else values, .simple = on, .bad_simple = !on and !off };
    }
};

const Kind = enum { string, number, boolean, null_value };

fn kindOf(token: []const u8) ?Kind {
    if (token.len == 0) return null;
    return switch (token[0]) {
        '"' => .string,
        't', 'f' => .boolean,
        'n' => .null_value,
        '-', '0'...'9' => .number,
        // An array or an object has no bind form.
        else => null,
    };
}

/// The count of the bind values, or null when one is no scalar or there
/// are too many.
pub fn countParams(values: ?[]const u8) ?u32 {
    var it = http.Elements.init(values orelse return 0) orelse return null;
    var n: u32 = 0;
    while (n <= max_params) : (n += 1) {
        const token = it.next() orelse return n;
        if (kindOf(token) == null) return null;
    }
    return null;
}

/// The parameter types of the bind values (`pgwire.numberOid`). `oids`
/// has room for `max_params`; `parseCall` checked the values.
pub fn paramOids(values: ?[]const u8, oids: []u32) []const u32 {
    std.debug.assert(oids.len >= max_params);
    var it = http.Elements.init(values orelse return oids[0..0]) orelse return oids[0..0];
    var n: usize = 0;
    while (n < max_params) : (n += 1) {
        const token = it.next() orelse break;
        oids[n] = switch (kindOf(token) orelse .null_value) {
            .string, .null_value => pgwire.oid_unknown,
            .boolean => pgwire.oid_bool,
            .number => pgwire.numberOid(token),
        };
    }
    return oids[0..n];
}

/// The key of a prepared statement: the text and the parameter types.
pub fn statementKey(text: []const u8, oids: []const u32) [32]u8 {
    var h = std.crypto.hash.sha2.Sha256.init(.{});
    var len: [8]u8 = @splat(0);
    std.mem.writeInt(u64, &len, text.len, .little);
    h.update(&len);
    h.update(text);
    h.update(std.mem.sliceAsBytes(oids));
    return h.finalResult();
}

/// Write the bind values of one statement as text.
pub fn writeParams(w: *pgwire.Writer, b: *pgwire.Writer.Bind, values: ?[]const u8) pgwire.Error!void {
    var it = http.Elements.init(values orelse return) orelse return;
    var left = b.left;
    while (left > 0) : (left -= 1) {
        const token = it.next() orelse return error.Malformed;
        switch (kindOf(token) orelse return error.Malformed) {
            .null_value => try w.bindParam(b, null),
            .boolean => try w.bindParam(b, if (token[0] == 't') "t" else "f"),
            .number => try w.bindParam(b, token),
            .string => {
                const at = try w.bindParamBegin(b);
                var o: creds.Out = .{ .buf = w.room() };
                http.unescape(token, &o) catch |e| return if (e == error.NoSpace) error.NoSpace else error.Malformed;
                try w.bindParamEnd(b, at, o.len);
            },
        }
    }
}

/// What the columns of a result mean for the call.
pub const Info = struct {
    columns: u32 = 0,
    /// A column type without a native form, two columns of one name, or
    /// more than `max_columns` columns.
    unsupported: bool = false,
    /// A date, or an array of dates or timestamps, that has no native form with `dates: legacy`.
    has_date: bool = false,
    /// A date or a timestamp, or an array of them: its text depends on the DateStyle of the session.
    has_time: bool = false,
    /// An interval, or an array of them: its text depends on the IntervalStyle of the session.
    has_interval: bool = false,
};

/// The columns of the result that is read now: for each one its class and
/// the JSON key (`"name":`), so that a row costs no look at the names.
pub const Desc = struct {
    buf: []u8,
    len: usize = 0,
    columns: u32 = 0,

    pub const Error = error{ Malformed, NoSpace };

    /// Read a RowDescription.
    /// `check_names`: also look for two columns of one name.
    pub fn load(d: *Desc, body: []const u8, opt: pgwire.Options, check_names: bool) Error!Info {
        d.len = 0;
        d.columns = 0;
        var info: Info = .{};
        var cols = try pgwire.Columns.init(body);
        var o: pgwire.Out = .{ .buf = d.buf };
        // The body length bounds the columns: each has 19 bytes or more.
        for (0..body.len / 19 + 1) |_| {
            const col = try cols.next() orelse break;
            const class = pgwire.classOf(col.oid, opt);
            info.unsupported = info.unsupported or class == .unsupported;
            info.has_date = info.has_date or pgwire.noLegacyForm(col.oid, opt.utc);
            info.has_time = info.has_time or pgwire.isTimeType(col.oid);
            info.has_interval = info.has_interval or pgwire.isIntervalType(col.oid);
            try o.byte(@backingInt(class));
            const at = o.len;
            try o.put(&.{ 0, 0 });
            try o.string(col.name);
            try o.byte(':');
            std.mem.writeInt(u16, d.buf[at..][0..2], std.math.cast(u16, o.len - at - 2) orelse return error.NoSpace, .little);
            info.columns += 1;
        }
        d.len = o.len;
        d.columns = info.columns;
        info.unsupported = info.unsupported or info.columns > max_columns or (check_names and d.hasDuplicate());
        return info;
    }

    const Entry = struct { class: pgwire.Class, key: []const u8, next: usize };

    fn entry(d: *const Desc, at: usize) Entry {
        std.debug.assert(at + 3 <= d.len);
        const n = std.mem.readInt(u16, d.buf[at + 1 ..][0..2], .little);
        return .{ .class = @fromBackingInt(d.buf[at]), .key = d.buf[at + 3 ..][0..n], .next = at + 3 + n };
    }

    /// True when two columns have one name: the row object of JavaScript
    /// keeps the place of the first and the value of the last.
    fn hasDuplicate(d: *const Desc) bool {
        if (d.columns > max_columns) return true;
        var a: usize = 0;
        while (a < d.len) {
            const ea = d.entry(a);
            var b = ea.next;
            while (b < d.len) {
                const eb = d.entry(b);
                if (std.mem.eql(u8, ea.key, eb.key)) return true;
                b = eb.next;
            }
            a = ea.next;
        }
        return false;
    }

    pub const RowError = error{ Malformed, NoSpace, Unsupported };

    /// Write one DataRow as a JSON object.
    pub fn writeRow(d: *const Desc, o: *pgwire.Out, body: []const u8, opt: pgwire.Options) RowError!void {
        var vals = try pgwire.Values.init(body);
        if (vals.left != d.columns) return error.Malformed;
        try o.byte('{');
        var at: usize = 0;
        while (at < d.len) {
            const e = d.entry(at);
            const v = try vals.next() orelse return error.Malformed;
            if (at > 0) try o.byte(',');
            try o.put(e.key);
            if (v.text) |text| try pgwire.writeValue(o, e.class, text, opt) else try o.put("null");
            at = e.next;
        }
        try o.byte('}');
    }
};

/// Write the fields of an ErrorResponse as the object that node-postgres
/// makes of them: `{"message":...,"length":n,"severity":...}`.
pub fn writeError(o: *pgwire.Out, body: []const u8) Desc.Error!void {
    var nb: [24]u8 = @splat(0);
    try o.put("{\"length\":");
    try o.put(std.fmt.bufPrint(&nb, "{d}", .{body.len + 4}) catch return error.NoSpace);
    var f = pgwire.Fields.init(body);
    // Each field has two bytes or more.
    for (0..body.len / 2 + 1) |_| {
        const field = try f.next() orelse break;
        const name = pgwire.fieldName(field.code) orelse continue;
        try o.put(",\"");
        try o.put(name);
        try o.put("\":");
        try o.string(field.text);
    }
    try o.byte('}');
}

/// The value of one field of an ErrorResponse, or null.
pub fn errorField(body: []const u8, code: u8) ?[]const u8 {
    var f = pgwire.Fields.init(body);
    for (0..body.len / 2 + 1) |_| {
        // A body that ends early has no more fields.
        const field = (f.next() catch return null) orelse return null;
        if (field.code == code) return field.text;
    }
    return null;
}

// ---- tests --------------------------------------------------------------------

test "sql call: arguments are checked before anything runs" {
    var call: Call = .{};
    const ok = "{\"credential\":\"db\",\"dialect\":\"postgres\",\"mode\":\"transaction\",\"largeNumbers\":\"numbers\",\"timeoutMs\":500," ++
        "\"statements\":[{\"text\":\"select $1\",\"values\":[1]},{\"text\":\"select 2\"}]}";
    try std.testing.expectEqual(@as(?[]const u8, null), parseCall(ok, 4, &call));
    try std.testing.expectEqual(Mode.transaction, call.mode);
    try std.testing.expectEqual(@as(u32, 2), call.count);
    try std.testing.expect(call.numbers and !call.legacy_dates);
    try std.testing.expectEqual(@as(u32, 500), call.timeout_ms);
    try std.testing.expectEqualStrings("db", call.credential);
    const bad = [_][]const u8{
        "{\"credential\":\"db\",\"dialect\":\"mysql\",\"statements\":[{\"text\":\"select 1\"}]}",
        "{\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select 1\"}]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":5}]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select $1\",\"values\":[[1]]}]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select $1\",\"values\":[{\"a\":1}]}]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"mode\":\"batch\",\"statements\":[{\"text\":\"select 1\"}]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select 1\",\"simple\":true,\"values\":[]}]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select 1\",\"simple\":1}]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"a\"},{\"text\":\"b\"},{\"text\":\"c\"},{\"text\":\"d\"},{\"text\":\"e\"}]}",
    };
    for (bad) |args| try std.testing.expect(parseCall(args, 4, &call) != null);
    // A simple statement has a text and no bind values.
    const simple = "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select 1; select 2\",\"simple\":true},{\"text\":\"select 3\",\"simple\":false,\"values\":null}]}";
    try std.testing.expectEqual(@as(?[]const u8, null), parseCall(simple, 4, &call));
    var it = Statements.init(call.statements).?;
    try std.testing.expect(it.next().?.simple and !it.next().?.simple);
}

test "sql call: bind values keep their types and are never part of the text" {
    var oid_buf: [max_params]u32 = @splat(0);
    const values = "[\"a\\n'b\", 7, 3000000000, 1.5, true, null]";
    const oids = paramOids(values, &oid_buf);
    try std.testing.expectEqualSlices(u32, &.{ 0, 23, 20, 1700, 16, 0 }, oids);
    var buf: [128]u8 = @splat(0);
    var w: pgwire.Writer = .{ .buf = &buf };
    var b = try w.bindBegin("s00", 6);
    try writeParams(&w, &b, values);
    try w.bindEnd(b);
    const want = "B\x00\x00\x00\x3a\x00s00\x00\x00\x00\x00\x06" ++
        "\x00\x00\x00\x04a\n'b" ++ "\x00\x00\x00\x017" ++ "\x00\x00\x00\x0a3000000000" ++ "\x00\x00\x00\x031.5" ++
        "\x00\x00\x00\x01t" ++ "\xff\xff\xff\xff" ++ "\x00\x00";
    try std.testing.expectEqualSlices(u8, want, buf[0..w.len]);
    // The same text with other types is another prepared statement.
    try std.testing.expect(!std.mem.eql(u8, &statementKey("select $1", &.{23}), &statementKey("select $1", &.{0})));
    try std.testing.expect(std.mem.eql(u8, &statementKey("select $1", &.{23}), &statementKey("select $1", &.{23})));
}

test "sql call: rows and errors become the result JSON" {
    var dbuf: [256]u8 = @splat(0);
    var d: Desc = .{ .buf = &dbuf };
    const head = "\x00\x00\x00\x00\x00\x00";
    const tail = "\xff\xff\xff\xff\xff\xff\x00\x00";
    const body = "\x00\x03id\x00" ++ head ++ "\x00\x00\x00\x17" ++ tail ++ "na\"me\x00" ++ head ++ "\x00\x00\x00\x19" ++ tail ++ "big\x00" ++ head ++ "\x00\x00\x00\x14" ++ tail;
    const info = try d.load(body, .{}, true);
    try std.testing.expectEqual(@as(u32, 3), info.columns);
    try std.testing.expect(!info.unsupported and !info.has_time);
    var obuf: [256]u8 = @splat(0);
    var o: pgwire.Out = .{ .buf = &obuf };
    try d.writeRow(&o, "\x00\x03\x00\x00\x00\x0242\xff\xff\xff\xff\x00\x00\x00\x0290", .{});
    try std.testing.expectEqualStrings("{\"id\":42,\"na\\\"me\":null,\"big\":\"90\"}", obuf[0..o.len]);
    try std.testing.expectError(error.Malformed, d.writeRow(&o, "\x00\x02\x00\x00\x00\x0242\xff\xff\xff\xff", .{}));
    // Two columns of one name have no native form. A bytea[] column has one.
    const twice = "\x00\x02id\x00" ++ head ++ "\x00\x00\x00\x17" ++ tail ++ "id\x00" ++ head ++ "\x00\x00\x00\x17" ++ tail;
    try std.testing.expect((try d.load(twice, .{}, true)).unsupported);
    const bytes = "\x00\x01a\x00" ++ head ++ "\x00\x00\x03\xe9" ++ tail;
    try std.testing.expect(!(try d.load(bytes, .{}, true)).unsupported);
    o.len = 0;
    try d.writeRow(&o, "\x00\x01\x00\x00\x00\x10{\"\\\\x00ff\",NULL}", .{});
    try std.testing.expectEqualStrings("{\"a\":[{\"type\":\"Buffer\",\"data\":[0,255]},null]}", obuf[0..o.len]);
    // An int4[] column and an interval column have a native form; the call looks at the styles of the session.
    const array = "\x00\x02a\x00" ++ head ++ "\x00\x00\x03\xef" ++ tail ++ "i\x00" ++ head ++ "\x00\x00\x04\xa2" ++ tail;
    const ainfo = try d.load(array, .{}, true);
    try std.testing.expect(!ainfo.unsupported and ainfo.has_interval and !ainfo.has_time and !ainfo.has_date);
    o.len = 0;
    try d.writeRow(&o, "\x00\x02\x00\x00\x00\x08{1,NULL}\x00\x00\x00\x051 day", .{});
    try std.testing.expectEqualStrings("{\"a\":[1,null],\"i\":{\"days\":1}}", obuf[0..o.len]);
    // An array of timestamps with a zone depends on the DateStyle. It has a form with `dates: legacy`.
    const stamps = "\x00\x01t\x00" ++ head ++ "\x00\x00\x04\xa1" ++ tail;
    const sinfo = try d.load(stamps, .{}, true);
    try std.testing.expect(!sinfo.unsupported and sinfo.has_time and !sinfo.has_date);
    try std.testing.expect(!(try d.load(stamps, .{ .legacy_dates = true }, true)).unsupported);
    // A date with `dates: legacy` is in the zone of the process of v1: a form only when that zone is UTC.
    const day = "\x00\x01d\x00" ++ head ++ "\x00\x00\x04\x3a" ++ tail;
    const dinfo = try d.load(day, .{}, true);
    try std.testing.expect(!dinfo.unsupported and dinfo.has_time and dinfo.has_date);
    try std.testing.expect((try d.load(day, .{ .legacy_dates = true }, true)).unsupported);
    const uinfo = try d.load(day, .{ .legacy_dates = true, .utc = true }, true);
    try std.testing.expect(!uinfo.unsupported and !uinfo.has_date);
    o.len = 0;
    try d.writeRow(&o, "\x00\x01\x00\x00\x00\x0a1990-02-03", .{ .legacy_dates = true, .utc = true });
    try std.testing.expectEqualStrings("{\"d\":\"1990-02-03T00:00:00.000Z\"}", obuf[0..o.len]);
    o.len = 0;
    const err = "SERROR\x00VERROR\x00C23505\x00Mduplicate key\x00Dkey (id)=(1)\x00nt_pkey\x00\x00";
    try writeError(&o, err);
    try std.testing.expectEqualStrings("{\"length\":63,\"severity\":\"ERROR\",\"code\":\"23505\",\"message\":\"duplicate key\",\"detail\":\"key (id)=(1)\",\"constraint\":\"t_pkey\"}", obuf[0..o.len]);
    try std.testing.expectEqualStrings("23505", errorField(err, 'C').?);
}
