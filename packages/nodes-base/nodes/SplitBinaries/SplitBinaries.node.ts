import { INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError } from 'n8n-workflow';
import { IExecuteFunctions } from 'n8n-core';

export class SplitBinaries implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Split Binaries',
		name: 'splitBinaries',
		icon: 'file:splitBinaries.svg',
		group: ['input'],
		version: 1,
		description: 'Helper for splitting binaries into multiple items.',
		defaults: {
			name: 'Split Binaries',
			color: '#ff6d5a',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				options: [
					{
						name: 'Split binaries',
						value: 'splitBinaries',
					},
				],
				default: 'splitBinaries',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				options: [
					{
						name: 'Split binaries',
						value: 'splitBinaries',
						description: 'Create separate items for each binary file.',
					},
				],
				default: 'splitBinaries',
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				options: [
					{
						name: 'No Other Fields',
						value: 'noOtherFields',
					},
					{
						name: 'All Other Fields',
						value: 'allOtherFields',
					},
					{
						name: 'Selected Other Fields',
						value: 'selectedOtherFields',
					},
				],
				default: 'noOtherFields',
				description: 'Whether to copy any other fields into the new items.',
				displayOptions: {
					show: {
						resource: [
							'splitBinaries',
						],
						operation: [
							'splitBinaries',
						],
					},
				},
			},
			{
				displayName: 'Fields To Include',
				name: 'fieldsToInclude',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Field To Include',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'splitBinaries',
						],
						operation: [
							'splitBinaries',
						],
						include: [
							'selectedOtherFields',
						],
					},
				},
				options: [
					{
						displayName: '',
						name: 'fields',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'string',
								default: '',
								description: 'A field in the input items to aggregate together.',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const results: INodeExecutionData[] = [];

		if (resource === 'splitBinaries') {
			if (operation === 'splitBinaries') {
				for (let i=0;i<items.length;i++) {
					const include = this.getNodeParameter('include', i) as string;
					const { binary, json } = items[i];
					let newItem = {};

					if (include === 'selectedOtherFields') {
						const fieldsToInclude = (this.getNodeParameter('fieldsToInclude.fields', i, []) as [{ fieldName: string }]).map(field => field.fieldName);

						if (!fieldsToInclude.length) {
							throw new NodeOperationError(this.getNode(), 'No fields specified', { description: 'Please add a field to include' });
						}

						newItem = {
							...fieldsToInclude.reduce((prev, field) => {
								return {
									...prev,
									[field as string]: json[field as string],
								};
							}, {}),
						};

					} else if (include === 'allOtherFields') {
						newItem = json;
					}

					if (binary !== undefined) {
						results.push(
							...Object.keys(binary).map(key => {
								return {
									json: newItem,
									binary: {
										data: binary[key],
									},
								};
							}),
						);
					} else {
						results.push(
							{
								json: newItem,
							},
						);
					}
				}
			}
		}

		return [results];
	}
}
