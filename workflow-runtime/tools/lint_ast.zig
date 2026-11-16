//! The tree rules: the lint rules that need the structure of the code, not
//! just its text. They run beside the text rules in `zig build lint`.
//!
//! Like the text rules, this is a pure function of (path, text), tested with
//! small source samples at the end of this file. The parser is the one Zig
//! ships (`std.zig.Ast`).
//!
//! The rules never walk the tree from the top. The parser stores every node in
//! one array, so each rule scans that array and asks, by token position, which
//! function or test a node sits in. That needs no recursion and no per-node
//! knowledge of where children are stored.
//!
//! Every rule prefers missing a case to flagging correct code. What each rule
//! cannot see is written beside it.
const std = @import("std");
const Ast = std.zig.Ast;
const Node = Ast.Node;
const lint = @import("lint.zig");
const lint_std = @import("lint_std.zig");

/// The largest array a function may keep on its stack.
pub const max_local_array_bytes = 4096;
/// Functions tracked per file for the call graph. A file with more is checked
/// for its first `max_fns` functions only.
const max_fns = 256;
/// Comment lines read above a struct when looking for a marker.
const max_marker_lines = 32;
/// How many `?T` and `[N]T` layers are unwrapped to find a field's base type.
const max_type_layers = 4;

/// Marker for a struct that holds the columns of a table. Its slices are the
/// columns themselves, set once at startup.
pub const table_marker = "lint: table";
/// Marker for a struct that carries data into or out of one step and is never
/// stored. Its slices are valid for that step only.
pub const step_marker = "lint: step-lived";

const Span = struct {
    first: Ast.TokenIndex,
    last: Ast.TokenIndex,

    fn contains(s: Span, token: Ast.TokenIndex) bool {
        return token >= s.first and token <= s.last;
    }

    fn len(s: Span) u32 {
        return s.last - s.first;
    }
};

const Fn = struct {
    name: []const u8,
    name_token: Ast.TokenIndex,
    span: Span,
};

pub const Ctx = struct {
    tree: *const Ast,
    path: []const u8,
    result: *lint.Result,
    fns: []const Fn,
    tests: []const Span,
    test_file: bool,
    core: bool, // program code in src/core
    /// A layer that only computes: core, wire, or limits, tests included.
    pure: bool,
    sim: bool, // the simulator, except its command-line entry point
    shell: bool,
    uring: bool, // the shell files that make system calls: uring.zig and sys.zig
    kernels: bool,
    row_file: bool,

    pub fn add(c: *const Ctx, token: Ast.TokenIndex, rule: []const u8, message: []const u8) void {
        const line: u32 = @intCast(c.tree.tokenLocation(0, token).line + 1);
        for (c.result.findings[0..c.result.count]) |f| {
            if (f.line == line and std.mem.eql(u8, f.rule, rule)) return;
        }
        c.result.add(line, rule, message);
    }

    pub fn inTest(c: *const Ctx, token: Ast.TokenIndex) bool {
        if (c.test_file) return true;
        for (c.tests) |t| {
            if (t.contains(token)) return true;
        }
        return false;
    }

    /// The innermost function whose text contains `token`.
    pub fn enclosingFn(c: *const Ctx, token: Ast.TokenIndex) ?u32 {
        var best: ?u32 = null;
        for (c.fns, 0..) |f, i| {
            if (!f.span.contains(token)) continue;
            if (best) |b| {
                if (c.fns[b].span.len() <= f.span.len()) continue;
            }
            best = @intCast(i);
        }
        return best;
    }
};

/// Checks one file with the tree rules and adds what it finds to `result`.
/// A file that does not parse is skipped: the compiler reports that.
pub fn lintTree(gpa: std.mem.Allocator, path: []const u8, source: [:0]const u8, result: *lint.Result) error{OutOfMemory}!void {
    var tree = try Ast.parse(gpa, source, .{});
    defer tree.deinit(gpa);
    if (tree.errors.len > 0) return;

    var fns: std.ArrayList(Fn) = .empty;
    defer fns.deinit(gpa);
    var tests: std.ArrayList(Span) = .empty;
    defer tests.deinit(gpa);
    try collect(gpa, &tree, &fns, &tests);

    const base = std.fs.path.basenamePosix(path);
    const test_file = std.mem.endsWith(u8, path, "_test.zig") or std.mem.endsWith(u8, path, "/testing.zig");
    const ctx: Ctx = .{
        .tree = &tree,
        .path = path,
        .result = result,
        .fns = fns.items,
        .tests = tests.items,
        .test_file = test_file,
        .core = std.mem.startsWith(u8, path, "src/core/") and !test_file,
        .pure = startsWithAny(path, &.{ "src/core/", "src/wire/", "src/limits/" }),
        .sim = std.mem.startsWith(u8, path, "src/sim/") and !std.mem.eql(u8, path, "src/sim/main.zig"),
        .shell = std.mem.startsWith(u8, path, "src/shell/"),
        .uring = std.mem.eql(u8, path, "src/shell/uring.zig") or std.mem.eql(u8, path, "src/shell/sys.zig"),
        .kernels = std.mem.eql(u8, base, "kernels.zig"),
        .row_file = std.mem.eql(u8, base, "types.zig") or std.mem.eql(u8, base, "state.zig"),
    };
    try checkRecursion(gpa, &ctx);
    try checkMapOrder(gpa, &ctx);
    try lint_std.check(gpa, &ctx);
    var i: u32 = 1; // node 0 is the file itself
    while (i < tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        checkRowFields(&ctx, node);
        checkLocalArray(&ctx, node);
        checkKernelParams(&ctx, node);
        checkDiscard(&ctx, node);
        checkSilentCatch(&ctx, node);
        checkSwitchElse(&ctx, node);
        checkErrorSet(&ctx, node);
        checkCallback(&ctx, node);
        checkLoopBound(&ctx, node);
        checkTestChecks(&ctx, node);
    }
}

