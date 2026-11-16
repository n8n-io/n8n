//! The lint tool: every rule from STANDARDS.md that a machine can check from
//! the source. Run it with `zig build lint`; list the rules with
//! `zig build lint -- --list-rules`.
//!
//! There are three kinds of rule, in three places:
//! - text rules, in this file: a pattern on one line, plus function length
//!   and nesting. Cheap, and blind to anything spread over lines or renamed.
//! - tree rules, in `lint_ast.zig` and `lint_std.zig`: they read the parsed
//!   file, so spacing, line breaks, and aliases do not hide anything.
//! - program rules, in `lint_program.zig`: they read every file at once, for
//!   what no single file shows (a call cycle across files, a limit nothing
//!   reads, a table written by a subsystem that does not own it).
//!
//! Every rule is a pure function of paths and texts, so the rules are tested
//! like any other code. `lint_rules.zig` is the registry: each rule's name,
//! what it prevents, and a failing and a passing sample that the tests run.
//! `main` only walks the tree and prints.
//!
//! An exemption is a comment on the offending line made of the word
//! `lint-allow`, a colon, the rule name, and a reason. The reason is required.
//! The number of exemptions may not exceed the number stored in `lint-baseline`.
const std = @import("std");
const lint_ast = @import("lint_ast.zig");
const lint_program = @import("lint_program.zig");
pub const rules = @import("lint_rules.zig");

pub const max_fn_lines = 60;
pub const max_nesting = 3;
pub const assert_after_lines = 20;
pub const max_line_bytes = 400;

/// The core's subsystems in dependency order. A subsystem may import only the
/// ones listed before it. Add a new subsystem's directory name here.
pub const core_order = [_][]const u8{ "mem", "conn", "log", "ingest" };

pub const Finding = struct {
    line: u32,
    rule: []const u8,
    message: []const u8,
};

pub const Result = struct {
    findings: [256]Finding = undefined,
    count: u32 = 0,
    exemptions: u32 = 0,

    pub fn add(r: *Result, line: u32, rule: []const u8, message: []const u8) void {
        // Every finding carries a rule from the registry, so every rule has
        // a description and a sample that proves it fires.
        std.debug.assert(rules.find(rule) != null);
        if (r.count == r.findings.len) return;
        r.findings[r.count] = .{ .line = line, .rule = rule, .message = message };
        r.count += 1;
    }

    pub fn hasAt(r: *const Result, line: u32, rule: []const u8) bool {
        for (r.findings[0..r.count]) |f| {
            if (f.line == line and std.mem.eql(u8, f.rule, rule)) return true;
        }
        return false;
    }

    /// Removes every finding for `rule` on `line`. True when one was removed.
    fn removeAt(r: *Result, from: u32, line: u32, rule: []const u8) bool {
        var kept = from;
        for (r.findings[from..r.count]) |f| {
            if (f.line == line and std.mem.eql(u8, f.rule, rule)) continue;
            r.findings[kept] = f;
            kept += 1;
        }
        const removed = kept != r.count;
        r.count = kept;
        return removed;
    }

    pub fn has(r: *const Result, rule: []const u8) bool {
        for (r.findings[0..r.count]) |f| {
            if (std.mem.eql(u8, f.rule, rule)) return true;
        }
        return false;
    }
};

const Where = struct {
    src: bool,
    core: bool, // program code in src/core
    wire: bool,
    kernels: bool,
    is_main: bool,
    shell: bool,
    arena: bool,
    test_file: bool,

    fn of(path: []const u8) Where {
        const test_file = std.mem.endsWith(u8, path, "_test.zig") or std.mem.endsWith(u8, path, "/testing.zig");
        return .{
            .src = std.mem.startsWith(u8, path, "src/"),
            .core = std.mem.startsWith(u8, path, "src/core/") and !test_file,
            .wire = std.mem.startsWith(u8, path, "src/wire/"),
            .kernels = std.mem.endsWith(u8, path, "/kernels.zig"),
            .is_main = std.mem.eql(u8, path, "src/main.zig"),
            .shell = std.mem.startsWith(u8, path, "src/shell/"),
            .arena = std.mem.eql(u8, path, "src/core/arena.zig"),
            .test_file = test_file,
        };
    }
};

const BlockKind = enum { function, test_block, control, other };

const Block = struct {
    kind: BlockKind,
    start: u32,
    /// A function that returns a type. Its body is a struct declaration, not
    /// control flow, so its length is not measured; each function declared
    /// inside it is measured on its own.
    makes_type: bool = false,
    asserts: bool = false,
    deep: bool = false, // nesting already reported for this function
};

