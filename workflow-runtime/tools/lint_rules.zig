//! The registry: every lint rule, what it prevents, and two samples.
//!
//! A rule exists only if it is listed here. `Result.add` refuses a finding
//! whose rule is not in this list, and `lint_rules_test.zig` runs every
//! rule's samples: `bad` must produce the finding and `good` must not. So a
//! rule cannot be added without proof that it fires, and cannot stop firing
//! without a test failing. The file `lint-rules` at the repo root repeats the
//! names, so removing a rule is a visible change to a second file.
//!
//! `zig build lint -- --list-rules` prints this list.

pub const Sample = struct {
    /// Where the lint is told the file lives: rules depend on the layer.
    path: []const u8,
    text: [:0]const u8,
};

pub const Rule = struct {
    name: []const u8,
    /// One sentence: what goes wrong without this rule.
    prevents: []const u8,
    /// Files that together must produce this finding.
    bad: []const Sample,
    /// The nearest correct code, which must not.
    good: []const Sample,
};

pub fn find(name: []const u8) ?*const Rule {
    for (&all) |*rule| {
        if (eql(rule.name, name)) return rule;
    }
    return null;
}

fn eql(a: []const u8, b: []const u8) bool {
    if (a.len != b.len) return false;
    for (a, b) |x, y| {
        if (x != y) return false;
    }
    return true;
}

fn one(path: []const u8, text: [:0]const u8) []const Sample {
    return &.{.{ .path = path, .text = text }};
}

const core = "src/core/a/root.zig";
const sim = "src/sim/x.zig";
const long_body = repeat("    g();\n", 61);
const medium_body = repeat("    g();\n", 21);

fn repeat(comptime text: [:0]const u8, comptime times: u32) [:0]const u8 {
    comptime {
        var out: [:0]const u8 = "";
        for (0..times) |_| out = out ++ text;
        return out;
    }
}

