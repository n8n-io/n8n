//! Tests of `core/binary_names.zig`: the values are those of the reference
//! runner (`packages/@n8n/workflow-lang/src/reference/binary-response.ts`),
//! which `pretty-bytes` and `mime-types` of n8n agree with.
const std = @import("std");
const core_lib = @import("core");
const names = core_lib.binary_names;
const t = std.testing;

fn expectName(expected: ?[]const u8, header: []const u8) !void {
    var buf: [256]u8 = @splat(0);
    const got = try names.contentDispositionFileName(header, &buf);
    if (expected) |e| try t.expectEqualStrings(e, got orelse return error.TestExpectedEqual) else try t.expect(got == null);
}

test "names.contentDispositionFileName follows n8n's parseContentDisposition" {
    try expectName("report.pdf", "attachment; filename=\"report.pdf\"");
    try expectName("report.pdf", "attachment; filename=report.pdf");
    try expectName("a b.txt", "inline; filename=\"a%20b.txt\"");
    try expectName("a b.txt", "filename=a%20b.txt");
    try expectName("na\xc3\xafve.txt", "attachment; filename*=UTF-8''na%C3%AFve.txt; filename=\"x.txt\"");
    try expectName("x.txt", "attachment; filename*=; filename=\"x.txt\"");
    try expectName(null, "attachment; filename*=plain; filename=\"x.txt\"");
    try expectName("second", "attachment; filename=first; FILENAME = second");
    try expectName("100%.txt", "attachment; filename=\"100%.txt\"");
    try expectName("q.txt", "attachment; filename=%22q.txt%22");
    try expectName("", "attachment; filename=\"");
    try expectName("\"a", "attachment; filename=\"a;b\"");
    try expectName("c", "attachment; filename*=a'b'c'd");
    try expectName("A/~", "attachment; filename=%41%2f%7E");
    try expectName("\xc2\xa0 x \xc2\xa0", "attachment; filename=\"\xa0 x \xa0\"");
    try expectName("caf\xc3\xa9", "attachment; filename=caf\xe9");
    try expectName("%C3", "attachment; filename=%C3");
    try expectName("%ED%A0%80", "attachment; filename=%ED%A0%80");
    try expectName(null, "attachment");
    try expectName(null, "");
    try expectName(null, "form-data; name=\"x\"");
    try expectName("f", "attachmentfilename=x; filename=f");
    var small: [4]u8 = @splat(0);
    try t.expectError(error.TooLong, names.contentDispositionFileName("filename=abcdef", &small));
}

test "names.pathParts follows path.parse" {
    const cases = [_]struct { path: []const u8, base: []const u8, ext: []const u8 }{
        .{ .path = "a/b/c.tar.gz", .base = "c.tar.gz", .ext = "gz" },
        .{ .path = "/", .base = "", .ext = "" },
        .{ .path = "dir/", .base = "dir", .ext = "" },
        .{ .path = ".hidden", .base = ".hidden", .ext = "" },
        .{ .path = "..", .base = "..", .ext = "" },
        .{ .path = "a.", .base = "a.", .ext = "" },
        .{ .path = "x//", .base = "x", .ext = "" },
        .{ .path = "", .base = "", .ext = "" },
    };
    for (cases) |c| {
        const p = names.pathParts(c.path);
        try t.expectEqualStrings(c.base, p.base);
        try t.expectEqualStrings(c.ext, p.ext);
    }
}

test "mime tables give the values of mime-types" {
    try t.expectEqualStrings("image/png", names.mimeLookup("a/b.PNG"));
    try t.expectEqualStrings("image/png", names.mimeLookup("png"));
    try t.expectEqualStrings("text/javascript", names.mimeLookup("x.js"));
    try t.expectEqualStrings("", names.mimeLookup("file"));
    try t.expectEqualStrings("", names.mimeLookup("a.nosuchext"));
    try t.expectEqualStrings("", names.mimeLookup(""));
    try t.expectEqualStrings("image/png", names.mimeLookup("png/"));
    try t.expectEqualStrings("png", names.mimeExtension("image/png"));
    try t.expectEqualStrings("png", names.mimeExtension(" IMAGE/PNG; q=1"));
    try t.expectEqualStrings("js", names.mimeExtension("application/javascript"));
    try t.expectEqualStrings("", names.mimeExtension("application/x-nothing"));
    try t.expectEqualStrings("", names.mimeExtension(""));
    try t.expectEqualStrings("jpg", names.mimeExtension("image/jpeg"));
    try t.expectEqualStrings("bin", names.mimeExtension("application/octet-stream"));
    try t.expectEqual(@as(usize, core_lib.mime_tables.line_count), std.mem.count(u8, core_lib.mime_tables.table, "\n") + 1);
}