const Scan = struct {
    where: Where,
    result: *Result,
    stack: [64]Block = undefined,
    depth: u32 = 0,
    /// Findings from the tree rules, so an exemption comment can match them.
    tree: ?*Result = null,
    pending_fn: u32 = 0, // line of a signature that has not reached its `{` yet
    prev_comment_only: bool = false,

    fn inTest(s: *const Scan) bool {
        if (s.where.test_file) return true;
        for (s.stack[0..s.depth]) |b| {
            if (b.kind == .test_block) return true;
        }
        return false;
    }

    fn nesting(s: *const Scan) u32 {
        var n: u32 = 0;
        var i = s.depth;
        while (i > 0) {
            i -= 1;
            if (s.stack[i].kind == .function or s.stack[i].kind == .test_block) break;
            if (s.stack[i].kind == .control) n += 1;
        }
        return n;
    }

    fn innermostFn(s: *Scan) ?*Block {
        var i = s.depth;
        while (i > 0) {
            i -= 1;
            if (s.stack[i].kind == .function or s.stack[i].kind == .test_block) return &s.stack[i];
        }
        return null;
    }
};

/// Checks one file with every rule that needs only that file: the tree
/// rules first, then the text rules, so that one `lint-allow` comment works
/// for both kinds. `program` holds what the program rules found in this
/// file, so the same comment works for those too.
/// `path` uses forward slashes and is relative to the repo root.
pub fn lintFile(gpa: std.mem.Allocator, path: []const u8, text: [:0]const u8, result: *Result, program: ?*const Result) error{OutOfMemory}!void {
    var tree: Result = if (program) |p| p.* else .{};
    try lint_ast.lintTree(gpa, path, text, &tree);
    scanText(path, text, result, &tree);
    for (tree.findings[0..tree.count]) |f| {
        if (!result.hasAt(f.line, f.rule)) result.add(f.line, f.rule, f.message);
    }
}

pub const File = lint_program.File;

/// Checks a set of files with every rule: the rules that look across files,
/// then the rules for each file. `results[i]` is for `files[i]`.
pub fn lintAll(gpa: std.mem.Allocator, files: []const File, results: []Result) error{OutOfMemory}!void {
    std.debug.assert(files.len == results.len);
    const program = try gpa.alloc(Result, files.len);
    defer gpa.free(program);
    @memset(program, .{});
    try lint_program.lintProgram(gpa, files, program);
    for (files, results, program) |file, *result, *found| {
        result.* = .{};
        try lintFile(gpa, file.path, file.text, result, found);
    }
}

/// Checks one file with the text rules only.
pub fn lintSource(path: []const u8, text: []const u8, result: *Result) void {
    scanText(path, text, result, null);
}

fn scanText(path: []const u8, text: []const u8, result: *Result, tree: ?*Result) void {
    var scan: Scan = .{ .where = Where.of(path), .result = result, .tree = tree };
    var lines = std.mem.splitScalar(u8, text, '\n');
    var line_no: u32 = 0;
    while (lines.next()) |raw| {
        line_no += 1;
        var buf: [512]u8 = undefined;
        // The text rules read a bounded piece of each line. A longer line is
        // refused, so nothing can sit beyond what they read.
        if (raw.len > max_line_bytes) result.add(line_no, "line-length", "a line over 400 bytes hides code from the text rules; break it");
        const parts = split(raw, &buf);
        const code = std.mem.trim(u8, parts.code, " \t\r");
        const before = result.count;
        closeBlock(&scan, code, line_no);
        checkPatterns(&scan, code, parts.comment, line_no);
        checkImport(&scan, path, raw, line_no);
        openBlock(&scan, code, line_no);
        applyExemption(result, before, parts.comment, line_no, tree);
        scan.prev_comment_only = code.len == 0 and parts.comment.len > 0;
    }
}

const Parts = struct { code: []const u8, comment: []const u8 };

/// Separates code from its trailing comment and blanks out string contents,
/// so that patterns never match inside a string or a comment.
fn split(raw: []const u8, buf: *[512]u8) Parts {
    const line = raw[0..@min(raw.len, buf.len)];
    if (std.mem.startsWith(u8, std.mem.trimStart(u8, line, " \t"), "\\\\")) return .{ .code = "", .comment = "" };
    var in_string = false;
    var quote: u8 = 0;
    var i: usize = 0;
    while (i < line.len) : (i += 1) {
        const c = line[i];
        buf[i] = if (in_string) ' ' else c;
        if (in_string and c == '\\' and i + 1 < line.len) {
            i += 1;
            buf[i] = ' ';
        } else if (in_string and c == quote) {
            in_string = false;
            buf[i] = c;
        } else if (!in_string and (c == '"' or c == '\'')) {
            in_string = true;
            quote = c;
        } else if (!in_string and c == '/' and i + 1 < line.len and line[i + 1] == '/') {
            return .{ .code = buf[0..i], .comment = std.mem.trim(u8, line[i + 2 ..], " /!\t\r") };
        }
    }
    return .{ .code = buf[0..line.len], .comment = "" };
}

fn closeBlock(s: *Scan, code: []const u8, line_no: u32) void {
    if (!std.mem.startsWith(u8, code, "}") or s.depth == 0) return;
    s.depth -= 1;
    const b = s.stack[s.depth];
    if (b.kind != .function) return;
    const length = line_no - b.start + 1;
    if (length > max_fn_lines and !b.makes_type) s.result.add(b.start, "fn-length", "function is longer than 60 lines; split it");
    const needs_assert = s.where.core and !s.inTest() and length > assert_after_lines;
    if (needs_assert and !b.asserts) s.result.add(b.start, "fn-assert", "core function over 20 lines has no assertion");
}

