import {
	N8N_NODES_API_VERSION,
	checkNodesApiVersion,
	parseNodesApiLevel,
} from '../src/nodes-api-version';

const pkg = (n8nNodesApiVersion?: unknown) => ({
	n8n: n8nNodesApiVersion === undefined ? {} : { n8nNodesApiVersion },
});

const supported = parseNodesApiLevel(N8N_NODES_API_VERSION);

/** The level one minor above `[major, minor]`, rendered as a package would declare it. */
const oneMinorAbove = ([major, minor]: [number, number]) => `${major}.${minor + 1}`;

describe('parseNodesApiLevel', () => {
	it('parses the supported level constant', () => {
		// The fallback in `checkNodesApiVersion` is unreachable while this holds.
		expect(supported).not.toBeNull();
	});

	it.each([
		[1, [1, 0]],
		[3, [3, 0]],
		['3', [3, 0]],
		['3.0', [3, 0]],
		['3.1', [3, 1]],
		// The case a decimal number cannot express: minor 10 is not minor 1.
		['3.10', [3, 10]],
		[' 3.2 ', [3, 2]],
	])('parses %p as %p', (value, expected) => {
		expect(parseNodesApiLevel(value)).toEqual(expected);
	});

	it.each([0, -1, 2.5, 3.1, '0', '3.', '.1', '3.1.2', 'v3', '', null, NaN, Infinity, true, {}])(
		'rejects %p',
		(value) => {
			expect(parseNodesApiLevel(value)).toBeNull();
		},
	);
});

describe('checkNodesApiVersion', () => {
	it('treats a missing n8n section as legacy level 1', () => {
		expect(checkNodesApiVersion({})).toEqual({ compatible: true });
	});

	it('treats a missing n8nNodesApiVersion as legacy level 1', () => {
		expect(checkNodesApiVersion(pkg())).toEqual({ compatible: true });
	});

	// The rule under test is `required <= supported`, compared major then minor.
	// The expectations below state that rule at its exact boundaries instead of
	// pinning the constant's value, so they survive a deliberate bump.
	it('accepts the floor level 1', () => {
		expect(checkNodesApiVersion(pkg(1))).toEqual({ compatible: true });
	});

	it('accepts a package that requires exactly the supported level', () => {
		expect(checkNodesApiVersion(pkg(N8N_NODES_API_VERSION))).toEqual({ compatible: true });
	});

	it('accepts the legacy integer form of the supported major', () => {
		expect(checkNodesApiVersion(pkg(supported![0]))).toEqual({ compatible: true });
	});

	it('rejects a package that requires one minor above the supported level', () => {
		const above = oneMinorAbove(supported!);
		expect(checkNodesApiVersion(pkg(above))).toEqual({
			compatible: false,
			reason: 'unsupported',
			declared: above,
		});
	});

	it('rejects a package that requires a newer major even at minor 0', () => {
		const above = `${supported![0] + 1}.0`;
		expect(checkNodesApiVersion(pkg(above))).toEqual({
			compatible: false,
			reason: 'unsupported',
			declared: above,
		});
	});

	for (const declared of ['3.1.0', 'three', 0, -1, 2.5, null, NaN, Infinity, true, {}]) {
		it(`rejects malformed value ${String(declared)}`, () => {
			expect(checkNodesApiVersion(pkg(declared))).toEqual({
				compatible: false,
				reason: 'malformed',
				declared,
			});
		});
	}
});
