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
					typeOptions: {
						filter: {
							caseSensitive: '={{$parameter.options.caseSensitive}}',
						},
					},
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Option',
					default: {},
					options: [
						{
							displayName: 'Case Sensitive',
							name: 'caseSensitive',
							type: 'boolean',
							default: true,
						},
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const thenItems: INodeExecutionData[] = [];
		const elseItems: INodeExecutionData[] = [];

		this.getInputData().forEach((item, itemIndex) => {
			const pass = this.getNodeParameter('conditions', itemIndex, false, {
				extractValue: true,
			});

			if (pass) {
				thenItems.push(item);
			} else {
				elseItems.push(item);
			}
		});

		return [thenItems, elseItems];
	}
}