fn startsWithAny(text: []const u8, prefixes: []const []const u8) bool {
    for (prefixes) |p| {
        if (std.mem.startsWith(u8, text, p)) return true;
    }
    return false;
}

fn isBuiltin(tree: *const Ast, node: Node.Index, name: []const u8) bool {
    return switch (tree.nodeTag(node)) {
        .builtin_call_two, .builtin_call_two_comma, .builtin_call, .builtin_call_comma => std.mem.eql(u8, tree.tokenSlice(tree.nodeMainToken(node)), name),
        else => false,
    };
}

/// Rule `silent-catch`: a `catch` that does not look at the error and does
/// not pass a failure on needs a comment saying why the error does not matter.
/// Passing it on means `catch return <value>`, `catch unreachable` (which has
/// its own rule), or `catch @panic(...)`. What is left is `catch return;`,
/// `catch continue`, `catch break`, and a fallback value such as `catch 0`.
fn checkSilentCatch(c: *const Ctx, node: Node.Index) void {
    const tree = c.tree;
    if (tree.nodeTag(node) != .@"catch") return;
    const keyword = tree.nodeMainToken(node);
    if (tree.tokenTag(keyword + 1) == .pipe) return; // the error is captured and used
    const handler = tree.nodeData(node).node_and_node[1];
    switch (tree.nodeTag(handler)) {
        .unreachable_literal => return, // has its own rule
        .@"return" => if (tree.nodeData(handler).opt_node != .none) return,
        // A block with statements does something about the error. An empty
        // one is the `empty-catch` rule's.
        .block, .block_semicolon, .block_two, .block_two_semicolon => return,
        else => if (isBuiltin(tree, handler, "@panic")) return, // any other handler is judged below
    }
    if (c.inTest(keyword)) return;
    if (commented(tree, tree.firstToken(node), tree.lastToken(node))) return;
    c.add(keyword, "silent-catch", "this catch drops the error without a trace; count it, return a status, or say in a comment why it does not matter");
}

/// Rule `switch-else`: in the pure layers an `else` prong needs a comment.
/// A switch that names every case fails to compile when a case is added; an
/// `else` silently takes the new case too.
/// Misses nothing it is aimed at, but cannot tell an enum from an integer, so
/// an `else` over integers needs its comment as well.
fn checkSwitchElse(c: *const Ctx, node: Node.Index) void {
    if (!c.pure) return;
    const case = c.tree.fullSwitchCase(node) orelse return;
    if (case.ast.values.len != 0) return;
    const keyword = case.ast.arrow_token - 1;
    if (c.inTest(keyword) or commented(c.tree, keyword, keyword)) return;
    c.add(keyword, "switch-else", "an else prong also takes every case added later; name the cases, or say in a comment what else covers and why");
}

/// Rule `inferred-error`: a public function of a pure layer names its errors.
/// `pub fn f() !T` can return anything any callee returns, now or later.
fn checkErrorSet(c: *const Ctx, node: Node.Index) void {
    if (!c.pure or c.tree.nodeTag(node) != .fn_decl) return;
    var buf: [1]Node.Index = @splat(.root);
    const proto = c.tree.fullFnProto(&buf, node) orelse return;
    if (proto.visib_token == null or c.inTest(proto.ast.fn_token)) return;
    const return_type = proto.ast.return_type.unwrap() orelse return;
    const before = c.tree.firstToken(return_type) - 1;
    if (c.tree.tokenTag(before) != .bang) return;
    c.add(before, "inferred-error", "a public function names its errors: write error{...}!T, so a new failure is a visible change");
}

/// Rule `core-callback`: no function stored in a core struct. Subsystems
/// talk through handles, events, and actions.
fn checkCallback(c: *const Ctx, node: Node.Index) void {
    if (!c.core) return;
    const field = c.tree.fullContainerField(node) orelse return;
    const type_node = field.ast.type_expr.unwrap() orelse return;
    if (!isFnType(c.tree, type_node) or c.inTest(field.ast.main_token)) return;
    c.add(field.ast.main_token, "core-callback", "the core stores no function to call later; emit an action or an event, and let the owner act on it");
}

/// Rule `unbounded-loop`, tree form: `while (true)` however it is spaced.
fn checkLoopBound(c: *const Ctx, node: Node.Index) void {
    if (!c.core) return;
    const loop = c.tree.fullWhile(node) orelse return;
    if (!isName(c.tree, loop.ast.cond_expr, &.{"true"}) or c.inTest(loop.ast.while_token)) return;
    c.add(loop.ast.while_token, "unbounded-loop", "every loop has a bound");
}

/// Words that show a test checks something.
const check_words = [_][]const u8{ "expect", "assert", "check", "fuzz", "return error." };

