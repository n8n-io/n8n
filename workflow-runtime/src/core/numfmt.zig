//! Forwarding wrapper: the real numfmt lives in src/wire/numfmt.zig.
//! Core files that `@import("numfmt.zig")` keep working without changes.
const wire_numfmt = @import("wire").numfmt;

pub const max_len = wire_numfmt.max_len;
pub const format = wire_numfmt.format;
pub const trimJs = wire_numfmt.trimJs;
pub const parse = wire_numfmt.parse;
pub const parseFloatPrefix = wire_numfmt.parseFloatPrefix;
pub const parseIntJs = wire_numfmt.parseIntJs;
pub const toInt32 = wire_numfmt.toInt32;
pub const toUint32 = wire_numfmt.toUint32;