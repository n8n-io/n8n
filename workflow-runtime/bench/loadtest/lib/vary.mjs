// Seeded variation of the load-test input: a new trigger item and a new
// gym state for each run, the same for every engine. The seed of run i is
// a hash of the run seed and i, so v1, v2 and the compiled engine get the
// same items and the same tenant state for the same i.
//
// Trigger items: the bundle's item is the shape model (keys, types,
// nesting). Each value gets a new value of the same kind: strings change
// length and character set (Unicode too), numbers stay near the original,
// arrays get 0, 1, a few or many elements, and some keys are left out.
// Values with a clear format (emails, ISO dates, URLs, UUIDs, numeric and
// hex ids) stay valid for that format. One run in 8 keeps the original item.
//
// Gym state: the tenant snapshot (`store.kinds.<kind>.<id>`) gets a seeded
// mutation of its leaf kinds (kinds whose ids no other kind refers to):
// records removed, fields edited, and records cloned with new ids. Kinds of
// the gym itself (`gym.*`) and referenced kinds stay as they are.
import { createHash } from 'node:crypto';
import { rng } from './bundle.mjs';

/** The seed of run `i` of a run with seed `seed`. */
export function runSeed(seed, i) {
	return createHash('sha256').update(`${seed}:${i}`).digest().readUInt32LE(0);
}