/// Rule `test-no-check`: a named test contains a check. A test that only
/// calls code proves that the code does not crash, and reads as if it proved
/// more. A test whose point is "this returns no error" says so in a comment
/// that contains the words `passes if`.
fn checkTestChecks(c: *const Ctx, node: Node.Index) void {
    const tree = c.tree;
    if (tree.nodeTag(node) != .test_decl) return;
    const data = tree.nodeData(node).opt_token_and_node;
    const name = data[0].unwrap() orelse return; // `test { _ = other_file; }` only pulls tests in
    if (tree.tokenTag(name) != .string_literal) return;
    const first = tree.firstToken(data[1]);
    const last = tree.lastToken(data[1]);
    const body = tree.source[tree.tokenStart(first) .. tree.tokenStart(last) + 1];
    for (check_words) |word| {
        if (std.mem.indexOf(u8, body, word) != null) return;
    }
    if (containsAnyCase(body, "passes if")) return;
    c.add(name, "test-no-check", "this test checks nothing; add an expectation, or say `passes if ...` in a comment when not failing is the point");
}

/// Finds every function with a body and every test block.
fn collect(gpa: std.mem.Allocator, tree: *const Ast, fns: *std.ArrayList(Fn), tests: *std.ArrayList(Span)) error{OutOfMemory}!void {
    var i: u32 = 1;
    while (i < tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        const span: Span = switch (tree.nodeTag(node)) {
            .fn_decl, .test_decl => .{ .first = tree.firstToken(node), .last = tree.lastToken(node) },
            else => continue,
        };
        if (tree.nodeTag(node) == .test_decl) {
            try tests.append(gpa, span);
            continue;
        }
        var buf: [1]Node.Index = @splat(.root);
        const proto = tree.fullFnProto(&buf, node) orelse continue;
        const name_token = proto.name_token orelse continue;
        if (fns.items.len == max_fns) continue;
        try fns.append(gpa, .{ .name = tree.tokenSlice(name_token), .name_token = name_token, .span = span });
    }
}

fn isCall(tag: Node.Tag) bool {
    return switch (tag) {
        .call_one, .call_one_comma, .call, .call_comma => true,
        else => false,
    };
}

/// The function a plain-name call refers to, when exactly one function in
/// this file has that name. Two functions with one name (methods of two
/// structs) cannot be told apart from the tree alone, so they are skipped.
fn calleeOf(c: *const Ctx, name: []const u8) ?u32 {
    var found: ?u32 = null;
    for (c.fns, 0..) |f, i| {
        if (!std.mem.eql(u8, f.name, name)) continue;
        if (found != null) return null;
        found = @intCast(i);
    }
    return found;
}

/// Rule `recursion`: no function reaches itself through calls.
/// Sees: calls written as a plain name, to a function declared in this file.
/// Misses: calls through another file, through a field (`x.f()`), or through
/// a function pointer.
fn checkRecursion(gpa: std.mem.Allocator, c: *const Ctx) error{OutOfMemory}!void {
    const n = c.fns.len;
    if (n == 0) return;
    const reach = try gpa.alloc(bool, n * n);
    defer gpa.free(reach);
    @memset(reach, false);
    var i: u32 = 1;
    while (i < c.tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        if (!isCall(c.tree.nodeTag(node))) continue;
        var buf: [1]Node.Index = @splat(.root);
        const call = c.tree.fullCall(&buf, node) orelse continue;
        if (c.tree.nodeTag(call.ast.fn_expr) != .identifier) continue;
        const callee = calleeOf(c, c.tree.tokenSlice(c.tree.nodeMainToken(call.ast.fn_expr))) orelse continue;
        const caller = c.enclosingFn(call.ast.lparen) orelse continue;
        reach[caller * n + callee] = true;
    }
    close(reach, n);
    for (c.fns, 0..) |f, at| {
        if (reach[at * n + at]) c.add(f.name_token, "recursion", "this function can call itself, directly or through other functions in this file; use a loop and an explicit stack with a fixed capacity");
    }
}

/// Transitive closure: afterwards `reach[a * n + b]` is true when `a` can
/// reach `b` through any chain of calls.
fn close(reach: []bool, n: usize) void {
    std.debug.assert(reach.len == n * n);
    for (0..n) |k| {
        for (0..n) |a| {
            if (!reach[a * n + k]) continue;
            for (0..n) |b| {
                if (reach[k * n + b]) reach[a * n + b] = true;
            }
        }
    }
}

/// True when a comment directly above the line of `token` holds `marker`.
pub fn markedAbove(tree: *const Ast, token: Ast.TokenIndex, marker: []const u8) bool {
    const source = tree.source;
    var line_start = tree.tokenLocation(0, token).line_start;
    for (0..max_marker_lines) |_| {
        if (line_start == 0) return false;
        const prev_end = line_start - 1;
        const prev_start = if (std.mem.lastIndexOfScalar(u8, source[0..prev_end], '\n')) |nl| nl + 1 else 0;
        const text = std.mem.trim(u8, source[prev_start..prev_end], " \t\r");
        if (!std.mem.startsWith(u8, text, "//")) return false;
        if (std.mem.indexOf(u8, text, marker) != null) return true;
        line_start = prev_start;
    }
    return false;
}

fn isPointerType(tree: *const Ast, type_node: Node.Index) bool {
    var node = type_node;
    for (0..max_type_layers) |_| {
        switch (tree.nodeTag(node)) {
            .ptr_type_aligned, .ptr_type_sentinel, .ptr_type, .ptr_type_bit_range => return true,
            .optional_type => node = tree.nodeData(node).node,
            else => return false,
        }
    }
    return false;
}

