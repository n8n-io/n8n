//! Program rules: the lint rules that need every file at once.
//!
//! A file-by-file rule cannot see that `a.zig` calls `b.zig` which calls
//! `a.zig`, or that a limit is declared and never checked anywhere. These
//! rules parse the whole tree first, then look across it.
//!
//! Like every other rule, each is a pure function of (paths, texts), prefers
//! missing a case to flagging correct code, and says what it misses.
const std = @import("std");
const Ast = std.zig.Ast;
const Node = Ast.Node;
const lint = @import("lint.zig");
const lint_ast = @import("lint_ast.zig");

pub const File = struct {
    /// The path whose rules apply: forward slashes, relative to the repo root.
    path: []const u8,
    text: [:0]const u8,
    /// Code the program does not use yet. Nothing names it, by definition, so
    /// the rules about unused declarations leave it alone.
    scaffold: bool = false,
};

/// Hops followed through re-exports such as `pub const f = other.f;`.
const max_hops = 4;
/// Layers of `*`, `?`, `[]`, and `[N]` unwrapped to find a field's base type.
const max_type_layers = 6;

/// Names a public declaration may have without a visible caller: the
/// language or the standard library calls them.
const called_by_convention = [_][]const u8{ "main", "panic", "format", "std_options", "build" };

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

const Container = struct {
    span: Span,
    /// The name it is declared under, or empty: `const Table = struct {...}`.
    name: []const u8,
    /// A name it gives itself inside: `const Self = @This();`.
    self_name: []const u8,
    step_lived: bool,
};

const Fn = struct {
    file: u32,
    name: []const u8,
    name_token: Ast.TokenIndex,
    span: Span,
    /// Index into the file's containers, or null at file scope.
    container: ?u32,
    first_param: []const u8,
    first_param_type: []const u8,
    public: bool,
};

const Import = struct {
    alias: []const u8,
    /// Index of the imported file, when it is one of the files being linted.
    target: u32,
};

const Unit = struct {
    path: []const u8,
    tree: Ast,
    test_file: bool,
    scaffold: bool,
    parsed: bool,
    containers: []Container,
    tests: []Span,
    imports: []Import,
    /// This file's functions are `fns[fn_first..fn_end]` of the program.
    fn_first: u32,
    fn_end: u32,

    fn inTest(u: *const Unit, token: Ast.TokenIndex) bool {
        if (u.test_file) return true;
        for (u.tests) |t| {
            if (t.contains(token)) return true;
        }
        return false;
    }

    /// The innermost container holding `token`, or null at file scope.
    fn containerOf(u: *const Unit, token: Ast.TokenIndex) ?u32 {
        var best: ?u32 = null;
        for (u.containers, 0..) |c, i| {
            if (!c.span.contains(token)) continue;
            if (best) |b| {
                if (u.containers[b].span.len() <= c.span.len()) continue;
            }
            best = @intCast(i);
        }
        return best;
    }
};

const Program = struct {
    arena: std.mem.Allocator,
    units: []Unit,
    fns: std.ArrayList(Fn) = .empty,
    results: []lint.Result,

    fn add(p: *Program, file: u32, token: Ast.TokenIndex, rule: []const u8, message: []const u8) void {
        const line: u32 = @intCast(p.units[file].tree.tokenLocation(0, token).line + 1);
        if (!p.results[file].hasAt(line, rule)) p.results[file].add(line, rule, message);
    }

    fn fnsOf(p: *const Program, file: u32) []const Fn {
        return p.fns.items[p.units[file].fn_first..p.units[file].fn_end];
    }
};

/// Checks every file together and adds what it finds to `results`, one per
/// file, in the same order. A file that does not parse takes no part.
pub fn lintProgram(gpa: std.mem.Allocator, files: []const File, results: []lint.Result) error{OutOfMemory}!void {
    std.debug.assert(files.len == results.len);
    var arena_state = std.heap.ArenaAllocator.init(gpa);
    defer arena_state.deinit();
    const arena = arena_state.allocator();
    var program: Program = .{ .arena = arena, .units = try arena.alloc(Unit, files.len), .results = results };
    for (files, program.units) |file, *unit| unit.* = try parse(arena, file);
    for (program.units, 0..) |*unit, i| {
        if (unit.parsed) try collect(&program, unit, @intCast(i));
    }
    for (program.units) |*unit| {
        if (unit.parsed) try collectImports(&program, unit);
    }
    try checkRecursion(&program);
    try checkStepLived(&program);
    try checkDeadFields(&program);
    try checkPublic(&program);
    try checkOwners(&program);
}

fn parse(arena: std.mem.Allocator, file: File) error{OutOfMemory}!Unit {
    const tree = try Ast.parse(arena, file.text, .{});
    return .{
        .path = file.path,
        .tree = tree,
        .test_file = std.mem.endsWith(u8, file.path, "_test.zig") or std.mem.endsWith(u8, file.path, "/testing.zig"),
        .scaffold = file.scaffold,
        .parsed = tree.errors.len == 0,
        .containers = &.{},
        .tests = &.{},
        .imports = &.{},
        .fn_first = 0,
        .fn_end = 0,
    };
}

