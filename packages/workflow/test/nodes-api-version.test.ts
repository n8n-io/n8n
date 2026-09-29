import { N8N_NODES_API_VERSION, checkNodesApiVersion } from '../src/nodes-api-version';

const pkg = (n8nNodesApiVersion?: unknown) => ({
	n8n: n8nNodesApiVersion === undefined ? {} : { n8nNodesApiVersion },
});

describe('checkNodesApiVersion', () => {
	it('treats a missing n8n section as legacy level 1', () => {
		expect(checkNodesApiVersion({})).toEqual({ compatible: true, version: 1 });
	});

	it('treats a missing n8nNodesApiVersion as legacy level 1', () => {
		expect(checkNodesApiVersion(pkg())).toEqual({ compatible: true, version: 1 });
	});

	// The rule under test is `required <= supported`. The expectations below
	// state that rule at its exact boundaries instead of pinning the
	// constant's value, so they survive a deliberate bump without edits.
	// They also fail if the constant degenerates (below 1 or non-integer).
	it('accepts the floor level 1', () => {
		expect(checkNodesApiVersion(pkg(1))).toEqual({ compatible: true, version: 1 });
	});

	it('accepts a package that requires exactly the supported level', () => {
		expect(checkNodesApiVersion(pkg(N8N_NODES_API_VERSION))).toEqual({
			compatible: true,
			version: N8N_NODES_API_VERSION,
		});
	});

	it('rejects a package that requires one level above the supported level', () => {
		const above = N8N_NODES_API_VERSION + 1;
		expect(checkNodesApiVersion(pkg(above))).toEqual({
			compatible: false,
			reason: 'unsupported',
			declared: above,
		});
	});

	for (const declared of ['3', 0, -1, 2.5, null, NaN, Infinity, true, {}]) {
		it(`rejects malformed value ${String(declared)}`, () => {
			expect(checkNodesApiVersion(pkg(declared))).toEqual({
				compatible: false,
				reason: 'malformed',
				declared,
			});
		});
	}
});