/// The type under any `?` and `[N]` layers: `?[4]usize` gives `usize`.
fn baseType(tree: *const Ast, type_node: Node.Index) Node.Index {
    var node = type_node;
    for (0..max_type_layers) |_| {
        if (tree.nodeTag(node) == .optional_type) {
            node = tree.nodeData(node).node;
        } else if (tree.fullArrayType(node)) |array| {
            node = array.ast.elem_type;
        } else {
            return node;
        }
    }
    return node;
}

fn isName(tree: *const Ast, node: Node.Index, names: []const []const u8) bool {
    if (tree.nodeTag(node) != .identifier) return false;
    const text = tree.tokenSlice(tree.nodeMainToken(node));
    for (names) |name| {
        if (std.mem.eql(u8, text, name)) return true;
    }
    return false;
}

/// Rules `row-pointer` and `row-usize`: stored data holds numbers and
/// handles, never a pointer, a slice, or a `usize`.
/// A struct is stored data when it is `extern` or `packed` (a wire or row
/// layout), or when it is declared in a file named `types.zig` or `state.zig`.
/// In those files a struct that is not a row says so with a marker comment
/// directly above it: `table_marker` or `step_marker`.
/// Misses: a row type declared in a file with another name, and a pointer
/// hidden behind a type alias.
fn checkRowFields(c: *const Ctx, node: Node.Index) void {
    var buf: [2]Node.Index = @splat(.root);
    const container = c.tree.fullContainerDecl(&buf, node) orelse return;
    if (c.tree.tokenTag(container.ast.main_token) != .keyword_struct) return;
    const first = c.tree.firstToken(node);
    if (c.inTest(first)) return;
    const fixed_layout = container.layout_token != null;
    if (!fixed_layout and !c.row_file) return;
    const is_table = markedAbove(c.tree, first, table_marker);
    if (!fixed_layout and (is_table or markedAbove(c.tree, first, step_marker))) return checkMarked(c, container, first, is_table);
    for (container.ast.members) |member| {
        const field = c.tree.fullContainerField(member) orelse continue;
        const type_node = field.ast.type_expr.unwrap() orelse continue;
        if (isPointerType(c.tree, type_node)) c.add(field.ast.main_token, "row-pointer", "stored data holds no pointer or slice; store an index or a handle (a table of columns is marked with a `lint: table` comment)");
        if (isName(c.tree, baseType(c.tree, type_node), &.{ "usize", "isize" })) c.add(field.ast.main_token, "row-usize", "stored data uses u32 or u64, not usize, so its layout is the same on every target");
    }
}

/// Words a table's comment must contain, in any letter case.
const table_words = [_][]const u8{ "owner", "lifetime", "capacity" };

/// Rules `marker-unused` and `table-doc`, for a struct that carries a marker.
/// A marker excuses slices, so it belongs only on a struct that has some.
/// A table's comment names its owner, its lifetime, and the limit that sets
/// its capacity: the three things a reader needs before touching it.
fn checkMarked(c: *const Ctx, container: Ast.full.ContainerDecl, first: Ast.TokenIndex, is_table: bool) void {
    var has_slice = false;
    for (container.ast.members) |member| {
        const field = c.tree.fullContainerField(member) orelse continue;
        if (isPointerType(c.tree, field.ast.type_expr.unwrap() orelse continue)) has_slice = true;
    }
    if (!has_slice) c.add(first, "marker-unused", "this struct is marked as a table or as step-lived, but it holds no slice; remove the marker");
    if (!is_table) return;
    for (table_words) |word| {
        if (!markedAboveAnyCase(c.tree, first, word)) return c.add(first, "table-doc", "the comment above a table names its Owner, its Lifetime, and the limit that sets its Capacity");
    }
}

/// True when `text` contains `word`, which is lower-case, in any letter case.
fn containsAnyCase(text: []const u8, word: []const u8) bool {
    if (text.len < word.len) return false;
    for (0..text.len - word.len + 1) |start| {
        if (std.ascii.eqlIgnoreCase(text[start..][0..word.len], word)) return true;
    }
    return false;
}

/// Like `markedAbove`, ignoring letter case.
fn markedAboveAnyCase(tree: *const Ast, token: Ast.TokenIndex, word: []const u8) bool {
    const source = tree.source;
    var line_start = tree.tokenLocation(0, token).line_start;
    for (0..max_marker_lines) |_| {
        if (line_start == 0) return false;
        const prev_end = line_start - 1;
        const prev_start = if (std.mem.lastIndexOfScalar(u8, source[0..prev_end], '\n')) |nl| nl + 1 else 0;
        const text = std.mem.trim(u8, source[prev_start..prev_end], " \t\r");
        if (!std.mem.startsWith(u8, text, "//")) return false;
        if (containsAnyCase(text, word)) return true;
        line_start = prev_start;
    }
    return false;
}

/// The value of an integer literal, or null.
fn literal(tree: *const Ast, node: Node.Index) ?u64 {
    if (tree.nodeTag(node) != .number_literal) return null;
    return switch (std.zig.parseNumberLiteral(tree.tokenSlice(tree.nodeMainToken(node)))) {
        .int => |v| v,
        .big_int, .float, .failure => null,
    };
}

/// A literal, or a product of two literals.
fn literalProduct(tree: *const Ast, node: Node.Index) ?u64 {
    if (tree.nodeTag(node) != .mul) return literal(tree, node);
    const sides = tree.nodeData(node).node_and_node;
    const a = literal(tree, sides[0]) orelse return null;
    const b = literal(tree, sides[1]) orelse return null;
    return std.math.mul(u64, a, b) catch null; // too large to judge: the rule skips it
}

