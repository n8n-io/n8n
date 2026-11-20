import { keysAgree, mergeSamples } from './merge.mjs';
import { planSchemaFile } from './plan.mjs';

function compareVersions(a, b) {
	const pa = String(a).split('.').map(Number);
	const pb = String(b).split('.').map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/** Accounts that a row comes from; an export without `users` counts workflows. */
function accountsOf(row) {
	return Number(row.users ?? row.workflows);
}

/** The newest version of each node operation, by `key`. */
function newestVersions(rows, key) {
	const newest = new Map();
	for (const r of rows) {
		const current = newest.get(key(r));
		if (current === undefined || compareVersions(r.node_version, current) > 0)
			newest.set(key(r), r.node_version);
	}
	return newest;
}

/**
 * Keeps the newest version of each node operation; version fallback covers
 * older ones. A version with at least `minWorkflows` workflows from
 * `minSamples` accounts wins over a newer, smaller one, because its samples filter user-defined keys better.
 */
function splitByNewestVersion(rows, { minWorkflows, minSamples }) {
	const key = (r) => [r.node_type, r.resource, r.operation].join('|');
	const newestLarge = newestVersions(
		rows.filter((r) => Number(r.workflows) >= minWorkflows && accountsOf(r) >= minSamples),
		key,
	);
	const newestAny = newestVersions(rows, key);
	const chosen = (r) => newestLarge.get(key(r)) ?? newestAny.get(key(r));
	const keep = [];
	const older = [];
	for (const r of rows) (compareVersions(r.node_version, chosen(r)) === 0 ? keep : older).push(r);
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
		const entry = byFile.get(plan.file) ?? {
			samples: [],
			workflows: 0,
			accounts: 0,
			nodeType: row.node_type,
		};
		const accounts = accountsOf(row);
		// The query orders samples by account rank: the first `users` are one per account.
		entry.samples.push(...parseSamples(row.samples.slice(0, accounts)));
		entry.workflows += Number(row.workflows);
		entry.accounts += accounts;
		byFile.set(plan.file, entry);
	}
	return { byFile, skipped, schemaPaths };
}

/**
 * A group from fewer than `minSamples` accounts is skipped. A group seen in
 * fewer than `minWorkflows` workflows is too small for the share thresholds
 * to filter user-defined keys. It is kept only when every key of every
 * sample, at every level, recurs in at least half of the samples.
 * Subsampling the large groups shows that this rule accepts about 1% of
 * user-shaped groups at 5 samples, and none at 12.
 */
function smallGroupSkip(samples, { workflows, accounts }, { minWorkflows, minSamples }) {
	if (accounts < minSamples) return 'too few accounts';
	if (workflows >= minWorkflows) return undefined;
	if (samples.length < minSamples) return 'small group: too few samples';
	if (!keysAgree(samples)) return 'small group: samples disagree';
	return undefined;
}

/** Merges the samples of one file, or says why the file is skipped. */
function mergeFile({ samples, workflows, accounts }, { minShare, minWorkflows, minSamples }) {
	const objects = samples.filter((sample) => sample.type === 'object');
	const skip = smallGroupSkip(objects, { workflows, accounts }, { minWorkflows, minSamples });
	if (skip) return { skip };
	const schema = mergeSamples(objects, { minShare });
	if (!schema.properties) return { skip: 'user-shaped output with no stable keys' };
	return { schema };
}

/**
 * Turns query rows into schema files to write. Never overwrites: a file that
 * already exists is reported, so a hand-written schema is compared, not replaced.
 *
 * @param {object[]} rows rows of `query.sql`, `samples` as JSON strings
 * @param {Map<string, { dir: string, noOperationSiblings: string[] }>} index
 * @param {{ exists: (file: string) => boolean, coveredBySameMajor?: (file: string) => boolean, defaultOf: (group: object) => 'true' | 'false' | undefined,
 *   minShare?: number, minWorkflows?: number, minSamples?: number }} options
 *   below `minWorkflows` workflows, a group needs `minSamples` samples that agree
 */
export function buildFiles(
	rows,
	index,
	{
		exists,
		coveredBySameMajor = () => false,
		defaultOf,
		minShare,
		minWorkflows = 20,
		minSamples = 5,
	},
) {
	const { keep, older } = splitByNewestVersion(rows, { minWorkflows, minSamples });
	const { byFile, skipped, schemaPaths } = groupRowsByFile(keep, index, defaultOf);
	skipped.push(
		...older.map((group) => ({ group, reason: 'not the chosen version of the operation' })),
	);

	const files = [];
	const existing = [];
	for (const [file, entry] of byFile) {
		if (exists(file)) {
			existing.push(file);
			continue;
		}
		// The resolver falls back within a major, so a new file would shadow that schema.
		if (coveredBySameMajor(file)) {
			skipped.push({ group: { file }, reason: 'covered by another version of the same major' });
			continue;
		}
		const merged = mergeFile(entry, { minShare, minWorkflows, minSamples });
		if (merged.skip) skipped.push({ group: { file }, reason: merged.skip });
		else files.push({ file, nodeType: entry.nodeType, workflows: entry.workflows, ...merged });
	}
	return { files, existing, skipped, schemaPaths };
}
