import type { LockGraph } from '../utils/pnpm-lock-parser.js';

/**
 * Detect curated libraries that pnpm resolved into more than one peer context.
 *
 * `verify-closure` / `verify-npm-install` catch the same defect, but only after an install: one
 * needs a built production closure, the other packs every publishable package. Both are too slow
 * to gate a PR, so a split lands on master and is found later. The lockfile already records the
 * answer — one `snapshots:` key per physical copy — so the same invariant is checkable in
 * milliseconds, on the diff that introduces it.
 */

/** A peer whose resolved version differs between two contexts of the same library. */
export interface PeerDelta {
	name: string;
	versions: string[];
}

export interface SplitVariant {
	/** Full `snapshots:` key. */
	key: string;
	/** Importers (repo-relative) that resolve the library to this context. */
	importers: string[];
}

/** A workspace package that declares a differing peer directly — the likeliest place to fix. */
export interface SplitCulprit {
	importer: string;
	peer: string;
	specifier: string;
	resolved: string;
}

export interface LockfileSplit {
	lib: string;
	variants: SplitVariant[];
	differingPeers: PeerDelta[];
	culprits: SplitCulprit[];
}

/**
 * Every `name@version` atom in a snapshot key's peer suffix, at any nesting depth.
 *
 * Depth is not meaningful here and the differentiator is often nested — an unmet peer of a peer.
 * Peer atoms never contain a parenthesis, so splitting on them yields exactly the atom list; the
 * leading fragment is the library's own version and is dropped. Non-`name@version` fragments
 * (`patch_hash=…`) carry no version to compare and are skipped.
 */
export function peerAtoms(key: string): Map<string, string> {
	const atoms = new Map<string, string>();
	const [, ...fragments] = key.split(/[()]/);
	for (const fragment of fragments) {
		if (!fragment) continue;
		const at = fragment.lastIndexOf('@');
		if (at <= 0) continue;
		atoms.set(fragment.slice(0, at), fragment.slice(at + 1));
	}
	return atoms;
}

/** Peers that do not resolve identically across every context. */
function diffPeers(keys: string[]): PeerDelta[] {
	const perKey = keys.map(peerAtoms);
	const names = new Set(perKey.flatMap((atoms) => [...atoms.keys()]));
	const deltas: PeerDelta[] = [];
	for (const name of names) {
		// `undefined` (absent in that context) is itself a difference, so compare the raw list.
		const versions = [...new Set(perKey.map((atoms) => atoms.get(name) ?? '(absent)'))];
		if (versions.length > 1) deltas.push({ name, versions: versions.sort() });
	}
	return deltas.sort((a, b) => a.name.localeCompare(b.name));
}

/** A declaration that can fork the graph: an explicit range, not a catalog or workspace reference. */
export function isPinned(culprit: SplitCulprit): boolean {
	return !culprit.specifier.startsWith('catalog:') && !culprit.specifier.startsWith('workspace:');
}

export function findLockfileSplits(graph: LockGraph, libs: readonly string[]): LockfileSplit[] {
	const splits: LockfileSplit[] = [];

	for (const lib of libs) {
		const keys = (graph.snapshotKeys.get(lib) ?? []).slice().sort();
		if (keys.length <= 1) continue;

		const variants: SplitVariant[] = keys.map((key) => ({ key, importers: [] }));
		for (const [importerPath, deps] of graph.importers) {
			const resolved = deps.get(lib);
			if (!resolved) continue;
			// The lockfile records an importer's resolution without the name prefix a snapshot key has.
			const variant = variants.find((v) => v.key === `${lib}@${resolved.version}`);
			variant?.importers.push(importerPath);
		}

		const differingPeers = diffPeers(keys);
		const differingNames = new Set(differingPeers.map((p) => p.name));
		const culprits: SplitCulprit[] = [];
		for (const [importerPath, deps] of graph.importers) {
			for (const [name, dep] of deps) {
				if (!differingNames.has(name)) continue;
				culprits.push({
					importer: importerPath,
					peer: name,
					specifier: dep.specifier,
					resolved: dep.version,
				});
			}
		}
		// Hardcoded pins first: a `catalog:` reference resolves to one version everywhere, so it is
		// never what forked the graph — it is only ever collateral.
		culprits.sort((a, b) => Number(isPinned(b)) - Number(isPinned(a)));

		splits.push({ lib, variants, differingPeers, culprits });
	}

	return splits;
}

/** A cascading split can touch dozens of entries; the first few carry the diagnosis. */
const MAX_LISTED = 3;

function list(items: string[], separator = ', '): string {
	const shown = items.slice(0, MAX_LISTED).join(separator);
	const rest = items.length - MAX_LISTED;
	return rest > 0 ? `${shown} (+${rest} more)` : shown;
}

/** Human-readable diagnosis: what split, along which peer, and who declares it. */
export function describeSplit(split: LockfileSplit): string {
	const parts = [
		`"${split.lib}" resolves to ${split.variants.length} peer contexts in pnpm-lock.yaml, so it is installed ${split.variants.length} times.`,
	];

	if (split.differingPeers.length > 0) {
		const peers = split.differingPeers.map((p) => `${p.name} (${p.versions.join(' vs ')})`);
		parts.push(`The contexts differ on: ${list(peers)}.`);
	}

	if (split.culprits.length > 0) {
		const declarations = split.culprits.map(
			(c) => `${c.importer} declares ${c.peer} "${c.specifier}"`,
		);
		parts.push(`Declared directly by: ${list(declarations, '; ')}.`);
	}

	const byVariant = split.variants
		.filter((v) => v.importers.length > 0)
		.map((v) => list(v.importers))
		.join(' | ');
	if (byVariant) parts.push(`Split across importers: ${byVariant}.`);

	return parts.join(' ');
}