fn openBlock(s: *Scan, code: []const u8, line_no: u32) void {
    const is_fn_start = startsWithAny(code, &.{ "pub fn ", "fn ", "pub inline fn ", "inline fn ", "export fn " });
    if (is_fn_start and !std.mem.endsWith(u8, code, "{") and !std.mem.endsWith(u8, code, ";")) s.pending_fn = line_no;
    if (!std.mem.endsWith(u8, code, "{") or s.depth == s.stack.len) return;
    var kind: BlockKind = .other;
    var start = line_no;
    if (is_fn_start or (s.pending_fn != 0 and std.mem.startsWith(u8, code, ")"))) {
        kind = .function;
        if (!is_fn_start) start = s.pending_fn;
        s.pending_fn = 0;
    } else if (std.mem.startsWith(u8, code, "test ")) {
        kind = .test_block;
    } else if (isControl(code)) {
        kind = .control;
    }
    const makes_type = kind == .function and std.mem.endsWith(u8, code, ") type {");
    s.stack[s.depth] = .{ .kind = kind, .start = start, .makes_type = makes_type };
    s.depth += 1;
    if (kind != .control or s.nesting() <= max_nesting) return;
    const f = s.innermostFn() orelse return;
    if (!f.deep) s.result.add(line_no, "nesting", "more than 3 levels of nesting; flatten with early exits or a helper");
    f.deep = true;
}

fn isControl(code: []const u8) bool {
    const after_brace = std.mem.trimStart(u8, std.mem.trimStart(u8, code, "}"), " ");
    if (startsWithAny(after_brace, &.{ "if ", "if(", "for ", "while ", "switch ", "else", "inline for ", "inline while " })) return true;
    const colon = std.mem.indexOf(u8, code, ": ") orelse return false;
    return startsWithAny(code[colon + 2 ..], &.{ "while ", "for ", "switch " });
}

fn startsWithAny(text: []const u8, prefixes: []const []const u8) bool {
    for (prefixes) |p| {
        if (std.mem.startsWith(u8, text, p)) return true;
    }
    return false;
}

fn containsAny(text: []const u8, needles: []const []const u8) bool {
    for (needles) |n| {
        if (std.mem.indexOf(u8, text, n) != null) return true;
    }
    return false;
}

fn checkPatterns(s: *Scan, code: []const u8, comment: []const u8, line_no: u32) void {
    const r = s.result;
    const in_test = s.inTest();
    const commented = comment.len > 0 or s.prev_comment_only;
    if (std.mem.indexOf(u8, comment, "TODO") != null and std.mem.indexOf(u8, comment, "#") == null) r.add(line_no, "todo-issue", "TODO must cite an issue, like TODO(#12)");
    if (code.len == 0) return;
    if (std.mem.indexOf(u8, code, "assert(") != null) {
        if (s.innermostFn()) |f| f.asserts = true;
    }
    checkEverywhere(s, code, commented, comment, in_test, line_no);
    if (s.where.src) checkSrc(s, code, in_test, line_no);
    if (s.where.core and !in_test) checkCore(s, code, line_no);
    if (in_test and std.mem.indexOf(u8, code, "sleep(") != null) r.add(line_no, "test-sleep", "tests never sleep; use simulated time");
}

fn checkEverywhere(s: *Scan, code: []const u8, commented: bool, comment: []const u8, in_test: bool, line_no: u32) void {
    const r = s.result;
    if (std.mem.indexOf(u8, code, "catch {}") != null) r.add(line_no, "empty-catch", "catch {} hides failures; handle or propagate");
    if (std.mem.indexOf(u8, code, "anyerror") != null) r.add(line_no, "anyerror", "use an explicit error set");
    if (std.mem.indexOf(u8, code, "unreachable") != null and !commented) r.add(line_no, "unreachable-comment", "unreachable needs a comment naming the invariant");
    if (std.mem.indexOf(u8, code, "@setRuntimeSafety(false)") != null and std.mem.indexOf(u8, comment, "bench") == null) r.add(line_no, "safety-off", "@setRuntimeSafety(false) needs a comment naming its benchmark");
    if (std.mem.indexOf(u8, code, "@setEvalBranchQuota") != null and !commented) r.add(line_no, "branch-quota", "@setEvalBranchQuota needs a comment giving the reason");
    if (std.mem.indexOf(u8, code, "@embedFile") != null and !in_test) r.add(line_no, "embed-file", "@embedFile is only allowed in test code");
    if (std.mem.startsWith(u8, code, "_ = ") and std.mem.indexOf(u8, code, "(") != null and !in_test and !commented) r.add(line_no, "discard", "a discarded result needs a comment saying why");
    const file_scope_var = s.depth == 0 and startsWithAny(code, &.{ "var ", "pub var ", "threadlocal ", "pub threadlocal " });
    if (file_scope_var) r.add(line_no, "global-var", "no mutable state at file scope; put it in State");
}

