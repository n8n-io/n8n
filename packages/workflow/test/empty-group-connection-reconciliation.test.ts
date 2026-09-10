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
	return { id, name: id, nodeIds: [], frame, visualLinks };
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

function completeGroup(id = 'g', sourceId = 'a', targetId = 'b') {
	return makeEmptyGroup(id, [
		visualLink(nodeEndpoint(sourceId), groupEndpoint(id)),
		visualLink(groupEndpoint(id), nodeEndpoint(targetId)),
	]);
}

describe('standalone empty-group projection', () => {
	it.each([
		['no groups', []],
		['no links', [makeEmptyGroup('g')]],
		[
			'only an incoming link',
			[makeEmptyGroup('g', [visualLink(nodeEndpoint('a'), groupEndpoint('g'))])],
		],
		[
			'only an outgoing link',
			[makeEmptyGroup('g', [visualLink(groupEndpoint('g'), nodeEndpoint('b'))])],
		],
	] satisfies Array<[string, IWorkflowGroup[]]>)('projects nothing for %s', (_name, nodeGroups) => {
		const result = deriveEmptyGroupProjection({
			nodes: [makeNode('a'), makeNode('b')],
			nodeGroups,
		});

		expect(result).toEqual({ success: true, projection: [] });
	});

	it('projects the Cartesian product and keeps each real node port index', () => {
		const group = makeEmptyGroup('g', [
			visualLink(nodeEndpoint('a', 1), groupEndpoint('g')),
			visualLink(nodeEndpoint('c', 2), groupEndpoint('g')),
			visualLink(groupEndpoint('g'), nodeEndpoint('b', 3)),
			visualLink(groupEndpoint('g'), nodeEndpoint('d', 4)),
		]);

		expect(
			deriveEmptyGroupProjection({
				nodes: ['a', 'b', 'c', 'd'].map((id) => makeNode(id)),
				nodeGroups: [group],
			}),
		).toEqual({
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

	it.each([
		[
			'unknown node endpoint',
			[makeEmptyGroup('g', [visualLink(nodeEndpoint('missing'), groupEndpoint('g'))])],
			[],
			'unknown-node-endpoint',
		],
		[
			'unknown group endpoint',
			[makeEmptyGroup('g', [visualLink(nodeEndpoint('a'), groupEndpoint('missing'))])],
			[makeNode('a')],
			'unknown-group-endpoint',
		],
		[
			'link stored by a group that it does not touch',
			[
				makeEmptyGroup('g'),
				makeEmptyGroup('other', [visualLink(nodeEndpoint('a'), groupEndpoint('g'))]),
			],
			[makeNode('a')],
			'invalid-visual-link-owner',
		],
	] satisfies Array<[string, IWorkflowGroup[], INode[], string]>)(
		'rejects %s',
		(_name, nodeGroups, nodes, expectedCode) => {
			expect(deriveEmptyGroupProjection({ nodes, nodeGroups })).toMatchObject({
				success: false,
				issues: [{ code: expectedCode }],
			});
		},
	);

	it('rejects node-to-node and group-to-group visual links with distinct issue codes', () => {
		const nodeToNode = makeEmptyGroup('node-owner', [
			visualLink(nodeEndpoint('a'), nodeEndpoint('b')),
		]);
		const firstGroup = makeEmptyGroup('g1', [visualLink(groupEndpoint('g1'), groupEndpoint('g2'))]);

		expect(
			deriveEmptyGroupProjection({
				nodes: [makeNode('a'), makeNode('b')],
				nodeGroups: [nodeToNode],
			}),
		).toMatchObject({ success: false, issues: [{ code: 'unsupported-visual-link' }] });
		expect(
			deriveEmptyGroupProjection({
				nodes: [],
				nodeGroups: [firstGroup, makeEmptyGroup('g2')],
			}),
		).toMatchObject({
			success: false,
			issues: [{ code: 'unsupported-group-to-group-link' }],
		});
	});

	it('rejects a link to a non-empty group', () => {
		const normalGroup: IWorkflowGroup = { id: 'normal', name: 'normal', nodeIds: ['member'] };
		const owner = makeEmptyGroup('g', [visualLink(nodeEndpoint('a'), groupEndpoint('normal'))]);

		expect(
			deriveEmptyGroupProjection({
				nodes: [makeNode('a'), makeNode('member')],
				nodeGroups: [owner, normalGroup],
			}),
		).toMatchObject({
			success: false,
			issues: [{ code: 'visual-link-to-non-empty-group' }],
		});
	});

	it('rejects duplicate visual links and duplicate projected connections', () => {
		const link = visualLink(nodeEndpoint('a'), groupEndpoint('g'));
		expect(
			deriveEmptyGroupProjection({
				nodes: [makeNode('a')],
				nodeGroups: [makeEmptyGroup('g', [link, link])],
			}),
		).toMatchObject({ success: false, issues: [{ code: 'duplicate-visual-link' }] });

		expect(
			deriveEmptyGroupProjection({
				nodes: [makeNode('a'), makeNode('b')],
				nodeGroups: [completeGroup('g1'), completeGroup('g2')],
			}),
		).toMatchObject({
			success: false,
			issues: [{ code: 'duplicate-projected-connection' }],
		});
	});

	it('rejects invalid frames and malformed runtime link data without throwing', () => {
		const invalidFrame = makeEmptyGroup('frame', [], { position: [0, 0], size: [0, 160] });
		const malformedLink = makeEmptyGroup('link');
		Object.assign(malformedLink, {
			visualLinks: [{ source: null, target: groupEndpoint('link') }],
		});

		expect(deriveEmptyGroupProjection({ nodes: [], nodeGroups: [invalidFrame] })).toMatchObject({
			success: false,
			issues: [{ code: 'invalid-empty-group-frame' }],
		});
		expect(deriveEmptyGroupProjection({ nodes: [], nodeGroups: [malformedLink] })).toMatchObject({
			success: false,
			issues: [{ code: 'unsupported-visual-link' }],
		});
	});
});

describe('standalone empty-group reconciliation', () => {
	it('adds and removes the canonical connection as a visual path becomes complete or incomplete', () => {
		const inputLink = visualLink(nodeEndpoint('a'), groupEndpoint('g'));
		const outputLink = visualLink(groupEndpoint('g'), nodeEndpoint('b'));
		const incomplete = makeEmptyGroup('g', [inputLink]);
		const complete = makeEmptyGroup('g', [inputLink, outputLink]);

		const added = reconcileEmptyGroupConnections({
			nodes: [makeNode('a'), makeNode('b')],
			connections: {},
			previousNodeGroups: [incomplete],
			nextNodeGroups: [complete],
		});
		expect(added).toMatchObject({
			success: true,
			value: { connections: { A: { main: [[connection('B')]] } } },
			projection: { added: [{ sourceNode: 'A', targetNode: 'B' }], removed: [] },
		});
		if (!added.success) throw new Error('Expected the connection to be added.');
		expect(added.value.nodeGroups).not.toBe(complete);
		expect(added.value.nodeGroups[0].visualLinks).not.toBe(complete.visualLinks);

		const removed = reconcileEmptyGroupConnections({
			nodes: [makeNode('a'), makeNode('b')],
			connections: added.value.connections,
			previousNodeGroups: [complete],
			nextNodeGroups: [incomplete],
		});
		expect(removed).toMatchObject({
			success: true,
			value: { connections: { A: { main: [[]] } } },
			projection: { added: [], removed: [{ sourceNode: 'A', targetNode: 'B' }] },
		});
	});

	it('applies only the projection set difference and preserves unrelated connection data', () => {
		const previousGroup = completeGroup('g', 'a', 'b');
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
		const originalBytes = JSON.stringify({ connections, previousGroup, nextGroup });

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
		expect(JSON.stringify({ connections, previousGroup, nextGroup })).toBe(originalBytes);
	});

	it('rejects an ordinary-connection collision without mutating the inputs', () => {
		const previousGroup = makeEmptyGroup('g');
		const nextGroup = completeGroup();
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

	it.each([
		['missing', {}, 'missing-projected-connection'],
		[
			'duplicated',
			{ A: { main: [[connection('B'), connection('B')]] } },
			'projected-connection-multiplicity',
		],
	] satisfies Array<[string, IConnections, string]>)(
		'rejects a %s connection owned by the previous projection',
		(_name, connections, expectedCode) => {
			const group = completeGroup();
			const originalBytes = JSON.stringify(connections);

			const result = reconcileEmptyGroupConnections({
				nodes: [makeNode('a'), makeNode('b')],
				connections,
				previousNodeGroups: [group],
				nextNodeGroups: [group],
			});

			expect(result).toMatchObject({ success: false, issues: [{ code: expectedCode }] });
			expect(JSON.stringify(connections)).toBe(originalBytes);
		},
	);

	it('keeps a canonical connection unchanged when visual ownership moves to another group', () => {
		const connections: IConnections = { A: { main: [[connection('B')]] } };
		const originalBytes = JSON.stringify(connections);
		const result = reconcileEmptyGroupConnections({
			nodes: [makeNode('a'), makeNode('b')],
			connections,
			previousNodeGroups: [completeGroup('old')],
			nextNodeGroups: [completeGroup('new')],
		});

		expect(result).toMatchObject({ success: true, projection: { added: [], removed: [] } });
		if (!result.success) throw new Error('Expected reconciliation to succeed.');
		expect(JSON.stringify(result.value.connections)).toBe(originalBytes);
		expect(JSON.stringify(connections)).toBe(originalBytes);
	});

	it('preserves own source properties whose names shadow object prototype properties', () => {
		const connections = JSON.parse(
			'{"constructor":{"main":[[{"node":"Target","type":"main","index":0}]]},"prototype":{"main":[[{"node":"Target","type":"main","index":0}]]},"__proto__":{"main":[[{"node":"Target","type":"main","index":0}]]}}',
		) as IConnections;
		const originalBytes = JSON.stringify(connections);
		const group = makeEmptyGroup('g');

		const result = reconcileEmptyGroupConnections({
			nodes: [],
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
	});

	it('rejects a projected connection that closes an ordinary graph cycle', () => {
		const connections: IConnections = { B: { main: [[connection('A')]] } };
		const originalBytes = JSON.stringify(connections);
		const result = reconcileEmptyGroupConnections({
			nodes: [makeNode('a'), makeNode('b')],
			connections,
			previousNodeGroups: [makeEmptyGroup('g')],
			nextNodeGroups: [completeGroup()],
		});

		expect(result).toMatchObject({
			success: false,
			issues: [{ code: 'empty-group-cycle', groupId: 'g' }],
		});
		expect(JSON.stringify(connections)).toBe(originalBytes);
	});
});

describe('persisted empty-group connection state', () => {
	it('accepts exactly one canonical occurrence for each visual projection', () => {
		expect(
			validateEmptyGroupConnectionState({
				nodes: [makeNode('a'), makeNode('b')],
				connections: { A: { main: [[connection('B')]] } },
				nodeGroups: [completeGroup()],
			}),
		).toMatchObject({ success: true, projection: [{ sourceNode: 'A', targetNode: 'B' }] });
	});

	it.each([
		['missing', {}, 'missing-projected-connection'],
		[
			'duplicated',
			{ A: { main: [[connection('B'), connection('B')]] } },
			'projected-connection-multiplicity',
		],
	] satisfies Array<[string, IConnections, string]>)(
		'rejects a %s canonical occurrence',
		(_name, connections, expectedCode) => {
			expect(
				validateEmptyGroupConnectionState({
					nodes: [makeNode('a'), makeNode('b')],
					connections,
					nodeGroups: [completeGroup()],
				}),
			).toMatchObject({ success: false, issues: [{ code: expectedCode }] });
		},
	);
});
