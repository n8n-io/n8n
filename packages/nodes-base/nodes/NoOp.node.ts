import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class NoOp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'No Operation',
		name: 'noOp',
		icon: 'fa:pen',
		group: ['organization'],
		version: 1,
		description: 'No Operation',
		defaults: {
			name: 'NoOp',
			color: '#b0b0b0',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
