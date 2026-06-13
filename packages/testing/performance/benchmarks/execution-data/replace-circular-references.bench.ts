import { bench, describe } from 'vitest';
import { replaceCircularReferences } from 'n8n-workflow';

function makeNodeItems(count: number): Array<{ json: Record<string, unknown> }> {
	return Array.from({ length: count }, (_, i) => ({
		json: { index: i, value: `item-${i}`, nested: { a: 1, b: 'hello', c: true } },
	}));
}

function makeRunData(nodeCount: number, itemsPerNode: number): Record<string, unknown> {
	const runData: Record<string, unknown> = {};
	for (let n = 0; n < nodeCount; n++) {
		runData[`Node ${n}`] = [{ data: { main: [makeNodeItems(itemsPerNode)] } }];
	}
	return runData;
}

function withCircular(runData: Record<string, unknown>): Record<string, unknown> {
	const copy = JSON.parse(JSON.stringify(runData)) as Record<string, unknown>;
	const socket: Record<string, unknown> = { type: 'TLSSocket' };
	socket._httpMessage = { res: socket };
	const firstNode = Object.keys(copy)[0];
	if (firstNode) {
		const node = (
			copy[firstNode] as Array<{ data: { main: Array<Array<{ json: Record<string, unknown> }>> } }>
		)[0];
		node.data.main[0][0].json.socket = socket;
	}
	return copy;
}

function withProtoKey(runData: Record<string, unknown>): Record<string, unknown> {
	const copy = JSON.parse(JSON.stringify(runData)) as Record<string, unknown>;
	const firstNode = Object.keys(copy)[0];
	if (firstNode) {
		const node = (
			copy[firstNode] as Array<{ data: { main: Array<Array<{ json: Record<string, unknown> }>> } }>
		)[0];
		Object.defineProperty(node.data.main[0][0].json, '__proto__', {
			value: { isAdmin: true },
			writable: true,
			configurable: true,
			enumerable: true,
		});
	}
	return copy;
}

const smallClean = { resultData: { runData: makeRunData(5, 10) } };
const mediumClean = { resultData: { runData: makeRunData(20, 50) } };
const largeClean = { resultData: { runData: makeRunData(50, 200) } };
const smallCircular = { resultData: { runData: withCircular(makeRunData(5, 10)) } };
const largeCircular = { resultData: { runData: withCircular(makeRunData(50, 200)) } };
const smallProto = { resultData: { runData: withProtoKey(makeRunData(5, 10)) } };
const largeProto = { resultData: { runData: withProtoKey(makeRunData(50, 200)) } };

describe('replaceCircularReferences — clean data (no circulars)', () => {
	bench('small  (5 nodes × 10 items)', () => {
		replaceCircularReferences(smallClean);
	});
	bench('medium (20 nodes × 50 items)', () => {
		replaceCircularReferences(mediumClean);
	});
	bench('large  (50 nodes × 200 items)', () => {
		replaceCircularReferences(largeClean);
	});
});

describe('replaceCircularReferences — circular data (TLSSocket chain)', () => {
	bench('small  circular', () => {
		replaceCircularReferences(smallCircular);
	});
	bench('large  circular', () => {
		replaceCircularReferences(largeCircular);
	});
});

describe('replaceCircularReferences — __proto__ key', () => {
	bench('small  with __proto__ key', () => {
		replaceCircularReferences(smallProto);
	});
	bench('large  with __proto__ key', () => {
		replaceCircularReferences(largeProto);
	});
});
