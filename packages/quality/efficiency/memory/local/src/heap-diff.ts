import { isRecord } from '@n8n/utils/is-record';
import { readFile } from 'node:fs/promises';

export interface ObjectGrowth {
	name: string;
	countDelta: number;
	sizeDeltaBytes: number;
	finalCount: number;
}

type Totals = Map<string, { count: number; size: number }>;

/** Groups a V8 heap snapshot's nodes the way the DevTools Summary view does, with shallow sizes. */
async function summarize(path: string): Promise<Totals> {
	const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
	if (
		!isRecord(parsed) ||
		!isRecord(parsed.snapshot) ||
		!isRecord(parsed.snapshot.meta) ||
		!Array.isArray(parsed.nodes) ||
		!Array.isArray(parsed.strings)
	) {
		throw new Error(`${path} is not a V8 heap snapshot.`);
	}
	const { meta } = parsed.snapshot;
	const fields: unknown[] = Array.isArray(meta.node_fields) ? meta.node_fields : [];
	const nodeTypes: unknown[] = Array.isArray(meta.node_types) ? meta.node_types : [];
	const typeNamesValue: unknown = nodeTypes[0];
	const typeNames: unknown[] = Array.isArray(typeNamesValue) ? typeNamesValue : [];
	const nodes: unknown[] = parsed.nodes;
	const strings: unknown[] = parsed.strings;
	const typeOffset = fields.indexOf('type');
	const nameOffset = fields.indexOf('name');
	const sizeOffset = fields.indexOf('self_size');
	if (typeOffset < 0 || nameOffset < 0 || sizeOffset < 0) {
		throw new Error(`${path} uses an unsupported heap snapshot format.`);
	}

	const totals: Totals = new Map();
	for (let index = 0; index < nodes.length; index += fields.length) {
		const type = typeNames[Number(nodes[index + typeOffset])];
		const name = strings[Number(nodes[index + nameOffset])];
		const key =
			(type === 'object' || type === 'native') && typeof name === 'string'
				? name
				: `(${String(type)})`;
		const entry = totals.get(key) ?? { count: 0, size: 0 };
		entry.count++;
		entry.size += Number(nodes[index + sizeOffset]);
		totals.set(key, entry);
	}
	return totals;
}

/** Object types whose total shallow size grew most between two snapshots. */
export async function diffSnapshots(
	baselinePath: string,
	finalPath: string,
	limit = 15,
): Promise<ObjectGrowth[]> {
	// Summarize one at a time so only one parsed snapshot is in memory.
	const baseline = await summarize(baselinePath);
	const final = await summarize(finalPath);
	return [...final]
		.map(([name, { count, size }]) => {
			const before = baseline.get(name) ?? { count: 0, size: 0 };
			return {
				name,
				countDelta: count - before.count,
				sizeDeltaBytes: size - before.size,
				finalCount: count,
			};
		})
		.filter((entry) => entry.sizeDeltaBytes > 0)
		.sort((a, b) => b.sizeDeltaBytes - a.sizeDeltaBytes)
		.slice(0, limit);
}
