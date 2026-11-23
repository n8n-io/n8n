import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { realpathSync } from 'node:fs';

// File-writing nodes refuse paths with a symlinked component. The harness temp dir
// must therefore already be a resolved path, even where the OS temp dir sits behind a
// symlink, as it does on macOS (`/var` -> `/private/var`).
describe('NodeTestHarness temporaryDir', () => {
	const testHarness = new NodeTestHarness();

	it('is a fully resolved path', () => {
		const dir = testHarness.temporaryDir;

		expect(realpathSync(dir)).toBe(dir);
	});
});
