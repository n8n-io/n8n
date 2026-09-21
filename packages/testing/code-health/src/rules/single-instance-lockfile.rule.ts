import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import { CURATED_LIBS } from '../single-instance/libs.js';
import {
	describeSplit,
	findLockfileSplits,
	remediationFor,
} from '../single-instance/lockfile-splits.js';
import type { LockfileSplit } from '../single-instance/lockfile-splits.js';
import { findPackageJsonFiles, parsePackageJson } from '../utils/package-json-scanner.js';
import { parsePnpmLockGraph } from '../utils/pnpm-lock-parser.js';

/** Where to point the reader: the manifest line that forced the split, when we can name it. */
interface Anchor {
	file: string;
	line: number;
}

/**
 * A single-instance-sensitive library must resolve to exactly one pnpm peer context. A second
 * context is a second physical copy, which breaks `instanceof`, module singletons and
 * cross-package schema composition at runtime.
 *
 * This is the same invariant `verify-closure` enforces, read straight off `pnpm-lock.yaml` so it
 * gates the PR that introduces the split rather than a nightly build. The usual cause is a
 * workspace package pinning a version that fails somebody's peer range: pnpm then builds a second
 * context for that dependent, and the split cascades into anything that peers on it.
 */
export class SingleInstanceLockfileRule extends BaseRule<CodeHealthContext> {
	readonly id = 'single-instance-lockfile';
	readonly name = 'Single-instance Lockfile Splits';
	readonly description =
		'Single-instance-sensitive libraries must resolve to exactly one peer context in pnpm-lock.yaml';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const options = this.getOptions();
		const lockFile = (options.lockFile as string) ?? 'pnpm-lock.yaml';
		const libs = (options.libs as string[]) ?? CURATED_LIBS;

		const graph = parsePnpmLockGraph(rootDir, lockFile);
		const splits = findLockfileSplits(graph, libs);
		if (splits.length === 0) return [];

		const anchors = await this.buildAnchors(rootDir);
		const lockPath = path.join(rootDir, lockFile);

		return splits.map((split) => {
			const anchor = this.anchorFor(split, anchors);
			return this.createViolation(
				anchor?.file ?? lockPath,
				anchor?.line ?? 1,
				5,
				describeSplit(split),
				remediationFor(split),
			);
		});
	}

	/** `<importer>|<dep>` -> the manifest line declaring it. */
	private async buildAnchors(rootDir: string): Promise<Map<string, Anchor>> {
		const anchors = new Map<string, Anchor>();
		for (const file of await findPackageJsonFiles(rootDir)) {
			const importer = path.relative(rootDir, path.dirname(file)).split(path.sep).join('/');
			for (const dep of parsePackageJson(file).deps) {
				anchors.set(`${importer}|${dep.name}`, { file, line: dep.line });
			}
		}
		return anchors;
	}

	/** `culprits` already leads with the pinned declarations, which are the ones worth pointing at. */
	private anchorFor(split: LockfileSplit, anchors: Map<string, Anchor>): Anchor | undefined {
		for (const culprit of split.culprits) {
			const anchor = anchors.get(`${culprit.importer}|${culprit.peer}`);
			if (anchor) return anchor;
		}
		return undefined;
	}
}
