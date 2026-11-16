//! Tests of the rule registry itself: the checks that keep the lint from
//! getting weaker without anyone noticing.
const std = @import("std");
const lint = @import("lint.zig");
const rules = lint.rules;

fn fires(rule: []const u8, samples: []const rules.Sample) !bool {
    const gpa = std.testing.allocator;
    const files = try gpa.alloc(lint.File, samples.len);
    defer gpa.free(files);
    for (samples, files) |sample, *file| file.* = .{ .path = sample.path, .text = sample.text };
    const results = try gpa.alloc(lint.Result, samples.len);
    defer gpa.free(results);
    try lint.lintAll(gpa, files, results);
    for (results) |result| {
        if (result.has(rule)) return true;
    }
    return false;
}

test "every rule fires on its bad sample and stays quiet on its good one" {
    // Passes if no rule's samples disagree with the rule.
    for (rules.all) |rule| {
        if (!try fires(rule.name, rule.bad)) {
            std.debug.print("rule '{s}' did not fire on its bad sample\n", .{rule.name});
            return error.RuleDoesNotFire;
        }
        if (try fires(rule.name, rule.good)) {
            std.debug.print("rule '{s}' fired on its good sample\n", .{rule.name});
            return error.RuleFlagsCorrectCode;
        }
    }
}

test "rule names are unique and every rule says what it prevents" {
    for (rules.all, 0..) |rule, i| {
        try std.testing.expect(rule.prevents.len > 10);
        try std.testing.expect(rule.bad.len > 0 and rule.good.len > 0);
        for (rules.all[0..i]) |earlier| {
            try std.testing.expect(!std.mem.eql(u8, earlier.name, rule.name));
        }
    }
}

/// The rule name a line of the lint's own source reports, if it reports one:
/// the first string after `.add(` or after `.rule = `.
fn reportedRule(line: []const u8) ?[]const u8 {
    const after = for ([_][]const u8{ ".add(", ".rule = " }) |marker| {
        if (std.mem.indexOf(u8, line, marker)) |at| break line[at + marker.len ..];
    } else return null;
    const open = std.mem.indexOfScalar(u8, after, '"') orelse return null;
    const close = std.mem.indexOfScalarPos(u8, after, open + 1, '"') orelse return null;
    return after[open + 1 .. close];
}

test "every rule the lint can report is in the registry" {
    const sources = [_][]const u8{
        @embedFile("lint.zig"),
        @embedFile("lint_ast.zig"),
        @embedFile("lint_std.zig"),
        @embedFile("lint_program.zig"),
    };
    var reported: u32 = 0;
    for (sources) |source| {
        // Only the code before a file's own tests reports findings.
        const code = source[0 .. std.mem.indexOf(u8, source, "\ntest \"") orelse source.len];
        var lines = std.mem.splitScalar(u8, code, '\n');
        while (lines.next()) |line| {
            const name = reportedRule(line) orelse continue;
            reported += 1;
            if (rules.find(name) != null) continue;
            std.debug.print("the lint reports '{s}', which is not in tools/lint_rules.zig\n", .{name});
            return error.RuleNotRegistered;
        }
    }
    // Every rule is reported from somewhere, so the scan above saw real lines.
    try std.testing.expect(reported >= rules.all.len);
}

test "the manifest check names a rule that was removed and one that is new" {
    var buf: [8192]u8 = undefined;
    var w: std.Io.Writer = .fixed(&buf);
    for (rules.all) |rule| try w.print("{s}\n", .{rule.name});
    try std.testing.expectEqual(@as(u32, 0), lint.checkManifest(w.buffered(), false));
    // One rule missing from the file, and one name in the file with no rule.
    const first_line_end = std.mem.indexOfScalar(u8, w.buffered(), '\n') orelse return error.TestUnexpectedResult;
    try std.testing.expectEqual(@as(u32, 1), lint.checkManifest(w.buffered()[first_line_end..], false));
    try w.writeAll("a-rule-someone-deleted\n");
    try std.testing.expectEqual(@as(u32, 1), lint.checkManifest(w.buffered(), false));
}
