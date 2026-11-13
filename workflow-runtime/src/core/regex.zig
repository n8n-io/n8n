//! Regular expressions (spec section 4.6). One library function,
//! `RegExp.exec(source, flags, input, lastIndex)`, finds the first match at
//! or after `lastIndex` (only at `lastIndex` with the `y` flag) and gives the
//! UTF-16 start and end of the match and of each capture group. Compiled code
//! builds `test`, `exec`, `match`, `replace` and `split` from it.
//!
//! The compiler reads the pattern in one pass, with an explicit stack of open
//! groups, and writes a program for a backtracking matcher. A quantifier
//! takes the code of its atom and writes it again for each iteration. The
//! matcher keeps its choice points and lookahead frames on an explicit stack
//! with a cap, so neither part recurses.
//!
//! The engine is a backtracking matcher with ECMAScript semantics: ordered
//! alternation, greedy and lazy quantifiers, captures that each iteration of
//! a quantifier resets, empty-iteration checks, lookahead, backreferences and
//! the `i` canonicalization of the non-Unicode mode. It supports the subset
//! that `regex-syntax.ts` of the compiler accepts: no lookbehind, no Unicode
//! property escapes, no `u` with `i`, no legacy octal escapes, no quantified
//! assertions.
//!
//! Every match attempt counts its steps. A pattern that backtracks too much
//! ends the execution with the fuel limit, so the result never depends on
//! the speed of the machine.
const std = @import("std");
const Arena = @import("arena.zig").Arena;
const unicase = @import("unicase.zig");

pub const Error = error{ Syntax, TooLarge, StepLimit, ArenaFull };

/// Steps of one `exec` call before the execution ends with the fuel limit.
pub const max_steps: u64 = 10_000_000;
/// Instructions of one compiled pattern.
pub const max_program: usize = 1 << 16;
/// Depth of nested groups.
pub const max_depth: u32 = 64;
/// Entries of the backtracking stack.
pub const max_stack: usize = 1 << 18;

pub const Flags = struct {
    global: bool = false,
    ignore_case: bool = false,
    multiline: bool = false,
    dot_all: bool = false,
    unicode: bool = false,
    sticky: bool = false,

    pub fn parse(text: []const u8) Error!Flags {
        var f: Flags = .{};
        for (text) |c| {
            const slot: *bool = switch (c) {
                'g' => &f.global,
                'i' => &f.ignore_case,
                'm' => &f.multiline,
                's' => &f.dot_all,
                'u' => &f.unicode,
                'y' => &f.sticky,
                else => return error.Syntax,
            };
            if (slot.*) return error.Syntax;
            slot.* = true;
        }
        if (f.unicode and f.ignore_case) return error.Syntax;
        return f;
    }
};

// ---- character sets ------------------------------------------------------

const Range = struct { lo: u21, hi: u21 };

const digit_ranges = [_]Range{.{ .lo = '0', .hi = '9' }};
const word_ranges = [_]Range{
    .{ .lo = '0', .hi = '9' }, .{ .lo = 'A', .hi = 'Z' },
    .{ .lo = '_', .hi = '_' }, .{ .lo = 'a', .hi = 'z' },
};
/// WhiteSpace and LineTerminator of ECMAScript, sorted.
const space_ranges = [_]Range{
    .{ .lo = 0x09, .hi = 0x0D },     .{ .lo = 0x20, .hi = 0x20 },     .{ .lo = 0xA0, .hi = 0xA0 },
    .{ .lo = 0x1680, .hi = 0x1680 }, .{ .lo = 0x2000, .hi = 0x200A }, .{ .lo = 0x2028, .hi = 0x2029 },
    .{ .lo = 0x202F, .hi = 0x202F }, .{ .lo = 0x205F, .hi = 0x205F }, .{ .lo = 0x3000, .hi = 0x3000 },
    .{ .lo = 0xFEFF, .hi = 0xFEFF },
};

fn inRanges(rs: []const Range, c: u21) bool {
    for (rs) |r| if (c >= r.lo and c <= r.hi) return true;
    return false;
}

fn isWord(c: u21) bool {
    return inRanges(&word_ranges, c);
}

fn isLineTerminator(c: u21) bool {
    return c == 0x0A or c == 0x0D or c == 0x2028 or c == 0x2029;
}

// ---- program -------------------------------------------------------------

const Op = enum(u8) {
    char,
    any,
    class,
    split,
    jmp,
    save,
    bol,
    eol,
    word_boundary,
    not_word_boundary,
    backref,
    look,
    look_end,
    reset,
    mark,
    check,
    match,
};

const Inst = struct {
    op: Op,
    a: u32 = 0,
    b: u32 = 0,
};

/// A jump target that a later instruction patches.
const none: u32 = std.math.maxInt(u32);

/// The operands of `inst` that are program counters.
fn isJump(op: Op) bool {
    return op == .split or op == .jmp or op == .look;
}

/// A class: ranges `[lo, hi)` in the range pool, negated or not.
const Class = struct { lo: u32, hi: u32, negated: bool };

const Set = struct { ranges: []const Range, negated: bool };

