//! Pure wire codecs: protocols, formats, and tables that never touch I/O,
//! clocks, threads, or the operating system. The shell and the core import
//! these as `@import("wire")`.
pub const numfmt = @import("numfmt.zig");
pub const pgwire = @import("pgwire.zig");
pub const mywire = @import("mywire.zig");
const myerr_tables = @import("myerr_tables.zig");
pub const tdswire = @import("tdswire.zig");
pub const tdscase_tables = @import("tdscase_tables.zig");
pub const smtp = @import("smtp.zig");
pub const mail = @import("mail.zig");
const mailmime_tables = @import("mailmime_tables.zig");
const mailcase_tables = @import("mailcase_tables.zig");
pub const hpack = @import("hpack.zig");
pub const http2 = @import("http2.zig");

test {
    @import("std").testing.refAllDecls(@This());
    _ = @import("mailcase_tables.zig");
}