fn spanOf(tree: *const Ast, node: Node.Index) Span {
    return .{ .first = tree.firstToken(node), .last = tree.lastToken(node) };
}

/// Finds the file's containers and tests, then its functions.
fn collect(p: *Program, unit: *Unit, file: u32) error{OutOfMemory}!void {
    const tree = &unit.tree;
    var containers: std.ArrayList(Container) = .empty;
    var tests: std.ArrayList(Span) = .empty;
    var i: u32 = 1;
    while (i < tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        if (tree.nodeTag(node) == .test_decl) try tests.append(p.arena, spanOf(tree, node));
        var buf: [2]Node.Index = @splat(.root);
        const decl = tree.fullContainerDecl(&buf, node) orelse continue;
        try containers.append(p.arena, describe(tree, node, decl));
    }
    unit.containers = containers.items;
    unit.tests = tests.items;
    unit.fn_first = @intCast(p.fns.items.len);
    i = 1;
    while (i < tree.nodes.len) : (i += 1) {
        const node: Node.Index = @fromBackingInt(i);
        if (tree.nodeTag(node) != .fn_decl) continue;
        var buf: [1]Node.Index = @splat(.root);
        const proto = tree.fullFnProto(&buf, node) orelse continue;
        const name_token = proto.name_token orelse continue;
        var f: Fn = .{
            .file = file,
            .name = tree.tokenSlice(name_token),
            .name_token = name_token,
            .span = spanOf(tree, node),
            .container = unit.containerOf(name_token),
            .first_param = "",
            .first_param_type = "",
            .public = proto.visib_token != null,
        };
        var params = proto.iterate(tree);
        if (params.next()) |param| {
            if (param.name_token) |t| f.first_param = tree.tokenSlice(t);
            if (param.type_expr) |t| f.first_param_type = tree.getNodeSource(t);
        }
        try p.fns.append(p.arena, f);
    }
    unit.fn_end = @intCast(p.fns.items.len);
}

fn describe(tree: *const Ast, node: Node.Index, decl: Ast.full.ContainerDecl) Container {
    const first = tree.firstToken(node);
    var c: Container = .{ .span = spanOf(tree, node), .name = "", .self_name = "", .step_lived = false };
    // `const Name = struct`, with `extern` or `packed` possibly in between.
    if (first >= 2 and tree.tokenTag(first - 1) == .equal and tree.tokenTag(first - 2) == .identifier) {
        c.name = tree.tokenSlice(first - 2);
    }
    c.step_lived = lint_ast.markedAbove(tree, first, lint_ast.step_marker);
    for (decl.ast.members) |member| {
        const v = tree.fullVarDecl(member) orelse continue;
        const init = v.ast.init_node.unwrap() orelse continue;
        if (std.mem.eql(u8, tree.getNodeSource(init), "@This()")) c.self_name = tree.tokenSlice(v.ast.mut_token + 1);
    }
    return c;
}

/// The path of `relative` as seen from the directory of `from`, with `..`
/// resolved, written into `buf`. Null when it leaves the tree or is too long.
fn resolvePath(from: []const u8, relative: []const u8, buf: []u8) ?[]const u8 {
    var len: usize = if (std.mem.lastIndexOfScalar(u8, from, '/')) |slash| slash else 0;
    if (len > buf.len) return null;
    @memcpy(buf[0..len], from[0..len]);
    var parts = std.mem.splitScalar(u8, relative, '/');
    while (parts.next()) |part| {
        if (std.mem.eql(u8, part, ".") or part.len == 0) continue;
        if (std.mem.eql(u8, part, "..")) {
            if (len == 0) return null;
            len = std.mem.lastIndexOfScalar(u8, buf[0..len], '/') orelse 0;
            continue;
        }
        const sep: usize = if (len == 0) 0 else 1;
        if (len + sep + part.len > buf.len) return null;
        if (sep == 1) buf[len] = '/';
        @memcpy(buf[len + sep ..][0..part.len], part);
        len += sep + part.len;
    }
    return buf[0..len];
}

/// The file named by `@import("x.zig")`, if `node` is that and the file is
/// one of those being linted.
fn importTarget(p: *const Program, unit: *const Unit, node: Node.Index) ?u32 {
    const tree = &unit.tree;
    var buf: [2]Node.Index = @splat(.root);
    const params = tree.builtinCallParams(&buf, node) orelse return null;
    if (params.len != 1 or tree.nodeTag(params[0]) != .string_literal) return null;
    if (!std.mem.eql(u8, tree.tokenSlice(tree.nodeMainToken(node)), "@import")) return null;
    const quoted = tree.tokenSlice(tree.nodeMainToken(params[0]));
    const name = quoted[1 .. quoted.len - 1];
    if (!std.mem.endsWith(u8, name, ".zig")) return null; // a module, not a file
    var path_buf: [256]u8 = @splat(0);
    const path = resolvePath(unit.path, name, &path_buf) orelse return null;
    for (p.units, 0..) |other, i| {
        if (std.mem.eql(u8, other.path, path)) return @intCast(i);
    }
    return null;
}