fn setOf(c: u21) ?Set {
    return switch (c) {
        'd' => .{ .ranges = &digit_ranges, .negated = false },
        'D' => .{ .ranges = &digit_ranges, .negated = true },
        'w' => .{ .ranges = &word_ranges, .negated = false },
        'W' => .{ .ranges = &word_ranges, .negated = true },
        's' => .{ .ranges = &space_ranges, .negated = false },
        'S' => .{ .ranges = &space_ranges, .negated = true },
        else => null,
    };
}

fn isSyntaxChar(c: u21) bool {
    return switch (c) {
        '^', '$', '\\', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|', '/' => true,
        else => false,
    };
}

fn hexDigit(c: u21) ?u32 {
    return switch (c) {
        '0'...'9' => c - '0',
        'a'...'f' => c - 'a' + 10,
        'A'...'F' => c - 'A' + 10,
        else => null,
    };
}

/// A decimal number at `i.*`, which moves past it. Values above 100000 clamp.
fn number(src: []const u21, i: *usize) ?u32 {
    const start = i.*;
    var v: u32 = 0;
    while (i.* < src.len and src[i.*] >= '0' and src[i.*] <= '9') : (i.* += 1) {
        v = @min(v * 10 + (src[i.*] - '0'), 100_000);
    }
    return if (i.* == start) null else v;
}

const Name = struct { text: []const u21, group: u32 };

/// Counts the capture groups and finds their names, skipping escapes and
/// classes, so backreferences can name later groups.
fn scanGroups(src: []const u21, names: []Name) struct { count: u32, named: u32 } {
    var count: u32 = 0;
    var named: u32 = 0;
    var in_class = false;
    var i: usize = 0;
    while (i < src.len) : (i += 1) {
        const c = src[i];
        if (c == '\\') {
            i += 1;
            continue;
        }
        if (in_class) {
            if (c == ']') in_class = false;
            continue;
        }
        if (c == '[') {
            in_class = true;
        } else if (c == '(') {
            if (i + 1 >= src.len or src[i + 1] != '?') {
                count += 1;
            } else if (i + 2 < src.len and src[i + 2] == '<' and i + 3 < src.len and src[i + 3] != '=' and src[i + 3] != '!') {
                count += 1;
                var e = i + 3;
                while (e < src.len and src[e] != '>') e += 1;
                if (named < names.len) {
                    names[named] = .{ .text = src[i + 3 .. e], .group = count };
                    named += 1;
                }
            }
        }
    }
    return .{ .count = count, .named = named };
}

// ---- compiler ------------------------------------------------------------

const FrameKind = enum(u8) { root, capture, group, look };

/// An open group of the pattern.
const Open = struct {
    kind: FrameKind,
    /// First instruction of the group (its `save` or `look`).
    start: u32,
    /// First instruction of the current alternative.
    alt_start: u32,
    /// Start of the group's pending jumps in `pend`.
    pend_base: u32,
    /// The capture index of a capture group.
    group: u32 = 0,
    /// Capture groups before the group opened.
    groups_before: u32,
};

