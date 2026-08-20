/**
 * Node output fixtures for the memory guard estimator benchmarks.
 *
 * Every builder is deterministic, so a run measures the same bytes as the run
 * before it and CodSpeed can compare instruction counts across commits.
 */
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Deterministic filler string of the requested length. */
function filler(length: number, seed: number): string {
	let out = '';
	for (let i = 0; i < length; i++) out += ALPHABET[(i + seed) % ALPHABET.length];
	return out;
}

/** The shape an HTTP Request or database node typically returns: flat, ~12 fields. */
function flatRecord(index: number): IDataObject {
	return {
		id: index,
		orderNumber: `ORD-${100000 + index}`,
		customerName: filler(18, index),
		customerEmail: `${filler(10, index)}@example.com`,
		status: index % 3 === 0 ? 'shipped' : 'pending',
		currency: 'EUR',
		total: 49.99 + index,
		taxRate: 0.19,
		createdAt: '2026-08-20T09:15:00.000Z',
		updatedAt: '2026-08-20T11:42:00.000Z',
		isPaid: index % 2 === 0,
		notes: filler(40, index),
	};
}

/** `count` flat records. The common case for every node on every execution. */
export function flatItems(count: number): INodeExecutionData[] {
	return Array.from({ length: count }, (_, i) => ({ json: flatRecord(i) }));
}

/** `count` records with `fieldCount` flat fields each. Cost scales with field count. */
export function wideItems(count: number, fieldCount: number): INodeExecutionData[] {
	return Array.from({ length: count }, (_, i) => {
		const json: IDataObject = {};
		for (let f = 0; f < fieldCount; f++) json[`field_${f}`] = filler(12, i + f);
		return { json };
	});
}

/** `count` records nested `depth` levels deep. Above MAX_DEPTH the walk must stop. */
export function deepItems(count: number, depth: number): INodeExecutionData[] {
	return Array.from({ length: count }, (_, i) => {
		let node: IDataObject = { leaf: filler(16, i), index: i };
		for (let d = 0; d < depth; d++) node = { level: d, child: node };
		return { json: node };
	});
}

/**
 * `count` records each holding one large string. The walk reads `.length`, so
 * these must cost the same as short strings.
 */
export function bigStringItems(count: number, charsPerItem: number): INodeExecutionData[] {
	const payload = filler(charsPerItem, 7);
	return Array.from({ length: count }, (_, i) => ({
		json: { id: i, payload },
	}));
}

/** `count` records carrying a base64 binary buffer, as a file-producing node returns. */
export function binaryItems(count: number, base64Chars: number): INodeExecutionData[] {
	const data = filler(base64Chars, 3);
	return Array.from({ length: count }, (_, i) => ({
		json: { id: i, fileName: `report-${i}.pdf` },
		binary: {
			data: { data, mimeType: 'application/pdf', fileName: `report-${i}.pdf` },
		},
	}));
}

/**
 * One record whose object graph holds `leafCount` values. Nothing bounds this
 * shape except WALK_BUDGET, so it is the worst case a single item can reach.
 */
export function fanOutItem(leafCount: number): INodeExecutionData[] {
	const json: IDataObject = {};
	for (let i = 0; i < leafCount; i++) {
		json[`k${i}`] = { a: i, b: filler(8, i), c: [i, i + 1, i + 2] };
	}
	return [{ json }];
}

/** A WeakSet already holding every object in `items`, as after a pass-through node. */
export function warmSeenSet(items: INodeExecutionData[]): WeakSet<object> {
	const seen = new WeakSet<object>();
	const add = (value: unknown) => {
		if (value === null || typeof value !== 'object') return;
		seen.add(value);
		for (const entry of Object.values(value)) add(entry);
	};
	for (const item of items) add(item.json);
	return seen;
}