/// A literal, or the name of a file-level constant whose value is a literal
/// or a product of two literals.
fn knownInt(tree: *const Ast, node: Node.Index) ?u64 {
    if (tree.nodeTag(node) != .identifier) return literal(tree, node);
    const name = tree.tokenSlice(tree.nodeMainToken(node));
    for (tree.rootDecls()) |decl| {
        const v = tree.fullVarDecl(decl) orelse continue;
        if (!std.mem.eql(u8, tree.tokenSlice(v.ast.mut_token + 1), name)) continue;
        return literalProduct(tree, v.ast.init_node.unwrap() orelse return null);
    }
    return null;
}

/// The value of an array length when it can be read from this file: a number,
/// a file-level constant, or a product of two of those.
fn lengthOf(tree: *const Ast, node: Node.Index) ?u64 {
    if (tree.nodeTag(node) != .mul) return knownInt(tree, node);
    const sides = tree.nodeData(node).node_and_node;
    const a = knownInt(tree, sides[0]) orelse return null;
    const b = knownInt(tree, sides[1]) orelse return null;
    return std.math.mul(u64, a, b) catch null; // too large to judge: the rule skips it
}

/// Bytes in one element. An unknown type counts as one byte, so the rule
/// under-counts instead of flagging an array that may be small.
fn elementBytes(tree: *const Ast, node: Node.Index) u64 {
    if (isName(tree, node, &.{ "u16", "i16" })) return 2;
    if (isName(tree, node, &.{ "u32", "i32", "f32" })) return 4;
    if (isName(tree, node, &.{ "u64", "i64", "f64", "usize", "isize" })) return 8;
    if (isName(tree, node, &.{ "u128", "i128" })) return 16;
    return 1;
}

/// Rule `local-array`: no array above 4 KB on the stack.
/// Sees: a local declared with an array type whose length is a number, a
/// file-level constant, or a product of those; one nested array level.
/// Misses: lengths from another file, and arrays inside a struct held by value.
fn checkLocalArray(c: *const Ctx, node: Node.Index) void {
    const decl = c.tree.fullVarDecl(node) orelse return;
    if (c.enclosingFn(decl.ast.mut_token) == null or c.inTest(decl.ast.mut_token)) return;
    const outer = c.tree.fullArrayType(decl.ast.type_node.unwrap() orelse return) orelse return;
    var bytes = lengthOf(c.tree, outer.ast.elem_count) orelse return;
    var element = outer.ast.elem_type;
    if (c.tree.fullArrayType(element)) |inner| {
        const inner_len = lengthOf(c.tree, inner.ast.elem_count) orelse return;
        bytes = std.math.mul(u64, bytes, inner_len) catch return; // too large to judge: skipped
        element = inner.ast.elem_type;
    }
    bytes = std.math.mul(u64, bytes, elementBytes(c.tree, element)) catch return; // as above
    if (bytes > max_local_array_bytes) c.add(decl.ast.mut_token, "local-array", "a local array above 4 KB can overflow the stack; take the buffer from an arena or from startup memory");
}

fn isFnType(tree: *const Ast, type_node: Node.Index) bool {
    var node = type_node;
    for (0..max_type_layers) |_| {
        switch (tree.nodeTag(node)) {
            .fn_proto_simple, .fn_proto_multi, .fn_proto_one, .fn_proto => return true,
            .optional_type => node = tree.nodeData(node).node,
            .ptr_type_aligned, .ptr_type_sentinel, .ptr_type, .ptr_type_bit_range => {
                const ptr = tree.fullPtrType(node) orelse return false;
                node = ptr.ast.child_type;
            },
            else => return false,
        }
    }
    return false;
}

/// Rule `kernel-fn-pointer`: a kernel takes no function to call per item.
/// Misses: a function type hidden behind an alias.
fn checkKernelParams(c: *const Ctx, node: Node.Index) void {
    if (!c.kernels or c.tree.nodeTag(node) != .fn_decl) return;
    var buf: [1]Node.Index = @splat(.root);
    const proto = c.tree.fullFnProto(&buf, node) orelse return;
    if (c.inTest(proto.ast.fn_token)) return;
    var params = proto.iterate(c.tree);
    while (params.next()) |param| {
        const type_node = param.type_expr orelse continue;
        if (isFnType(c.tree, type_node)) c.add(c.tree.firstToken(type_node), "kernel-fn-pointer", "a kernel takes concrete slices, not a function to call per item");
    }
}

/// The expression under `try`, parentheses, and the left side of `catch`.
fn unwrapped(tree: *const Ast, expr: Node.Index) Node.Index {
    var node = expr;
    for (0..max_type_layers) |_| {
        node = switch (tree.nodeTag(node)) {
            .@"try" => tree.nodeData(node).node,
            .grouped_expression => tree.nodeData(node).node_and_token[0],
            .@"catch" => tree.nodeData(node).node_and_node[0],
            else => return node,
        };
    }
    return node;
}

