import { mergeSamples, stableKeyShare } from './merge.mjs';
import { planSchemaFile } from './plan.mjs';

/** Below this share of stable keys, the output is user data, not a node contract. */
const MIN_KEPT_KEY_SHARE = 0.8;

function compareVersions(a, b) {
	const pa = String(a).split('.').map(Number);
	const pb = String(b).split('.').map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/** Keeps the newest version of each node operation; version fallback covers older ones. */
function splitByNewestVersion(rows) {
	const key = (r) => [r.node_type, r.resource, r.operation].join('|');
	const newest = new Map();
	for (const r of rows) {
		const current = newest.get(key(r));
		if (current === undefined || compareVersions(r.node_version, current) > 0)
			newest.set(key(r), r.node_version);
	}
	const keep = [];
	const older = [];
	for (const r of rows) {
		(compareVersions(r.node_version, newest.get(key(r))) === 0 ? keep : older).push(r);
	}
	return { keep, older };
}

function parseSamples(samples) {
	return samples.flatMap((sample) => {
		try {
			return [JSON.parse(sample)];
		} catch {
			return [];
		}
	});
}

/** Groups query rows by the file they belong to, collecting skips and hints. */
function groupRowsByFile(rows, index, defaultOf) {
	const byFile = new Map();
	const skipped = [];
	const schemaPaths = {};
	for (const row of rows) {
		const plan = planSchemaFile(row, index, { defaultOf });
		if (plan.schemaPath) schemaPaths[row.node_type] = plan.schemaPath;
		if (plan.skip) {
			skipped.push({ group: row, reason: plan.skip });
			continue;
		}
		const entry = byFile.get(plan.file) ?? { samples: [], workflows: 0, nodeType: row.node_type };
		entry.samples.push(...parseSamples(row.samples));
		entry.workflows += Number(row.workflows);
		byFile.set(plan.file, entry);
	}
	return { byFile, skipped, schemaPaths };
}

/**
 * Turns query rows into schema files to write. Never overwrites: a file that
 * already exists is reported, so a hand-written schema is compared, not replaced.
 *
 * @param {object[]} rows rows of `query.sql`, `samples` as JSON strings
 * @param {Map<string, { dir: string, noOperationSiblings: string[] }>} index
 * @param {{ exists: (file: string) => boolean, defaultOf: (group: object) => 'true' | 'false' | undefined,
 *   minShare?: number }} options
 */
export function buildFiles(rows, index, { exists, defaultOf, minShare }) {
	const { keep, older } = splitByNewestVersion(rows);
	const { byFile, skipped, schemaPaths } = groupRowsByFile(keep, index, defaultOf);
	skipped.push(...older.map((group) => ({ group, reason: 'older version of the operation' })));

	const files = [];
	const existing = [];
	for (const [file, { samples, workflows, nodeType }] of byFile) {
		if (exists(file)) {
			existing.push(file);
			continue;
		}
		const schema = mergeSamples(samples, { minShare });
		const share = stableKeyShare(samples);
		if (share < MIN_KEPT_KEY_SHARE) {
			skipped.push({
				group: { file },
				reason: `user-shaped output (${Math.round(share * 100)}% of keys stable)`,
			});
			continue;
		}
		files.push({ file, nodeType, workflows, schema });
	}
	return { files, existing, skipped, schemaPaths };
}