/// File-level names that stand for another file: `const x = @import("x.zig");`.
fn collectImports(p: *Program, unit: *Unit) error{OutOfMemory}!void {
    const tree = &unit.tree;
    var imports: std.ArrayList(Import) = .empty;
    for (tree.rootDecls()) |decl| {
        const v = tree.fullVarDecl(decl) orelse continue;
        const target = importTarget(p, unit, v.ast.init_node.unwrap() orelse continue) orelse continue;
        try imports.append(p.arena, .{ .alias = tree.tokenSlice(v.ast.mut_token + 1), .target = target });
    }
    unit.imports = imports.items;
}

fn importOf(unit: *const Unit, alias: []const u8) ?u32 {
    for (unit.imports) |imp| {
        if (std.mem.eql(u8, imp.alias, alias)) return imp.target;
    }
    return null;
}

/// The one function called `name` among `fns` that satisfies `at_file_scope`,
/// or null when there is none or more than one.
fn uniqueFn(p: *const Program, file: u32, name: []const u8, container: ?u32, any_container: bool) ?u32 {
    var found: ?u32 = null;
    const first = p.units[file].fn_first;
    for (p.fnsOf(file), 0..) |f, i| {
        if (!std.mem.eql(u8, f.name, name)) continue;
        if (!any_container and f.container != container) continue;
        if (found != null) return null;
        found = first + @as(u32, @intCast(i));
    }
    return found;
}

/// The function `name` in `file`, following re-exports: when the file has no
/// such function but declares `const name = other.name2;`, look there.
fn exported(p: *const Program, start_file: u32, start_name: []const u8) ?u32 {
    var file = start_file;
    var name = start_name;
    for (0..max_hops) |_| {
        if (uniqueFn(p, file, name, null, false)) |f| return f;
        const unit = &p.units[file];
        const tree = &unit.tree;
        var next: ?u32 = null;
        for (tree.rootDecls()) |decl| {
            const v = tree.fullVarDecl(decl) orelse continue;
            if (!std.mem.eql(u8, tree.tokenSlice(v.ast.mut_token + 1), name)) continue;
            const init = v.ast.init_node.unwrap() orelse break;
            if (tree.nodeTag(init) != .field_access) break;
            const access = tree.nodeData(init).node_and_token;
            const through = if (tree.nodeTag(access[0]) == .identifier)
                importOf(unit, tree.tokenSlice(tree.nodeMainToken(access[0])))
            else
                importTarget(p, unit, access[0]);
            next = through orelse break;
            name = tree.tokenSlice(access[1]);
            break;
        }
        file = next orelse return null;
    }
    return null;
}

fn isCall(tag: Node.Tag) bool {
    return switch (tag) {
        .call_one, .call_one_comma, .call, .call_comma => true,
        else => false,
    };
}

/// The innermost function of `file` whose text contains `token`.
fn enclosing(p: *const Program, file: u32, token: Ast.TokenIndex) ?u32 {
    var best: ?u32 = null;
    const first = p.units[file].fn_first;
    for (p.fnsOf(file), 0..) |f, i| {
        if (!f.span.contains(token)) continue;
        if (best) |b| {
            if (p.fns.items[b].span.len() <= f.span.len()) continue;
        }
        best = first + @as(u32, @intCast(i));
    }
    return best;
}

/// True when the caller's first parameter is its own container: `t: *Table`
/// inside `Table`, or `loop: *Loop` where the container says
/// `const Loop = @This();`.
fn takesSelf(p: *const Program, caller: Fn) bool {
    const container = p.units[caller.file].containers[caller.container orelse return false];
    const text = std.mem.trimStart(u8, caller.first_param_type, "*?");
    const base = if (std.mem.startsWith(u8, text, "const ")) text["const ".len..] else text;
    if (std.mem.eql(u8, base, "@This()")) return true;
    if (container.name.len > 0 and std.mem.eql(u8, base, container.name)) return true;
    return container.self_name.len > 0 and std.mem.eql(u8, base, container.self_name);
}

/// The function a call refers to, when that can be told from the text.
/// Resolves: `f()`, `file.f()`, `Type.f()`, and `self.f()` where `self` is
/// the caller's first parameter and has the caller's own type.
/// Does not resolve: a call on any other value, or through a function pointer.
fn callee(p: *const Program, file: u32, caller: u32, fn_expr: Node.Index) ?u32 {
    const unit = &p.units[file];
    const tree = &unit.tree;
    if (tree.nodeTag(fn_expr) == .identifier) {
        const name = tree.tokenSlice(tree.nodeMainToken(fn_expr));
        return uniqueFn(p, file, name, null, true) orelse exported(p, file, name);
    }
    if (tree.nodeTag(fn_expr) != .field_access) return null;
    const access = tree.nodeData(fn_expr).node_and_token;
    if (tree.nodeTag(access[0]) != .identifier) return null;
    const receiver = tree.tokenSlice(tree.nodeMainToken(access[0]));
    const name = tree.tokenSlice(access[1]);
    if (importOf(unit, receiver)) |target| return exported(p, target, name);
    const from = p.fns.items[caller];
    if (std.mem.eql(u8, receiver, from.first_param) and takesSelf(p, from)) {
        return uniqueFn(p, file, name, from.container, false);
    }
    for (unit.containers, 0..) |c, i| {
        if (c.name.len > 0 and std.mem.eql(u8, c.name, receiver)) return uniqueFn(p, file, name, @intCast(i), false);
    }
    return null;
}

