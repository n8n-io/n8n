//! The data of one `sql` effect with the dialect `mssql` (spec section
//! 9.10): the arguments that the core sends, the bind values of a
//! statement, and the scan that says what a statement text can do.
//! Everything here works on buffers that the client (`ms.zig`) owns;
//! nothing here touches a socket.
const std = @import("std");
const tds = @import("core").tdswire;
const http = @import("http.zig");
const creds = @import("creds.zig");

/// `single`: the result ends with the first statement that has an error.
/// `independently`: every statement runs.
pub const Mode = enum(u8) { single, independently };

/// The limit of SQL Server for the parameters of one request.
pub const max_params = 2100;

pub const Call = struct {
    /// The name of the credential slot.
    credential: []const u8 = "",
    mode: Mode = .single,
    /// The raw JSON array of the statements.
    statements: []const u8 = "",
    count: u32 = 0,
};

/// True when the arguments name the dialect `mssql`.
pub fn isMssql(args: []const u8) bool {
    const dialect = http.plainString(http.member(args, "dialect") orelse "") orelse "";
    return std.mem.eql(u8, dialect, "mssql");
}

/// What the text of a statement can do. The scan reads words only: it
/// knows no grammar, so each class is the narrow one.
pub const Class = enum(u8) {
    /// One or more `SELECT` that change nothing: the host can run it again.
    reads,
    /// `INSERT`, `UPDATE` or `DELETE` that gives counts and no rows.
    writes,
    /// Any other text: it can change data and give rows.
    other,
};

/// Words that end the class `reads`: they change data or the session, or
/// start a statement that can.
const not_reads = [_][]const u8{
    "INTO",       "INSERT",    "UPDATE",         "DELETE", "MERGE",      "EXEC",        "EXECUTE",    "CREATE",
    "ALTER",      "DROP",      "TRUNCATE",       "SET",    "DECLARE",    "BEGIN",       "COMMIT",     "ROLLBACK",
    "SAVE",       "GRANT",     "REVOKE",         "DENY",   "USE",        "WAITFOR",     "KILL",       "BACKUP",
    "RESTORE",    "DBCC",      "NEXT",           "BULK",   "CHECKPOINT", "RECONFIGURE", "SHUTDOWN",   "SEND",
    "RECEIVE",    "REVERT",    "SETUSER",        "ENABLE", "DISABLE",    "WRITETEXT",   "UPDATETEXT", "READTEXT",
    "OPENROWSET", "OPENQUERY", "OPENDATASOURCE", "FETCH",  "OPEN",       "MOVE",        "GO",
};

/// Words that end the class `writes`: with one of them a text can give rows.
const gives_rows = [_][]const u8{
    "SELECT",  "OUTPUT", "EXEC",  "EXECUTE", "FETCH", "RECEIVE", "READTEXT", "DBCC",
    "RESTORE", "BACKUP", "MERGE", "DECLARE", "OPEN",  "GO",
};

const write_words = [_][]const u8{ "INSERT", "UPDATE", "DELETE" };

fn isWordByte(c: u8) bool {
    return std.ascii.isAlphanumeric(c) or c == '_' or c == '@' or c == '#' or c == '$' or c >= 0x80;
}

fn inList(word: []const u8, list: []const []const u8) bool {
    for (list) |w| {
        if (std.ascii.eqlIgnoreCase(w, word)) return true;
    }
    return false;
}

