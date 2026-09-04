import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

/**
 * The boundary of a canvas group.
 *
 * A group is a node with one main input and one main output. Its interior is
 * the set of nodes that carry its id in `parentId`. The engine resolves the
 * boundary before a run starts, so this node is never a step in a run: items
 * that arrive on its input go to the interior entry nodes, and the interior
 * exit nodes emit on its output.
 *
 * The `execute` below is a safety net for a path that reaches the node without
 * the boundary resolved. It forwards its input, which is what an empty group
 * does, so a workflow keeps running instead of failing.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */
export class Group implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Group',
		name: 'group',
		icon: 'fa:object-group',
		group: ['organization'],
		version: 1,
		description: 'Hold a set of nodes behind one input and one output',
		defaults: {
			name: 'Group',
		},
		inputs: ['main'],
		outputs: ['main'],
		// The canvas creates and edits a group; the node creator must not offer it.
		hidden: true,
		properties: [
			{
				displayName: 'Objective',
				name: 'objective',
				type: 'string',
				default: '',
				description: 'What this group of nodes does, shown on the group card',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.getInputData()];
	}
}
