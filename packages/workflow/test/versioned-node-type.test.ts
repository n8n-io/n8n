import { VersionedNodeType } from '../src/versioned-node-type';
import type { INodeTypeBaseDescription, INodeType } from '../src/interfaces';

describe('VersionedNodeType', () => {
	const createMockNodeType = (version: number): INodeType => ({
		description: {
			displayName: `Test Node v${version}`,
			name: 'testNode',
			group: ['test'],
			version,
			description: `Test node version ${version}`,
			defaults: {},
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
		},
		execute: vi.fn().mockName(`execute-v${version}`),
	});

	const createMockBaseDescription = (defaultVersion?: number): INodeTypeBaseDescription => ({
		displayName: 'Test Node',
		name: 'testNode',
		group: ['test'],
		description: 'Test node description',
		defaultVersion,
	});

	describe('constructor', () => {
		it('should initialize with provided node versions and description', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				2: createMockNodeType(2),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.nodeVersions).toBe(nodeVersions);
			expect(versionedNode.description).toBe(description);
		});

		it('should use defaultVersion from description when provided', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				2: createMockNodeType(2),
				3: createMockNodeType(3),
			};
			const description = createMockBaseDescription(2);

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.currentVersion).toBe(2);
		});

		it('should use latest version when defaultVersion is not provided', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				2: createMockNodeType(2),
				3: createMockNodeType(3),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.currentVersion).toBe(3);
		});

		it('should handle single version', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.currentVersion).toBe(1);
		});

		it('should handle non-sequential version numbers', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				5: createMockNodeType(5),
				3: createMockNodeType(3),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.currentVersion).toBe(5);
		});

		it('should handle defaultVersion undefined explicitly', () => {
			const nodeVersions = {
				2: createMockNodeType(2),
				4: createMockNodeType(4),
			};
			const description = createMockBaseDescription(undefined);

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.currentVersion).toBe(4);
		});
	});

	describe('getLatestVersion', () => {
		it('should return the highest version number', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				3: createMockNodeType(3),
				2: createMockNodeType(2),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.getLatestVersion()).toBe(3);
		});

		it('should handle single version', () => {
			const nodeVersions = {
				7: createMockNodeType(7),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.getLatestVersion()).toBe(7);
		});

		it('should handle non-sequential versions', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				10: createMockNodeType(10),
				5: createMockNodeType(5),
				20: createMockNodeType(20),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.getLatestVersion()).toBe(20);
		});

		it('should work with decimal-like version numbers (stored as strings)', () => {
			const nodeVersions = {
				'1': createMockNodeType(1),
				'2': createMockNodeType(2),
				'10': createMockNodeType(10),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.getLatestVersion()).toBe(10);
		});
	});

	describe('getNodeType', () => {
		let versionedNode: VersionedNodeType;
		let nodeVersions: Record<number, INodeType>;

		beforeEach(() => {
			nodeVersions = {
				1: createMockNodeType(1),
				2: createMockNodeType(2),
				3: createMockNodeType(3),
			};
			const description = createMockBaseDescription(2); // Set default to version 2
			versionedNode = new VersionedNodeType(nodeVersions, description);
		});

		it('should return the current version when no version specified', () => {
			const nodeType = versionedNode.getNodeType();

			expect(nodeType).toBe(nodeVersions[2]);
			expect(nodeType.description.version).toBe(2);
		});

		it('should return specific version when version is specified', () => {
			const nodeTypeV1 = versionedNode.getNodeType(1);
			const nodeTypeV3 = versionedNode.getNodeType(3);

			expect(nodeTypeV1).toBe(nodeVersions[1]);
			expect(nodeTypeV1.description.version).toBe(1);

			expect(nodeTypeV3).toBe(nodeVersions[3]);
			expect(nodeTypeV3.description.version).toBe(3);
		});

		it('should return undefined for non-existent version', () => {
			const nonExistentNodeType = versionedNode.getNodeType(99);

			expect(nonExistentNodeType).toBeUndefined();
		});

		it('should handle version 0 (falls back to current version due to falsy check)', () => {
			// Create a fresh nodeVersions object with version 0
			const nodeVersionsWithZero = {
				0: createMockNodeType(0),
				1: createMockNodeType(1),
				2: createMockNodeType(2),
			};
			const description = createMockBaseDescription();
			const versionedNodeWithZero = new VersionedNodeType(nodeVersionsWithZero, description);

			// Due to implementation bug: getNodeType(0) falls back to currentVersion (2)
			// because if (version) treats 0 as falsy
			const nodeTypeV0 = versionedNodeWithZero.getNodeType(0);

			expect(nodeTypeV0).toBe(nodeVersionsWithZero[2]); // Returns version 2, not 0
			expect(nodeTypeV0?.description.version).toBe(2);
		});

		it('should handle negative version numbers', () => {
			const nodeTypeNegative = versionedNode.getNodeType(-1);

			expect(nodeTypeNegative).toBeUndefined();
		});
	});

	describe('Integration scenarios', () => {
		it('should work correctly when defaultVersion equals latest version', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				2: createMockNodeType(2),
				3: createMockNodeType(3),
			};
			const description = createMockBaseDescription(3);

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.currentVersion).toBe(3);
			expect(versionedNode.getLatestVersion()).toBe(3);
			expect(versionedNode.getNodeType()).toBe(nodeVersions[3]);
		});

		it('should work correctly when defaultVersion is less than latest version', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				2: createMockNodeType(2),
				3: createMockNodeType(3),
			};
			const description = createMockBaseDescription(1);

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.currentVersion).toBe(1);
			expect(versionedNode.getLatestVersion()).toBe(3);
			expect(versionedNode.getNodeType()).toBe(nodeVersions[1]);
			expect(versionedNode.getNodeType(3)).toBe(nodeVersions[3]);
		});

		it('should maintain reference integrity', () => {
			const nodeV1 = createMockNodeType(1);
			const nodeV2 = createMockNodeType(2);
			const nodeVersions = {
				1: nodeV1,
				2: nodeV2,
			};
			const description = createMockBaseDescription(1);

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			// Should return the exact same object references
			expect(versionedNode.getNodeType(1)).toBe(nodeV1);
			expect(versionedNode.getNodeType(2)).toBe(nodeV2);
			expect(versionedNode.getNodeType()).toBe(nodeV1);
		});

		it('should handle complex version numbering schemes', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
				11: createMockNodeType(11),
				2: createMockNodeType(2),
				21: createMockNodeType(21),
				3: createMockNodeType(3),
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.getLatestVersion()).toBe(21);
			expect(versionedNode.currentVersion).toBe(21);
			expect(versionedNode.getNodeType()).toBe(nodeVersions[21]);
		});
	});

	describe('Error handling and edge cases', () => {
		it('should handle empty nodeVersions object', () => {
			const nodeVersions = {};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.getLatestVersion()).toBe(-Infinity);
			expect(versionedNode.currentVersion).toBe(-Infinity);
		});

		it('should handle nodeVersions with string keys that are not numeric', () => {
			const nodeVersions = {
				'1': createMockNodeType(1),
				'2': createMockNodeType(2),
				abc: createMockNodeType(99) as any, // Invalid key
			};
			const description = createMockBaseDescription();

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			// Math.max with NaN returns NaN, so we expect NaN
			expect(versionedNode.getLatestVersion()).toBeNaN();
		});

		it('should preserve all properties of the description', () => {
			const nodeVersions = {
				1: createMockNodeType(1),
			};
			const description: INodeTypeBaseDescription = {
				displayName: 'Custom Node',
				name: 'customNode',
				group: ['transform'],
				description: 'A custom test node',
				defaultVersion: 1,
				codex: {
					categories: ['Data Transformation'],
					subcategories: {
						'Data Transformation': ['Text'],
					},
					resources: {
						primaryDocumentation: [
							{
								url: 'https://example.com/docs',
							},
						],
					},
				},
			};

			const versionedNode = new VersionedNodeType(nodeVersions, description);

			expect(versionedNode.description).toBe(description);
			expect(versionedNode.description.displayName).toBe('Custom Node');
			expect(versionedNode.description.name).toBe('customNode');
			expect(versionedNode.description.group).toEqual(['transform']);
			expect(versionedNode.description.codex).toBeDefined();
		});
	});
});