const Compiler = struct {
    src: []const u21,
    pos: usize = 0,
    flags: Flags,
    prog: []Inst,
    n: u32 = 0,
    /// The code of an atom while a quantifier or an alternation writes it again.
    tmp: []Inst,
    pend: []u32,
    n_pend: u32 = 0,
    opens: [max_depth]Open = undefined,
    n_opens: u32 = 0,
    ranges: []Range,
    n_ranges: u32 = 0,
    classes: []Class,
    n_classes: u32 = 0,
    groups: u32 = 0,
    total_groups: u32,
    names: []const Name,
    next_slot: u32,

    fn peek(c: *const Compiler, k: usize) ?u21 {
        return if (c.pos + k < c.src.len) c.src[c.pos + k] else null;
    }

    fn eat(c: *Compiler, ch: u21) bool {
        if (c.peek(0) == ch) {
            c.pos += 1;
            return true;
        }
        return false;
    }

    fn emit(c: *Compiler, inst: Inst) Error!u32 {
        if (c.n >= c.prog.len) return error.TooLarge;
        c.prog[c.n] = inst;
        c.n += 1;
        return c.n - 1;
    }

    fn pushPend(c: *Compiler, at: u32) Error!void {
        if (c.n_pend >= c.pend.len) return error.TooLarge;
        c.pend[c.n_pend] = at;
        c.n_pend += 1;
    }

    /// Moves the code `[start, n)` to `tmp` and truncates the program to `start`.
    fn takeBlock(c: *Compiler, start: u32) u32 {
        std.debug.assert(start <= c.n);
        const len = c.n - start;
        @memcpy(c.tmp[0..len], c.prog[start..c.n]);
        c.n = start;
        return len;
    }

    /// Writes the code in `tmp` (taken from `old_start`) at the end of the
    /// program. Jumps inside the block move with it.
    fn putBlock(c: *Compiler, old_start: u32, len: u32) Error!void {
        if (c.n + len > c.prog.len) return error.TooLarge;
        const base = c.n;
        for (c.tmp[0..len]) |inst_in| {
            var inst = inst_in;
            if (isJump(inst.op)) {
                // Targets inside the block, or at its end, move with it.
                if (inst.a != none and inst.a >= old_start and inst.a <= old_start + len) inst.a = inst.a - old_start + base;
                if (inst.op == .split and inst.b >= old_start and inst.b <= old_start + len) inst.b = inst.b - old_start + base;
            }
            c.prog[c.n] = inst;
            c.n += 1;
        }
    }

    fn setSplit(c: *Compiler, at: u32, body: u32, exit: u32, greedy: bool) void {
        std.debug.assert(c.prog[at].op == .split);
        c.prog[at].a = if (greedy) body else exit;
        c.prog[at].b = if (greedy) exit else body;
    }

    fn top(c: *Compiler) *Open {
        std.debug.assert(c.n_opens > 0);
        return &c.opens[c.n_opens - 1];
    }

    fn open(c: *Compiler, kind: FrameKind, negative: bool) Error!void {
        if (c.n_opens >= max_depth) return error.TooLarge;
        const before = c.groups;
        const start = c.n;
        var group: u32 = 0;
        switch (kind) {
            .capture => {
                c.groups += 1;
                group = c.groups;
                _ = try c.emit(.{ .op = .save, .a = 2 * group });
            },
            .look => _ = try c.emit(.{ .op = .look, .a = none, .b = @intFromBool(negative) }),
            .root, .group => {},
        }
        c.opens[c.n_opens] = .{ .kind = kind, .start = start, .alt_start = c.n, .pend_base = c.n_pend, .group = group, .groups_before = before };
        c.n_opens += 1;
    }

    /// `|`: the current alternative gets a split before it and a jump to the
    /// end of the group after it.
    fn alternative(c: *Compiler) Error!void {
        const o = c.top();
        const start = o.alt_start;
        const len = c.takeBlock(start);
        const sp = try c.emit(.{ .op = .split, .a = start + 1, .b = none });
        try c.putBlock(start, len);
        try c.pushPend(try c.emit(.{ .op = .jmp, .a = none }));
        c.prog[sp].b = c.n;
        o.alt_start = c.n;
    }

    /// Ends the alternatives of the top group: the pending jumps go to the end.
    fn closeAlternatives(c: *Compiler) void {
        const o = c.top();
        for (c.pend[o.pend_base..c.n_pend]) |at| c.prog[at].a = c.n;
        c.n_pend = o.pend_base;
    }

    const Atom = struct { start: u32, g_lo: u32, g_hi: u32 };

    /// `)`: returns the group as an atom, or null for a lookahead.
    fn close(c: *Compiler) Error!?Atom {
        if (c.n_opens <= 1) return error.Syntax;
        c.closeAlternatives();
        const o = c.opens[c.n_opens - 1];
        c.n_opens -= 1;
        switch (o.kind) {
            .capture => _ = try c.emit(.{ .op = .save, .a = 2 * o.group + 1 }),
            .look => {
                _ = try c.emit(.{ .op = .look_end });
                c.prog[o.start].a = c.n;
                return null;
            },
            .group => {},
            .root => unreachable,
        }
        return .{ .start = o.start, .g_lo = o.groups_before + 1, .g_hi = c.groups + 1 };
    }

    const Brace = struct { len: usize, min: u32, max: u32 };

    /// A `{n}`, `{n,}` or `{n,m}` quantifier at the position.
    fn braceQuantifier(c: *const Compiler) ?Brace {
        var i = c.pos + 1;
        const min = number(c.src, &i) orelse return null;
        var max = min;
        if (i < c.src.len and c.src[i] == ',') {
            i += 1;
            max = number(c.src, &i) orelse none;
        }
        if (i >= c.src.len or c.src[i] != '}') return null;
        return .{ .len = i + 1 - c.pos, .min = min, .max = max };
    }

    fn isQuantifierHere(c: *const Compiler) bool {
        const ch = c.peek(0) orelse return false;
        return ch == '*' or ch == '+' or ch == '?' or (ch == '{' and c.braceQuantifier() != null);
    }

    /// Applies a quantifier after `atom`, if there is one.
    fn quantifier(c: *Compiler, atom: Atom) Error!void {
        const ch = c.peek(0) orelse return;
        var min: u32 = 0;
        var max: u32 = none;
        switch (ch) {
            '*' => c.pos += 1,
            '+' => {
                min = 1;
                c.pos += 1;
            },
            '?' => {
                max = 1;
                c.pos += 1;
            },
            '{' => {
                const b = c.braceQuantifier() orelse return;
                if (b.min > 1000 or (b.max != none and b.max > 1000)) return error.TooLarge;
                if (b.max < b.min) return error.Syntax;
                min = b.min;
                max = b.max;
                c.pos += b.len;
            },
            else => return,
        }
        const greedy = !c.eat('?');
        try c.repeat(atom, min, max, greedy);
    }

    /// One iteration of the atom in `tmp`: its captures start unset, and an
    /// optional iteration fails when it matches the empty string.
    fn iteration(c: *Compiler, atom: Atom, old_start: u32, len: u32, slot: ?u32) Error!void {
        if (slot) |s| _ = try c.emit(.{ .op = .mark, .a = s });
        if (atom.g_hi > atom.g_lo) _ = try c.emit(.{ .op = .reset, .a = 2 * atom.g_lo, .b = 2 * atom.g_hi });
        try c.putBlock(old_start, len);
        if (slot) |s| _ = try c.emit(.{ .op = .check, .a = s });
    }

    fn repeat(c: *Compiler, atom: Atom, min: u32, max: u32, greedy: bool) Error!void {
        const old = atom.start;
        const len = c.takeBlock(old);
        var k: u32 = 0;
        while (k < min) : (k += 1) try c.iteration(atom, old, len, null);
        if (max == min) return;
        const slot = c.next_slot;
        c.next_slot += 1;
        if (max == none) {
            const loop = try c.emit(.{ .op = .split });
            const body = c.n;
            try c.iteration(atom, old, len, slot);
            _ = try c.emit(.{ .op = .jmp, .a = loop });
            c.setSplit(loop, body, c.n, greedy);
            return;
        }
        // Optional copies, each inside the one before: x(x(x)?)?
        const first = c.n_pend;
        while (k < max) : (k += 1) {
            try c.pushPend(try c.emit(.{ .op = .split }));
            try c.iteration(atom, old, len, slot);
        }
        for (c.pend[first..c.n_pend]) |sp| c.setSplit(sp, sp + 1, c.n, greedy);
        c.n_pend = first;
    }

    fn compileAll(c: *Compiler) Error!void {
        try c.open(.root, false);
        while (c.pos < c.src.len) {
            const ch = c.src[c.pos];
            switch (ch) {
                '|' => {
                    c.pos += 1;
                    try c.alternative();
                },
                '(' => {
                    c.pos += 1;
                    if (c.peek(0) == '?') {
                        const k = c.peek(1);
                        if (k == ':') {
                            c.pos += 2;
                            try c.open(.group, false);
                        } else if (k == '=' or k == '!') {
                            c.pos += 2;
                            try c.open(.look, k == '!');
                        } else if (k == '<' and c.peek(2) != '=' and c.peek(2) != '!') {
                            // A named group: the pre-scan has its name.
                            c.pos += 2;
                            while (c.peek(0)) |d| {
                                c.pos += 1;
                                if (d == '>') break;
                            }
                            try c.open(.capture, false);
                        } else return error.Syntax;
                    } else try c.open(.capture, false);
                },
                ')' => {
                    c.pos += 1;
                    if (try c.close()) |atom| {
                        try c.quantifier(atom);
                    } else if (c.isQuantifierHere()) return error.Syntax;
                },
                '^', '$' => {
                    c.pos += 1;
                    _ = try c.emit(.{ .op = if (ch == '^') .bol else .eol });
                    if (c.isQuantifierHere()) return error.Syntax;
                },
                '*', '+', '?' => return error.Syntax,
                else => {
                    if (ch == '\\' and (c.peek(1) == 'b' or c.peek(1) == 'B')) {
                        c.pos += 2;
                        _ = try c.emit(.{ .op = if (c.src[c.pos - 1] == 'b') .word_boundary else .not_word_boundary });
                        if (c.isQuantifierHere()) return error.Syntax;
                        continue;
                    }
                    if (ch == '{' and c.braceQuantifier() != null) return error.Syntax;
                    const atom: Atom = .{ .start = c.n, .g_lo = 0, .g_hi = 0 };
                    try c.plainAtom();
                    try c.quantifier(atom);
                },
            }
        }
        if (c.n_opens != 1) return error.Syntax;
        c.closeAlternatives();
    }

    /// One atom that is not a group: a character, `.`, a class or an escape.
    fn plainAtom(c: *Compiler) Error!void {
        const ch = c.src[c.pos];
        switch (ch) {
            '.' => {
                c.pos += 1;
                _ = try c.emit(.{ .op = .any });
            },
            '[' => try c.class(),
            '\\' => {
                c.pos += 1;
                try c.atomEscape();
            },
            else => {
                c.pos += 1;
                try c.char(ch);
            },
        }
    }

    fn char(c: *Compiler, ch: u21) Error!void {
        _ = try c.emit(.{ .op = .char, .a = if (c.flags.ignore_case and ch <= 0xFFFF) unicase.canonicalize(@intCast(ch)) else ch });
    }

    fn atomEscape(c: *Compiler) Error!void {
        const ch = c.peek(0) orelse return error.Syntax;
        if (ch >= '1' and ch <= '9') {
            var i = c.pos;
            const n = number(c.src, &i) orelse return error.Syntax;
            if (n > c.total_groups) return error.Syntax;
            c.pos = i;
            _ = try c.emit(.{ .op = .backref, .a = n });
            return;
        }
        if (ch == 'k' and (c.flags.unicode or c.names.len > 0)) {
            if (c.peek(1) != '<') return error.Syntax;
            const start = c.pos + 2;
            var i = start;
            while (i < c.src.len and c.src[i] != '>') i += 1;
            if (i >= c.src.len) return error.Syntax;
            for (c.names) |nm| {
                if (std.mem.eql(u21, nm.text, c.src[start..i])) {
                    c.pos = i + 1;
                    _ = try c.emit(.{ .op = .backref, .a = nm.group });
                    return;
                }
            }
            return error.Syntax;
        }
        if (setOf(ch) != null) {
            const start = c.n_ranges;
            try c.addSet(ch);
            c.pos += 1;
            return c.addClass(start, false);
        }
        try c.char(try c.characterEscape(false));
    }

    fn addClass(c: *Compiler, start: u32, negated: bool) Error!void {
        if (c.n_classes >= c.classes.len) return error.TooLarge;
        c.classes[c.n_classes] = .{ .lo = start, .hi = c.n_ranges, .negated = negated };
        c.n_classes += 1;
        _ = try c.emit(.{ .op = .class, .a = c.n_classes - 1 });
    }

    fn addRange(c: *Compiler, lo: u21, hi: u21) Error!void {
        if (c.n_ranges >= c.ranges.len) return error.TooLarge;
        c.ranges[c.n_ranges] = .{ .lo = lo, .hi = hi };
        c.n_ranges += 1;
    }

    /// Adds the ranges of `\d \w \s`, or of their complement for `\D \W \S`.
    fn addSet(c: *Compiler, ch: u21) Error!void {
        const set = setOf(ch).?;
        if (!set.negated) {
            for (set.ranges) |r| try c.addRange(r.lo, r.hi);
            return;
        }
        var next: u21 = 0;
        for (set.ranges) |r| {
            if (r.lo > next) try c.addRange(next, r.lo - 1);
            next = r.hi + 1;
        }
        try c.addRange(next, 0x10FFFF);
    }

    fn class(c: *Compiler) Error!void {
        c.pos += 1;
        const negated = c.eat('^');
        const start = c.n_ranges;
        // Each pass reads at least one character, so the pattern length bounds the loop.
        while (true) {
            const ch = c.peek(0) orelse return error.Syntax;
            if (ch == ']') break;
            const a = try c.classAtom();
            if (c.peek(0) == '-' and c.peek(1) != null and c.peek(1) != ']') {
                c.pos += 1;
                const b = try c.classAtom();
                if (a == null or b == null) return error.Syntax;
                if (a.? > b.?) return error.Syntax;
                try c.addRange(a.?, b.?);
            } else if (a) |x| {
                try c.addRange(x, x);
            }
        }
        c.pos += 1;
        try c.addClass(start, negated);
    }

    /// One class atom. Null for a class escape, whose ranges are added.
    fn classAtom(c: *Compiler) Error!?u21 {
        const ch = c.peek(0).?;
        if (ch != '\\') {
            c.pos += 1;
            return ch;
        }
        c.pos += 1;
        const e = c.peek(0) orelse return error.Syntax;
        if (setOf(e) != null) {
            try c.addSet(e);
            c.pos += 1;
            return null;
        }
        if (e >= '1' and e <= '9') return error.Syntax;
        return try c.characterEscape(true);
    }

    /// The character of an escape after `\`.
    fn characterEscape(c: *Compiler, in_class: bool) Error!u21 {
        const ch = c.peek(0) orelse return error.Syntax;
        c.pos += 1;
        switch (ch) {
            'f' => return 0x0C,
            'n' => return 0x0A,
            'r' => return 0x0D,
            't' => return 0x09,
            'v' => return 0x0B,
            'b' => if (in_class) return 0x08 else return error.Syntax,
            '-' => if (in_class or !c.flags.unicode) return '-' else return error.Syntax,
            'c' => {
                const l = c.peek(0) orelse return error.Syntax;
                if (!((l >= 'a' and l <= 'z') or (l >= 'A' and l <= 'Z'))) return error.Syntax;
                c.pos += 1;
                return l % 32;
            },
            '0' => {
                if (c.peek(0)) |d| if (d >= '0' and d <= '9') return error.Syntax;
                return 0;
            },
            'x' => {
                if (c.hex(c.pos, 2)) |v| {
                    c.pos += 2;
                    return @intCast(v);
                }
                if (c.flags.unicode) return error.Syntax;
                return 'x';
            },
            'u' => return c.unicodeEscape(),
            else => {
                if (ch >= '1' and ch <= '9') return error.Syntax;
                if (c.flags.unicode and !isSyntaxChar(ch)) return error.Syntax;
                return ch;
            },
        }
    }

    fn unicodeEscape(c: *Compiler) Error!u21 {
        if (c.hex(c.pos, 4)) |v| {
            c.pos += 4;
            // In the Unicode mode, an escaped surrogate pair is one code point.
            if (c.flags.unicode and v >= 0xD800 and v <= 0xDBFF and c.peek(0) == '\\' and c.peek(1) == 'u') {
                if (c.hex(c.pos + 2, 4)) |w| {
                    if (w >= 0xDC00 and w <= 0xDFFF) {
                        c.pos += 6;
                        return @intCast(0x10000 + ((v - 0xD800) << 10) + (w - 0xDC00));
                    }
                }
            }
            return @intCast(v);
        }
        if (!c.flags.unicode) return 'u';
        if (c.peek(0) != '{') return error.Syntax;
        var i = c.pos + 1;
        var v: u32 = 0;
        while (i < c.src.len and c.src[i] != '}') : (i += 1) {
            const d = hexDigit(c.src[i]) orelse return error.Syntax;
            v = v * 16 + d;
            if (v > 0x10FFFF) return error.Syntax;
        }
        if (i >= c.src.len or i == c.pos + 1) return error.Syntax;
        c.pos = i + 1;
        return @intCast(v);
    }

    fn hex(c: *const Compiler, at: usize, n: usize) ?u32 {
        if (at + n > c.src.len) return null;
        var v: u32 = 0;
        for (c.src[at..][0..n]) |d| v = v * 16 + (hexDigit(d) orelse return null);
        return v;
    }
};