/// Rule `recursion`, across files: no function reaches itself through calls.
/// What a call resolves to is described at `callee`.
fn checkRecursion(p: *Program) error{OutOfMemory}!void {
    const n = p.fns.items.len;
    if (n == 0) return;
    // Edges as a list per caller: `edges[starts[f]..starts[f + 1]]`.
    var pairs: std.ArrayList([2]u32) = .empty;
    for (p.units, 0..) |*unit, file| {
        if (!unit.parsed) continue;
        const tree = &unit.tree;
        var i: u32 = 1;
        while (i < tree.nodes.len) : (i += 1) {
            const node: Node.Index = @fromBackingInt(i);
            if (!isCall(tree.nodeTag(node))) continue;
            var buf: [1]Node.Index = @splat(.root);
            const call = tree.fullCall(&buf, node) orelse continue;
            const caller = enclosing(p, @intCast(file), call.ast.lparen) orelse continue;
            const to = callee(p, @intCast(file), caller, call.ast.fn_expr) orelse continue;
            try pairs.append(p.arena, .{ caller, to });
        }
    }
    // Sorted by caller, so each function's calls are one run of the list.
    std.mem.sort([2]u32, pairs.items, {}, byCaller);
    const starts = try p.arena.alloc(u32, n + 1);
    var at: u32 = 0;
    for (starts, 0..) |*start, f| {
        while (at < pairs.items.len and pairs.items[at][0] < f) at += 1;
        start.* = at;
    }
    const graph: Graph = .{ .pairs = pairs.items, .starts = starts };
    const visited = try p.arena.alloc(bool, n);
    const stack = try p.arena.alloc(u32, n);
    for (0..n) |start| {
        if (!graph.reachesItself(@intCast(start), visited, stack)) continue;
        const f = p.fns.items[start];
        p.add(f.file, f.name_token, "recursion", "this function can call itself, directly or through other functions, possibly in other files; use a loop and an explicit stack with a fixed capacity");
    }
}

fn byCaller(_: void, a: [2]u32, b: [2]u32) bool {
    return a[0] < b[0];
}

const Graph = struct {
    /// Every call as (caller, callee), sorted by caller.
    pairs: []const [2]u32,
    /// Function `f` makes the calls `pairs[starts[f]..starts[f + 1]]`.
    starts: []const u32,

    /// Follows calls from `start` with an explicit stack. Each function is
    /// pushed at most once, so the stack cannot overflow.
    fn reachesItself(g: Graph, start: u32, visited: []bool, stack: []u32) bool {
        @memset(visited, false);
        var depth: usize = 1;
        stack[0] = start;
        while (depth > 0) {
            depth -= 1;
            const from = stack[depth];
            for (g.pairs[g.starts[from]..g.starts[from + 1]]) |pair| {
                if (pair[1] == start) return true;
                if (visited[pair[1]]) continue;
                visited[pair[1]] = true;
                stack[depth] = pair[1];
                depth += 1;
            }
        }
        return false;
    }
};

/// The name of a field's type under any `*`, `?`, `[]`, and `[N]`:
/// `[]const types.Received` gives `Received`.
fn baseTypeName(tree: *const Ast, type_node: Node.Index) ?[]const u8 {
    var node = type_node;
    for (0..max_type_layers) |_| {
        const tag = tree.nodeTag(node);
        if (tag == .identifier) return tree.tokenSlice(tree.nodeMainToken(node));
        if (tag == .field_access) return tree.tokenSlice(tree.nodeData(node).node_and_token[1]);
        if (tag == .optional_type) {
            node = tree.nodeData(node).node;
        } else if (tree.fullPtrType(node)) |ptr| {
            node = ptr.ast.child_type;
        } else if (tree.fullArrayType(node)) |array| {
            node = array.ast.elem_type;
        } else return null;
    }
    return null;
}

/// Rule `step-lived-stored`: a struct marked `lint: step-lived` is valid for
/// one step, so no stored struct may hold one. The marker is a claim; this is
/// what makes the claim checkable.
/// Sees: a field in `src/core/` whose type is, points to, or is a slice of a
/// step-lived struct, unless the holder is step-lived too.
/// Misses: one stored through a type alias.
fn checkStepLived(p: *Program) error{OutOfMemory}!void {
    var names: std.ArrayList([]const u8) = .empty;
    for (p.units) |unit| {
        if (!unit.parsed or !std.mem.startsWith(u8, unit.path, "src/core/")) continue;
        for (unit.containers) |c| {
            if (c.step_lived and c.name.len > 0) try names.append(p.arena, c.name);
        }
    }
    if (names.items.len == 0) return;
    for (p.units, 0..) |*unit, file| {
        if (!unit.parsed or unit.test_file or !std.mem.startsWith(u8, unit.path, "src/core/")) continue;
        const tree = &unit.tree;
        var i: u32 = 1;
        while (i < tree.nodes.len) : (i += 1) {
            const field = tree.fullContainerField(@fromBackingInt(i)) orelse continue;
            const name = baseTypeName(tree, field.ast.type_expr.unwrap() orelse continue) orelse continue;
            if (!lint_ast.matches(name, names.items) or unit.inTest(field.ast.main_token)) continue;
            const holder = unit.containerOf(field.ast.main_token) orelse continue;
            if (unit.containers[holder].step_lived) continue;
            p.add(@intCast(file), field.ast.main_token, "step-lived-stored", "this type is marked step-lived: valid for one step only. A struct that outlives the step cannot hold it; copy what is needed into a row");
        }
    }
}