test "names.prettyBytes gives the text of pretty-bytes" {
    const cases = [_]struct { n: u64, text: []const u8 }{
        .{ .n = 0, .text = "0 B" },            .{ .n = 1, .text = "1 B" },
        .{ .n = 999, .text = "999 B" },        .{ .n = 1000, .text = "1 kB" },
        .{ .n = 1005, .text = "1 kB" },        .{ .n = 1015, .text = "1.01 kB" },
        .{ .n = 1340, .text = "1.34 kB" },     .{ .n = 1337, .text = "1.34 kB" },
        .{ .n = 9995, .text = "9.99 kB" },     .{ .n = 9999, .text = "10 kB" },
        .{ .n = 10050, .text = "10.1 kB" },    .{ .n = 99950, .text = "100 kB" },
        .{ .n = 123456, .text = "123 kB" },    .{ .n = 999999, .text = "1000 kB" },
        .{ .n = 1000000, .text = "1 MB" },     .{ .n = 1500000, .text = "1.5 MB" },
        .{ .n = 12345678, .text = "12.3 MB" }, .{ .n = 999949999, .text = "1000 MB" },
        .{ .n = 1000000000, .text = "1 GB" },  .{ .n = 999999999999, .text = "1000 GB" },
        .{ .n = 2675000, .text = "2.67 MB" },  .{ .n = 8125, .text = "8.13 kB" },
    };
    var buf: [names.max_size_text]u8 = @splat(0);
    for (cases) |c| try t.expectEqualStrings(c.text, names.prettyBytes(c.n, &buf) orelse return error.TestExpectedEqual);
    try t.expect(names.prettyBytes(names.max_size_bytes, &buf) == null);
}

test "names.handleNames follows prepareBinaryData for a response" {
    var buf: names.NameBuf = .{};
    var n = try names.handleNames(.{ .content_disposition = "attachment; filename=\"dir/report.PDF\"", .content_type = "Application/PDF; charset=x", .url_path = "/files/1" }, &buf);
    try t.expectEqualStrings("application/pdf", n.mime_type);
    try t.expectEqualStrings("pdf", n.file_type orelse "");
    try t.expectEqualStrings("report.PDF", n.file_name orelse "");
    try t.expectEqualStrings("PDF", n.extension);

    n = try names.handleNames(.{ .url_path = "/img/logo.png" }, &buf);
    try t.expectEqualStrings("image/png", n.mime_type);
    try t.expectEqualStrings("logo.png", n.file_name orelse "");
    try t.expectEqualStrings("png", n.extension);

    n = try names.handleNames(.{ .url_path = "/" }, &buf);
    try t.expectEqualStrings("text/plain", n.mime_type);
    try t.expect(n.file_name == null);
    try t.expectEqualStrings("txt", n.extension);

    n = try names.handleNames(.{ .file_name = "data", .mime_type = "application/x-custom", .content_type = "image/png", .url_path = "/a.png" }, &buf);
    try t.expectEqualStrings("application/x-custom", n.mime_type);
    try t.expect(n.file_type == null);
    try t.expectEqualStrings("data", n.file_name orelse "");
    try t.expectEqualStrings("", n.extension);

    n = try names.handleNames(.{ .content_type = "image/jpeg", .url_path = "/download" }, &buf);
    try t.expectEqualStrings("download", n.file_name orelse "");
    try t.expectEqualStrings("jpg", n.extension);

    try t.expectError(error.NotText, names.handleNames(.{ .content_type = "text/\xff" }, &buf));
    try t.expectError(error.NotText, names.handleNames(.{ .url_path = "/\xff\xfe" }, &buf));
    const long: [names.max_path_bytes + 2]u8 = @splat('a');
    try t.expectError(error.TooLong, names.handleNames(.{ .url_path = &long }, &buf));
}

