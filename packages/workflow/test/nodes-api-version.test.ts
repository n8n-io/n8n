import {
	N8N_NODES_API_VERSION,
	getNodesApiVersion,
	type NodesApiVersionCheck,
} from '../src/nodes-api-version';

const pkg = (n8nNodesApiVersion?: unknown) => ({
	n8n: n8nNodesApiVersion === undefined ? {} : { n8nNodesApiVersion },
});

describe('getNodesApiVersion', () => {
	it('treats a missing n8n section as legacy level 1', () => {
		expect(getNodesApiVersion({})).toEqual({ compatible: true, version: 1 });
	});

	it('treats a missing n8nNodesApiVersion as legacy level 1', () => {
		expect(getNodesApiVersion(pkg())).toEqual({ compatible: true, version: 1 });
	});

	it('keeps the constant at 1 on master (2.x runtime)', () => {
		expect(N8N_NODES_API_VERSION).toBe(1);
	});

	for (const declared of [1, 2, 3, 4]) {
		it(`checks declared level ${declared} against the supported level`, () => {
			const result: NodesApiVersionCheck = getNodesApiVersion(pkg(declared));
			if (declared <= N8N_NODES_API_VERSION) {
				expect(result).toEqual({ compatible: true, version: declared });
			} else {
				expect(result).toEqual({ compatible: false, reason: 'unsupported', declared });
			}
		});
	}

	for (const declared of ['3', 0, -1, 2.5, null, NaN, Infinity, true, {}]) {
		it(`rejects malformed value ${String(declared)}`, () => {
			expect(getNodesApiVersion(pkg(declared))).toEqual({
				compatible: false,
				reason: 'malformed',
				declared,
			});
		});
	}
});
