import {
	N8N_NODES_API_VERSION,
	checkNodesApiVersion,
	formatNodesApiLevel,
	parseNodesApiLevel,
} from '../src/nodes-api-version';

const pkg = (n8nNodesApiVersion?: unknown) => ({
	n8n: n8nNodesApiVersion === undefined ? {} : { n8nNodesApiVersion },
});

const { major: supportedMajor, minor: supportedMinor } = parseNodesApiLevel(N8N_NODES_API_VERSION)!;

describe('N8N_NODES_API_VERSION', () => {
	it('is a level written as major.minor', () => {
		expect(N8N_NODES_API_VERSION).toBe(
			formatNodesApiLevel(parseNodesApiLevel(N8N_NODES_API_VERSION)!),
		);
	});
});

describe('checkNodesApiVersion', () => {
	it('treats a missing n8n section as legacy level 1', () => {
		expect(checkNodesApiVersion({})).toEqual({ compatible: true });
	});

	it('treats a missing n8nNodesApiVersion as legacy level 1', () => {
		expect(checkNodesApiVersion(pkg())).toEqual({ compatible: true });
	});

	it('accepts the integer 1', () => {
		expect(checkNodesApiVersion(pkg(1))).toEqual({ compatible: true });
	});

	it('accepts the supported level', () => {
		expect(checkNodesApiVersion(pkg(N8N_NODES_API_VERSION))).toEqual({ compatible: true });
	});

	it('accepts a minor below the supported one', () => {
		if (supportedMinor === 0) return;
		expect(checkNodesApiVersion(pkg(`${supportedMajor}.${supportedMinor - 1}`))).toEqual({
			compatible: true,
		});
	});

	it('rejects one minor above the supported level', () => {
		const above = `${supportedMajor}.${supportedMinor + 1}`;
		expect(checkNodesApiVersion(pkg(above))).toEqual({
			compatible: false,
			reason: 'unsupported',
			declared: above,
			required: above,
		});
	});

	it('rejects the next major at minor 0', () => {
		const above = `${supportedMajor + 1}.0`;
		expect(checkNodesApiVersion(pkg(above))).toEqual({
			compatible: false,
			reason: 'unsupported',
			declared: above,
			required: above,
		});
	});

	it('reports an integer level as major.minor', () => {
		expect(checkNodesApiVersion(pkg(supportedMajor + 1))).toMatchObject({
			required: `${supportedMajor + 1}.0`,
		});
	});

	it.each(['3.1.0', 'three', 0, -1, 2.5, 3.1, null, NaN, true, {}, '9007199254740992'])(
		'rejects the malformed value %p',
		(declared) => {
			expect(checkNodesApiVersion(pkg(declared))).toEqual({
				compatible: false,
				reason: 'malformed',
				declared,
			});
		},
	);
});
