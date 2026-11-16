//! Tree rules about the standard library: which parts of `std` each layer
//! may reach. Called from `lint_ast.zig`.
//!
//! The text rules look for names like `std.posix` on a line. These rules
//! follow the name instead, so an alias does not hide it:
//!
//!     const s = @import("std");
//!     const net = s.posix;        // found here
//!     const T = @field(s, "Thread"); // and here
//!
//! For the pure layers (core, wire, limits) the rule is an allowlist: only
//! the parts of `std` listed in `pure_allowed` may be used. A new part of
//! `std` is therefore refused until someone decides it is pure.
const std = @import("std");
const Ast = std.zig.Ast;
const Node = Ast.Node;
const lint_ast = @import("lint_ast.zig");
const Ctx = lint_ast.Ctx;

/// Longest `a.b.c` chain followed below `std`.
const max_segments = 8;
const max_path_bytes = 160;
/// Passes over the declarations to resolve aliases of aliases.
const alias_passes = 3;

const Alias = struct {
    name: []const u8,
    /// The dotted path below `std`; empty for `std` itself.
    path: []const u8,
};

/// The parts of `std` the pure layers may use: computation on values, with
/// no I/O, no clock, no threads, and no allocation of their own.
const pure_allowed = [_][]const u8{
    "mem",     "math",           "meta",      "enums",        "simd",      "sort",
    "ascii",   "unicode",        "hash",      "builtin",      "base64",    "Random",
    "bit_set", "MultiArrayList", "ArrayList", "StaticBitSet", "EnumArray", "EnumSet",
    "EnumMap",
};

/// The parts of `std` that reach outside the process or vary from run to run.
const real_world = [_][]const u8{ "Io", "Thread", "posix", "os", "fs", "net", "process", "c", "http", "DynLib" };

fn among(name: []const u8, names: []const []const u8) bool {
    for (names) |n| {
        if (std.mem.eql(u8, n, name)) return true;
    }
    return false;
}

fn isStdImport(tree: *const Ast, node: Node.Index) bool {
    var buf: [2]Node.Index = @splat(.root);
    const params = tree.builtinCallParams(&buf, node) orelse return false;
    if (!std.mem.eql(u8, tree.tokenSlice(tree.nodeMainToken(node)), "@import") or params.len != 1) return false;
    if (tree.nodeTag(params[0]) != .string_literal) return false;
    return std.mem.eql(u8, tree.tokenSlice(tree.nodeMainToken(params[0])), "\"std\"");
}

fn aliasPath(aliases: []const Alias, name: []const u8) ?[]const u8 {
    for (aliases) |a| {
        if (std.mem.eql(u8, a.name, name)) return a.path;
    }
    return null;
}

/// The dotted path below `std` that `expr` names, written into `buf`, or
/// null when `expr` is not rooted in `std` or an alias of part of it.
fn stdPath(tree: *const Ast, aliases: []const Alias, expr: Node.Index, buf: *[max_path_bytes]u8) ?[]const u8 {
    var segments: [max_segments][]const u8 = @splat("");
    var count: usize = 0;
    var node = expr;
    var base: ?[]const u8 = null;
    for (0..max_segments + 1) |_| {
        const tag = tree.nodeTag(node);
        if (tag == .field_access and count < max_segments) {
            const access = tree.nodeData(node).node_and_token;
            segments[count] = tree.tokenSlice(access[1]);
            count += 1;
            node = access[0];
            continue;
        }
        if (tag == .identifier) base = aliasPath(aliases, tree.tokenSlice(tree.nodeMainToken(node)));
        if (isStdImport(tree, node)) base = "";
        break;
    }
    var w: std.Io.Writer = .fixed(buf);
    w.writeAll(base orelse return null) catch return null; // a path too long to hold is not judged
    while (count > 0) : (count -= 1) {
        if (w.end > 0) w.writeByte('.') catch return null; // as above
        w.writeAll(segments[count - 1]) catch return null; // as above
    }
    return w.buffered();
}