// ---- matcher -------------------------------------------------------------

const FrameTag = enum(u8) { choice, look };

/// A choice point, or the start of a lookahead (`look` holds the program
/// counter of its `look` instruction).
const Frame = struct { pc: u32, pos: u32, trail: u32, tag: FrameTag };
const Undo = struct { reg: u32, old: i32 };

const Matcher = struct {
    prog: []const Inst,
    classes: []const Class,
    ranges: []const Range,
    input: []const u16,
    flags: Flags,
    regs: []i32,
    stack: []Frame,
    n_stack: usize = 0,
    trail: []Undo,
    n_trail: usize = 0,
    steps: u64 = 0,

    fn set(m: *Matcher, reg: u32, v: i32) Error!void {
        if (m.n_trail >= m.trail.len) return error.StepLimit;
        m.trail[m.n_trail] = .{ .reg = reg, .old = m.regs[reg] };
        m.n_trail += 1;
        m.regs[reg] = v;
    }

    fn unwind(m: *Matcher, to: usize) void {
        std.debug.assert(to <= m.n_trail);
        while (m.n_trail > to) {
            m.n_trail -= 1;
            const u = m.trail[m.n_trail];
            m.regs[u.reg] = u.old;
        }
    }

    fn push(m: *Matcher, f: Frame) Error!void {
        if (m.n_stack >= m.stack.len) return error.StepLimit;
        m.stack[m.n_stack] = f;
        m.n_stack += 1;
    }

    /// The topmost lookahead frame. The program nests lookaheads, so it is
    /// the one that a `look_end` ends.
    fn topLook(m: *Matcher) Error!usize {
        var i = m.n_stack;
        while (i > 0) {
            i -= 1;
            m.steps += 1;
            if (m.stack[i].tag == .look) return i;
        }
        unreachable; // A `look_end` runs only inside its lookahead.
    }

    /// The character at `pos` and its length in units.
    fn charAt(m: *const Matcher, pos: u32) struct { c: u21, len: u32 } {
        std.debug.assert(pos < m.input.len);
        const u = m.input[pos];
        if (m.flags.unicode and isHigh(u) and pos + 1 < m.input.len and isLow(m.input[pos + 1])) {
            return .{ .c = @intCast(0x10000 + ((@as(u32, u) - 0xD800) << 10) + (m.input[pos + 1] - 0xDC00)), .len = 2 };
        }
        return .{ .c = u, .len = 1 };
    }

    fn classMatches(m: *const Matcher, cls: Class, c: u21) bool {
        const rs = m.ranges[cls.lo..cls.hi];
        var hit = inRanges(rs, c);
        if (!hit and m.flags.ignore_case and c <= 0xFFFF) {
            // Any member whose canonical form is the canonical form of c.
            var buf: [unicase.max_inverse]u16 = undefined;
            for (unicase.canonicalizeInverse(unicase.canonicalize(@intCast(c)), &buf)) |x| {
                if (inRanges(rs, x)) {
                    hit = true;
                    break;
                }
            }
        }
        return hit != cls.negated;
    }

    fn sameChar(m: *const Matcher, a: u16, b: u16) bool {
        if (a == b) return true;
        return m.flags.ignore_case and unicase.canonicalize(a) == unicase.canonicalize(b);
    }

    fn isWordAt(m: *const Matcher, pos: i64) bool {
        if (pos < 0 or pos >= m.input.len) return false;
        return isWord(m.input[@intCast(pos)]);
    }

    /// One instruction at `pc.*` and `pos.*`. False means: backtrack.
    fn step(m: *Matcher, pc: *u32, pos: *u32) Error!bool {
        const inst = m.prog[pc.*];
        switch (inst.op) {
            .char, .any, .class => {
                if (pos.* >= m.input.len) return false;
                const ch = m.charAt(pos.*);
                const ok = switch (inst.op) {
                    .char => (if (m.flags.ignore_case) unicase.canonicalize(@intCast(ch.c)) else ch.c) == inst.a,
                    .any => m.flags.dot_all or !isLineTerminator(ch.c),
                    else => m.classMatches(m.classes[inst.a], ch.c),
                };
                if (!ok) return false;
                pos.* += ch.len;
            },
            .split => {
                try m.push(.{ .pc = inst.b, .pos = pos.*, .trail = @intCast(m.n_trail), .tag = .choice });
                pc.* = inst.a;
                return true;
            },
            .jmp => {
                pc.* = inst.a;
                return true;
            },
            .save, .mark => try m.set(inst.a, @intCast(pos.*)),
            .check => if (m.regs[inst.a] == @as(i32, @intCast(pos.*))) return false,
            .reset => {
                var r = inst.a;
                while (r < inst.b) : (r += 1) {
                    if (m.regs[r] != -1) try m.set(r, -1);
                }
            },
            .bol => if (!(pos.* == 0 or (m.flags.multiline and isLineTerminator(m.input[pos.* - 1])))) return false,
            .eol => if (!(pos.* == m.input.len or (m.flags.multiline and isLineTerminator(m.input[pos.*])))) return false,
            .word_boundary, .not_word_boundary => {
                const at = m.isWordAt(@as(i64, pos.*) - 1) != m.isWordAt(pos.*);
                if (at != (inst.op == .word_boundary)) return false;
            },
            .backref => {
                const s = m.regs[2 * inst.a];
                const e = m.regs[2 * inst.a + 1];
                if (s >= 0 and e >= 0) {
                    const len: u32 = @intCast(e - s);
                    if (pos.* + len > m.input.len) return false;
                    var k: u32 = 0;
                    while (k < len) : (k += 1) {
                        if (!m.sameChar(m.input[@as(u32, @intCast(s)) + k], m.input[pos.* + k])) return false;
                    }
                    pos.* += len;
                }
            },
            .look => try m.push(.{ .pc = pc.*, .pos = pos.*, .trail = @intCast(m.n_trail), .tag = .look }),
            .look_end => {
                // The body matched: drop its choice points and go on after it.
                const i = try m.topLook();
                const f = m.stack[i];
                m.n_stack = i;
                const look = m.prog[f.pc];
                pos.* = f.pos;
                if (look.b == 1) {
                    m.unwind(f.trail);
                    return false;
                }
                pc.* = look.a;
                return true;
            },
            .match => unreachable,
        }
        pc.* += 1;
        return true;
    }

    /// Runs the program at `start`. True on a match.
    fn run(m: *Matcher, start: u32) Error!bool {
        m.n_stack = 0;
        m.n_trail = 0;
        var pc: u32 = 0;
        var pos = start;
        // Each pass costs a step, and `max_steps` bounds the steps.
        while (true) {
            m.steps += 1;
            if (m.steps > max_steps) return error.StepLimit;
            if (m.prog[pc].op == .match) return true;
            if (try m.step(&pc, &pos)) continue;
            // Backtrack to the last choice point. A lookahead frame that is
            // reached this way had a body that did not match.
            while (true) {
                m.steps += 1;
                if (m.n_stack == 0) return false;
                m.n_stack -= 1;
                const f = m.stack[m.n_stack];
                m.unwind(f.trail);
                pos = f.pos;
                if (f.tag == .choice) {
                    pc = f.pc;
                    break;
                }
                const look = m.prog[f.pc];
                if (look.b == 1) {
                    // A negative lookahead whose body failed succeeds.
                    pc = look.a;
                    break;
                }
            }
        }
    }
};