fn checkSrc(s: *Scan, code: []const u8, in_test: bool, line_no: u32) void {
    const r = s.result;
    const w = s.where;
    if (!w.is_main and containsAny(code, &.{ "page_allocator", "c_allocator", "smp_allocator" })) r.add(line_no, "global-allocator", "only src/main.zig may name a global allocator");
    if (!w.is_main and !w.shell and std.mem.indexOf(u8, code, "@panic(") != null) r.add(line_no, "panic", "return an error or a status instead of @panic");
    const casts = containsAny(code, &.{ "@ptrCast", "@alignCast", "@ptrFromInt", "@intFromPtr", "@constCast" });
    if (casts and !w.arena and !w.shell) r.add(line_no, "pointer-cast", "pointer casts are only allowed in the arena and the shell");
    const is_undefined = std.mem.indexOf(u8, code, "undefined") != null;
    if (is_undefined and !w.arena and !in_test) r.add(line_no, "undefined", "initialize with zeroes or @splat; undefined is only for the arena and tests");
    const wire_cast = w.wire and !in_test and containsAny(code, &.{ "@intCast", "@truncate" });
    if (wire_cast) r.add(line_no, "wire-cast", "in wire code use std.math.cast and handle the failure");
}

fn checkCore(s: *Scan, code: []const u8, line_no: u32) void {
    const r = s.result;
    const io = containsAny(code, &.{ "std.Io", "std.Thread", "std.posix", "std.fs", "std.net", "std.process", "std.time.", "std.crypto.random" });
    if (io) r.add(line_no, "core-io", "the core takes no I/O, threads, clock, or environment; move this to the shell");
    if (containsAny(code, &.{ "std.debug.print", "std.log", "std.fmt" })) r.add(line_no, "core-print", "no printing or formatting in the core; use counters and core/text.zig");
    if (containsAny(code, &.{ "Mutex", "std.atomic", "RwLock", "Semaphore" })) r.add(line_no, "core-lock", "the core shares no memory between threads");
    if (std.mem.indexOf(u8, code, ".?") != null) r.add(line_no, "optional-unwrap", "use orelse and handle the missing case");
    if (std.mem.indexOf(u8, code, "while (true)") != null) r.add(line_no, "unbounded-loop", "every loop has a bound");
    if (std.mem.indexOf(u8, code, "@setFloatMode") != null) r.add(line_no, "float-mode", "float mode changes results across builds");
    const has_allocator = std.mem.indexOf(u8, code, "Allocator") != null;
    if (has_allocator and std.mem.indexOf(u8, code, "fn init(") == null) r.add(line_no, "core-allocator", "only init functions may take an Allocator; hot code allocates nothing");
    if (s.where.kernels and std.mem.indexOf(u8, code, "anytype") != null) r.add(line_no, "kernel-anytype", "kernels take concrete slices");
}

/// Inside the core, a subsystem imports only subsystems listed before it in
/// `core_order`, and only through their `root.zig`.
fn checkImport(s: *Scan, path: []const u8, raw: []const u8, line_no: u32) void {
    if (!s.where.core) return;
    const marker = "@import(\"../";
    const at = std.mem.indexOf(u8, raw, marker) orelse return;
    const rest = raw[at + marker.len ..];
    const target = rest[0 .. std.mem.indexOfScalar(u8, rest, '"') orelse return];
    const slash = std.mem.indexOfScalar(u8, target, '/') orelse return; // a top-level core file
    const to = target[0..slash];
    const from_path = path["src/core/".len..];
    const from = from_path[0 .. std.mem.indexOfScalar(u8, from_path, '/') orelse return];
    const to_rank = rankOf(to);
    const from_rank = rankOf(from);
    if (to_rank == null or from_rank == null) {
        s.result.add(line_no, "subsystem-order", "this subsystem is not listed in core_order in tools/lint.zig");
        return;
    }
    if ((to_rank orelse 0) >= (from_rank orelse 0)) s.result.add(line_no, "subsystem-order", "a subsystem may import only subsystems before it in core_order");
    const through_root = std.mem.eql(u8, target[slash + 1 ..], "root.zig") or std.mem.eql(u8, to, "mem");
    if (!through_root) s.result.add(line_no, "subsystem-internal", "import another subsystem only through its root.zig");
}

fn rankOf(name: []const u8) ?u32 {
    for (core_order, 0..) |n, i| {
        if (std.mem.eql(u8, n, name)) return @intCast(i);
    }
    return null;
}

