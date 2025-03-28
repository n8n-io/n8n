import type { INodeType, INodeTypeBaseDescription, IVersionedNodeType } from '../src/Interfaces';
import { deepCopy } from '../src/utils';
import { VersionedNodeType } from '../src/VersionedNodeType';

describe('VersionedNodeType', () => {
	const mockNodeTypeV1: INodeType = {
		name: 'MockNode',
		description: {
			group: [],
			version: 1,
			defaults: {},
			inputs: [],
			outputs: [],
			properties: [],
		},
	} as unknown as INodeType;
	const mockNodeTypeV2: INodeType = {
		name: 'MockNode',
		description: {
			group: [],
			version: [2, 2.1],
			defaults: {},
			inputs: [],
			outputs: [],
			properties: [],
		},
	} as unknown as INodeType;

	const nodeVersions: IVersionedNodeType['nodeVersions'] = {
		1: mockNodeTypeV1,
		2: mockNodeTypeV2,
		2.1: deepCopy(mockNodeTypeV2),
	};

	const description: INodeTypeBaseDescription = {
		name: 'MockNode',
		displayName: 'Mock Node',
		defaultVersion: 2,
		group: [],
		description: '',
	};

	it('should initialize with the correct current version', () => {
		const versionedNodeType = new VersionedNodeType(nodeVersions, description);
		expect(versionedNodeType.currentVersion).toBe(2);
	});

	it('should initialize with the latest version if defaultVersion is not provided', () => {
		const descriptionWithoutDefaultVersion = { ...description, defaultVersion: undefined };
		const versionedNodeType = new VersionedNodeType(nodeVersions, descriptionWithoutDefaultVersion);
		expect(versionedNodeType.currentVersion).toBe(2.1);
	});

	it('should return the latest version number', () => {
		const versionedNodeType = new VersionedNodeType(nodeVersions, description);
		expect(versionedNodeType.getLatestVersion()).toBe(2.1);
	});

	it('should return the correct node type for a specific version', () => {
		const versionedNodeType = new VersionedNodeType(nodeVersions, description);
		expect(versionedNodeType.getNodeType(1)).toEqual(mockNodeTypeV1);
		expect(versionedNodeType.getNodeType(2)).toEqual(mockNodeTypeV2);
		expect(versionedNodeType.getNodeType(2.1)).toEqual(mockNodeTypeV2);
	});

	it('should return the current version node type if no version is specified', () => {
		const versionedNodeType = new VersionedNodeType(nodeVersions, description);
		expect(versionedNodeType.getNodeType()).toEqual(mockNodeTypeV2);
	});

	it('should return undefined if an invalid version is requested', () => {
		const versionedNodeType = new VersionedNodeType(nodeVersions, description);
		expect(versionedNodeType.getNodeType(3)).toBeUndefined();
	});

	it('should copy inputs rather than track them by reference', () => {
		const versions = deepCopy(nodeVersions);
		versions[2.1].description.inputs = [{ type: 'ai_agent' }];
		const versionedNodeType = new VersionedNodeType(versions, description);
		versions[2.1].description.inputs = [{ type: 'main' }];
		expect(versionedNodeType.getNodeType(2)).toEqual(mockNodeTypeV2);
		expect(versionedNodeType.getNodeType(2.1)).toEqual({
			...mockNodeTypeV2,
			description: { ...mockNodeTypeV2.description, inputs: [{ type: 'ai_agent' }] },
		});
	});
});
