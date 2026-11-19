//! The context and codec natives: `ctx.*`, `XML.*`, `RegExp.exec`, `btoa`,
//! `atob`, the URI codecs, `escape`, `unescape`, and `Base64.encodeUtf8`.
const std = @import("std");
const value = @import("value.zig");
const ops = @import("ops.zig");
const heap = @import("heap.zig");
const json = @import("json.zig");
const xml = @import("xml.zig");
const xmlrss = @import("xmlrss.zig");
const textcodec = @import("textcodec.zig");
const regex = @import("regex.zig");
const cred_flags = @import("cred_flags.zig");
const Builder = @import("arena.zig").Builder;
const lib = @import("lib.zig");

const Value = value.Value;
const Vm = ops.Vm;
const Err = ops.Err;
const Native = lib.Native;

/// True for the natives this file handles: context, codec, XML, and regex.
fn ctxNative(n: Native) bool {
    return switch (n) {
        .regexp_exec, .btoa, .atob, .encode_uri_component, .decode_uri_component, .escape, .unescape, .encode_uri, .base64_encode_utf8, .xml_parse, .xml_snippet, .xml_content, .static_data, .polled, .ascii_is, .ascii_is_printable, .credential_flag => true,
        else => false, // the other natives route to their own domain file.
    };
}

pub fn callNative(vm: *Vm, n: Native, args: []const Value) Err!Value {
    std.debug.assert(ctxNative(n));
    return switch (n) {
        .regexp_exec => regexExec(vm, args),
        .btoa => codec(vm, args, textcodec.btoa),
        .atob => codec(vm, args, textcodec.atob),
        .encode_uri_component => codec(vm, args, textcodec.encodeUriComponent),
        .decode_uri_component => codec(vm, args, textcodec.decodeUriComponent),
        .escape => codec(vm, args, textcodec.escape),
        .unescape => codec(vm, args, textcodec.unescape),
        .encode_uri => codec(vm, args, textcodec.encodeUri),
        .base64_encode_utf8 => codec(vm, args, textcodec.base64Utf8),
        .xml_parse => xmlParse(vm, lib.arg(args, 0)),
        .xml_snippet => xmlrss.snippet(vm, vm.str(try vm.toStr(lib.arg(args, 0)))),
        .xml_content => xmlrss.content(vm, lib.arg(args, 0)),
        .static_data => staticData(vm, lib.arg(args, 0), lib.arg(args, 1)),
        .polled => polled(vm, lib.arg(args, 0)),
        .ascii_is => textRange(vm, lib.arg(args, 0), 0x00, 0x7f),
        .ascii_is_printable => textRange(vm, lib.arg(args, 0), 0x20, 0x7e),
        .credential_flag => credentialFlag(vm, lib.arg(args, 0), lib.arg(args, 1)),
        else => unreachable, // ctxNative above.
    };
}

/// `XML.parse(text)`: the xml2js value, or an Error with the message of sax.
/// ctx.staticData(type, node): the object of `$getWorkflowStaticData`
/// (spec 9.7). `global`, or `node` with the node name. Changes to the
/// object are the execution's; it commits them when it ends.
fn staticData(vm: *Vm, kind: Value, node: Value) Err!Value {
    const k = try vm.toStr(kind);
    var key_buf: [5 + 256]u8 = undefined;
    const key: []const u8 = if (std.mem.eql(u8, vm.str(k), "global")) "global" else if (std.mem.eql(u8, vm.str(k), "node")) blk: {
        if (value.kindOf(node) != .string or vm.str(node).len == 0) return vm.throwMsg(.@"error", "The node name is missing for static data of type \"node\"", .{});
        const name = vm.str(node);
        if (name.len > 256) return vm.throwMsg(.@"error", "The node name is too long", .{});
        @memcpy(key_buf[0..5], "node:");
        @memcpy(key_buf[5..][0..name.len], name);
        break :blk key_buf[0 .. 5 + name.len];
    } else return vm.throwMsg(.@"error", "Unknown context type. Only `global` and `node` are supported.", .{});
    const e = vm.r.exec();
    if (e.static_doc == value.undef) {
        const start = e.static_start;
        const doc = if (value.kindOf(start) == .string) json.decode(vm, vm.str(start)) catch |err| switch (err) {
            error.RegionFull => return error.RegionFull,
            else => try vm.r.newObject(0),
        } else try vm.r.newObject(0);
        // An allocation can move nothing: regions grow between instructions only.
        vm.r.exec().static_doc = if (value.kindOf(doc) == .object) doc else try vm.r.newObject(0);
    }
    const doc = vm.r.exec().static_doc;
    const cur = vm.objGet(value.payload(doc), key);
    if (value.kindOf(cur) == .object) return cur;
    const fresh = try vm.r.newObject(0);
    const kv = try vm.newStr(key);
    try vm.objSet(value.payload(vm.r.exec().static_doc), kv, fresh);
    return fresh;
}