/// Removes findings on this line that carry a valid `lint-allow` comment.
/// `tree` holds the tree rules' findings for the whole file.
fn applyExemption(result: *Result, before: u32, comment: []const u8, line_no: u32, tree: ?*Result) void {
    const marker = "lint-allow:";
    const at = std.mem.indexOf(u8, comment, marker) orelse return;
    var words = std.mem.tokenizeScalar(u8, comment[at + marker.len ..], ' ');
    const rule = words.next() orelse "";
    if (words.next() == null) {
        result.add(line_no, "lint-allow", "an exemption needs a rule and a reason: // lint-allow: <rule> <reason>");
        return;
    }
    var removed = result.removeAt(before, line_no, rule);
    if (tree) |t| {
        if (t.removeAt(0, line_no, rule)) removed = true;
    }
    if (removed) result.exemptions += 1;
    if (!removed) result.add(line_no, "lint-allow", "this exemption matches no finding on its line; remove it");
}

const Mode = enum { check, all, counts };

const Options = struct {
    mode: Mode = .check,
    /// `--rule <name>`: print the findings of this rule only.
    only: ?[]const u8 = null,
};

pub fn main(init: std.process.Init) !void {
    const io = init.io;
    const arena = init.arena.allocator();
    const cwd = std.Io.Dir.cwd();
    var args = try init.minimal.args.iterateAllocator(arena);
    // The program's own name comes first.
    _ = args.skip();
    const opts = parseOptions(&args) orelse return listRules();
    const paths = try collectPaths(arena, io, cwd);
    const files = try arena.alloc(File, paths.len);
    for (paths, files) |path, *file| {
        const text = try cwd.readFileAllocOptions(io, path, arena, .limited(64 * 1024 * 1024), .of(u8), 0);
        file.* = .{ .path = path, .text = text, .scaffold = false };
    }
    const results = try arena.alloc(Result, files.len);
    try lintAll(arena, files, results);

    const counts = try arena.alloc(u32, rules.all.len);
    const allowed = try arena.alloc(u32, rules.all.len);
    @memset(counts, 0);
    @memset(allowed, 0);
    var failures = parseRatchet(try cwd.readFileAlloc(io, "lint-ratchet", arena, .limited(64 * 1024)), allowed, true);
    const exemptions = tally(paths, results, opts, counts, allowed);
    if (opts.mode == .counts) return printCounts(counts);
    failures += compareRatchet(counts, allowed, true);

    const baseline_text = try cwd.readFileAlloc(io, "lint-baseline", arena, .limited(64));
    const baseline = try std.fmt.parseInt(u32, std.mem.trim(u8, baseline_text, " \r\n"), 10);
    if (exemptions > baseline) {
        std.debug.print("lint: {d} exemptions, but lint-baseline allows {d}. Remove the new exemption.\n", .{ exemptions, baseline });
        failures += 1;
    }
    failures += checkManifest(try cwd.readFileAlloc(io, "lint-rules", arena, .limited(64 * 1024)), true);
    if (failures > 0) {
        std.debug.print("lint: FAILED with {d} problem(s) in {d} file(s) checked\n", .{ failures, paths.len });
        std.process.exit(1);
    }
    var held: u32 = 0;
    for (counts) |count| held += count;
    std.debug.print("lint: ok ({d} files, {d} rules, {d} known findings held by lint-ratchet, {d} exemptions of {d} allowed)\n", .{ paths.len, rules.all.len, held, exemptions, baseline });
}

/// The command line. Null asks for the list of rules.
fn parseOptions(args: anytype) ?Options {
    var opts: Options = .{};
    while (args.next()) |arg| {
        if (std.mem.eql(u8, arg, "--list-rules")) return null;
        if (std.mem.eql(u8, arg, "--all")) {
            opts.mode = .all;
        } else if (std.mem.eql(u8, arg, "--counts")) {
            opts.mode = .counts;
        } else if (std.mem.eql(u8, arg, "--rule")) {
            opts = .{ .mode = .all, .only = args.next() };
        } else {
            std.debug.print("usage: lint [--list-rules | --all | --rule <name> | --counts]\n", .{});
            std.process.exit(2);
        }
    }
    return opts;
}

/// Every Zig file under `src` and `tools`, sorted, with forward slashes.
fn collectPaths(arena: std.mem.Allocator, io: std.Io, cwd: std.Io.Dir) ![]const []const u8 {
    var paths: std.ArrayList([]const u8) = .empty;
    for ([_][]const u8{ "src", "tools" }) |root| {
        var dir = try cwd.openDir(io, root, .{ .iterate = true });
        defer dir.close(io);
        var walker = try dir.walk(arena);
        while (try walker.next(io)) |entry| {
            if (entry.kind != .file or !std.mem.endsWith(u8, entry.basename, ".zig")) continue;
            const path = try std.fmt.allocPrint(arena, "{s}/{s}", .{ root, entry.path });
            std.mem.replaceScalar(u8, path, '\\', '/');
            try paths.append(arena, path);
        }
    }
    std.mem.sort([]const u8, paths.items, {}, lessThan);
    return paths.items;
}

