/** A user's WebDAV root: `/remote.php/webdav` or `/remote.php/dav/files/<user>`. */
const WEBDAV_ROOT = /\/remote\.php\/(?:webdav|dav\/files\/[^/]+)/;

/** Everything in an href up to and including the WebDAV root, with any sub-path before it. */
export const WEBDAV_HREF_PREFIX = new RegExp(`^.*?${WEBDAV_ROOT.source}/`);

/** The WebDAV root at the end of a credential URL, with any trailing slashes. */
export const WEBDAV_URL_SUFFIX = new RegExp(`${WEBDAV_ROOT.source}/*$`);