// ---- entry point ---------------------------------------------------------

/// A compiled pattern.
pub const Regex = struct {
    prog: []const Inst,
    classes: []const Class,
    ranges: []const Range,
    flags: Flags,
    groups: u32,
    slots: u32,
};

/// Compiles `source` (UTF-8 or WTF-8). The memory comes from `arena`.
pub fn compile(arena: *Arena, source: []const u8, flags_text: []const u8) Error!Regex {
    const flags = try Flags.parse(flags_text);
    const src = try decodePattern(arena, source, flags.unicode);
    const names = try arena.push(Name, 64);
    const scan = scanGroups(src, names);
    var c: Compiler = .{
        .src = src,
        .flags = flags,
        .prog = try arena.push(Inst, max_program),
        .tmp = try arena.push(Inst, max_program),
        .pend = try arena.push(u32, max_program),
        .ranges = try arena.push(Range, src.len * 8 + 64),
        .classes = try arena.push(Class, src.len + 4),
        .total_groups = scan.count,
        .names = names[0..scan.named],
        .next_slot = 2 * (scan.count + 1),
    };
    _ = try c.emit(.{ .op = .save, .a = 0 });
    try c.compileAll();
    _ = try c.emit(.{ .op = .save, .a = 1 });
    _ = try c.emit(.{ .op = .match });
    std.debug.assert(c.groups == scan.count);
    return .{
        .prog = c.prog[0..c.n],
        .classes = c.classes[0..c.n_classes],
        .ranges = c.ranges[0..c.n_ranges],
        .flags = flags,
        .groups = c.groups,
        .slots = c.next_slot,
    };
}

