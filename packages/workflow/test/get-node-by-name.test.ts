import { getNodeByName } from '../src/common';
import type { INode, INodes } from '../src/interfaces';

function makeNode(name: string, id = `id-${name}`): INode {
	return {
		id,
		name,
		typeVersion: 1,
		type: 'test.node',
		position: [0, 0],
		parameters: {},
	};
}

describe('getNodeByName (array overload)', () => {
	const a = makeNode('A');
	const b = makeNode('B');
	const c = makeNode('C');
	const arr: INode[] = [a, b, c];

	test.each([
		['A', a],
		['B', b],
		['C', c],
	])('returns the node whose name === %s', (name, expected) => {
		const result = getNodeByName(arr, name);
		expect(result).toBe(expected);
		expect(result?.name).toBe(name);
	});

	it('returns null when no node has the requested name', () => {
		const result = getNodeByName(arr, 'NotPresent');
		expect(result).toBeNull();
		expect(result).not.toBeUndefined();
	});

	it('returns null (not undefined) for an empty array', () => {
		const result = getNodeByName([], 'A');
		expect(result).toBeNull();
		expect(result).not.toBeUndefined();
	});

	it('matches by strict equality and is case-sensitive', () => {
		expect(getNodeByName(arr, 'a')).toBeNull();
		expect(getNodeByName(arr, 'A ')).toBeNull();
		expect(getNodeByName(arr, ' A')).toBeNull();
	});

	it('returns the FIRST match when duplicates exist (Array.prototype.find semantics)', () => {
		const firstA = makeNode('A', 'first');
		const secondA = makeNode('A', 'second');
		const result = getNodeByName([firstA, secondA], 'A');
		expect(result).toBe(firstA);
		expect(result).not.toBe(secondA);
	});

	it('compares against the node.name property (not id, type, or position)', () => {
		const node = { ...makeNode('Real'), id: 'Fake' };
		// Searching by the id value must not match — comparison is on `name`
		expect(getNodeByName([node], 'Fake')).toBeNull();
		expect(getNodeByName([node], 'Real')).toBe(node);
	});

	it('treats empty string name as a real lookup (returns null when no node is named "")', () => {
		expect(getNodeByName(arr, '')).toBeNull();
	});

	it('returns a node literally named "" when searching for ""', () => {
		const blank = makeNode('');
		expect(getNodeByName([blank, ...arr], '')).toBe(blank);
	});
});

describe('getNodeByName (record overload)', () => {
	const a = makeNode('A');
	const b = makeNode('B');
	const record: INodes = { A: a, B: b };

	test.each([
		['A', a],
		['B', b],
	])('returns nodes[%s] when key exists', (name, expected) => {
		expect(getNodeByName(record, name)).toBe(expected);
	});

	it('returns null when key is missing', () => {
		const result = getNodeByName(record, 'Missing');
		expect(result).toBeNull();
		expect(result).not.toBeUndefined();
	});

	it('returns null for an empty record', () => {
		const result = getNodeByName({} as INodes, 'A');
		expect(result).toBeNull();
	});

	it('uses key lookup, not the inner node.name', () => {
		// Stored under key 'KeyName' but the node's own .name is 'OtherName'
		const node = makeNode('OtherName');
		const r: INodes = { KeyName: node };
		expect(getNodeByName(r, 'KeyName')).toBe(node);
		expect(getNodeByName(r, 'OtherName')).toBeNull();
	});

	it('uses hasOwnProperty so inherited Object.prototype keys do not resolve', () => {
		// Searching for 'toString' / 'hasOwnProperty' / 'constructor' must NOT
		// return Object.prototype members — only own properties count.
		expect(getNodeByName({} as INodes, 'toString')).toBeNull();
		expect(getNodeByName({} as INodes, 'hasOwnProperty')).toBeNull();
		expect(getNodeByName({} as INodes, 'constructor')).toBeNull();
	});

	it('returns own property even when its name shadows an Object.prototype key', () => {
		const shadow = makeNode('toString');
		const r: INodes = { toString: shadow };
		expect(getNodeByName(r, 'toString')).toBe(shadow);
	});

	it('does not confuse record and array overloads (record path is taken for plain objects)', () => {
		// A plain object with a numeric-ish key — must go via hasOwnProperty,
		// NOT via Array.prototype.find on values.
		const node = makeNode('X');
		const r: INodes = { X: node };
		expect(getNodeByName(r, 'X')).toBe(node);
		// And a value lookup that *would* match if we accidentally searched values:
		expect(getNodeByName(r, 'NotAKey')).toBeNull();
	});
});
