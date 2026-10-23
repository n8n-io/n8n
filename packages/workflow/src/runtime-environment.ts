// Vite's dev server replaces `process` with an empty `{ env: {} }` shim.
const IS_FRONTEND_IN_DEV_MODE =
	typeof process === 'object' &&
	Object.keys(process).length === 1 &&
	'env' in process &&
	Object.keys(process.env).length === 0;

/** True when this package runs in the browser (the editor), false on the backend. */
export const IS_FRONTEND = typeof process === 'undefined' || IS_FRONTEND_IN_DEV_MODE;
