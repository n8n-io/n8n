import {
	deriveEmptyGroupProjection,
	reconcileEmptyGroupConnections,
	validateEmptyGroupConnectionState,
} from '../src/empty-group-connection-reconciliation';
import {
	NodeConnectionTypes,
	type IConnection,
	type IConnections,
	type INode,
	type IWorkflowGroup,
	type IWorkflowGroupFrame,
	type IWorkflowGroupVisualLink,
	type IWorkflowGroupVisualLinkEndpoint,
	type IWorkflowGroupVisualLinkGroupEndpoint,
	type IWorkflowGroupVisualLinkNodeEndpoint,
} from '../src/interfaces';

function makeNode(id: string, name = id.toUpperCase()): INode {
	return {
		id,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function makeEmptyGroup(
	id: string,
	visualLinks: IWorkflowGroupVisualLink[] = [],
	frame: IWorkflowGroupFrame = { position: [0, 0], size: [240, 160] },
): IWorkflowGroup {
	return {
		id,
		name: id,
		nodeIds: [],
		frame,
		visualLinks,
	};
}

function nodeEndpoint(id: string, index = 0): IWorkflowGroupVisualLinkNodeEndpoint {
	return { kind: 'node', id, port: { type: NodeConnectionTypes.Main, index } };
}

function groupEndpoint(id: string): IWorkflowGroupVisualLinkGroupEndpoint {
	return { kind: 'group', id, port: { type: NodeConnectionTypes.Main, index: 0 } };
}

function visualLink(
	source: IWorkflowGroupVisualLinkEndpoint,
	target: IWorkflowGroupVisualLinkEndpoint,
): IWorkflowGroupVisualLink {
	return { source, target };
}

function connection(node: string, index = 0): IConnection {
	return { node, type: NodeConnectionTypes.Main, index };
}

describe('empty-group connection projection', () => {
	it.each([
		['no empty groups', []],
		['an empty group with no links', [makeEmptyGroup('g')]],
		[
			'an incoming link without an outgoing link',
			[makeEmptyGroup('g', [visualLink(nodeEndpoint('a'), groupEndpoint('g'))])],
		],
		[
			'an outgoing link without an incoming link',
			[makeEmptyGroup('g', [visualLink(groupEndpoint('g'), nodeEndpoint('b'))])],
		],
	] satisfies Array<[string, IWorkflowGroup[]]>)('projects nothing for %s', (_name, nodeGroups) => {
		const result = deriveEmptyGroupProjection({
			nodes: [makeNode('a'), makeNode('b')],
			nodeGroups,
		});

		expect(result).toEqual({ success: true, projection: [] });
	});

	it('projects one complete node-to-group-to-node path', () => {
		const group = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a'), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('b')),
		]);

		const result = deriveEmptyGroupProjection({
			nodes: [makeNode('a'), makeNode('b')],
			nodeGroups: [group],
		});

		expect(result).toEqual({
			success: true,
			projection: [
				{
					sourceNode: 'A',
					sourceType: NodeConnectionTypes.Main,
					sourceIndex: 0,
					targetNode: 'B',
					targetType: NodeConnectionTypes.Main,
					targetIndex: 0,
				},
			],
		});
	});

	it('projects every many-to-many route and keeps the real node port indexes', () => {
		const group = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a', 1), groupEndpoint('g')),
			visualLink(nodeEndpoint('c', 2), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('b', 3)),
			visualLink(groupEndpoint('g'), nodeEndpoint('d', 4)),
		]);

		const result = deriveEmptyGroupProjection({
			nodes: [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')],
			nodeGroups: [group],
		});

		expect(result).toEqual({
			success: true,
			projection: [
				{
					sourceNode: 'A',
					sourceType: NodeConnectionTypes.Main,
					sourceIndex: 1,
					targetNode: 'B',
					targetType: NodeConnectionTypes.Main,
					targetIndex: 3,
				},
				{
					sourceNode: 'C',
					sourceType: NodeConnectionTypes.Main,
					sourceIndex: 2,
					targetNode: 'B',
					targetType: NodeConnectionTypes.Main,
					targetIndex: 3,
				},
				{
					sourceNode: 'A',
					sourceType: NodeConnectionTypes.Main,
					sourceIndex: 1,
					targetNode: 'D',
					targetType: NodeConnectionTypes.Main,
					targetIndex: 4,
				},
				{
					sourceNode: 'C',
					sourceType: NodeConnectionTypes.Main,
					sourceIndex: 2,
					targetNode: 'D',
					targetType: NodeConnectionTypes.Main,
					targetIndex: 4,
				},
			],
		});
	});

	it('projects a path through a chain of empty groups', () => {
		const firstGroup = makeEmptyGroup('g1', [
			visualLink(nodeEndpoint('a'), groupEndpoint('g1')),
			visualLink(groupEndpoint('g1'), groupEndpoint('g2')),
		]);
		const secondGroup = makeEmptyGroup('g2', [visualLink(groupEndpoint('g2'), nodeEndpoint('b'))]);

		const result = deriveEmptyGroupProjection({
			nodes: [makeNode('a'), makeNode('b')],
			nodeGroups: [firstGroup, secondGroup],
		});

		expect(result).toMatchObject({
			success: true,
			projection: [{ sourceNode: 'A', sourceIndex: 0, targetNode: 'B', targetIndex: 0 }],
		});
	});

	it('rejects two branched visual paths that project to the same executable connection', () => {
		const groups = [
			makeEmptyGroup('g1', [
				visualLink(nodeEndpoint('a'), groupEndpoint('g1')),
				visualLink(groupEndpoint('g1'), groupEndpoint('g2')),
				visualLink(groupEndpoint('g1'), groupEndpoint('g3')),
			]),
			makeEmptyGroup('g2', [visualLink(groupEndpoint('g2'), groupEndpoint('g4'))]),
			makeEmptyGroup('g3', [visualLink(groupEndpoint('g3'), groupEndpoint('g4'))]),
			makeEmptyGroup('g4', [visualLink(groupEndpoint('g4'), nodeEndpoint('b'))]),
		];

		const result = deriveEmptyGroupProjection({
			nodes: [makeNode('a'), makeNode('b')],
			nodeGroups: groups,
		});

		expect(result).toMatchObject({
			success: false,
			issues: [{ code: 'duplicate-projected-connection' }],
		});
	});

	it('rejects a visual link stored by a group that does not own it', () => {
		const groups = [
			makeEmptyGroup('g'),
			makeEmptyGroup('other', [visualLink(nodeEndpoint('a'), groupEndpoint('g'))]),
		];

		const result = deriveEmptyGroupProjection({ nodes: [makeNode('a')], nodeGroups: groups });

		expect(result).toMatchObject({
			success: false,
			issues: [{ code: 'invalid-visual-link-owner' }],
		});
	});

	it.each([
		[
			'node',
			[makeEmptyGroup('g', [visualLink(nodeEndpoint('missing'), groupEndpoint('g'))])],
			'unknown-node-endpoint',
		],
		[
			'group',
			[makeEmptyGroup('g', [visualLink(groupEndpoint('g'), groupEndpoint('missing'))])],
			'unknown-group-endpoint',
		],
	] satisfies Array<[string, IWorkflowGroup[], string]>)(
		'rejects a dangling %s endpoint',
		(_kind, nodeGroups, expectedCode) => {
			const result = deriveEmptyGroupProjection({ nodes: [], nodeGroups });

			expect(result).toMatchObject({
				success: false,
				issues: [{ code: expectedCode }],
			});
		},
	);

	it('rejects an empty group with an invalid frame', () => {
		const result = deriveEmptyGroupProjection({
			nodes: [],
			nodeGroups: [makeEmptyGroup('g', [], { position: [0, 0], size: [0, 160] })],
		});

		expect(result).toMatchObject({
			success: false,
			issues: [{ code: 'invalid-empty-group-frame' }],
		});
	});

	it('returns a validation issue instead of throwing for malformed runtime data', () => {
		const malformedLinkGroup = makeEmptyGroup('g');
		Object.assign(malformedLinkGroup, {
			visualLinks: [{ source: null, target: groupEndpoint('g') }],
		});
		const malformedFrameGroup = makeEmptyGroup('frame');
		Object.assign(malformedFrameGroup, { frame: null });

		expect(
			deriveEmptyGroupProjection({ nodes: [], nodeGroups: [malformedLinkGroup] }),
		).toMatchObject({
			success: false,
			issues: [{ code: 'unsupported-visual-link', groupId: 'g' }],
		});
		expect(
			deriveEmptyGroupProjection({ nodes: [], nodeGroups: [malformedFrameGroup] }),
		).toMatchObject({
			success: false,
			issues: [{ code: 'invalid-empty-group-frame', groupId: 'frame' }],
		});
	});

	it('rejects a cycle made only of empty groups', () => {
		const groups = [
			makeEmptyGroup('g1', [visualLink(groupEndpoint('g1'), groupEndpoint('g2'))]),
			makeEmptyGroup('g2', [visualLink(groupEndpoint('g2'), groupEndpoint('g1'))]),
		];

		const result = deriveEmptyGroupProjection({ nodes: [], nodeGroups: groups });

		expect(result).toMatchObject({
			success: false,
			issues: [{ code: 'empty-group-cycle' }],
		});
	});

	it('attributes a group-only cycle to a cycle member rather than its acyclic descendant', () => {
		const groups = [
			makeEmptyGroup('g3'),
			makeEmptyGroup('g1', [visualLink(groupEndpoint('g1'), groupEndpoint('g2'))]),
			makeEmptyGroup('g2', [
				visualLink(groupEndpoint('g2'), groupEndpoint('g1')),
				visualLink(groupEndpoint('g2'), groupEndpoint('g3')),
			]),
		];

		const result = deriveEmptyGroupProjection({ nodes: [], nodeGroups: groups });

		expect(result).toMatchObject({ success: false, issues: [{ code: 'empty-group-cycle' }] });
		if (result.success) throw new Error('Expected cycle validation to fail.');
		expect(['g1', 'g2']).toContain(result.issues[0].groupId);
	});
});

