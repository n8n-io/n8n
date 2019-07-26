import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class Start implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Start',
		name: 'start',
		icon: 'fa:play',
		group: ['input'],
		version: 1,
		description: 'Starts the workflow execution from this node',
		maxNodes: 1,
		defaults: {
			name: 'Start',
			color: '#00e000',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
