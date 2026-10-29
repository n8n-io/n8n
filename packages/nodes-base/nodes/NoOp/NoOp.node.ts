import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class NoOp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'No Operation, do nothing',
		name: 'noOp',
		icon: 'node:no-operation',
		iconColor: 'neutral',
		group: ['organization'],
		version: 1,
		description: 'No Operation',
		defaults: {
			name: 'No Operation, do nothing',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Empty Group Anchor',
				name: 'emptyGroupAnchor',
				type: 'hidden',
				default: false,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return [items];
	}
}
