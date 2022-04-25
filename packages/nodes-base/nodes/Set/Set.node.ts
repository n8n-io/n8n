import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { set } from 'lodash';

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
				description: 'If only the values set on this node should be kept and all others removed.',
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
				description: 'The value to set.',
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
								default: 'propertyName',
								description: 'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'boolean',
								default: false,
								description: 'The boolean value to write in the property.',
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
								description: 'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'number',
								default: 0,
								description: 'The number value to write in the property.',
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
								description: 'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The string value to write in the property.',
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
						description: `<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.<p></p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>
						`,
					},
				],
			},
		],
	};


	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		if (items.length === 0) {
			items.push({json: {}});
		}

		const returnData: INodeExecutionData[] = [];

		let item: INodeExecutionData;
		let keepOnlySet: boolean;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			keepOnlySet = this.getNodeParameter('keepOnlySet', itemIndex, false) as boolean;
			item = items[itemIndex];
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			const newItem: INodeExecutionData = {
				json: {},
			};

			if (keepOnlySet !== true) {
				if (item.binary !== undefined) {
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					newItem.binary = {};
					Object.assign(newItem.binary, item.binary);
				}

				newItem.json = JSON.parse(JSON.stringify(item.json));
			}

			// Add boolean values
			(this.getNodeParameter('values.boolean', itemIndex, []) as INodeParameters[]).forEach((setItem) => {
				if (options.dotNotation === false) {
					newItem.json[setItem.name as string] = !!setItem.value;
				} else {
					set(newItem.json, setItem.name as string, !!setItem.value);
				}
			});

			// Add number values
			(this.getNodeParameter('values.number', itemIndex, []) as INodeParameters[]).forEach((setItem) => {
				if (options.dotNotation === false) {
					newItem.json[setItem.name as string] = setItem.value;
				} else {
					set(newItem.json, setItem.name as string, setItem.value);
				}
			});

			// Add string values
			(this.getNodeParameter('values.string', itemIndex, []) as INodeParameters[]).forEach((setItem) => {
				if (options.dotNotation === false) {
					newItem.json[setItem.name as string] = setItem.value;
				} else {
					set(newItem.json, setItem.name as string, setItem.value);
				}
			});

			returnData.push(newItem);
		}

		return this.prepareOutputData(returnData);
	}
}