/// The words of a T-SQL text, without those in strings, quoted names and
/// comments.
const Words = struct {
    s: []const u8,
    i: usize = 0,

    /// The index after the quoted part that starts at `i` with `open`. A
    /// doubled closing quote stays inside.
    fn afterQuote(w: *const Words, close: u8) usize {
        var i = w.i + 1;
        for (0..w.s.len) |_| {
            if (i >= w.s.len) break;
            if (w.s[i] != close) {
                i += 1;
                continue;
            }
            if (i + 1 < w.s.len and w.s[i + 1] == close) {
                i += 2;
                continue;
            }
            return i + 1;
        }
        return w.s.len;
    }

    /// The index after the block comment that starts at `i`. Block
    /// comments nest in T-SQL.
    fn afterBlock(w: *const Words) usize {
        var depth: u32 = 0;
        var i = w.i;
        for (0..w.s.len) |_| {
            if (i + 1 >= w.s.len) break;
            if (w.s[i] == '/' and w.s[i + 1] == '*') {
                depth += 1;
                i += 2;
            } else if (w.s[i] == '*' and w.s[i + 1] == '/') {
                depth -= 1;
                i += 2;
                if (depth == 0) return i;
            } else {
                i += 1;
            }
        }
        return w.s.len;
    }

    fn next(w: *Words) ?[]const u8 {
        // Each pass moves `i` forward.
        for (0..w.s.len + 1) |_| {
            if (w.i >= w.s.len) return null;
            const c = w.s[w.i];
            const two = if (w.i + 1 < w.s.len) w.s[w.i + 1] else 0;
            if (c == '\'' or c == '"') {
                w.i = w.afterQuote(c);
            } else if (c == '[') {
                w.i = w.afterQuote(']');
            } else if (c == '-' and two == '-') {
                w.i = std.mem.indexOfScalarPos(u8, w.s, w.i, '\n') orelse w.s.len;
            } else if (c == '/' and two == '*') {
                w.i = w.afterBlock();
            } else if (isWordByte(c)) {
                const start = w.i;
                for (w.s[start..]) |b| {
                    if (!isWordByte(b)) break;
                    w.i += 1;
                }
                return w.s[start..w.i];
            } else {
                w.i += 1;
            }
        }
        return null;
    }
};

/// The class of a statement text (UTF-8, without JSON escapes).
pub fn classOf(text: []const u8) Class {
    var words: Words = .{ .s = text };
    const first = words.next() orelse return .other;
    const reads = std.ascii.eqlIgnoreCase(first, "SELECT");
    if (!reads and !inList(first, &write_words)) return .other;
    const ends: []const []const u8 = if (reads) &not_reads else &gives_rows;
    // Each word has one byte or more.
    for (0..text.len) |_| {
        const word = words.next() orelse break;
        if (inList(word, ends)) return .other;
    }
    std.debug.assert(words.i >= text.len);
    return if (reads) .reads else .writes;
}

pub const Statement = struct {
    /// The raw JSON string of the text.
    text: []const u8,
    /// The raw JSON array of `{"name", "value"}`, or empty.
    params: []const u8,
};

/// The statements of a call, in order.
pub const Statements = struct {
    it: http.Elements,

    pub fn init(raw: []const u8) ?Statements {
        return .{ .it = http.Elements.init(raw) orelse return null };
    }

    pub fn next(s: *Statements) ?Statement {
        const el = s.it.next() orelse return null;
        const params = http.member(el, "params") orelse "";
        return .{
            .text = http.member(el, "text") orelse "",
            .params = if (std.mem.eql(u8, params, "null")) "" else params,
        };
    }
};

pub const ParamError = error{ NoSpace, BadParam, TooMany };

/// Read the bind values of a statement into `table`, in their order. A
/// string value is decoded into `scratch`. `mssql` takes the type of a
/// parameter from a string, a number, a boolean or null; the library node
/// sends no other value.
pub fn readParams(raw: []const u8, scratch: *creds.Out, table: []tds.Param) ParamError![]const tds.Param {
    if (raw.len == 0) return table[0..0];
    var it = http.Elements.init(raw) orelse return error.BadParam;
    var n: usize = 0;
    for (0..table.len + 1) |_| {
        const el = it.next() orelse break;
        if (n == table.len) return error.TooMany;
        const name = http.plainString(http.member(el, "name") orelse "") orelse return error.BadParam;
        const value = http.member(el, "value") orelse return error.BadParam;
        table[n] = .{ .name = name, .value = try readValue(value, scratch) };
        n += 1;
    }
    std.debug.assert(n <= table.len);
    return table[0..n];
}

fn readValue(raw: []const u8, scratch: *creds.Out) ParamError!tds.Value {
    if (raw.len == 0) return error.BadParam;
    if (std.mem.eql(u8, raw, "null")) return .null;
    if (std.mem.eql(u8, raw, "true")) return .{ .boolean = true };
    if (std.mem.eql(u8, raw, "false")) return .{ .boolean = false };
    if (raw[0] == '"') {
        const start = scratch.len;
        http.unescape(raw, scratch) catch |e| return switch (e) {
            error.NoSpace => error.NoSpace,
            error.BadString => error.BadParam,
        };
        return .{ .string = scratch.buf[start..scratch.len] };
    }
    if (raw[0] != '-' and !std.ascii.isDigit(raw[0])) return error.BadParam;
    // A text that is no number: the call is refused.
    const x = std.fmt.parseFloat(f64, raw) catch return error.BadParam;
    return .{ .number = x };
}

