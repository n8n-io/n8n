import type { INodeTypeDescription } from '../src/interfaces';
import { Node, isNodeClassInstance } from '../src/interfaces';

/**
 * `isNodeClassInstance` is a replacement for `instanceof Node`, which fails when n8n-workflow
 * is duplicated in the dependency tree in certain setups (namely, n8n installed via npm).
 */

const description = {} as INodeTypeDescription;

class RealNode extends Node {
	description = description;
}

describe('isNodeClassInstance', () => {
	it('returns true for an instance of a Node subclass', () => {
		expect(isNodeClassInstance(new RealNode())).toBe(true);
	});

	it('returns true for an instance created via Object.create(Node.prototype)', () => {
		expect(isNodeClassInstance(Object.create(Node.prototype))).toBe(true);
	});

	it('returns true for a Node subclass from a duplicated n8n-workflow copy', () => {
		// A second copy brands its own prototype with the same global symbol. Model that: an object
		// whose prototype carries the tag but which is NOT instanceof this copy's Node.
		const duplicatedProto = {};
		Object.defineProperty(duplicatedProto, Symbol.for('n8n.workflow.NodeClass'), { value: true });
		const nodeFromOtherCopy = Object.create(duplicatedProto) as object;

		expect(nodeFromOtherCopy instanceof Node).toBe(false);
		expect(isNodeClassInstance(nodeFromOtherCopy)).toBe(true);
	});

	it('returns false for a legacy object-literal node', () => {
		expect(isNodeClassInstance({ description })).toBe(false);
	});

	it('returns false for a legacy class node that does not extend Node', () => {
		class LegacyNode {
			description = description;
		}
		expect(isNodeClassInstance(new LegacyNode())).toBe(false);
	});

	it('returns false for non-object values', () => {
		expect(isNodeClassInstance(null)).toBe(false);
		expect(isNodeClassInstance(undefined)).toBe(false);
		expect(isNodeClassInstance('test')).toBe(false);
		expect(isNodeClassInstance(67)).toBe(false);
		expect(isNodeClassInstance(true)).toBe(false);
	});
});