/// Counts the findings of each rule and prints the ones to show. Returns
/// the number of exemptions.
fn tally(paths: []const []const u8, results: []const Result, opts: Options, counts: []u32, allowed: []const u32) u32 {
    var exemptions: u32 = 0;
    for (paths, results) |path, result| {
        // A generated file is read so that the program rules see its calls
        // and names. Its own findings belong to its generator.
        if (generated(path)) continue;
        exemptions += result.exemptions;
        for (result.findings[0..result.count]) |f| {
            const index = ruleIndex(f.rule) orelse continue; // `Result.add` asserts that the rule is registered
            counts[index] += 1;
            if (shown(opts, f.rule, allowed[index])) std.debug.print("{s}:{d}: {s}: {s}\n", .{ path, f.line, f.rule, f.message });
        }
    }
    return exemptions;
}

/// Files that a tool writes (`wfrt aot-gen`, the Unicode table scripts).
pub fn generated(path: []const u8) bool {
    return std.mem.endsWith(u8, path, "/aot_gen.zig") or std.mem.endsWith(u8, path, "_tables.zig");
}

fn ruleIndex(name: []const u8) ?usize {
    for (rules.all, 0..) |rule, i| {
        if (std.mem.eql(u8, rule.name, name)) return i;
    }
    return null;
}

/// A plain run prints the findings of the rules that allow none: each of
/// those is new. The known findings of a rule in `lint-ratchet` are printed
/// on request (`--rule <name>`, `--all`).
fn shown(opts: Options, rule: []const u8, limit: u32) bool {
    if (opts.only) |name| return std.mem.eql(u8, name, rule);
    return opts.mode == .all or (opts.mode == .check and limit == 0);
}

/// The findings of each rule, in the format of `lint-ratchet`.
fn printCounts(counts: []const u32) void {
    for (rules.all, counts) |rule, count| {
        if (count > 0) std.debug.print("{s} {d}\n", .{ rule.name, count });
    }
}

/// Reads `lint-ratchet`: one `rule count` pair on each line, `#` starts a
/// comment line. A rule without a line allows no finding. Returns the
/// number of bad lines.
pub fn parseRatchet(text: []const u8, allowed: []u32, report: bool) u32 {
    std.debug.assert(allowed.len == rules.all.len);
    var bad: u32 = 0;
    var lines = std.mem.tokenizeAny(u8, text, "\r\n");
    while (lines.next()) |line| {
        var parts = std.mem.tokenizeAny(u8, line, " \t");
        const name = parts.next() orelse continue;
        if (name[0] == '#') continue;
        const index = ruleIndex(name) orelse {
            if (report) std.debug.print("lint: lint-ratchet names the rule '{s}', which the lint tool does not have\n", .{name});
            bad += 1;
            continue;
        };
        allowed[index] = std.fmt.parseInt(u32, parts.next() orelse "", 10) catch {
            if (report) std.debug.print("lint: lint-ratchet: the line of '{s}' needs a count\n", .{name});
            bad += 1;
            continue;
        };
    }
    return bad;
}

/// The ratchet. A rule may have at most the findings that `lint-ratchet`
/// allows, and its line must go down when findings are fixed, so the count
/// only shrinks. Returns the number of rules whose count differs.
pub fn compareRatchet(counts: []const u32, allowed: []const u32, report: bool) u32 {
    std.debug.assert(counts.len == rules.all.len and allowed.len == rules.all.len);
    var differences: u32 = 0;
    for (rules.all, counts, allowed) |rule, count, limit| {
        if (count == limit) continue;
        differences += 1;
        if (!report) continue;
        if (count < limit) {
            std.debug.print("lint: {s}: {d} finding(s) left of {d}. Lower its line in lint-ratchet to {d}.\n", .{ rule.name, count, limit, count });
        } else if (limit == 0) {
            std.debug.print("lint: {s}: {d} finding(s), and this rule allows none.\n", .{ rule.name, count });
        } else {
            std.debug.print("lint: {s}: {d} findings, lint-ratchet allows {d}. Fix the new ones (list: zig build lint -- --rule {s}).\n", .{ rule.name, count, limit, rule.name });
        }
    }
    return differences;
}

test "the ratchet fails when a rule has more findings or fewer than its line" {
    const gpa = std.testing.allocator;
    const counts = try gpa.alloc(u32, rules.all.len);
    defer gpa.free(counts);
    const allowed = try gpa.alloc(u32, rules.all.len);
    defer gpa.free(allowed);
    @memset(counts, 0);
    @memset(allowed, 0);
    try std.testing.expectEqual(@as(u32, 0), parseRatchet("# known findings\nundefined 3\n\nnesting 1\n", allowed, false));
    const undefined_rule = ruleIndex("undefined") orelse return error.RuleMissing;
    try std.testing.expectEqual(@as(u32, 3), allowed[undefined_rule]);
    try std.testing.expectEqual(@as(u32, 2), compareRatchet(counts, allowed, false));
    counts[undefined_rule] = 3;
    counts[ruleIndex("nesting") orelse return error.RuleMissing] = 2;
    try std.testing.expectEqual(@as(u32, 1), compareRatchet(counts, allowed, false));
    try std.testing.expectEqual(@as(u32, 2), parseRatchet("no-such-rule 1\nnesting\n", allowed, false));
    try std.testing.expect(generated("src/core/aot_gen.zig") and generated("src/core/collate_tables.zig"));
    try std.testing.expect(!generated("src/core/aot.zig"));
}