describe('empty-group connection reconciliation', () => {
	it('applies only the added and removed projection set differences', () => {
		const previousGroup = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a'), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('b')),
			visualLink(groupEndpoint('g'), nodeEndpoint('c')),
		]);
		const nextGroup = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a'), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('b')),
			visualLink(groupEndpoint('g'), nodeEndpoint('d')),
		]);
		const connections: IConnections = {
			A: { main: [[connection('B'), connection('C')]] },
		};
		const originalBytes = JSON.stringify(connections);

		const result = reconcileEmptyGroupConnections({
			nodes: [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')],
			connections,
			previousNodeGroups: [previousGroup],
			nextNodeGroups: [nextGroup],
		});

		expect(result).toMatchObject({
			success: true,
			value: { connections: { A: { main: [[connection('B'), connection('D')]] } } },
			projection: {
				added: [{ sourceNode: 'A', sourceIndex: 0, targetNode: 'D', targetIndex: 0 }],
				removed: [{ sourceNode: 'A', sourceIndex: 0, targetNode: 'C', targetIndex: 0 }],
			},
		});
		expect(JSON.stringify(connections)).toBe(originalBytes);
	});

	it('rejects a collision with an ordinary connection without mutating the input', () => {
		const previousGroup = makeEmptyGroup('g');
		const nextGroup = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a'), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('b')),
		]);
		const connections: IConnections = { A: { main: [[connection('B')]] } };
		const originalBytes = JSON.stringify({ connections, previousGroup, nextGroup });

		const result = reconcileEmptyGroupConnections({
			nodes: [makeNode('a'), makeNode('b')],
			connections,
			previousNodeGroups: [previousGroup],
			nextNodeGroups: [nextGroup],
		});

		expect(result).toMatchObject({
			success: false,
			issues: [{ code: 'canonical-connection-collision' }],
		});
		expect(JSON.stringify({ connections, previousGroup, nextGroup })).toBe(originalBytes);
	});

	it('replaces a visual route with the same canonical tuple without changing connection bytes', () => {
		const previousGroup = makeEmptyGroup('old', [
			visualLink(nodeEndpoint('a'), groupEndpoint('old')),
			visualLink(groupEndpoint('old'), nodeEndpoint('b')),
		]);
		const nextGroup = makeEmptyGroup('new', [
			visualLink(nodeEndpoint('a'), groupEndpoint('new')),
			visualLink(groupEndpoint('new'), nodeEndpoint('b')),
		]);
		const connections: IConnections = { A: { main: [[connection('B')]] } };
		const originalBytes = JSON.stringify(connections);

		const result = reconcileEmptyGroupConnections({
			nodes: [makeNode('a'), makeNode('b')],
			connections,
			previousNodeGroups: [previousGroup],
			nextNodeGroups: [nextGroup],
		});

		expect(result).toMatchObject({ success: true, projection: { added: [], removed: [] } });
		if (!result.success) throw new Error('Expected reconciliation to succeed.');
		expect(JSON.stringify(result.value.connections)).toBe(originalBytes);
		expect(JSON.stringify(connections)).toBe(originalBytes);
	});

	it.each([
		['missing', {}, 'missing-projected-connection'],
		[
			'duplicated',
			{ A: { main: [[connection('B'), connection('B')]] } },
			'projected-connection-multiplicity',
		],
	] satisfies Array<[string, IConnections, string]>)(
		'rejects a %s occurrence owned by the old projection',
		(_condition, connections, expectedCode) => {
			const group = makeEmptyGroup('g', [
				visualLink(nodeEndpoint('a'), groupEndpoint('g')),
				visualLink(groupEndpoint('g'), nodeEndpoint('b')),
			]);
			const originalBytes = JSON.stringify(connections);

			const result = reconcileEmptyGroupConnections({
				nodes: [makeNode('a'), makeNode('b')],
				connections,
				previousNodeGroups: [group],
				nextNodeGroups: [group],
			});

			expect(result).toMatchObject({
				success: false,
				issues: [{ code: expectedCode }],
			});
			expect(JSON.stringify(connections)).toBe(originalBytes);
		},
	);

	it('preserves unrelated duplicates, null buckets, order, and non-main connections', () => {
		const previousGroup = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a'), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('b')),
		]);
		const nextGroup = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a'), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('c', 1)),
		]);
		const connections: IConnections = {
			A: {
				main: [
					[connection('X', 2), connection('B'), connection('Y'), connection('X', 2)],
					null,
					[connection('Z', 4)],
				],
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'Tool', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
			X: { main: [null, [connection('Y')]] },
		};
		const originalBytes = JSON.stringify(connections);

		const result = reconcileEmptyGroupConnections({
			nodes: ['a', 'b', 'c', 'x', 'y', 'z', 'tool'].map((id) => makeNode(id)),
			connections,
			previousNodeGroups: [previousGroup],
			nextNodeGroups: [nextGroup],
		});

		expect(result.success).toBe(true);
		if (!result.success) throw new Error('Expected reconciliation to succeed.');
		expect(JSON.stringify(result.value.connections)).toBe(
			JSON.stringify({
				A: {
					main: [
						[connection('X', 2), connection('Y'), connection('X', 2), connection('C', 1)],
						null,
						[connection('Z', 4)],
					],
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'Tool', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
				X: { main: [null, [connection('Y')]] },
			}),
		);
		expect(JSON.stringify(connections)).toBe(originalBytes);
	});

	it('preserves own source buckets whose node names shadow object prototype keys', () => {
		const connections = JSON.parse(
			'{"constructor":{"main":[[{"node":"Target","type":"main","index":0}]]},"prototype":{"main":[[{"node":"Target","type":"main","index":0}]]},"__proto__":{"main":[[{"node":"Target","type":"main","index":0}]]}}',
		) as IConnections;
		const originalBytes = JSON.stringify(connections);
		const group = makeEmptyGroup('g');

		const result = reconcileEmptyGroupConnections({
			nodes: [
				makeNode('constructor-id', 'constructor'),
				makeNode('prototype-id', 'prototype'),
				makeNode('proto-id', '__proto__'),
				makeNode('target-id', 'Target'),
			],
			connections,
			previousNodeGroups: [group],
			nextNodeGroups: [group],
		});

		expect(result.success).toBe(true);
		if (!result.success) throw new Error('Expected reconciliation to succeed.');
		expect(JSON.stringify(result.value.connections)).toBe(originalBytes);
		expect(Object.keys(result.value.connections)).toEqual([
			'constructor',
			'prototype',
			'__proto__',
		]);
		expect(JSON.stringify(connections)).toBe(originalBytes);
	});

	it('validates a long ordinary acyclic chain without overflowing the call stack', () => {
		const nodeCount = 5_000;
		const nodes = Array.from({ length: nodeCount }, (_, index) =>
			makeNode(`node-${index}`, `Node ${index}`),
		);
		const connections: IConnections = {};
		for (let index = 0; index < nodeCount - 1; index++) {
			connections[`Node ${index}`] = { main: [[connection(`Node ${index + 1}`)]] };
		}

		expect(
			validateEmptyGroupConnectionState({
				nodes,
				connections,
				nodeGroups: [makeEmptyGroup('g')],
			}),
		).toMatchObject({ success: true, projection: [] });
	});

	it('rejects an ordinary back edge that would create a cycle through an empty group', () => {
		const previousGroup = makeEmptyGroup('g');
		const nextGroup = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a'), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('b')),
		]);
		const connections: IConnections = { B: { main: [[connection('A')]] } };
		const originalBytes = JSON.stringify(connections);

		const result = reconcileEmptyGroupConnections({
			nodes: [makeNode('a'), makeNode('b')],
			connections,
			previousNodeGroups: [previousGroup],
			nextNodeGroups: [nextGroup],
		});

		expect(result).toMatchObject({
			success: false,
			issues: [{ code: 'empty-group-cycle' }],
		});
		expect(JSON.stringify(connections)).toBe(originalBytes);
	});
});