/// True when the statement that spans `first..last` has a comment on its last
/// line, or a comment-only line directly above it.
fn commented(tree: *const Ast, first: Ast.TokenIndex, last: Ast.TokenIndex) bool {
    const source = tree.source;
    const end = tree.tokenLocation(0, last);
    if (std.mem.indexOf(u8, source[tree.tokenStart(last)..end.line_end], "//") != null) return true;
    const line_start = tree.tokenLocation(0, first).line_start;
    if (line_start == 0) return false;
    const prev_start = if (std.mem.lastIndexOfScalar(u8, source[0 .. line_start - 1], '\n')) |nl| nl + 1 else 0;
    return std.mem.startsWith(u8, std.mem.trim(u8, source[prev_start .. line_start - 1], " \t\r"), "//");
}

/// Rule `discard`: `_ = call()` drops a result, so it needs a comment saying
/// why. `_ = x` marks a value as deliberately unused and needs none.
/// The text rule of the same name guesses from a `(` on the line; this one
/// knows the right-hand side is a call, including across lines.
fn checkDiscard(c: *const Ctx, node: Node.Index) void {
    if (c.tree.nodeTag(node) != .assign) return;
    const sides = c.tree.nodeData(node).node_and_node;
    if (!isName(c.tree, sides[0], &.{"_"})) return;
    if (!isCall(c.tree.nodeTag(unwrapped(c.tree, sides[1])))) return;
    const first = c.tree.firstToken(node);
    if (c.inTest(first)) return;
    if (commented(c.tree, first, c.tree.lastToken(node))) return;
    c.add(first, "discard", "a discarded result needs a comment saying why");
}

const map_iterators = [_][]const u8{ "iterator", "keyIterator", "valueIterator" };

fn isHashMapText(text: []const u8) bool {
    return std.mem.indexOf(u8, text, "HashMap") != null and std.mem.indexOf(u8, text, "ArrayHashMap") == null;
}

/// A name declared with a hash-map type, and the function it is local to
/// (null for a field or a file-level variable, which any function may use).
const MapName = struct {
    name: []const u8,
    scope: ?u32,
};

fn addMapName(gpa: std.mem.Allocator, c: *const Ctx, names: *std.ArrayList(MapName), name_token: Ast.TokenIndex) error{OutOfMemory}!void {
    try names.append(gpa, .{ .name = c.tree.tokenSlice(name_token), .scope = c.enclosingFn(name_token) });
}

/// Names declared in this file with a hash-map type: variables, fields, and
/// parameters whose type or initial value mentions `HashMap`.
fn mapNames(gpa: std.mem.Allocator, c: *const Ctx, names: *std.ArrayList(MapName)) error{OutOfMemory}!void {
    const tree = c.tree;
    var i: u32 = 1;
    while (i < tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        var buf: [1]Node.Index = @splat(.root);
        if (tree.fullVarDecl(node)) |v| {
            const typed = if (v.ast.type_node.unwrap()) |t| isHashMapText(tree.getNodeSource(t)) else false;
            const inited = if (v.ast.init_node.unwrap()) |t| isHashMapText(tree.getNodeSource(t)) else false;
            if (typed or inited) try addMapName(gpa, c, names, v.ast.mut_token + 1);
        } else if (tree.fullContainerField(node)) |f| {
            const type_node = f.ast.type_expr.unwrap() orelse continue;
            if (isHashMapText(tree.getNodeSource(type_node))) try addMapName(gpa, c, names, f.ast.main_token);
        } else if (tree.nodeTag(node) == .fn_decl) {
            const proto = tree.fullFnProto(&buf, node) orelse continue;
            try paramMapNames(gpa, c, &proto, names);
        }
    }
}

fn paramMapNames(gpa: std.mem.Allocator, c: *const Ctx, proto: *const Ast.full.FnProto, names: *std.ArrayList(MapName)) error{OutOfMemory}!void {
    var params = proto.iterate(c.tree);
    while (params.next()) |param| {
        const type_node = param.type_expr orelse continue;
        const name_token = param.name_token orelse continue;
        if (isHashMapText(c.tree.getNodeSource(type_node))) try addMapName(gpa, c, names, name_token);
    }
}

/// True when `name`, used inside function `in_fn`, is one of the map names.
fn isMapName(names: []const MapName, name: []const u8, in_fn: u32) bool {
    for (names) |m| {
        if (m.scope != null and m.scope != in_fn) continue;
        if (std.mem.eql(u8, m.name, name)) return true;
    }
    return false;
}

/// True when the function at `fn_index` calls something whose name contains
/// "sort" (`std.mem.sort`, `std.sort.pdq`, a local `sortKeys`).
fn fnSorts(c: *const Ctx, fn_index: u32) bool {
    const tree = c.tree;
    var i: u32 = 1;
    while (i < tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        if (!isCall(tree.nodeTag(node))) continue;
        var buf: [1]Node.Index = @splat(.root);
        const call = tree.fullCall(&buf, node) orelse continue;
        if (!c.fns[fn_index].span.contains(call.ast.lparen)) continue;
        const callee = tree.getNodeSource(call.ast.fn_expr);
        if (std.mem.indexOf(u8, callee, "sort") != null or std.mem.indexOf(u8, callee, "Sort") != null) return true;
    }
    return false;
}

/// The last name in a receiver: `m` in `m`, `index` in `state.index`.
fn receiverName(tree: *const Ast, node: Node.Index) ?[]const u8 {
    return switch (tree.nodeTag(node)) {
        .identifier => tree.tokenSlice(tree.nodeMainToken(node)),
        .field_access => tree.tokenSlice(tree.nodeData(node).node_and_token[1]),
        else => null,
    };
}