pub const all = [_]Rule{
    // ---- Memory ----
    .{
        .name = "global-allocator",
        .prevents = "Allocation after startup: only main may name a global allocator.",
        .bad = one(sim, "const a = std.heap.page_allocator;\n"),
        .good = one("src/main.zig", "const a = std.heap.page_allocator;\n"),
    },
    .{
        .name = "core-allocator",
        .prevents = "Allocation on hot paths: in the core only init functions take an Allocator.",
        .bad = one(core, "fn grow(gpa: std.mem.Allocator) void {}\n"),
        .good = one(core, "fn init(gpa: std.mem.Allocator) void {}\n"),
    },
    .{
        .name = "row-pointer",
        .prevents = "References that outlive their target: stored data holds numbers and handles.",
        .bad = one("src/core/a/types.zig", "const Row = struct { name: []const u8 };\n"),
        .good = one("src/core/a/types.zig", "const Row = struct { id: u32 };\n"),
    },
    .{
        .name = "row-usize",
        .prevents = "Stored layouts that differ by target.",
        .bad = one("src/core/a/types.zig", "const Row = struct { len: usize };\n"),
        .good = one("src/core/a/types.zig", "const Row = struct { len: u32 };\n"),
    },
    .{
        .name = "marker-unused",
        .prevents = "A table or step-lived marker left on a struct it no longer describes.",
        .bad = one("src/core/a/state.zig", "/// Owner: a. Lifetime: process. Capacity: one.\n// lint: table\npub const Table = struct { count: u32 };\n"),
        .good = one("src/core/a/state.zig", "/// Owner: a. Lifetime: process. Capacity: one.\n// lint: table\npub const Table = struct { ids: []u32 };\n"),
    },
    .{
        .name = "table-doc",
        .prevents = "A table nobody can change safely: its owner, lifetime, and capacity are not written down.",
        .bad = one("src/core/a/state.zig", "// lint: table\npub const Table = struct { ids: []u32 };\n"),
        .good = one("src/core/a/state.zig", "/// Owner: a. Lifetime: process. Capacity: `Limits.max_a`.\n// lint: table\npub const Table = struct { ids: []u32 };\n"),
    },
    .{
        .name = "step-lived-stored",
        .prevents = "A slice that is valid for one step kept in state that outlives the step.",
        .bad = one("src/core/types.zig", "// lint: step-lived\npub const Input = struct { bytes: []const u8 };\npub const Row = struct { last: Input };\n"),
        .good = one("src/core/types.zig", "// lint: step-lived\npub const Input = struct { bytes: []const u8 };\npub const Row = struct { last_len: u32 };\n"),
    },
    .{
        .name = "undefined",
        .prevents = "Uninitialized reads.",
        .bad = one(sim, "fn f() void {\n    var x: u32 = undefined;\n    use(&x);\n}\n"),
        .good = one(sim, "fn f() void {\n    var x: u32 = 0;\n    use(&x);\n}\n"),
    },
    .{
        .name = "pointer-cast",
        .prevents = "Type confusion and misaligned access outside the arena and the shell.",
        .bad = one(sim, "fn f(p: *u8) *u32 {\n    return @ptrCast(@alignCast(p));\n}\n"),
        .good = one("src/shell/x.zig", "fn f(p: *u8) *u32 {\n    return @ptrCast(@alignCast(p));\n}\n"),
    },
    .{
        .name = "wire-cast",
        .prevents = "A length from input that wraps or traps.",
        .bad = one("src/wire/x.zig", "fn f(n: u64) u32 {\n    return @intCast(n);\n}\n"),
        .good = one("src/wire/x.zig", "fn f(n: u64) u32 {\n    return std.math.cast(u32, n) orelse 0; // 0 is refused by the caller\n}\n"),
    },
    .{
        .name = "local-array",
        .prevents = "Stack overflow from a large local buffer.",
        .bad = one(sim, "fn f() void {\n    var buf: [8192]u8 = @splat(0);\n    use(&buf);\n}\n"),
        .good = one(sim, "fn f() void {\n    var buf: [512]u8 = @splat(0);\n    use(&buf);\n}\n"),
    },
    .{
        .name = "global-var",
        .prevents = "Hidden shared state and data races.",
        .bad = one(sim, "var count: u32 = 0;\n"),
        .good = one(sim, "const count: u32 = 0;\n"),
    },
    // ---- Control flow ----
    .{
        .name = "empty-catch",
        .prevents = "A failure that vanishes.",
        .bad = one(sim, "fn f() void {\n    g() catch {};\n}\n"),
        .good = one(sim, "fn f() error{Full}!void {\n    g() catch |err| return err;\n}\n"),
    },
    .{
        .name = "silent-catch",
        .prevents = "An error dropped with no count, no status, and no reason given.",
        .bad = one(sim, "fn f() void {\n    g() catch return;\n}\n"),
        .good = one(sim, "fn f() void {\n    g() catch return; // g changes nothing when it fails\n}\n"),
    },
    .{
        .name = "anyerror",
        .prevents = "A signature that hides which failures can happen.",
        .bad = one(sim, "fn f() anyerror!void {}\n"),
        .good = one(sim, "fn f() error{Full}!void {}\n"),
    },
    .{
        .name = "inferred-error",
        .prevents = "A public function whose failures change when any callee changes.",
        .bad = one(core, "pub fn f() !void {}\n"),
        .good = one(core, "pub fn f() error{Full}!void {}\n"),
    },
    .{
        .name = "unreachable-comment",
        .prevents = "A crash on a state someone assumed impossible without saying why.",
        .bad = one(sim, "fn f(x: u32) void {\n    if (x > 3) unreachable;\n}\n"),
        .good = one(sim, "fn f(x: u32) void {\n    if (x > 3) unreachable; // the caller masks x to two bits\n}\n"),
    },
    .{
        .name = "optional-unwrap",
        .prevents = "A crash where a status was needed.",
        .bad = one(core, "fn f(x: ?u32) u32 {\n    return x.?;\n}\n"),
        .good = one(core, "fn f(x: ?u32) u32 {\n    return x orelse 0;\n}\n"),
    },
    .{
        .name = "panic",
        .prevents = "Library code that takes the process down.",
        .bad = one(core, "fn f() void {\n    @panic(\"no\");\n}\n"),
        .good = one("src/shell/x.zig", "fn f() void {\n    @panic(\"no\");\n}\n"),
    },
    .{
        .name = "switch-else",
        .prevents = "A new enum value silently handled by an else prong written before it existed.",
        .bad = one(core, "fn f(x: E) u32 {\n    return switch (x) {\n        .a => 1,\n        else => 0,\n    };\n}\n"),
        .good = one(core, "fn f(x: E) u32 {\n    return switch (x) {\n        .a => 1,\n        .b, .c => 0,\n    };\n}\n"),
    },
    .{
        .name = "recursion",
        .prevents = "Unbounded stack use, including through a second file.",
        .bad = &.{
            .{ .path = "src/sim/a.zig", .text = "const b = @import(\"b.zig\");\npub fn ping(n: u32) u32 {\n    return b.pong(n);\n}\n" },
            .{ .path = "src/sim/b.zig", .text = "const a = @import(\"a.zig\");\npub fn pong(n: u32) u32 {\n    return a.ping(n);\n}\n" },
        },
        .good = &.{
            .{ .path = "src/sim/a.zig", .text = "const b = @import(\"b.zig\");\npub fn ping(n: u32) u32 {\n    return b.pong(n);\n}\n" },
            .{ .path = "src/sim/b.zig", .text = "pub fn pong(n: u32) u32 {\n    return n;\n}\n" },
        },
    },
    .{
        .name = "unbounded-loop",
        .prevents = "A loop in the core with no limit.",
        .bad = one(core, "fn f() void {\n    while (true) {}\n}\n"),
        .good = one(core, "fn f() void {\n    for (0..8) |_| {}\n}\n"),
    },
    .{
        .name = "fn-length",
        .prevents = "Functions too long to review or step through.",
        .bad = one(sim, "fn f() void {\n" ++ long_body ++ "}\n"),
        .good = one(sim, "fn f() void {\n    g();\n}\n"),
    },
    .{
        .name = "nesting",
        .prevents = "Code too tangled to follow.",
        .bad = one(sim, "fn f() void {\n    if (a) {\n        if (b) {\n            if (c) {\n                if (d) {\n                    g();\n                }\n            }\n        }\n    }\n}\n"),
        .good = one(sim, "fn f() void {\n    if (!a or !b) return;\n    if (c) {\n        g();\n    }\n}\n"),
    },
    .{
        .name = "fn-assert",
        .prevents = "Invariants left unchecked in long core functions.",
        .bad = one(core, "fn f() void {\n" ++ medium_body ++ "}\n"),
        .good = one(core, "fn f() void {\n    std.debug.assert(ready);\n" ++ medium_body ++ "}\n"),
    },
    .{
        .name = "discard",
        .prevents = "A status silently dropped.",
        .bad = one(sim, "fn f() void {\n    _ = g();\n}\n"),
        .good = one(sim, "fn f() void {\n    _ = g(); // the count is not needed here\n}\n"),
    },
    // ---- Determinism and boundaries ----
    .{
        .name = "core-io",
        .prevents = "Runs that cannot be replayed: the core touches no file, socket, clock, or thread.",
        .bad = one(core, "fn f() void {\n    std.posix.exit(1);\n}\n"),
        .good = one(core, "fn f() void {\n    std.debug.assert(true);\n}\n"),
    },
    .{
        .name = "core-std",
        .prevents = "The same, through an alias or a part of std nobody has judged pure.",
        .bad = one(core, "const s = @import(\"std\");\nconst net = s.posix;\n"),
        .good = one(core, "const s = @import(\"std\");\nconst assert = s.debug.assert;\n"),
    },
    .{
        .name = "sim-real-world",
        .prevents = "A simulation seed that is not one exact run.",
        .bad = one(sim, "const std = @import(\"std\");\nconst Thread = std.Thread;\n"),
        .good = one(sim, "const std = @import(\"std\");\nconst eql = std.mem.eql;\n"),
    },
    .{
        .name = "test-real-world",
        .prevents = "Flaky tests: tests of the pure layers use no real clock, file, socket, or thread.",
        .bad = one("src/core/a/x_test.zig", "const std = @import(\"std\");\ntest \"t\" {\n    try std.testing.expect(std.Thread.getCurrentId() != 0);\n}\n"),
        .good = one("src/core/a/x_test.zig", "const std = @import(\"std\");\ntest \"t\" {\n    try std.testing.expect(std.mem.eql(u8, \"a\", \"a\"));\n}\n"),
    },
    .{
        .name = "shell-syscall",
        .prevents = "A system call the simulator cannot stand in for.",
        .bad = one("src/shell/batched.zig", "const std = @import(\"std\");\nconst linux = std.os.linux;\n"),
        .good = one("src/shell/uring.zig", "const std = @import(\"std\");\nconst linux = std.os.linux;\n"),
    },
    .{
        .name = "core-lock",
        .prevents = "Shared mutable memory in the core.",
        .bad = one(core, "fn f() void {\n    var m: Mutex = .{};\n    m.lock();\n}\n"),
        .good = one(core, "fn f() void {}\n"),
    },
    .{
        .name = "core-print",
        .prevents = "Per-item output and hidden I/O in the core.",
        .bad = one(core, "fn f() void {\n    std.debug.print(\"x\", .{});\n}\n"),
        .good = one(core, "fn f() void {\n    std.debug.assert(true);\n}\n"),
    },
    .{
        .name = "core-callback",
        .prevents = "Control flow hidden in stored functions: subsystems talk through data.",
        .bad = one(core, "const Hooks = struct { on_done: *const fn (u32) void };\n"),
        .good = one(core, "const Hooks = struct { done_count: u32 };\n"),
    },
    .{
        .name = "map-order",
        .prevents = "Output order that varies from run to run.",
        .bad = one(core, "fn total(map: *const std.AutoHashMap(u32, u32)) u32 {\n    var it = map.iterator();\n    return if (it.next()) |e| e.value_ptr.* else 0;\n}\n"),
        .good = one(core, "fn total(map: *const std.AutoArrayHashMap(u32, u32)) u32 {\n    var it = map.iterator();\n    return if (it.next()) |e| e.value_ptr.* else 0;\n}\n"),
    },
    .{
        .name = "float-mode",
        .prevents = "Results that differ across builds.",
        .bad = one(core, "fn f() void {\n    @setFloatMode(.optimized);\n}\n"),
        .good = one(core, "fn f() void {}\n"),
    },
    .{
        .name = "safety-off",
        .prevents = "Safety removed without evidence.",
        .bad = one(sim, "fn f() void {\n    @setRuntimeSafety(false);\n}\n"),
        .good = one(sim, "fn f() void {\n    @setRuntimeSafety(false); // bench: zig build bench-counts, the sum kernel\n}\n"),
    },
    .{
        .name = "kernel-anytype",
        .prevents = "Per-item indirect work in a kernel.",
        .bad = one("src/core/a/kernels.zig", "pub fn sum(xs: anytype) void {}\n"),
        .good = one("src/core/a/kernels.zig", "pub fn sum(xs: []const u32) void {}\n"),
    },
    .{
        .name = "kernel-fn-pointer",
        .prevents = "Per-item indirect calls in a kernel.",
        .bad = one("src/core/a/kernels.zig", "pub fn each(xs: []u32, f: *const fn (u32) u32) void {}\n"),
        .good = one("src/core/a/kernels.zig", "pub fn each(xs: []u32, out: []u32) void {}\n"),
    },
    .{
        .name = "subsystem-order",
        .prevents = "Import cycles between subsystems.",
        .bad = one("src/core/text/root.zig", "const sched = @import(\"../sched/root.zig\");\n"),
        .good = one("src/core/sched/root.zig", "const text = @import(\"../text/root.zig\");\n"),
    },
    .{
        .name = "subsystem-internal",
        .prevents = "One subsystem reaching into another's files.",
        .bad = one("src/core/sched/root.zig", "const cron = @import(\"../text/cron.zig\");\n"),
        .good = one("src/core/sched/root.zig", "const text = @import(\"../text/root.zig\");\n"),
    },
    .{
        .name = "table-owner",
        .prevents = "A table written from several places, so nobody can say what changed a value.",
        .bad = &.{
            .{ .path = "src/core/state.zig", .text = "const text = @import(\"text/root.zig\");\npub const State = struct { conns: text.Table };\n" },
            .{ .path = "src/core/text/root.zig", .text = "pub const Table = struct { op: []u32 };\n" },
            .{ .path = "src/core/sched/root.zig", .text = "fn f(state: anytype, row: u32) void {\n    state.conns.op[row] = 7;\n}\n" },
        },
        .good = &.{
            .{ .path = "src/core/state.zig", .text = "const text = @import(\"text/root.zig\");\npub const State = struct { conns: text.Table };\n" },
            .{ .path = "src/core/text/root.zig", .text = "pub const Table = struct { op: []u32 };\npub fn setOp(state: anytype, row: u32) void {\n    state.conns.op[row] = 7;\n}\n" },
            .{ .path = "src/core/sched/root.zig", .text = "const text = @import(\"../text/root.zig\");\nfn f(state: anytype, row: u32) void {\n    text.setOp(state, row);\n}\n" },
        },
    },
    // ---- Things that are declared and never used ----
    .{
        .name = "dead-limit",
        .prevents = "A limit in the config that nothing enforces.",
        .bad = &.{
            .{ .path = "src/limits/root.zig", .text = "pub const Limits = struct {\n    max_conns: u32,\n    max_dust: u32,\n};\n" },
            .{ .path = core, .text = "fn full(l: anytype, n: u32) bool {\n    return n >= l.max_conns;\n}\n" },
        },
        .good = &.{
            .{ .path = "src/limits/root.zig", .text = "pub const Limits = struct {\n    max_conns: u32,\n    max_dust: u32,\n};\n" },
            .{ .path = core, .text = "fn full(l: anytype, n: u32) bool {\n    return n >= l.max_conns or n >= l.max_dust;\n}\n" },
        },
    },
    .{
        .name = "dead-counter",
        .prevents = "A counter that reads zero forever and hides the event it names.",
        .bad = &.{
            .{ .path = "src/core/types.zig", .text = "pub const Counters = struct {\n    seen: u64 = 0,\n    lost: u64 = 0,\n};\n" },
            .{ .path = core, .text = "fn note(c: anytype) void {\n    c.seen += 1;\n}\n" },
        },
        .good = &.{
            .{ .path = "src/core/types.zig", .text = "pub const Counters = struct {\n    seen: u64 = 0,\n    lost: u64 = 0,\n};\n" },
            .{ .path = core, .text = "fn note(c: anytype) void {\n    c.seen += 1;\n    c.lost += 1;\n}\n" },
        },
    },
    .{
        .name = "pub-unused",
        .prevents = "Dead code and a public surface wider than its users.",
        .bad = &.{
            .{ .path = core, .text = "pub fn helper() void {}\n" },
            .{ .path = "src/core/b.zig", .text = "fn other() void {}\n" },
        },
        .good = &.{
            .{ .path = core, .text = "pub fn helper() void {}\n" },
            .{ .path = "src/core/b.zig", .text = "const a = @import(\"a/root.zig\");\nfn other() void {\n    a.helper();\n}\n" },
        },
    },
    // ---- Tests ----
    .{
        .name = "test-sleep",
        .prevents = "Slow and flaky tests.",
        .bad = one(sim, "test \"t\" {\n    sleep(5);\n    try expect(done);\n}\n"),
        .good = one(sim, "test \"t\" {\n    try expect(done);\n}\n"),
    },
    .{
        .name = "test-no-check",
        .prevents = "A test that passes whatever the code does.",
        .bad = one(sim, "test \"runs\" {\n    run();\n}\n"),
        .good = one(sim, "test \"runs\" {\n    try expect(run() == 1);\n}\n"),
    },
    .{
        .name = "embed-file",
        .prevents = "Test data compiled into the program.",
        .bad = one(sim, "const data = @embedFile(\"x.bin\");\n"),
        .good = one(sim, "test \"t\" {\n    try expect(@embedFile(\"x.bin\").len > 0);\n}\n"),
    },
    // ---- Housekeeping ----
    .{
        .name = "branch-quota",
        .prevents = "Compile time lost to comptime work nobody justified.",
        .bad = one(sim, "comptime {\n    @setEvalBranchQuota(5000);\n}\n"),
        .good = one(sim, "comptime {\n    @setEvalBranchQuota(5000); // the table has 4,000 entries\n}\n"),
    },
    .{
        .name = "todo-issue",
        .prevents = "Forgotten work.",
        .bad = one(sim, "// TODO fix this\nconst x = 1;\n"),
        .good = one(sim, "// TODO(#12) fix this\nconst x = 1;\n"),
    },
    .{
        .name = "line-length",
        .prevents = "Code placed past the part of a line the text rules read.",
        .bad = one(sim, "const x = \"" ++ repeat("long ", 90) ++ "\";\n"),
        .good = one(sim, "const x = \"short\";\n"),
    },
    .{
        .name = "lint-allow",
        .prevents = "An exemption with no reason, or one left behind after its finding is gone.",
        .bad = one(sim, "fn f() void {\n    g(); // lint-allow: empty-catch nothing here to allow\n}\n"),
        .good = one(sim, "fn f() void {\n    g() catch {}; // lint-allow: empty-catch the socket is already gone\n}\n"),
    },
};
