/**
 * Give Stryker's sandbox the same place in the tree as the package it copies.
 *
 * Stryker copies the package to `<tempDir>/sandbox-<id>/`. With the default
 * temp dir that copy sits one level below the package dir, so a config path
 * that leaves the package points into the temp dir and the test file does not
 * load. Examples: the cli alias `path.resolve(__dirname, '../@n8n/telemetry/src')`
 * and the `@nodes-testing` alias of nodes-base and nodes-langchain.
 *
 * The mirror fixes this. It is a chain of real directories along the
 * package's path from the repo root, with a symbolic link to each real entry
 * beside that path. Stryker gets the mirror of the package's parent dir as its
 * temp dir, so `..` from the sandbox reaches the same files as `..` from the
 * package.
 *
 * The mirror sits under `.stryker-tmp/` at the repo root, which git ignores.
 * It holds only directories and links. Removing it never follows a link.
 */
import {
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmdirSync,
	symlinkSync,
	unlinkSync,
} from 'node:fs';
import path from 'node:path';

// Entries the mirror never links. Without `.git`, git in the sandbox finds the
// real repository above the mirror, as it does from the package. A link to
// `.stryker-tmp` would put the mirror inside itself.
const UNLINKED = new Set(['.git', '.stryker-tmp']);

function linkEntries(realDir, mirrorDir, skip) {
	for (const name of readdirSync(realDir)) {
		if (name === skip || UNLINKED.has(name)) continue;
		symlinkSync(path.join(realDir, name), path.join(mirrorDir, name));
	}
}

/**
 * Remove a tree and never follow a link: a link is unlinked, not entered. A
 * missing path is not an error, so a second call does nothing.
 */
export function removeTree(target) {
	let stat;
	try {
		stat = lstatSync(target);
	} catch {
		return;
	}
	if (!stat.isDirectory()) {
		unlinkSync(target);
		return;
	}
	for (const name of readdirSync(target)) removeTree(path.join(target, name));
	rmdirSync(target);
}

/**
 * The path segments from the repo root to the package, or null when the
 * package is the repo root or lies outside it. Such a package keeps Stryker's
 * default temp dir.
 */
export function mirrorSegments(pkgRoot, repoRoot) {
	const rel = path.relative(repoRoot, pkgRoot);
	if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
	return rel.split(path.sep);
}

/**
 * Build the mirror for the package at `pkgRoot` under `parentDir`. Returns the
 * temp dir for Stryker and a `dispose` that removes the mirror, or null when
 * the package needs no mirror.
 */
export function createSandboxMirror(pkgRoot, { repoRoot, parentDir }) {
	const segments = mirrorSegments(pkgRoot, repoRoot);
	if (!segments) return null;
	mkdirSync(parentDir, { recursive: true });
	const mirrorRoot = mkdtempSync(path.join(parentDir, 'mirror-'));
	let realDir = repoRoot;
	let mirrorDir = mirrorRoot;
	try {
		for (const [index, segment] of segments.entries()) {
			linkEntries(realDir, mirrorDir, segment);
			if (index === segments.length - 1) break;
			realDir = path.join(realDir, segment);
			mirrorDir = path.join(mirrorDir, segment);
			mkdirSync(mirrorDir);
		}
	} catch (error) {
		removeMirror(mirrorRoot, parentDir);
		throw error;
	}
	return { tempDir: mirrorDir, dispose: () => removeMirror(mirrorRoot, parentDir) };
}

// Remove the mirror, then its parent dir once no other run's mirror is in it.
function removeMirror(mirrorRoot, parentDir) {
	removeTree(mirrorRoot);
	try {
		rmdirSync(parentDir);
	} catch {
		// Another run's mirror is still there, or the dir is already gone.
	}
}