test "names.writeHandle and names.writeSidecar give the JSON of n8n" {
    var nb: names.NameBuf = .{};
    const n = try names.handleNames(.{ .file_name = "a \"b\".png" }, &nb);
    var sb: [names.max_size_text]u8 = @splat(0);
    var buf: [512]u8 = @splat(0);
    var out: names.Out = .{ .buf = &buf };
    try names.writeHandle(&out, "workflows/w/executions/1/binary_data/u", n, 1340, names.prettyBytes(1340, &sb) orelse "");
    try t.expectEqualStrings(
        "{\"id\":\"filesystem-v2:workflows/w/executions/1/binary_data/u\",\"data\":\"filesystem-v2\",\"mimeType\":\"image/png\",\"fileType\":\"image\",\"fileName\":\"a \\\"b\\\".png\",\"fileExtension\":\"png\",\"fileSize\":\"1.34 kB\",\"bytes\":1340}",
        out.written(),
    );
    out.len = 0;
    try names.writeSidecar(&out, "a\n\x01.png", "image/png", 5);
    try t.expectEqualStrings("{\"fileName\":\"a\\n\\u0001.png\",\"mimeType\":\"image/png\",\"fileSize\":5}", out.written());
    out.len = 0;
    try names.writeSidecar(&out, null, "text/plain", 0);
    try t.expectEqualStrings("{\"mimeType\":\"text/plain\",\"fileSize\":0}", out.written());
    var tiny: [8]u8 = @splat(0);
    var small: names.Out = .{ .buf = &tiny };
    try t.expectError(error.NoSpace, names.writeSidecar(&small, "name", null, 1));
}

test "names.uuidText gives a version 4 UUID" {
    const text = names.uuidText(.{ 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff });
    try t.expectEqualStrings("00112233-4455-4677-8899-aabbccddeeff", &text);
}

/// Any header: the name is null or UTF-8 that fits the buffer, and the
/// names of a handle are text.
fn fuzzNames(_: void, smith: *std.testing.Smith) !void {
    var input: [512]u8 = @splat(0);
    const header = input[0..smith.slice(&input)];
    var buf: [256]u8 = @splat(0);
    const name = names.contentDispositionFileName(header, &buf) catch |e| {
        try t.expectEqual(error.TooLong, e);
        return;
    };
    if (name) |text| try t.expect(text.len <= buf.len and std.unicode.utf8ValidateSlice(text));
    var nb: names.NameBuf = .{};
    // A header that gives no names is refused: nothing more to check.
    const n = names.handleNames(.{ .content_disposition = header, .content_type = header, .url_path = header }, &nb) catch return;
    try t.expect(std.unicode.utf8ValidateSlice(n.mime_type) and n.mime_type.len > 0);
    if (n.file_name) |base| try t.expect(std.unicode.utf8ValidateSlice(base) and std.mem.indexOfScalar(u8, base, '/') == null);
    var jb: [4096]u8 = @splat(0);
    var out: names.Out = .{ .buf = &jb };
    try names.writeSidecar(&out, n.file_name, n.mime_type, header.len);
    try t.expect(std.unicode.utf8ValidateSlice(out.written()));
}

fn fuzzSeed(comptime s: []const u8) *const [4 + s.len]u8 {
    return comptime blk: {
        var out: [4 + s.len]u8 = @splat(0);
        std.mem.writeInt(u32, out[0..4], s.len, .little);
        @memcpy(out[4..], s);
        const final = out;
        break :blk &final;
    };
}

test "fuzz content-disposition and handle names" {
    try std.testing.fuzz({}, fuzzNames, .{
        .corpus = &.{
            fuzzSeed("attachment; filename=\"report.pdf\""),
            fuzzSeed("attachment; filename*=UTF-8''na%C3%AFve.txt; filename=\"x.txt\""),
            fuzzSeed("filename=%22q%2Ftxt%22;;=;filename*=''"),
            fuzzSeed("inline; filename=%ED%A0%80%"),
        },
    });
}
