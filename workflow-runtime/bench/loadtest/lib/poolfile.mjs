// The pool file (pool.mjs output): one JSON line for each bundle.
import crypto from 'node:crypto';
import fs from 'node:fs';

/** A short key of a bundle id, used in webhook paths and workflow ids. */
export const keyOf = (id) => crypto.createHash('sha1').update(id).digest('hex').slice(0, 12);

/** The runnable rows of a pool file, in file order; `only`: a set of keys to keep. */
export function readPool(file, only) {
	return fs
		.readFileSync(file, 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((l) => JSON.parse(l))
		.filter((r) => !r.excluded && (!only || only.has(keyOf(r.id))));
}