/// Rule `map-order`: the core never iterates a hash map without sorting,
/// because a hash map's order can differ from run to run.
/// Sees: `.iterator()`, `.keyIterator()`, `.valueIterator()` on a name this
/// file declares with a `HashMap` type, in a function that calls no sort.
/// Misses: a map whose type is declared in another file.
fn checkMapOrder(gpa: std.mem.Allocator, c: *const Ctx) error{OutOfMemory}!void {
    if (!c.core) return;
    var names: std.ArrayList(MapName) = .empty;
    defer names.deinit(gpa);
    try mapNames(gpa, c, &names);
    if (names.items.len == 0) return;
    const tree = c.tree;
    var i: u32 = 1;
    while (i < tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        if (!isCall(tree.nodeTag(node))) continue;
        var buf: [1]Node.Index = @splat(.root);
        const call = tree.fullCall(&buf, node) orelse continue;
        if (tree.nodeTag(call.ast.fn_expr) != .field_access) continue;
        const access = tree.nodeData(call.ast.fn_expr).node_and_token;
        if (!matches(tree.tokenSlice(access[1]), &map_iterators)) continue;
        const receiver = receiverName(tree, access[0]) orelse continue;
        const in_fn = c.enclosingFn(call.ast.lparen) orelse continue;
        if (!isMapName(names.items, receiver, in_fn) or c.inTest(call.ast.lparen)) continue;
        if (fnSorts(c, in_fn)) continue;
        c.add(access[1], "map-order", "a hash map's order varies by run; collect the entries and sort them, or keep them in an array");
    }
}

pub fn matches(text: []const u8, names: []const []const u8) bool {
    for (names) |name| {
        if (std.mem.eql(u8, text, name)) return true;
    }
    return false;
}

fn check(path: []const u8, source: [:0]const u8) !lint.Result {
    var result: lint.Result = .{};
    try lintTree(std.testing.allocator, path, source, &result);
    return result;
}

test "recursion: direct and mutual recursion are found; a plain call chain is not" {
    try std.testing.expect((try check("src/sim/x.zig",
        \\fn walk(n: u32) u32 {
        \\    if (n == 0) return 0;
        \\    return walk(n - 1);
        \\}
    )).has("recursion"));
    try std.testing.expect((try check("src/sim/x.zig",
        \\fn even(n: u32) bool {
        \\    return n == 0 or odd(n - 1);
        \\}
        \\fn middle(n: u32) bool {
        \\    return even(n);
        \\}
        \\fn odd(n: u32) bool {
        \\    return n != 0 and middle(n - 1);
        \\}
    )).has("recursion"));
    const clean = try check("src/sim/x.zig",
        \\fn a() u32 {
        \\    return b() + c();
        \\}
        \\fn b() u32 {
        \\    return c();
        \\}
        \\fn c() u32 {
        \\    return 1;
        \\}
        \\const T = struct {
        \\    fn init() T {
        \\        return .{};
        \\    }
        \\};
        \\const U = struct {
        \\    fn init() U {
        \\        _ = T.init();
        \\        return .{};
        \\    }
        \\};
    );
    try std.testing.expect(!clean.has("recursion"));
}

test "row-pointer: a pointer, slice, or optional pointer in stored data is found" {
    try std.testing.expect((try check("src/wire/x.zig", "const H = extern struct { next: *u8 };")).has("row-pointer"));
    try std.testing.expect((try check("src/wire/x.zig", "const H = extern struct { next: ?*const H };")).has("row-pointer"));
    try std.testing.expect((try check("src/core/a/types.zig", "const Row = struct { name: []const u8 };")).has("row-pointer"));
    try std.testing.expect((try check("src/core/a/state.zig", "const Row = struct { many: [*]u32 };")).has("row-pointer"));
    // Numbers and handles are what rows hold.
    try std.testing.expect(!(try check("src/core/a/types.zig", "const Row = struct { id: u32, next: ?u32, key: [16]u8 };")).has("row-pointer"));
    // The same struct in an ordinary file is not stored data.
    try std.testing.expect(!(try check("src/core/a/root.zig", "const View = struct { name: []const u8 };")).has("row-pointer"));
}

test "row-pointer: a marked table or step-lived struct may hold slices" {
    try std.testing.expect(!(try check("src/core/a/state.zig",
        \\/// The table.
        \\// lint: table
        \\pub const Table = struct { ids: []u32 };
    )).has("row-pointer"));
    try std.testing.expect(!(try check("src/core/types.zig",
        \\// lint: step-lived
        \\pub const Input = struct { bytes: []const u8 };
    )).has("row-pointer"));
    // A marker does not excuse a fixed layout: bytes on a wire cannot be pointers.
    try std.testing.expect((try check("src/core/a/state.zig",
        \\// lint: table
        \\pub const Header = extern struct { ids: [*]u32 };
    )).has("row-pointer"));
    // The marker must be directly above.
    try std.testing.expect((try check("src/core/a/state.zig",
        \\// lint: table
        \\const x = 1;
        \\pub const Table = struct { ids: []u32 };
    )).has("row-pointer"));
}

test "row-usize: usize in stored data is found; u32 and u64 are not" {
    try std.testing.expect((try check("src/wire/x.zig", "const H = packed struct { len: usize };")).has("row-usize"));
    try std.testing.expect((try check("src/core/a/types.zig", "const Row = struct { offsets: [4]usize };")).has("row-usize"));
    try std.testing.expect(!(try check("src/core/a/types.zig", "const Row = struct { len: u32, at: u64 };")).has("row-usize"));
    try std.testing.expect(!(try check("src/core/a/root.zig", "const Cursor = struct { at: usize };")).has("row-usize"));
}

