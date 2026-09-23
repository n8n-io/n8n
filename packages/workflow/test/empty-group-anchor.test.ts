import {
	NO_OP_NODE_TYPE,
	type INode,
	type IWorkflowGroup,
	getEmptyGroupAnchor,
	hasEmptyGroupAnchorMarker,
	isEmptyGroupAnchor,
} from '../src';

function makeNode({
	emptyGroupAnchor,
	...overrides
}: Partial<INode> & { emptyGroupAnchor: boolean }): INode {
	return {
		id: overrides.id ?? 'anchor-id',
		name: overrides.name ?? 'Empty group anchor',
		type: overrides.type ?? NO_OP_NODE_TYPE,
		typeVersion: overrides.typeVersion ?? 1,
		position: overrides.position ?? [0, 0],
		parameters: overrides.parameters ?? { emptyGroupAnchor },
		...overrides,
	};
}

function makeGroup(overrides: Partial<IWorkflowGroup> = {}): IWorkflowGroup {
	return {
		id: overrides.id ?? 'group-id',
		name: overrides.name ?? 'Empty group',
		nodeIds: overrides.nodeIds ?? ['anchor-id'],
		...overrides,
	};
}

describe('empty-group anchor helpers', () => {
	it('identifies only a marked NoOp as an empty-group anchor', () => {
		const anchor = makeNode({ emptyGroupAnchor: true });
		const ordinaryNoOp = makeNode({ emptyGroupAnchor: false });
		const markedOtherNode = makeNode({
			emptyGroupAnchor: true,
			type: 'n8n-nodes-base.set',
		});

		expect(hasEmptyGroupAnchorMarker(anchor)).toBe(true);
		expect(isEmptyGroupAnchor(anchor)).toBe(true);
		expect(hasEmptyGroupAnchorMarker(ordinaryNoOp)).toBe(false);
		expect(isEmptyGroupAnchor(ordinaryNoOp)).toBe(false);
		expect(isEmptyGroupAnchor(markedOtherNode)).toBe(false);
	});

	it('models the empty and populated group lifecycle', () => {
		const anchor = makeNode({ emptyGroupAnchor: true });
		const realNode = makeNode({
			emptyGroupAnchor: false,
			id: 'real-node',
			name: 'Real node',
		});
		const emptyGroup = makeGroup();
		const populatedGroup = makeGroup({ nodeIds: [anchor.id, realNode.id] });

		expect(getEmptyGroupAnchor(emptyGroup, [anchor])).toBe(anchor);
		expect(getEmptyGroupAnchor(populatedGroup, [anchor, realNode])).toBeUndefined();
	});
});