/// ctx.credentialFlag(slot, name): the outcome of one condition on the
/// credential of the slot, a boolean, and the only value of a credential
/// that node code reads. The name must have the form of a flag name and be
/// in the list of the module's META. The value is the execution's copy from
/// its start, so a replay and a changed credential give the same branch.
/// Each other case throws: the result is never a value of another type.
fn credentialFlag(vm: *Vm, slot: Value, name: Value) Err!Value {
    const found: cred_flags.Found = blk: {
        if (value.kindOf(slot) != .string or value.kindOf(name) != .string) break :blk .absent;
        const flag = vm.str(name);
        if (!cred_flags.isName(flag) or !cred_flags.declared(vm.m.flag_names, flag)) break :blk .absent;
        const off = vm.r.exec().cred_flags;
        if (off == 0) break :blk .absent;
        break :blk cred_flags.scan(vm.r.strBytes(off), vm.str(slot), flag);
    };
    return switch (found) {
        .yes => value.true_,
        .no => value.false_,
        .absent, .invalid => vm.throwMsg(.@"error", cred_flags.missing_message, .{}),
    };
}

/// ctx.polled(items) (spec 9.8): true when a poll found items. A quiet poll
/// run then becomes a run like any other: its `started` event, with the items
/// as the trigger, goes out before its next event. With no items the run stays
/// quiet; when it ends, the core skips it.
fn polled(vm: *Vm, items: Value) Err!Value {
    const found = value.kindOf(items) == .array and vm.r.arrItems(value.payload(items)).len > 0;
    if (!found) return value.false_;
    const e = vm.r.exec();
    if (e.flags & heap.exec_flag_quiet != 0) {
        e.flags = (e.flags & ~heap.exec_flag_quiet) | heap.exec_flag_announce;
        e.trigger = items;
    }
    return value.true_;
}

/// Ascii.is and Ascii.isPrintable: true when every character of the
/// text is in [lo, hi]. Library nodes call them in place of loops over
/// `charCodeAt`. In UTF-8, a byte below 0x80 is a whole character, so a
/// check of the bytes is a check of the characters.
fn textRange(vm: *Vm, v: Value, lo: u8, hi: u8) Err!Value {
    const s = try vm.toStr(v);
    const bytes = vm.str(s);
    vm.charge(bytes.len / 64);
    for (bytes) |c| {
        if (c < lo or c > hi) return value.false_;
    }
    return value.true_;
}

fn xmlParse(vm: *Vm, text: Value) Err!Value {
    const s = try vm.toStr(text);
    var fail: xml.Failure = .{};
    // The parse reads each byte a fixed number of times.
    vm.charge(vm.str(s).len / 4);
    return xml.parse(vm, vm.str(s), &fail) catch |e| switch (e) {
        error.XmlSyntax => {
            var buf: [400]u8 = undefined;
            const msg = xml.message(&fail, &buf);
            return vm.throwMsg(.@"error", "{s}", .{msg});
        },
        else => |other| other,
    };
}

/// A text codec over the string of the first argument (`textcodec.zig`).
fn codec(vm: *Vm, args: []const Value, f: fn (*Builder, []const u8) textcodec.Error!void) Err!Value {
    const s = try vm.toStr(lib.arg(args, 0));
    const t = vm.scratch.begin();
    defer t.end();
    var b = vm.scratch.builder();
    f(&b, vm.str(s)) catch |e| return switch (e) {
        error.ArenaFull => error.ArenaFull,
        error.Malformed => vm.throwMsg(.uri_error, "URI malformed", .{}),
        error.InvalidCharacter => vm.throwMsg(.invalid_character_error, "Invalid character", .{}),
        error.NotEncoded => vm.throwMsg(.invalid_character_error, "The string to be decoded is not correctly encoded.", .{}),
    };
    // A linear pass over the text: one unit of fuel for each 16 bytes.
    vm.charge((vm.str(s).len + b.len) / 16);
    return vm.newStr(b.bytes());
}

/// `RegExp.exec(source, flags, input, lastIndex)` (spec section 4.6): null, or
/// an array of UTF-16 positions `[start, end, group 1 start, group 1 end, ...]`
/// with -1 for a group that did not take part.
fn regexExec(vm: *Vm, args: []const Value) Err!Value {
    const source = try vm.toStr(lib.arg(args, 0));
    const flags = try vm.toStr(lib.arg(args, 1));
    const input = try vm.toStr(lib.arg(args, 2));
    const last = @trunc(try lib.numArg(vm, args, 3));
    const t = vm.scratch.begin();
    defer t.end();
    const re = regex.compile(vm.scratch, vm.str(source), vm.str(flags)) catch |e| return regexError(vm, e, vm.str(source));
    const units = try regex.toUtf16(vm.scratch, vm.str(input));
    if (!(last >= 0 and last <= @as(f64, @floatFromInt(units.len)))) return value.null_;
    var steps: u64 = 0;
    const found = regex.exec(vm.scratch, re, units, @intFromFloat(last), &steps) catch |e| return regexError(vm, e, vm.str(source));
    // The steps of the matcher count as fuel, a little below one instruction each.
    vm.charge(steps / 16);
    const caps = found orelse return value.null_;
    const out = try vm.r.newArray(@intCast(caps.len));
    for (caps) |c| try vm.r.arrPush(value.payload(out), value.num(@floatFromInt(c)));
    return out;
}

fn regexError(vm: *Vm, e: regex.Error, source: []const u8) Err {
    return switch (e) {
        error.Syntax => vm.throwMsg(.syntax_error, "Invalid regular expression: /{s}/", .{source}),
        error.TooLarge => vm.throwMsg(.syntax_error, "Regular expression too large: /{s}/", .{source}),
        error.StepLimit => vm.limit(.fuel),
        error.ArenaFull => error.ArenaFull,
    };
}
