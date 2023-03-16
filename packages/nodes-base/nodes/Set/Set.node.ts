import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import set from 'lodash.set';

export class Set implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Set',
		name: 'set',
		icon: 'fa:pen',
		group: ['input'],
		version: 1,
		description: 'Sets values on items and optionally remove other values',
		defaults: {
			name: 'Set',
			color: '#0000FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Keep Only Set',
				name: 'keepOnlySet',
				type: 'boolean',
				default: false,
				description:
					'Whether only the values set on this node should be kept and all others removed',
			},
			{
				displayName: 'Values to Set',
				name: 'values',
				placeholder: 'Add Value',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The value to set',
				default: {},
				options: [
					{
						name: 'boolean',
						displayName: 'Boolean',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								requiresDataPath: 'single',
								default: 'propertyName',
								description:
									'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'boolean',
								default: false,
								// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
								description: 'The boolean value to write in the property',
							},
						],
					},
					{
						name: 'number',
						displayName: 'Number',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'propertyName',
								requiresDataPath: 'single',
								description:
									'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'number',
								default: 0,
								description: 'The number value to write in the property',
							},
						],
					},
					{
						name: 'string',
						displayName: 'String',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'propertyName',
								requiresDataPath: 'single',
								description:
									'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The string value to write in the property',
							},
						],
					},
				],
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Dot Notation',
						name: 'dotNotation',
						type: 'boolean',
						default: true,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.<p></p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		if (items.length === 0) {
			items.push({ json: {} });
		}

		const returnData: INodeExecutionData[] = [];

		let item: INodeExecutionData;
		let keepOnlySet: boolean;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			keepOnlySet = this.getNodeParameter('keepOnlySet', itemIndex, false) as boolean;
			item = items[itemIndex];
			const options = this.getNodeParameter('options', itemIndex, {});

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: item.pairedItem,
			};

			if (!keepOnlySet) {
				if (item.binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					newItem.binary = {};
					Object.assign(newItem.binary, item.binary);
				}

				newItem.json = deepCopy(item.json);
			}

			// Add boolean values
			(this.getNodeParameter('values.boolean', itemIndex, []) as INodeParameters[]).forEach(
				(setItem) => {
					if (options.dotNotation === false) {
						newItem.json[setItem.name as string] = !!setItem.value;
					} else {
						set(newItem.json, setItem.name as string, !!setItem.value);
					}
				},
			);

			// Add number values
			(this.getNodeParameter('values.number', itemIndex, []) as INodeParameters[]).forEach(
				(setItem) => {
					if (options.dotNotation === false) {
						newItem.json[setItem.name as string] = setItem.value;
					} else {
						set(newItem.json, setItem.name as string, setItem.value);
					}
				},
			);

			// Add string values
			(this.getNodeParameter('values.string', itemIndex, []) as INodeParameters[]).forEach(
				(setItem) => {
					if (options.dotNotation === false) {
						newItem.json[setItem.name as string] = setItem.value;
					} else {
						set(newItem.json, setItem.name as string, setItem.value);
					}
				},
			);

			returnData.push(newItem);
		}

		return this.prepareOutputData(returnData);
	}
}