fn listRules() void {
    for (rules.all) |rule| std.debug.print("{s}\n    {s}\n", .{ rule.name, rule.prevents });
}

/// The file `lint-rules` lists every rule by name. It must match the
/// registry exactly, so removing a rule is a change to a second file that a
/// reviewer sees. Returns the number of differences, and prints each one
/// when `report` is set.
pub fn checkManifest(manifest: []const u8, report: bool) u32 {
    var differences: u32 = 0;
    var lines = std.mem.tokenizeAny(u8, manifest, "\r\n");
    while (lines.next()) |line| {
        const name = std.mem.trim(u8, line, " \t");
        if (name.len == 0 or name[0] == '#' or rules.find(name) != null) continue;
        if (report) std.debug.print("lint: the rule '{s}' is listed in lint-rules but the lint tool no longer has it. Restore the rule.\n", .{name});
        differences += 1;
    }
    for (rules.all) |rule| {
        var listed = false;
        var again = std.mem.tokenizeAny(u8, manifest, "\r\n");
        while (again.next()) |line| {
            if (std.mem.eql(u8, std.mem.trim(u8, line, " \t"), rule.name)) listed = true;
        }
        if (listed) continue;
        if (report) std.debug.print("lint: the rule '{s}' is new. Add its name to lint-rules.\n", .{rule.name});
        differences += 1;
    }
    return differences;
}

/// The path whose rules apply to a file. A scaffold is held to the rules of
/// the place it is headed: `scaffolds/core/x.zig` is linted as `src/core/x.zig`.
fn rulesPath(path: []const u8) []const u8 {
    const prefix = "scaffolds/";
    if (!std.mem.startsWith(u8, path, prefix)) return path;
    // The path keeps its length: "scaffolds/" becomes "src/" plus the tail.
    return scaffold_rules.get(path[prefix.len..]) orelse path;
}

/// Prefixes of scaffold paths and the `src/` prefix each is linted under.
const scaffold_rules = struct {
    fn get(tail: []const u8) ?[]const u8 {
        if (std.mem.startsWith(u8, tail, "core/")) return if (std.mem.endsWith(u8, tail, "_test.zig")) "src/core/scaffold_test.zig" else "src/core/scaffold.zig";
        if (std.mem.startsWith(u8, tail, "wire/")) return "src/wire/scaffold.zig";
        if (std.mem.startsWith(u8, tail, "shell/")) return "src/shell/scaffold.zig";
        return null;
    }
};

fn lessThan(_: void, a: []const u8, b: []const u8) bool {
    return std.mem.lessThan(u8, a, b);
}

test {
    _ = lint_ast;
    _ = lint_program;
    _ = rules;
    _ = @import("lint_rules_test.zig");
}

fn check(path: []const u8, text: []const u8) Result {
    var result: Result = .{};
    lintSource(path, text, &result);
    return result;
}

test "clean code has no findings" {
    const r = check("src/core/x.zig",
        \\const std = @import("std");
        \\pub fn add(a: u32, b: u32) u32 {
        \\    return a + b;
        \\}
    );
    try std.testing.expectEqual(@as(u32, 0), r.count);
}

test "each banned construct is found, and only where it is banned" {
    try std.testing.expect(check("src/core/x.zig", "const a = std.heap.page_allocator;").has("global-allocator"));
    try std.testing.expect(!check("src/main.zig", "const a = std.heap.page_allocator;").has("global-allocator"));
    try std.testing.expect(check("src/core/x.zig", "fn f(io: std.Io) void {}").has("core-io"));
    try std.testing.expect(!check("src/shell/x.zig", "fn f(io: std.Io) void {}").has("core-io"));
    try std.testing.expect(check("src/core/x.zig", "const v = maybe.?;").has("optional-unwrap"));
    try std.testing.expect(check("src/core/x.zig", "fn f(gpa: std.mem.Allocator) void {}").has("core-allocator"));
    try std.testing.expect(!check("src/core/x.zig", "pub fn init(gpa: std.mem.Allocator) void {}").has("core-allocator"));
    try std.testing.expect(check("src/wire/x.zig", "const n: u32 = @intCast(len);").has("wire-cast"));
    try std.testing.expect(check("src/sim/x.zig", "foo() catch {};").has("empty-catch"));
    try std.testing.expect(check("src/sim/x.zig", "var counter: u32 = 0;").has("global-var"));
    try std.testing.expect(check("src/sim/x.zig", "const x: u8 = undefined;").has("undefined"));
    try std.testing.expect(check("src/sim/x.zig", "    else => unreachable,").has("unreachable-comment"));
    try std.testing.expect(!check("src/sim/x.zig", "    else => unreachable, // the caller checked").has("unreachable-comment"));
    try std.testing.expect(check("src/sim/x.zig", "// TODO fix this").has("todo-issue"));
    try std.testing.expect(!check("src/sim/x.zig", "// TODO(#12) fix this").has("todo-issue"));
}

