import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

export class IfV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {
				name: 'If',
				color: '#408000',
			},
			inputs: ['main'],
			outputs: ['main', 'main'],
			outputNames: ['then', 'else'],
			properties: [
				{
					displayName: 'Conditions',
					name: 'conditions',
					placeholder: 'Add Condition',
					type: 'filter',
					default: {},
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnDataTrue: INodeExecutionData[] = [];
		const returnDataFalse: INodeExecutionData[] = [];

		return [returnDataTrue, returnDataFalse];
	}
}
