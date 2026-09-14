import { NO_OP_NODE_TYPE } from './constants';
import { type INode, type IWorkflowGroup } from './interfaces';

/** Returns true when a node carries the persisted empty-group marker. */
export function hasEmptyGroupAnchorMarker(node: Pick<INode, 'parameters'>): boolean {
	return node.parameters?.emptyGroupAnchor === true;
}

/** Returns true only for a valid NoOp anchor used by an empty group. */
export function isEmptyGroupAnchor(node: Pick<INode, 'type' | 'parameters'>): boolean {
	return node.type === NO_OP_NODE_TYPE && hasEmptyGroupAnchorMarker(node);
}

/** Resolves the only member that can represent an empty group. */
export function getEmptyGroupAnchor<TNode extends INode>(
	group: IWorkflowGroup,
	nodes: TNode[],
): TNode | undefined {
	if (group.nodeIds.length !== 1) return undefined;

	const member = nodes.find((node) => node.id === group.nodeIds[0]);
	return member && isEmptyGroupAnchor(member) ? member : undefined;
}