/// Every name in the file that stands for `std` or a part of it.
///
/// Names are matched by spelling, not by scope, so a declaration inside a
/// function counts only when it renames `std` itself (`const s = std;`).
/// Otherwise a local `const gpa = std.testing.allocator;` in one test would
/// make every parameter called `gpa` look like part of `std`. Nothing is lost:
/// a local alias of a banned part is found where it is declared.
fn collectAliases(arena: std.mem.Allocator, c: *const Ctx, aliases: *std.ArrayList(Alias)) error{OutOfMemory}!void {
    const tree = c.tree;
    for (0..alias_passes) |_| {
        var i: u32 = 1;
        while (i < tree.nodes.len) : (i += 1) {
            const decl = tree.fullVarDecl(@fromBackingInt(i)) orelse continue;
            const init = decl.ast.init_node.unwrap() orelse continue;
            const name = tree.tokenSlice(decl.ast.mut_token + 1);
            if (aliasPath(aliases.items, name) != null) continue;
            var buf: [max_path_bytes]u8 = @splat(0);
            const path = stdPath(tree, aliases.items, init, &buf) orelse continue;
            const local = c.enclosingFn(decl.ast.mut_token) != null or c.inTest(decl.ast.mut_token);
            if (local and path.len != 0) continue;
            try aliases.append(arena, .{ .name = name, .path = try arena.dupe(u8, path) });
        }
    }
}

const Verdict = struct { rule: []const u8, message: []const u8 };

const core_std: Verdict = .{ .rule = "core-std", .message = "the core, wire, and limits layers use only the pure parts of std (see pure_allowed in tools/lint_std.zig); do this in the shell and pass the result in as data" };
const sim_real: Verdict = .{ .rule = "sim-real-world", .message = "the simulator touches no real clock, file, socket, or thread, or a seed would not be one exact run; simulate it" };
const test_real: Verdict = .{ .rule = "test-real-world", .message = "tests of the pure layers and the simulator touch no real clock, file, socket, or thread; pass the data in" };
const shell_syscall: Verdict = .{ .rule = "shell-syscall", .message = "system calls live in src/shell/sys.zig and src/shell/uring.zig, so a simulated kernel can stand in for them" };

/// Splits `a.b.c` into `a` and `b` (the rest does not matter).
fn firstTwo(path: []const u8) [2][]const u8 {
    var it = std.mem.splitScalar(u8, path, '.');
    const first = it.next() orelse "";
    return .{ first, it.next() orelse "" };
}

fn touchesWorld(first: []const u8, second: []const u8) bool {
    if (among(first, &real_world)) return true;
    if (std.mem.eql(u8, first, "crypto")) return std.mem.eql(u8, second, "random");
    // `std.time` holds the clock; only its unit constants are plain values.
    if (std.mem.eql(u8, first, "time")) return second.len > 0 and std.mem.indexOf(u8, second, "_per_") == null;
    return false;
}

fn pureAllows(first: []const u8, second: []const u8) bool {
    if (first.len == 0 or among(first, &pure_allowed)) return true;
    if (std.mem.eql(u8, first, "debug")) return second.len == 0 or std.mem.eql(u8, second, "assert");
    if (std.mem.eql(u8, first, "atomic")) return second.len == 0 or std.mem.eql(u8, second, "cache_line");
    if (std.mem.eql(u8, first, "crypto")) return !std.mem.eql(u8, second, "random");
    if (std.mem.eql(u8, first, "time")) return !touchesWorld(first, second);
    return false;
}

/// What is wrong, if anything, with using `std.<path>` at this place.
fn verdict(c: *const Ctx, path: []const u8, in_test: bool) ?Verdict {
    const parts = firstTwo(path);
    const world = touchesWorld(parts[0], parts[1]);
    if (c.pure) {
        if (in_test) return if (world) test_real else null;
        return if (pureAllows(parts[0], parts[1])) null else core_std;
    }
    if (c.sim) {
        if (!world) return null;
        return if (in_test) test_real else sim_real;
    }
    if (c.shell and !in_test and !c.uring) {
        return if (among(parts[0], &.{ "os", "posix", "c" })) shell_syscall else null;
    }
    return null;
}

/// Rules `core-std`, `sim-real-world`, `test-real-world`, `shell-syscall`.
/// Sees: any use of `std` or of a name declared as part of it, including
/// through `@import("std")` written inline and through `@field`.
/// Misses: a part of `std` handed in from another file as a `type` parameter.
pub fn check(gpa: std.mem.Allocator, c: *const Ctx) error{OutOfMemory}!void {
    if (!c.pure and !c.sim and !c.shell) return;
    var arena_state = std.heap.ArenaAllocator.init(gpa);
    defer arena_state.deinit();
    var aliases: std.ArrayList(Alias) = .empty;
    try collectAliases(arena_state.allocator(), c, &aliases);
    const tree = c.tree;
    var i: u32 = 1;
    while (i < tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        var buf: [max_path_bytes]u8 = @splat(0);
        const token = tree.firstToken(node);
        if (tree.nodeTag(node) == .field_access) {
            const path = stdPath(tree, aliases.items, node, &buf) orelse continue;
            const v = verdict(c, path, c.inTest(token)) orelse continue;
            c.add(tree.nodeData(node).node_and_token[1], v.rule, v.message);
        } else if (reflected(tree, aliases.items, node)) {
            // `@field(std, name)` can name anything, so it is judged as the
            // worst thing it could name.
            const v = verdict(c, "posix", c.inTest(token)) orelse continue;
            c.add(token, v.rule, v.message);
        }
    }
}