/// Where a field's use is looked for: the program itself. Tests and the
/// simulator using a limit do not make the program enforce it.
fn isProgram(unit: *const Unit) bool {
    if (unit.test_file or !unit.parsed) return false;
    return std.mem.startsWith(u8, unit.path, "src/core/") or std.mem.startsWith(u8, unit.path, "src/shell/") or
        std.mem.startsWith(u8, unit.path, "src/wire/") or std.mem.eql(u8, unit.path, "src/main.zig");
}

const Use = enum { read, increment };

/// True when program code outside `skip_file` reads `.name` (not as the
/// target of `=`), or increments it with `+=`.
fn fieldUsed(p: *const Program, name: []const u8, use: Use, skip_file: u32) bool {
    for (p.units, 0..) |*unit, file| {
        if (file == skip_file and use == .read) continue;
        if (!isProgram(unit)) continue;
        const tree = &unit.tree;
        const tags = tree.tokens.items(.tag);
        var t: Ast.TokenIndex = 1;
        while (t + 1 < tags.len) : (t += 1) {
            if (tags[t] != .identifier or tags[t - 1] != .period) continue;
            if (!std.mem.eql(u8, tree.tokenSlice(t), name) or unit.inTest(t)) continue;
            const next = tags[t + 1];
            if (use == .increment and next == .plus_equal) return true;
            if (use == .read and next != .equal) return true;
        }
    }
    return false;
}

/// Rules `dead-limit` and `dead-counter`.
/// A limit nobody reads is not a limit: the thing it names can grow without
/// bound while the config says otherwise. A counter nobody increments reads
/// zero forever and hides the event it was meant to show.
/// Sees: fields of `Limits` in `src/limits/root.zig`, and of any struct named
/// `Counters` in `src/`.
/// Misses: a limit that is read but never compared with anything.
fn checkDeadFields(p: *Program) error{OutOfMemory}!void {
    for (p.units, 0..) |*unit, file| {
        if (!unit.parsed or unit.test_file or unit.scaffold or !std.mem.startsWith(u8, unit.path, "src/")) continue;
        const tree = &unit.tree;
        const limits_file = std.mem.eql(u8, unit.path, "src/limits/root.zig");
        var i: u32 = 1;
        while (i < tree.nodes.len) : (i += 1) {
            const field = tree.fullContainerField(@fromBackingInt(i)) orelse continue;
            const token = field.ast.main_token;
            const holder = unit.containers[unit.containerOf(token) orelse continue];
            const name = tree.tokenSlice(token);
            if (limits_file and std.mem.eql(u8, holder.name, "Limits")) {
                if (!fieldUsed(p, name, .read, @intCast(file))) p.add(@intCast(file), token, "dead-limit", "no program code reads this limit, so nothing enforces it; check it where the thing it bounds is admitted, or remove it");
            } else if (std.mem.eql(u8, holder.name, "Counters")) {
                if (!fieldUsed(p, name, .increment, @intCast(file))) p.add(@intCast(file), token, "dead-counter", "no program code increments this counter, so it reads zero forever; count the event, or remove it");
            }
        }
    }
}

/// True when the identifier `name` appears in any file other than `file`.
fn namedElsewhere(p: *const Program, name: []const u8, file: u32) bool {
    for (p.units, 0..) |*unit, other| {
        if (other == file or !unit.parsed) continue;
        // A cheap test first: most files do not mention the name at all.
        if (std.mem.indexOf(u8, unit.tree.source, name) == null) continue;
        const tree = &unit.tree;
        const tags = tree.tokens.items(.tag);
        for (tags, 0..) |tag, t| {
            if (tag == .identifier and std.mem.eql(u8, tree.tokenSlice(@intCast(t)), name)) return true;
        }
    }
    return false;
}

/// Rule `pub-unused`: `pub` marks only what another file uses. A public
/// declaration nothing else names is either dead code or wider than it needs
/// to be, and either way it is surface a reader must assume is in use.
/// Sees: `pub fn` and `pub const` in program files under `src/`, when no
/// other linted file contains the name as an identifier.
/// Leaves alone: types (names that start with a capital). A function can
/// hand another file a value of a type that file never names, and the type
/// still has to be public to be written down later.
/// Misses: a name another file uses for something unrelated.
fn checkPublic(p: *Program) error{OutOfMemory}!void {
    for (p.units, 0..) |*unit, file| {
        if (!unit.parsed or unit.test_file or unit.scaffold or !std.mem.startsWith(u8, unit.path, "src/")) continue;
        const tree = &unit.tree;
        var i: u32 = 1;
        while (i < tree.nodes.len) : (i += 1) {
            const node: Node.Index = @fromBackingInt(i);
            const name_token = publicName(tree, node) orelse continue;
            const name = tree.tokenSlice(name_token);
            if (std.ascii.isUpper(name[0])) continue; // a type
            if (unit.inTest(name_token) or lint_ast.matches(name, &called_by_convention)) continue;
            if (namedElsewhere(p, name, @intCast(file))) continue;
            p.add(@intCast(file), name_token, "pub-unused", "no other file names this; drop `pub`, or delete it if nothing here uses it either");
        }
    }
}