test "local-array: an array above 4 KB on the stack is found; a small or global one is not" {
    try std.testing.expect((try check("src/sim/x.zig",
        \\fn f() void {
        \\    var buf: [8192]u8 = @splat(0);
        \\    use(&buf);
        \\}
    )).has("local-array"));
    try std.testing.expect((try check("src/sim/x.zig",
        \\const rows = 64;
        \\fn f() void {
        \\    var grid: [rows][32]u32 = @splat(@splat(0));
        \\    use(&grid);
        \\}
    )).has("local-array"));
    try std.testing.expect((try check("src/sim/x.zig",
        \\fn f() void {
        \\    var buf: [2 * 4096]u8 = @splat(0);
        \\    use(&buf);
        \\}
    )).has("local-array"));
    const clean = try check("src/sim/x.zig",
        \\const table: [8192]u8 = @splat(0);
        \\fn f(n: usize) void {
        \\    var small: [4096]u8 = @splat(0);
        \\    var words: [512]u64 = @splat(0);
        \\    var unknown: [n]u8 = @splat(0);
        \\    use(&small, &words, &unknown);
        \\}
        \\test "tests may use the stack" {
        \\    var big: [65536]u8 = @splat(0);
        \\    use(&big);
        \\}
    );
    try std.testing.expect(!clean.has("local-array"));
}

test "map-order: iterating a hash map in the core is found unless the function sorts" {
    try std.testing.expect((try check("src/core/a/root.zig",
        \\fn total(map: *const std.AutoHashMap(u32, u32)) u32 {
        \\    var sum: u32 = 0;
        \\    var it = map.iterator();
        \\    while (it.next()) |e| sum += e.value_ptr.*;
        \\    return sum;
        \\}
    )).has("map-order"));
    try std.testing.expect((try check("src/core/a/root.zig",
        \\const S = struct { index: std.StringHashMapUnmanaged(u32) };
        \\fn first(s: *S) ?u32 {
        \\    var it = s.index.valueIterator();
        \\    return if (it.next()) |v| v.* else null;
        \\}
    )).has("map-order"));
    const clean = try check("src/core/a/root.zig",
        \\fn sorted(map: *const std.AutoHashMap(u32, u32), out: []u32) void {
        \\    var it = map.keyIterator();
        \\    var n: usize = 0;
        \\    while (it.next()) |k| : (n += 1) out[n] = k.*;
        \\    std.mem.sort(u32, out[0..n], {}, std.sort.asc(u32));
        \\}
        \\fn ordered(map: *const std.AutoArrayHashMap(u32, u32)) u32 {
        \\    var it = map.iterator();
        \\    return if (it.next()) |e| e.value_ptr.* else 0;
        \\}
        \\fn lines(text: []const u8) u32 {
        \\    var it = std.mem.splitScalar(u8, text, '\n');
        \\    var n: u32 = 0;
        \\    while (it.next()) |_| n += 1;
        \\    return n;
        \\}
    );
    try std.testing.expect(!clean.has("map-order"));
    // Outside the core, order does not reach the log or a response.
    try std.testing.expect(!(try check("src/sim/x.zig",
        \\fn total(map: *const std.AutoHashMap(u32, u32)) u32 {
        \\    var it = map.iterator();
        \\    return if (it.next()) |e| e.value_ptr.* else 0;
        \\}
    )).has("map-order"));
}

test "kernel-fn-pointer: a function parameter in a kernel is found; slices are not" {
    try std.testing.expect((try check("src/core/a/kernels.zig", "pub fn each(xs: []u32, f: *const fn (u32) u32) void {}")).has("kernel-fn-pointer"));
    try std.testing.expect((try check("src/core/a/kernels.zig", "pub fn each(xs: []u32, comptime f: fn (u32) u32) void {}")).has("kernel-fn-pointer"));
    try std.testing.expect(!(try check("src/core/a/kernels.zig", "pub fn sum(xs: []const u32, out: *u64) void {}")).has("kernel-fn-pointer"));
    try std.testing.expect(!(try check("src/core/a/root.zig", "pub fn each(xs: []u32, f: *const fn (u32) u32) void {}")).has("kernel-fn-pointer"));
}

test "discard: a discarded call needs a comment; a discarded variable does not" {
    try std.testing.expect((try check("src/sim/x.zig",
        \\fn f(x: u32) void {
        \\    _ = g(x);
        \\}
    )).has("discard"));
    // Across lines, which the text rule cannot see.
    try std.testing.expect((try check("src/sim/x.zig",
        \\fn f(x: u32) void {
        \\    _ =
        \\        try g(x);
        \\}
    )).has("discard"));
    const clean = try check("src/sim/x.zig",
        \\fn f(x: u32, table: []u32) void {
        \\    _ = x;
        \\    _ = table[(x + 1) % 2];
        \\    _ = g(x); // the count is not needed here
        \\    // only the side effect matters
        \\    _ = g(x);
        \\}
        \\test "tests may discard" {
        \\    _ = g(1);
        \\}
    );
    try std.testing.expect(!clean.has("discard"));
}

test "a file that does not parse is left to the compiler" {
    const r = try check("src/sim/x.zig", "fn f( {");
    try std.testing.expectEqual(@as(u32, 0), r.count);
}