/// Finds the first match at or after `last_index` (only at it when sticky).
/// Returns null when there is none. `steps` of the attempt are in `steps.*`.
pub fn exec(arena: *Arena, re: Regex, input: []const u16, last_index: u32, steps: *u64) Error!?[]const i32 {
    std.debug.assert(re.prog.len > 0 and re.prog[re.prog.len - 1].op == .match);
    const regs = try arena.push(i32, re.slots);
    const cap = @min(max_stack, re.prog.len * 8 + input.len * 4 + 1024);
    var m: Matcher = .{
        .prog = re.prog,
        .classes = re.classes,
        .ranges = re.ranges,
        .input = input,
        .flags = re.flags,
        .regs = regs,
        .stack = try arena.push(Frame, cap),
        .trail = try arena.push(Undo, cap),
    };
    defer steps.* = m.steps;
    var start = last_index;
    // V8 starts at the high surrogate when `lastIndex` points into a pair (Unicode mode).
    if (re.flags.unicode and start > 0 and start < input.len and isLow(input[start]) and isHigh(input[start - 1])) start -= 1;
    // At most input.len + 1 starts.
    while (start <= input.len) {
        @memset(regs, -1);
        if (try m.run(start)) return regs[0 .. 2 * (re.groups + 1)];
        if (re.flags.sticky) return null;
        start += if (re.flags.unicode and start < input.len) m.charAt(start).len else 1;
    }
    return null;
}