/// True for `@field(x, ...)` where `x` is `std` or part of it.
fn reflected(tree: *const Ast, aliases: []const Alias, node: Node.Index) bool {
    var params_buf: [2]Node.Index = @splat(.root);
    const params = tree.builtinCallParams(&params_buf, node) orelse return false;
    if (!std.mem.eql(u8, tree.tokenSlice(tree.nodeMainToken(node)), "@field") or params.len == 0) return false;
    var buf: [max_path_bytes]u8 = @splat(0);
    return stdPath(tree, aliases, params[0], &buf) != null;
}

const lint = @import("lint.zig");

fn has(rule: []const u8, path: []const u8, source: [:0]const u8) !bool {
    var result: lint.Result = .{};
    try lint_ast.lintTree(std.testing.allocator, path, source, &result);
    return result.has(rule);
}

test "core-std: an alias, an alias of an alias, an inline import, and @field are all followed" {
    const core = "src/core/a/root.zig";
    try std.testing.expect(try has("core-std", core, "const s = @import(\"std\");\nconst p = s.posix;\n"));
    try std.testing.expect(try has("core-std", core, "const std = @import(\"std\");\nconst os = std.os;\nconst linux = os.linux;\n"));
    try std.testing.expect(try has("core-std", core, "fn f() void {\n    @import(\"std\").Thread.yield() catch return; // sample\n}\n"));
    try std.testing.expect(try has("core-std", core, "const std = @import(\"std\");\nconst T = @field(std, \"Thread\");\n"));
    // Renaming std inside a function does not hide it either.
    try std.testing.expect(try has("core-std", core, "fn f() void {\n    const s = @import(\"std\");\n    s.process.exit(1);\n}\n"));
    // A part of std nobody has judged pure is refused until someone does.
    try std.testing.expect(try has("core-std", core, "const std = @import(\"std\");\nconst z = std.compress;\n"));
}

test "core-std: the pure parts are allowed, and a local value is not mistaken for std" {
    const core = "src/core/a/root.zig";
    try std.testing.expect(!try has("core-std", core,
        \\const std = @import("std");
        \\const assert = std.debug.assert;
        \\const ms = std.time.ns_per_ms;
        \\fn f(gpa: std.mem.Allocator, xs: []u32) void {
        \\    assert(std.math.maxInt(u32) > ms);
        \\    std.mem.sort(u32, xs, {}, std.sort.asc(u32));
        \\    gpa.free(xs);
        \\}
        \\test "t" {
        \\    const gpa = std.testing.allocator;
        \\    try std.testing.expect(gpa.vtable == gpa.vtable);
        \\}
    ));
    // The clock itself is not a unit constant.
    try std.testing.expect(try has("core-std", core, "const std = @import(\"std\");\nconst t = std.time.Instant;\n"));
    try std.testing.expect(try has("core-std", core, "const std = @import(\"std\");\nconst p = std.debug.print;\n"));
}

test "each layer has its own rule, and the right files are exempt" {
    const thread = "const std = @import(\"std\");\nconst T = std.Thread;\n";
    try std.testing.expect(try has("sim-real-world", "src/sim/x.zig", thread));
    try std.testing.expect(!try has("sim-real-world", "src/sim/main.zig", thread)); // the command line reads arguments
    try std.testing.expect(try has("test-real-world", "src/sim/x_test.zig", thread));
    try std.testing.expect(!try has("test-real-world", "src/shell/x_test.zig", thread)); // the shell's tests use real sockets
    const linux = "const std = @import(\"std\");\nconst linux = std.os.linux;\n";
    try std.testing.expect(try has("shell-syscall", "src/shell/batched.zig", linux));
    try std.testing.expect(!try has("shell-syscall", "src/shell/uring.zig", linux));
    try std.testing.expect(!try has("shell-syscall", "src/shell/batched.zig", "const std = @import(\"std\");\nconst Io = std.Io;\n"));
}
