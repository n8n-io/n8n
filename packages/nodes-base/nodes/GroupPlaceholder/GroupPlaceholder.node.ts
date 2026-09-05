import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

/**
 * Stand-in node for a node group that has no real nodes yet. Forwards items
 * so a half-planned workflow still runs end to end.
 */
export class GroupPlaceholder implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Group Placeholder',
		name: 'groupPlaceholder',
		icon: 'fa:layer-group',
		iconColor: 'neutral',
		group: ['organization'],
		version: 1,
		// Only the canvas inserts this node; it must not show in the node creator.
		hidden: true,
		description: 'Forwards items. Stands in for a group that is not generated yet.',
		defaults: {
			name: 'Group Placeholder',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.getInputData()];
	}
}