const pick = (r, list) => list[Math.floor(r() * list.length)];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const ALNUM = `${LOWER}ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
// Words and characters outside ASCII: accents, Cyrillic, CJK, RTL, emoji.
const UNICODE = ['é', 'ü', 'ß', 'ñ', 'ø', 'ç', 'Ж', 'я', '中', '文', '日本', '한', 'ع', 'ש', '😀', '🚀', '✓', '€', '—', ' '];
const WORDS = ['order', 'invoice', 'update', 'customer', 'request', 'status', 'new', 'urgent', 'report', 'team', 'Müller', 'São Paulo', 'Zürich', '北京', 'café', 'naïve', 'résumé'];

const FORMATS = [
	['email', /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i],
	['uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
	['isodate', /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/],
	['url', /^https?:\/\/\S+$/i],
	['numid', /^\d{3,}$/],
	['hexid', /^[0-9a-f]{12,}$/i],
	['token', /^[A-Za-z0-9_-]{16,}$/],
];
const formatOf = (s) => FORMATS.find(([, re]) => re.test(s))?.[0];
const ID_KEY = /(^id$|_id$|Id$|^uuid$|key$|token$|^ts$|^sid$)/;

/** A string of the same kind as `s`: same character classes for ids, else new text. */
function sameShape(r, s) {
	let out = '';
	for (const ch of s) {
		if (/[0-9]/.test(ch)) out += String(int(r, 0, 9));
		else if (/[a-f]/.test(ch) && /^[0-9a-f-]+$/i.test(s)) out += pick(r, [...'0123456789abcdef']);
		else if (/[a-z]/.test(ch)) out += pick(r, [...LOWER]);
		else if (/[A-Z]/.test(ch)) out += pick(r, [...LOWER.toUpperCase()]);
		else out += ch;
	}
	return out;
}

function formatted(r, kind, s) {
	switch (kind) {
		case 'email': {
			const name = Array.from({ length: int(r, 3, 12) }, () => pick(r, [...ALNUM.toLowerCase()])).join('');
			return `${name}${r() < 0.3 ? `.${pick(r, WORDS).toLowerCase().replace(/[^a-z]/g, 'x')}` : ''}@${s.split('@')[1]}`;
		}
		case 'isodate': {
			const t = Date.parse(s.replace(' ', 'T'));
			if (Number.isNaN(t)) return s;
			const d = new Date(t + int(r, -30, 30) * 86_400_000 + int(r, -43_200, 43_200) * 1000);
			const iso = d.toISOString();
			// Keep the precision of the original: a date stays a date.
			return /^\d{4}-\d{2}-\d{2}$/.test(s) ? iso.slice(0, 10) : s.includes('.') ? iso : iso.replace(/\.\d{3}Z$/, 'Z');
		}
		case 'url': {
			try {
				const u = new URL(s);
				const parts = u.pathname.split('/').map((p) => (p && r() < 0.5 ? sameShape(r, p) : p));
				u.pathname = parts.join('/');
				return u.toString();
			} catch {
				return s;
			}
		}
		default:
			return sameShape(r, s);
	}
}

/** New text: the original length times 0 .. 2.5, with Unicode in one value of 4. */
function text(r, s) {
	const want = Math.max(0, Math.round(s.length * pick(r, [0, 0.5, 1, 1, 1.5, 2.5])));
	if (want === 0) return r() < 0.5 ? '' : s;
	const words = [];
	let len = 0;
	const uni = r() < 0.25;
	while (len < want) {
		const w = uni && r() < 0.3 ? pick(r, UNICODE) : r() < 0.5 ? pick(r, WORDS) : Array.from({ length: int(r, 2, 9) }, () => pick(r, [...LOWER])).join('');
		words.push(w);
		len += w.length + 1;
	}
	let out = words.join(' ');
	// Multi-line originals stay multi-line.
	if (s.includes('\n')) out = out.replace(/ /g, () => (r() < 0.1 ? '\n' : ' '));
	return out;
}

function number(r, n) {
	if (n === 0) return r() < 0.5 ? 0 : int(r, 1, 10);
	const v = n * (0.5 + r());
	return Number.isInteger(n) ? Math.round(v) : Number(v.toFixed(Math.min(6, (String(n).split('.')[1] ?? '').length || 2)));
}

/** A value of the same kind as `v`. `key` is the member name, if any. */
export function varyValue(r, v, key = '', depth = 0) {
	if (v === null || v === undefined) return r() < 0.7 ? v : pick(r, ['', 0, 'n/a']);
	if (typeof v === 'boolean') return r() < 0.2 ? !v : v;
	if (typeof v === 'number') return ID_KEY.test(key) ? (r() < 0.7 ? v : Number(sameShape(r, String(Math.trunc(v)))) || v) : number(r, v);
	if (typeof v === 'string') {
		const f = formatOf(v);
		// Ids keep their value in most runs, so lookups in the gym still find the record.
		if (ID_KEY.test(key) || f === 'uuid' || f === 'numid' || f === 'hexid' || f === 'token') return r() < 0.7 ? v : formatted(r, f ?? 'id', v);
		if (f) return formatted(r, f, v);
		return text(r, v);
	}
	if (Array.isArray(v)) {
		if (depth > 8) return v;
		const n = v.length;
		const len = n === 0 ? (r() < 0.8 ? 0 : 1) : pick(r, [0, 1, n, n, Math.max(2, Math.min(n * 2, n + 3)), Math.min(50, n * 5 + 3)]);
		return Array.from({ length: len }, (_, j) => varyValue(r, v[j % n], key, depth + 1));
	}
	if (typeof v === 'object') {
		if (depth > 8) return v;
		const out = {};
		for (const [k, x] of Object.entries(v)) {
			// Some keys are left out: never at the top of the item, never an id.
			if (depth > 0 && !ID_KEY.test(k) && r() < 0.05) continue;
			out[k] = varyValue(r, x, k, depth + 1);
		}
		return out;
	}
	return v;
}

/** The trigger items of a run: one run in 8 keeps the original items. */
export function varyItems(seed, items) {
	const r = rng(seed);
	if (r() < 0.125) return { items, original: true };
	// A list of items may change length too.
	const n = items.length;
	const len = n <= 1 ? n : pick(r, [1, n, n, Math.min(200, n * 3)]);
	return { items: Array.from({ length: len }, (_, j) => varyValue(r, items[j % n], '', 0)), original: false };
}

/** The leaf kinds of a snapshot: no other kind's data names one of their ids. Cached per bundle by the caller. */
export function leafKinds(doc) {
	const kinds = doc?.store?.kinds ?? {};
	const names = Object.keys(kinds).filter((k) => !k.startsWith('gym.'));
	const text = new Map(names.map((k) => [k, JSON.stringify(kinds[k])]));
	const out = [];
	for (const k of names) {
		const ids = Object.keys(kinds[k]);
		if (ids.length === 0) continue;
		const sample = ids.slice(0, 20);
		const referenced = names.some((o) => o !== k && sample.some((id) => id.length >= 4 && text.get(o).includes(id)));
		if (!referenced) out.push(k);
	}
	return out;
}

/**
 * Mutates a parsed snapshot in place for one run: for each leaf kind,
 * removes up to a third of the records, edits fields of some, and clones a
 * few with new ids. Returns counts for the run record.
 */
export function mutateSnapshot(seed, doc, leaves) {
	const r = rng(seed ^ 0x9e3779b9);
	const counts = { removed: 0, edited: 0, added: 0 };
	if (r() < 0.125 || !doc?.store?.kinds) return counts;
	let seq = doc.store.seq ?? 0;
	for (const k of leaves) {
		const recs = doc.store.kinds[k];
		const ids = Object.keys(recs);
		if (ids.length === 0) continue;
		const mode = pick(r, ['remove', 'edit', 'add', 'mix', 'none']);
		if (mode === 'none') continue;
		if (mode === 'remove' || mode === 'mix') {
			const n = int(r, 0, Math.floor(ids.length / 3));
			for (let j = 0; j < n; j++) {
				const id = ids.splice(int(r, 0, ids.length - 1), 1)[0];
				if (id !== undefined && ids.length > 0) {
					delete recs[id];
					counts.removed++;
				}
			}
		}
		if (mode === 'edit' || mode === 'mix') {
			for (const id of ids) {
				if (r() < 0.5) continue;
				const data = recs[id].data;
				if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
				for (const [f, v] of Object.entries(data)) {
					// Only plain text and numbers: ids, refs and structure stay.
					if (ID_KEY.test(f) || typeof v === 'object' || typeof v === 'boolean') continue;
					if (typeof v === 'string' && (formatOf(v) || ids.includes(v))) continue;
					if (r() < 0.4) data[f] = varyValue(r, v, f, 1);
				}
				counts.edited++;
			}
		}
		if (mode === 'add' || mode === 'mix') {
			const n = int(r, 1, Math.min(20, Math.max(1, ids.length * 2)));
			for (let j = 0; j < n; j++) {
				const from = pick(r, ids);
				// A new id of the same shape; for "a/b" ids only the last part changes.
				const parts = from.split('/');
				const oldLast = parts[parts.length - 1];
				const newLast = sameShape(r, oldLast);
				parts[parts.length - 1] = newLast;
				const id = parts.join('/');
				if (recs[id]) continue;
				const copy = structuredClone(recs[from]);
				if (copy.data && typeof copy.data === 'object' && !Array.isArray(copy.data)) {
					for (const [f, v] of Object.entries(copy.data)) {
						// The record's own id inside its data follows the new key.
						if (v === from) copy.data[f] = id;
						else if (v === oldLast) copy.data[f] = newLast;
						else if (!ID_KEY.test(f) && (typeof v === 'string' || typeof v === 'number') && r() < 0.5) copy.data[f] = varyValue(r, v, f, 1);
					}
				}
				copy.seq = ++seq;
				recs[id] = copy;
				counts.added++;
			}
		}
	}
	doc.store.seq = seq;
	return counts;
}
