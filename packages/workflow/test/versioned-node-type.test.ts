import { NodeVersionNotFoundError } from '../src/errors';
import type { INodeType, INodeTypeBaseDescription } from '../src/interfaces';
import { VersionedNodeType } from '../src/versioned-node-type';

const v1 = { description: {} } as INodeType;
const v2 = { description: {} } as INodeType;

const baseDescription = {
	name: 'n8n-nodes-base.example',
	defaultVersion: 2,
} as INodeTypeBaseDescription;

describe('VersionedNodeType', () => {
	const versioned = new VersionedNodeType({ 1: v1, 2: v2 }, baseDescription);

	describe('getNodeType', () => {
		it('returns the requested version', () => {
			expect(versioned.getNodeType(1)).toBe(v1);
			expect(versioned.getNodeType(2)).toBe(v2);
		});

		it('falls back to the current version when none is requested', () => {
			expect(versioned.getNodeType()).toBe(v2);
		});

		it('throws NodeVersionNotFoundError with the available versions for an unknown version', () => {
			let caught: unknown;
			try {
				versioned.getNodeType(4.4);
			} catch (error) {
				caught = error;
			}

			expect(caught).toBeInstanceOf(NodeVersionNotFoundError);
			const error = caught as NodeVersionNotFoundError;
			expect(error.nodeType).toBe('n8n-nodes-base.example');
			expect(error.version).toBe(4.4);
			expect(error.availableVersions).toEqual([1, 2]);
			expect(error.latestVersion).toBe(2);
			expect(error.message).toBe(
				'Node type "n8n-nodes-base.example" is not available in version 4.4. Available versions: 1, 2. Use the latest version 2.',
			);
		});
	});
});
