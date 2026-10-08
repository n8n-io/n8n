import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createSandboxMirror, mirrorSegments, removeTree } from './sandbox-mirror.mjs';

let repo;

beforeEach(() => {
	repo = mkdtempSync(path.join(tmpdir(), 'mutate-mirror-'));
});

afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
});

// A small repo: the package under test, two packages its config reaches with
// `..`, a root dependency and a git dir.
const REAL_FILES = {
	pkgSource: 'packages/@n8n/pkg/src/a.ts',
	telemetry: 'packages/@n8n/telemetry/src/index.ts',
	nodesTesting: 'packages/core/nodes-testing/helper.ts',
	rootDependency: 'node_modules/dep/index.js',
	gitHead: '.git/HEAD',
};

function seedRepo() {
	for (const [name, file] of Object.entries(REAL_FILES)) {
		mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
		writeFileSync(path.join(repo, file), `${name}\n`);
	}
	return path.join(repo, 'packages/@n8n/pkg');
}

function mirrorFor(pkgRoot) {
	return createSandboxMirror(pkgRoot, {
		repoRoot: repo,
		parentDir: path.join(repo, '.stryker-tmp'),
	});
}

// Where Stryker would put the copy of the package.
function sandboxIn(tempDir) {
	const sandbox = path.join(tempDir, 'sandbox-1');
	mkdirSync(sandbox);
	return sandbox;
}

describe('createSandboxMirror', () => {
	it('puts the temp dir at the same depth as the package', () => {
		const mirror = mirrorFor(seedRepo());
		assert.match(mirror.tempDir, /\.stryker-tmp\/mirror-[^/]+\/packages\/@n8n$/);
		mirror.dispose();
	});

	// The cli alias `../@n8n/telemetry/src` and the `@nodes-testing` alias
	// `../../core/nodes-testing` both have to reach the real files.
	it('lets `..` paths from the sandbox reach the same files as from the package', () => {
		const mirror = mirrorFor(seedRepo());
		const sandbox = sandboxIn(mirror.tempDir);
		const read = (rel) => readFileSync(path.resolve(sandbox, rel), 'utf8');
		assert.equal(read('../telemetry/src/index.ts'), 'telemetry\n');
		assert.equal(read('../../core/nodes-testing/helper.ts'), 'nodesTesting\n');
		assert.equal(read('../../../node_modules/dep/index.js'), 'rootDependency\n');
		mirror.dispose();
	});

	// The sandbox is the package. git in the sandbox must find the real
	// repository above the mirror, not a link to its git dir.
	it('links neither the package itself, nor the git dir, nor the temp dir', () => {
		const mirror = mirrorFor(seedRepo());
		const mirrorRoot = path.resolve(mirror.tempDir, '../..');
		assert.equal(existsSync(path.join(mirror.tempDir, 'pkg')), false);
		assert.equal(existsSync(path.join(mirrorRoot, '.git')), false);
		assert.equal(existsSync(path.join(mirrorRoot, '.stryker-tmp')), false);
		mirror.dispose();
	});

	it('needs no mirror for a package at the repo root or outside the repo', () => {
		assert.equal(mirrorFor(repo), null);
		assert.equal(mirrorFor(path.join(tmpdir(), 'elsewhere')), null);
	});

	it('removes a half-built mirror when a dir on the path cannot be read', () => {
		seedRepo();
		assert.throws(() => mirrorFor(path.join(repo, 'packages/missing/pkg')), /ENOENT/);
		assert.equal(existsSync(path.join(repo, '.stryker-tmp')), false);
	});
});

describe('the mirror dispose', () => {
	it('removes the mirror and leaves every real file in place', () => {
		const mirror = mirrorFor(seedRepo());
		mirror.dispose();
		assert.equal(existsSync(path.join(repo, '.stryker-tmp')), false);
		for (const file of Object.values(REAL_FILES))
			assert.ok(existsSync(path.join(repo, file)), file);
	});

	// Stryker links `node_modules` into its sandbox. A crash can leave the
	// sandbox behind, and removing it must not enter that link.
	it('removes a sandbox left behind without following its links', () => {
		const mirror = mirrorFor(seedRepo());
		const sandbox = sandboxIn(mirror.tempDir);
		writeFileSync(path.join(sandbox, 'copy.ts'), 'copy\n');
		symlinkSync(path.join(repo, 'node_modules'), path.join(sandbox, 'node_modules'));
		mirror.dispose();
		assert.equal(existsSync(sandbox), false);
		assert.ok(existsSync(path.join(repo, REAL_FILES.rootDependency)));
	});

	// Runs in two packages can overlap. One run must not remove the other's mirror.
	it("keeps the parent dir while another run's mirror is in it", () => {
		const pkgRoot = seedRepo();
		const first = mirrorFor(pkgRoot);
		const second = mirrorFor(pkgRoot);
		first.dispose();
		assert.ok(existsSync(second.tempDir));
		second.dispose();
		assert.equal(existsSync(path.join(repo, '.stryker-tmp')), false);
	});

	it('does nothing the second time', () => {
		const mirror = mirrorFor(seedRepo());
		mirror.dispose();
		mirror.dispose();
		assert.ok(existsSync(path.join(repo, REAL_FILES.telemetry)));
	});
});

describe('removeTree', () => {
	it('unlinks a link to a directory and keeps the directory', () => {
		seedRepo();
		const link = path.join(repo, 'link');
		symlinkSync(path.join(repo, 'packages'), link);
		removeTree(link);
		assert.throws(() => lstatSync(link), /ENOENT/);
		assert.ok(existsSync(path.join(repo, REAL_FILES.pkgSource)));
	});

	it('ignores a path that does not exist', () => {
		assert.doesNotThrow(() => removeTree(path.join(repo, 'missing')));
	});
});

describe('mirrorSegments', () => {
	it('gives the path from the repo root to the package', () => {
		assert.deepEqual(mirrorSegments('/repo/packages/@n8n/pkg', '/repo'), [
			'packages',
			'@n8n',
			'pkg',
		]);
	});

	it('gives null for the repo root and for a path outside it', () => {
		assert.equal(mirrorSegments('/repo', '/repo'), null);
		assert.equal(mirrorSegments('/other/pkg', '/repo'), null);
		assert.equal(mirrorSegments('/repository/pkg', '/repo'), null);
	});
});