pub const statement_marker = " (limit: sql-statement)";

/// Read and check the arguments. The answer is null, or the text of the
/// error (a constant: it names no value of the call). `scratch` holds one
/// statement text at a time.
pub fn parseCall(args: []const u8, max_statements: u32, call: *Call, scratch: []u8) ?[]const u8 {
    std.debug.assert(max_statements > 0);
    if (!isMssql(args)) return "sql: the dialect must be 'mssql'";
    call.credential = http.plainString(http.member(args, "credential") orelse "") orelse "";
    if (call.credential.len == 0) return "sql: the call needs a credential slot";
    call.mode = parseMode(http.member(args, "mode")) orelse return "sql: the mode for mssql must be 'single' or 'independently'";
    call.statements = http.member(args, "statements") orelse return "sql: the call needs statements";
    return checkStatements(call, max_statements, scratch);
}

/// The call is one that the client can end with a marker at every point
/// where the result can have no native form: no statement that gives rows
/// comes after a statement that writes, and each statement that writes
/// gives no rows.
fn checkStatements(call: *Call, max_statements: u32, scratch: []u8) ?[]const u8 {
    var it = Statements.init(call.statements) orelse return "sql: statements must be an array";
    var n: u32 = 0;
    var wrote = false;
    // One statement more than the limit ends the loop.
    for (0..@as(usize, max_statements) + 1) |_| {
        const st = it.next() orelse break;
        n += 1;
        if (st.text.len < 2 or st.text[0] != '"') return "sql: the text of a statement must be a string";
        var text: creds.Out = .{ .buf = scratch };
        http.unescape(st.text, &text) catch return "sql: the text of a statement is not a valid string, or is larger than --sql-max-request-kb (limit)";
        switch (classOf(text.written())) {
            .reads => if (wrote) return "sql: a statement that gives rows comes after a statement that writes" ++ statement_marker,
            .writes => wrote = true,
            .other => return "sql: a statement is not only SELECT, and not INSERT, UPDATE or DELETE without rows" ++ statement_marker,
        }
    }
    if (n == 0) return "sql: the call has no statement";
    if (n > max_statements) return "sql: the call has more statements than --sql-max-statements" ++ statement_marker;
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

test "mssql call: the class of a statement text" {
    const reads = [_][]const u8{
        "select 1",
        "  SELECT a, [into], 'insert' as \"update\" from t -- delete\n where x = 'it''s' /* drop /* nested */ exec */",
        "(select 1) union all select 2",
        "select @set, #drop.a from #drop",
        "select 1; select 2",
    };
    for (reads) |text| try std.testing.expectEqual(Class.reads, classOf(text));
    const writes = [_][]const u8{
        "INSERT INTO [t] ([a]) VALUES (@r0v0);",
        "update t set a = @v0 where [select] = @condition",
        "delete from t where id in (@v0, @v1); delete from u",
    };
    for (writes) |text| try std.testing.expectEqual(Class.writes, classOf(text));
    const other = [_][]const u8{
        "",
        "-- only a comment",
        "select 1 into t2 from t",
        "select 1 update t set a = 1",
        "select next value for s",
        "select * from openquery(l, 'delete from t')",
        "insert into t output inserted.id values (1)",
        "insert into t select 1",
        "update t set a = 1; select 1",
        "exec p",
        "sp_who",
        "with c as (select 1 a) delete from c",
        "merge t using u on 1 = 1 when matched then delete;",
        "delete from t; exec p",
        "select 1 'unclosed",
    };
    // The last text: the string has no end, so the scan sees no word after
    // it, and the server refuses the text. It reads nothing either way.
    for (other[0 .. other.len - 1]) |text| try std.testing.expectEqual(Class.other, classOf(text));
    try std.testing.expectEqual(Class.reads, classOf(other[other.len - 1]));
}

test "mssql call: arguments are checked before anything runs" {
    var call: Call = .{};
    var scratch: [256]u8 = @splat(0);
    const good = "{\"credential\":\"db\",\"dialect\":\"mssql\",\"mode\":\"independently\",\"statements\":[" ++
        "{\"text\":\"select @p1\",\"params\":[{\"name\":\"p1\",\"value\":1}]},{\"text\":\"select 2\"}]}";
    try std.testing.expect(parseCall(good, 4, &call, &scratch) == null);
    try std.testing.expectEqual(@as(u32, 2), call.count);
    try std.testing.expectEqual(Mode.independently, call.mode);
    try std.testing.expect(isMssql(good) and !isMssql("{\"dialect\":\"mysql\"}"));
    const bad = [_]struct { []const u8, []const u8 }{
        .{ "{\"credential\":\"db\",\"statements\":[{\"text\":\"select 1\"}]}", "dialect" },
        .{ "{\"dialect\":\"mssql\",\"statements\":[{\"text\":\"select 1\"}]}", "credential slot" },
        .{ "{\"credential\":\"db\",\"dialect\":\"mssql\",\"mode\":\"transaction\",\"statements\":[{\"text\":\"select 1\"}]}", "mode" },
        .{ "{\"credential\":\"db\",\"dialect\":\"mssql\"}", "needs statements" },
        .{ "{\"credential\":\"db\",\"dialect\":\"mssql\",\"statements\":[]}", "no statement" },
        .{ "{\"credential\":\"db\",\"dialect\":\"mssql\",\"statements\":[{\"text\":1}]}", "must be a string" },
        .{ "{\"credential\":\"db\",\"dialect\":\"mssql\",\"statements\":[{\"text\":\"exec p\"}]}", "(limit: sql-statement)" },
        .{ "{\"credential\":\"db\",\"dialect\":\"mssql\",\"statements\":[{\"text\":\"delete from t\"},{\"text\":\"select 1\"}]}", "after a statement that writes (limit: sql-statement)" },
        .{ "{\"credential\":\"db\",\"dialect\":\"mssql\",\"statements\":[{\"text\":\"select 1\"},{\"text\":\"select 2\"},{\"text\":\"select 3\"},{\"text\":\"select 4\"},{\"text\":\"select 5\"}]}", "--sql-max-statements (limit: sql-statement)" },
    };
    for (bad) |case| {
        const msg = parseCall(case[0], 4, &call, &scratch) orelse return error.Accepted;
        try std.testing.expect(std.mem.indexOf(u8, msg, case[1]) != null);
    }
    // A statement that reads can come before one that writes.
    const mixed = "{\"credential\":\"db\",\"dialect\":\"mssql\",\"statements\":[{\"text\":\"select 1\"},{\"text\":\"delete from t\"}]}";
    try std.testing.expect(parseCall(mixed, 4, &call, &scratch) == null);
}

test "mssql call: bind values" {
    var buf: [64]u8 = @splat(0);
    var scratch: creds.Out = .{ .buf = &buf };
    var table: [4]tds.Param = @splat(.{ .name = "", .value = .null });
    const raw = "[{\"name\":\"p2\",\"value\":\"a\\nb\"},{\"name\":\"p1\",\"value\":-1.5e3},{\"name\":\"n\",\"value\":null},{\"name\":\"b\",\"value\":true}]";
    const params = try readParams(raw, &scratch, &table);
    try std.testing.expectEqual(@as(usize, 4), params.len);
    try std.testing.expectEqualStrings("p2", params[0].name);
    try std.testing.expectEqualStrings("a\nb", params[0].value.string);
    try std.testing.expectEqual(@as(f64, -1500), params[1].value.number);
    try std.testing.expect(params[2].value == .null and params[3].value.boolean);
    try std.testing.expectEqual(@as(usize, 0), (try readParams("", &scratch, &table)).len);
    try std.testing.expectError(error.BadParam, readParams("[{\"name\":\"a\",\"value\":{}}]", &scratch, &table));
    try std.testing.expectError(error.BadParam, readParams("[{\"name\":\"a\",\"value\":[1]}]", &scratch, &table));
    try std.testing.expectError(error.BadParam, readParams("[{\"name\":\"a\"}]", &scratch, &table));
    try std.testing.expectError(error.BadParam, readParams("{}", &scratch, &table));
    try std.testing.expectError(error.TooMany, readParams(raw, &scratch, table[0..3]));
    var small: creds.Out = .{ .buf = buf[0..1] };
    try std.testing.expectError(error.NoSpace, readParams(raw, &small, &table));
}