/// The name of a `pub fn` or `pub const` declared by `node`, if it is one.
fn publicName(tree: *const Ast, node: Node.Index) ?Ast.TokenIndex {
    if (tree.nodeTag(node) == .fn_decl) {
        var buf: [1]Node.Index = @splat(.root);
        const proto = tree.fullFnProto(&buf, node) orelse return null;
        if (proto.visib_token == null) return null;
        return proto.name_token;
    }
    const v = tree.fullVarDecl(node) orelse return null;
    if (v.visib_token == null) return null;
    return v.ast.mut_token + 1;
}

const state_path = "src/core/state.zig";
const core_prefix = "src/core/";
/// The name the core gives the `State` it is passed.
const state_name = "state";

const Owned = struct {
    /// A field of `State`, such as `conns`.
    field: []const u8,
    /// The subsystem directory that owns it, such as `conn`.
    owner: []const u8,
};

/// The subsystem directory of a core file: `conn` for
/// `src/core/conn/root.zig`, empty for a file directly in `src/core/`.
fn subsystemOf(path: []const u8) []const u8 {
    if (!std.mem.startsWith(u8, path, core_prefix)) return "";
    const rest = path[core_prefix.len..];
    return rest[0 .. std.mem.indexOfScalar(u8, rest, '/') orelse 0];
}

/// Which subsystem owns each field of `State`: the one whose `root.zig` the
/// field's type comes from. `conns: conn.Table` belongs to `conn`.
fn owners(p: *Program, list: *std.ArrayList(Owned)) error{OutOfMemory}!void {
    for (p.units) |*unit| {
        if (!unit.parsed or !std.mem.eql(u8, unit.path, state_path)) continue;
        const tree = &unit.tree;
        var i: u32 = 1;
        while (i < tree.nodes.len) : (i += 1) {
            const field = tree.fullContainerField(@fromBackingInt(i)) orelse continue;
            const holder = unit.containers[unit.containerOf(field.ast.main_token) orelse continue];
            if (!std.mem.eql(u8, holder.name, "State")) continue;
            const type_node = field.ast.type_expr.unwrap() orelse continue;
            if (tree.nodeTag(type_node) != .field_access) continue;
            const from = tree.nodeData(type_node).node_and_token[0];
            if (tree.nodeTag(from) != .identifier) continue;
            const target = importOf(unit, tree.tokenSlice(tree.nodeMainToken(from))) orelse continue;
            const owner = subsystemOf(p.units[target].path);
            if (owner.len > 0) try list.append(p.arena, .{ .field = tree.tokenSlice(field.ast.main_token), .owner = owner });
        }
    }
}

fn isAssignment(tag: Node.Tag) bool {
    return switch (tag) {
        .assign, .assign_add, .assign_sub, .assign_mul, .assign_div, .assign_mod => true,
        .assign_shl, .assign_shl_sat, .assign_shr, .assign_bit_and, .assign_bit_xor, .assign_bit_or => true,
        .assign_mul_wrap, .assign_add_wrap, .assign_sub_wrap, .assign_mul_sat, .assign_add_sat, .assign_sub_sat => true,
        else => false,
    };
}

/// For a place such as `state.conns.op[row]`, the field of `State` it is
/// in: `conns`. Null when the place is not reached from `state` or from a
/// local name that stands for part of it.
fn stateField(unit: *const Unit, place: Node.Index) ?[]const u8 {
    const tree = &unit.tree;
    var node = place;
    var field: ?[]const u8 = null;
    for (0..max_type_layers * 2) |_| {
        switch (tree.nodeTag(node)) {
            .array_access => node = tree.nodeData(node).node_and_node[0],
            .field_access => {
                const access = tree.nodeData(node).node_and_token;
                field = tree.tokenSlice(access[1]);
                node = access[0];
            },
            .deref, .address_of => node = tree.nodeData(node).node,
            .identifier => {
                const name = tree.tokenSlice(tree.nodeMainToken(node));
                if (std.mem.eql(u8, name, state_name)) return field;
                return localStateField(unit, name);
            },
            else => return null,
        }
    }
    return null;
}

/// When `name` is declared as `const name = &state.conns;` (or without the
/// `&`), the field it stands for: `conns`.
fn localStateField(unit: *const Unit, name: []const u8) ?[]const u8 {
    const tree = &unit.tree;
    var i: u32 = 1;
    while (i < tree.nodes.len) : (i += 1) {
        const decl = tree.fullVarDecl(@fromBackingInt(i)) orelse continue;
        if (!std.mem.eql(u8, tree.tokenSlice(decl.ast.mut_token + 1), name)) continue;
        const text = std.mem.trimStart(u8, tree.getNodeSource(decl.ast.init_node.unwrap() orelse continue), "&");
        if (!std.mem.startsWith(u8, text, state_name ++ ".")) continue;
        const rest = text[state_name.len + 1 ..];
        return rest[0 .. std.mem.indexOfAny(u8, rest, ".[ ") orelse rest.len];
    }
    return null;
}

