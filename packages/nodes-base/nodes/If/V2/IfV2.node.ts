import set from 'lodash/set';
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
			outputNames: ['true', 'false'],
			parameterPane: 'wide',
			properties: [
				{
					displayName: 'Conditions',
					name: 'conditions',
					placeholder: 'Add Condition',
					type: 'filter',
					default: {},
					typeOptions: {
						filter: {
							caseSensitive: '={{!$parameter.options.ignoreCase}}',
							typeValidation: '={{$parameter.options.looseTypeValidation ? "loose" : "strict"}}',
						},
					},
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add option',
					default: {},
					options: [
						{
							displayName: 'Ignore Case',
							description: 'Whether to ignore letter case when evaluating conditions',
							name: 'ignoreCase',
							type: 'boolean',
							default: true,
						},
						{
							displayName: 'Less Strict Type Validation',
							description: 'Whether to try casting value types based on the selected operator',
							name: 'looseTypeValidation',
							type: 'boolean',
							default: true,
						},
					],
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const trueItems: INodeExecutionData[] = [];
		const falseItems: INodeExecutionData[] = [];

		this.getInputData().forEach((item, itemIndex) => {
			try {
				const options = this.getNodeParameter('options', itemIndex) as {
					ignoreCase?: boolean;
					looseTypeValidation?: boolean;
				};
				let pass = false;
				try {
					pass = this.getNodeParameter('conditions', itemIndex, false, {
						extractValue: true,
					}) as boolean;
				} catch (error) {
					if (!options.looseTypeValidation) {
						set(
							error,
							'description',
							"Try changing the type of comparison. Alternatively you can enable 'Less Strict Type Validation' in the options.",
						);
					}
					set(error, 'context.itemIndex', itemIndex);
					set(error, 'node', this.getNode());
					throw error;
				}

				if (item.pairedItem === undefined) {
					item.pairedItem = { item: itemIndex };
				}

				if (pass) {
					trueItems.push(item);
				} else {
					falseItems.push(item);
				}
			} catch (error) {
				if (this.continueOnFail(error)) {
					falseItems.push(item);
				} else {
					throw error;
				}
			}
		});

		return [trueItems, falseItems];
	}
}
