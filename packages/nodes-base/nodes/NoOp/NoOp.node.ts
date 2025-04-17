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
		icon: 'fa:arrow-right',
		iconColor: 'gray',
		group: ['organization'],
		version: 1,
		description: 'No Operation',
		defaults: {
			name: 'No Operation, do nothing',
			color: '#b0b0b0',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return [items];
	}
}