/// Rule `table-owner`: only the owning subsystem writes a table, so "what
/// changed this value?" has one answer. Ownership is read from `State`: a
/// field belongs to the subsystem its type comes from.
/// Sees: in `src/core/`, an assignment, `@memset`, or `@memcpy` whose target
/// is inside a `State` field owned by another subsystem, reached as
/// `state.<field>...` or through a local name declared from it.
/// Misses: a write through a pointer handed to another function, and a
/// method called on another subsystem's table.
fn checkOwners(p: *Program) error{OutOfMemory}!void {
    var owned: std.ArrayList(Owned) = .empty;
    try owners(p, &owned);
    if (owned.items.len == 0) return;
    for (p.units, 0..) |*unit, file| {
        if (!unit.parsed or unit.test_file or unit.scaffold or !std.mem.startsWith(u8, unit.path, core_prefix)) continue;
        const here = subsystemOf(unit.path);
        const tree = &unit.tree;
        var i: u32 = 1;
        while (i < tree.nodes.len) : (i += 1) {
            const node: Node.Index = @fromBackingInt(i);
            const place = writtenPlace(tree, node) orelse continue;
            const field = stateField(unit, place) orelse continue;
            const token = tree.firstToken(node);
            if (unit.inTest(token)) continue;
            for (owned.items) |o| {
                if (!std.mem.eql(u8, o.field, field) or std.mem.eql(u8, o.owner, here)) continue;
                p.add(@intCast(file), token, "table-owner", "only the subsystem that owns a table writes it; call a function in the owner's root.zig that makes this change and asserts the state it expects");
            }
        }
    }
}

/// The place a node writes to: the left side of an assignment, or the first
/// argument of `@memset` or `@memcpy`.
fn writtenPlace(tree: *const Ast, node: Node.Index) ?Node.Index {
    if (isAssignment(tree.nodeTag(node))) return tree.nodeData(node).node_and_node[0];
    var buf: [2]Node.Index = @splat(.root);
    const params = tree.builtinCallParams(&buf, node) orelse return null;
    const name = tree.tokenSlice(tree.nodeMainToken(node));
    if (params.len == 0 or !lint_ast.matches(name, &.{ "@memset", "@memcpy" })) return null;
    return params[0];
}

fn reports(rule: []const u8, files: []const File) !bool {
    const gpa = std.testing.allocator;
    const results = try gpa.alloc(lint.Result, files.len);
    defer gpa.free(results);
    try lint.lintAll(gpa, files, results);
    for (results) |result| {
        if (result.has(rule)) return true;
    }
    return false;
}

test "recursion: a method that calls itself through another method is found" {
    try std.testing.expect(try reports("recursion", &.{.{ .path = "src/sim/x.zig", .text =
        \\pub const Table = struct {
        \\    n: u32,
        \\    fn grow(t: *Table) void {
        \\        t.settle();
        \\    }
        \\    fn settle(t: *Table) void {
        \\        if (t.n > 0) t.grow();
        \\    }
        \\};
    }}));
    // The same through `@This()`, as a generic type's methods are written.
    try std.testing.expect(try reports("recursion", &.{.{ .path = "src/sim/x.zig", .text =
        \\fn Box(comptime T: type) type {
        \\    return struct {
        \\        const Self = @This();
        \\        item: T,
        \\        fn a(self: *Self) void {
        \\            self.b();
        \\        }
        \\        fn b(self: *Self) void {
        \\            self.a();
        \\        }
        \\    };
        \\}
    }}));
}

test "recursion: a call on another object with the same method name is not a cycle" {
    // `add` forwards to a field's `add`: a different function with the same name.
    try std.testing.expect(!try reports("recursion", &.{.{ .path = "src/sim/x.zig", .text =
        \\pub const Report = struct {
        \\    inner: Inner,
        \\    fn add(r: *Report, n: u32) void {
        \\        r.inner.add(n);
        \\    }
        \\};
        \\const Inner = struct {
        \\    total: u32,
        \\    fn add(i: *Inner, n: u32) void {
        \\        i.total += n;
        \\    }
        \\};
    }}));
    // A parameter that merely shares the first parameter's role but has
    // another type is not `self`.
    try std.testing.expect(!try reports("recursion", &.{.{ .path = "src/sim/x.zig", .text =
        \\pub const Outer = struct {
        \\    fn run(other: *Engine) void {
        \\        other.run();
        \\    }
        \\};
    }}));
}

test "recursion: found through a re-export and through a type's name" {
    try std.testing.expect(try reports("recursion", &.{
        .{ .path = "src/sim/root.zig", .text = "pub const step = @import(\"step.zig\").step;\n" },
        .{ .path = "src/sim/step.zig", .text = "const helper = @import(\"helper.zig\");\npub fn step(n: u32) u32 {\n    return helper.again(n);\n}\n" },
        .{ .path = "src/sim/helper.zig", .text = "const root = @import(\"root.zig\");\npub fn again(n: u32) u32 {\n    return root.step(n);\n}\n" },
    }));
    try std.testing.expect(try reports("recursion", &.{.{ .path = "src/sim/x.zig", .text =
        \\const Node = struct {
        \\    fn depth(n: u32) u32 {
        \\        return if (n == 0) 0 else Node.depth(n - 1) + 1;
        \\    }
        \\};
    }}));
}