fn isHigh(u: u16) bool {
    return u >= 0xD800 and u <= 0xDBFF;
}

fn isLow(u: u16) bool {
    return u >= 0xDC00 and u <= 0xDFFF;
}

/// Decodes a pattern to UTF-16 units (non-Unicode mode) or code points.
fn decodePattern(arena: *Arena, source: []const u8, unicode: bool) Error![]u21 {
    const out = try arena.push(u21, source.len * 2 + 1);
    var n: usize = 0;
    var i: usize = 0;
    while (i < source.len) {
        const cp = decodeWtf8(source, &i);
        if (cp >= 0x10000 and !unicode) {
            out[n] = @intCast(0xD800 + ((cp - 0x10000) >> 10));
            out[n + 1] = @intCast(0xDC00 + ((cp - 0x10000) & 0x3FF));
            n += 2;
        } else {
            out[n] = cp;
            n += 1;
        }
    }
    return out[0..n];
}

/// One code point of WTF-8 (UTF-8 that may hold encoded lone surrogates).
pub fn decodeWtf8(s: []const u8, i: *usize) u21 {
    const b0 = s[i.*];
    const n: usize = if (b0 < 0x80) 1 else if (b0 >= 0xF0 and b0 < 0xF8) 4 else if (b0 >= 0xE0) 3 else if (b0 >= 0xC0) 2 else 1;
    if (i.* + n > s.len or n == 1) {
        i.* += 1;
        return b0;
    }
    var cp: u21 = switch (n) {
        2 => b0 & 0x1F,
        3 => b0 & 0x0F,
        else => b0 & 0x07,
    };
    for (s[i.* + 1 ..][0 .. n - 1]) |b| cp = (cp << 6) | (b & 0x3F);
    i.* += n;
    return cp;
}