test "subsystems import one way only, and only through root.zig" {
    try std.testing.expect(check("src/core/conn/root.zig", "const x = @import(\"../ingest/root.zig\");").has("subsystem-order"));
    try std.testing.expect(!check("src/core/ingest/root.zig", "const x = @import(\"../conn/root.zig\");").has("subsystem-order"));
    try std.testing.expect(check("src/core/ingest/root.zig", "const x = @import(\"../conn/state.zig\");").has("subsystem-internal"));
    try std.testing.expect(!check("src/core/ingest/root.zig", "const x = @import(\"../mem/pool.zig\");").has("subsystem-internal"));
    try std.testing.expect(check("src/core/new/root.zig", "const x = @import(\"../conn/root.zig\");").has("subsystem-order"));
    try std.testing.expect(!check("src/core/ingest/root.zig", "const x = @import(\"../state.zig\");").has("subsystem-order"));
}

test "patterns inside strings and comments are ignored" {
    try std.testing.expectEqual(@as(u32, 0), check("src/core/x.zig", "const s = \"std.Io catch {} .?\"; // std.Thread").count);
}

test "tests may use what program code may not" {
    const r = check("src/core/x.zig",
        \\test "t" {
        \\    var buf: [4]u8 = undefined;
        \\    _ = std.fmt.bufPrint(&buf, "{d}", .{1});
        \\}
    );
    try std.testing.expectEqual(@as(u32, 0), r.count);
}

test "nesting deeper than three levels is found" {
    const r = check("src/sim/x.zig",
        \\fn f(a: bool) void {
        \\    if (a) {
        \\        for (xs) |x| {
        \\            while (x) {
        \\                if (a) {
        \\                    g();
        \\                }
        \\            }
        \\        }
        \\    }
        \\}
    );
    try std.testing.expect(r.has("nesting"));
}

test "a long function is found, and a long core function needs an assertion" {
    var text: [4096]u8 = undefined;
    var w: std.Io.Writer = .fixed(&text);
    try w.writeAll("fn f() void {\n");
    for (0..61) |_| try w.writeAll("    g();\n");
    try w.writeAll("}\nfn h() void {\n");
    for (0..25) |_| try w.writeAll("    g();\n");
    try w.writeAll("}\n");
    const r = check("src/core/x.zig", w.buffered());
    try std.testing.expect(r.has("fn-length"));
    try std.testing.expect(r.has("fn-assert"));
}

test "an exemption needs a reason, must match a finding, and is counted" {
    const ok = check("src/sim/x.zig", "foo() catch {}; // lint-allow: empty-catch closing a socket that is already gone");
    try std.testing.expectEqual(@as(u32, 0), ok.count);
    try std.testing.expectEqual(@as(u32, 1), ok.exemptions);
    try std.testing.expect(check("src/sim/x.zig", "foo() catch {}; // lint-allow: empty-catch").has("lint-allow"));
    try std.testing.expect(check("src/sim/x.zig", "foo(); // lint-allow: empty-catch nothing to allow").has("lint-allow"));
}

test "one exemption comment covers a tree rule's finding, and is counted" {
    const gpa = std.testing.allocator;
    var found: Result = .{};
    try lintFile(gpa, "src/wire/x.zig", "const H = extern struct {\n    next: *u8,\n};\n", &found, null);
    try std.testing.expect(found.has("row-pointer"));
    var allowed: Result = .{};
    try lintFile(gpa, "src/wire/x.zig", "const H = extern struct {\n    next: *u8, // lint-allow: row-pointer sample for this test\n};\n", &allowed, null);
    try std.testing.expectEqual(@as(u32, 0), allowed.count);
    try std.testing.expectEqual(@as(u32, 1), allowed.exemptions);
}

test "a finding both kinds of rule report is listed once" {
    var r: Result = .{};
    try lintFile(std.testing.allocator, "src/sim/x.zig", "fn f() void {\n    _ = g();\n}\n", &r, null);
    try std.testing.expectEqual(@as(u32, 1), r.count);
}

test "a function that returns a type is measured by the functions inside it" {
    var text: [8192]u8 = undefined;
    var w: std.Io.Writer = .fixed(&text);
    try w.writeAll("pub fn Box(comptime T: type) type {\n    return struct {\n");
    for (0..70) |_| try w.writeAll("        const x: T = 0;\n");
    try w.writeAll("    };\n}\n");
    try std.testing.expect(!check("src/sim/x.zig", w.buffered()).has("fn-length"));

    // A long function inside it is still found.
    var w2: std.Io.Writer = .fixed(&text);
    try w2.writeAll("pub fn Box(comptime T: type) type {\n    return struct {\n        fn f() void {\n");
    for (0..61) |_| try w2.writeAll("            g();\n");
    try w2.writeAll("        }\n    };\n}\n");
    try std.testing.expect(check("src/sim/x.zig", w2.buffered()).has("fn-length"));
}