test "step-lived-stored: a step-lived holder may hold one; a stored struct may not, even by slice" {
    const input = "// lint: step-lived\npub const Received = struct { bytes: []const u8 };\n";
    try std.testing.expect(try reports("step-lived-stored", &.{
        .{ .path = "src/core/types.zig", .text = input },
        .{ .path = "src/core/a/root.zig", .text = "const types = @import(\"../types.zig\");\nconst Queue = struct { waiting: []const types.Received };\n" },
    }));
    try std.testing.expect(!try reports("step-lived-stored", &.{
        .{ .path = "src/core/types.zig", .text = input ++ "// lint: step-lived\npub const Input = struct { received: []const Received };\n" },
    }));
}

test "dead-limit: a use in a test or in the simulator does not count" {
    const limits = "pub const Limits = struct {\n    max_dust: u32,\n};\n";
    try std.testing.expect(try reports("dead-limit", &.{
        .{ .path = "src/limits/root.zig", .text = limits },
        .{ .path = "src/sim/x.zig", .text = "fn f(l: anytype) u32 {\n    return l.max_dust;\n}\n" },
        .{ .path = "src/core/a_test.zig", .text = "fn f(l: anytype) u32 {\n    return l.max_dust;\n}\n" },
    }));
    // Setting a limit is not reading it.
    try std.testing.expect(try reports("dead-limit", &.{
        .{ .path = "src/limits/root.zig", .text = limits },
        .{ .path = "src/core/a/root.zig", .text = "fn f(l: anytype) void {\n    l.max_dust = 4;\n}\n" },
    }));
}

test "pub-unused: types, scaffolds, and conventional names are left alone" {
    const other: File = .{ .path = "src/core/b.zig", .text = "fn other() void {}\n" };
    try std.testing.expect(!try reports("pub-unused", &.{ .{ .path = "src/core/a/root.zig", .text = "pub const Handle = struct { id: u32 };\n" }, other }));
    try std.testing.expect(!try reports("pub-unused", &.{ .{ .path = "src/main.zig", .text = "pub fn main() void {}\n" }, other }));
    try std.testing.expect(!try reports("pub-unused", &.{ .{ .path = "src/core/a/root.zig", .text = "pub fn helper() void {}\n", .scaffold = true }, other }));
    try std.testing.expect(try reports("pub-unused", &.{ .{ .path = "src/core/a/root.zig", .text = "pub const max_things = 4;\n" }, other }));
}

test "resolvePath follows .. and refuses to leave the tree" {
    var buf: [64]u8 = undefined;
    try std.testing.expectEqualStrings("src/core/mem/pool.zig", resolvePath("src/core/conn/root.zig", "../mem/pool.zig", &buf) orelse "");
    try std.testing.expectEqualStrings("src/core/conn/state.zig", resolvePath("src/core/conn/root.zig", "state.zig", &buf) orelse "");
    try std.testing.expect(resolvePath("a.zig", "../../x.zig", &buf) == null);
}

const owner_state: File = .{ .path = "src/core/state.zig", .text = "const conn = @import(\"conn/root.zig\");\npub const State = struct {\n    conns: conn.Table,\n    steps: u64,\n};\n" };
const owner_conn: File = .{ .path = "src/core/conn/root.zig", .text = "pub const Table = struct { op: []u32 };\npub fn clear(state: anytype, row: u32) void {\n    state.conns.op[row] = 0;\n}\n" };

fn ownerCase(text: [:0]const u8) !bool {
    return reports("table-owner", &.{ owner_state, owner_conn, .{ .path = "src/core/ingest/root.zig", .text = text } });
}

test "table-owner: another subsystem may read a table and call its owner, not write it" {
    try std.testing.expect(try ownerCase("fn f(state: anytype, row: u32) void {\n    state.conns.op[row] = 7;\n}\n"));
    try std.testing.expect(try ownerCase("fn f(state: anytype, row: u32) void {\n    state.conns.op[row] += 1;\n}\n"));
    try std.testing.expect(try ownerCase("fn f(state: anytype) void {\n    @memset(state.conns.op, 0);\n}\n"));
    // A local name for the table does not hide the write.
    try std.testing.expect(try ownerCase("fn f(state: anytype, row: u32) void {\n    const conns = &state.conns;\n    conns.op[row] = 7;\n}\n"));
    // Reading, and asking the owner, are how subsystems work together.
    try std.testing.expect(!try ownerCase("const conn = @import(\"../conn/root.zig\");\nfn f(state: anytype, row: u32) u32 {\n    conn.clear(state, row);\n    return state.conns.op[row];\n}\n"));
    // A field no subsystem owns is everyone's to write.
    try std.testing.expect(!try ownerCase("fn f(state: anytype) void {\n    state.steps += 1;\n}\n"));
    // The owner writes its own table.
    try std.testing.expect(!try reports("table-owner", &.{ owner_state, owner_conn }));
}