/// The UTF-16 units of a WTF-8 string.
pub fn toUtf16(arena: *Arena, s: []const u8) Arena.Error![]u16 {
    const out = try arena.push(u16, s.len);
    var n: usize = 0;
    var i: usize = 0;
    while (i < s.len) {
        const cp = decodeWtf8(s, &i);
        if (cp >= 0x10000) {
            out[n] = @intCast(0xD800 + ((cp - 0x10000) >> 10));
            out[n + 1] = @intCast(0xDC00 + ((cp - 0x10000) & 0x3FF));
            n += 2;
        } else {
            out[n] = @intCast(cp);
            n += 1;
        }
    }
    return out[0..n];
}

// ---- tests ---------------------------------------------------------------

const Case = struct {
    source: []const u8,
    flags: []const u8,
    /// UTF-16 units: JSON cannot hold lone surrogates as text.
    input: []const u16,
    lastIndex: u32 = 0,
    /// Capture positions, or null for no match. -1 for an unset group.
    expected: ?[]const i32,
};

test "matches as V8 does" {
    const text = @embedFile("testdata/regex_cases.json");
    const parsed = try std.json.parseFromSlice([]const Case, std.testing.allocator, text, .{});
    defer parsed.deinit();
    const buf = try std.testing.allocator.alloc(u8, 16 << 20);
    defer std.testing.allocator.free(buf);
    var arena = Arena.init(buf);
    for (parsed.value) |case| {
        const t = arena.begin();
        defer t.end();
        const re = try compile(&arena, case.source, case.flags);
        var steps: u64 = 0;
        const got = try exec(&arena, re, case.input, case.lastIndex, &steps);
        const same = if (case.expected) |want| got != null and std.mem.eql(i32, got.?, want) else got == null;
        if (!same) {
            std.debug.print("pattern /{s}/{s} on {any} from {d}: got {any}, want {any}\n", .{ case.source, case.flags, case.input, case.lastIndex, got, case.expected });
            return error.TestUnexpectedResult;
        }
    }
}

test "rejects what the subset does not have" {
    var buf: [1 << 16]u8 = undefined;
    var arena = Arena.init(&buf);
    const bad = [_][2][]const u8{
        .{ "(", "" },   .{ "a**", "" },    .{ "(?<=a)b", "" }, .{ "\\p{L}", "u" },
        .{ "a", "gg" }, .{ "a", "iu" },    .{ "[b-a]", "" },   .{ "\\1(a)\\2", "" },
        .{ "^*", "" },  .{ "a{2,1}", "" }, .{ "\\07", "" },
    };
    for (bad) |b| {
        const t = arena.begin();
        defer t.end();
        if (compile(&arena, b[0], b[1])) |_| {
            std.debug.print("accepted /{s}/{s}\n", .{ b[0], b[1] });
            return error.TestUnexpectedResult;
        } else |_| {}
    }
}

test "catastrophic backtracking stops at the step limit" {
    const buf = try std.testing.allocator.alloc(u8, 4 << 20);
    defer std.testing.allocator.free(buf);
    var arena = Arena.init(buf);
    const re = try compile(&arena, "^(a+)+$", "");
    const input = try toUtf16(&arena, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!");
    var steps: u64 = 0;
    try std.testing.expectError(error.StepLimit, exec(&arena, re, input, 0, &steps));
}
