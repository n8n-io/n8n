import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'Simple',
				value: 'simple',
			},
			{
				name: 'Random',
				value: 'random',
			},
			{
				name: 'Code',
				value: 'code',
			},
		],
		default: 'simple',
		description: 'The fields of the input items to compare to see if they are the same',
	},
	{
		displayName: 'Fields To Sort By',
		name: 'sortFieldsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Field To Sort By',
		options: [
			{
				displayName: '',
				name: 'sortField',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldName',
						type: 'string',
						required: true,
						default: '',
						description: 'The field to sort by',
						// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
						placeholder: 'e.g. id',
						hint: ' Enter the field name as text',
						requiresDataPath: 'single',
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'ascending',
							},
							{
								name: 'Descending',
								value: 'descending',
							},
						],
						default: 'ascending',
						description: 'The order to sort by',
					},
				],
			},
		],
		default: {},
		description: 'The fields of the input items to compare to see if they are the same',
		displayOptions: {
			show: {
				type: ['simple'],
			},
		},
	},
	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
			editor: 'code',
			rows: 10,
		},
		default: `// The two items to compare are in the variables a and b
// Access the fields in a.json and b.json
// Return -1 if a should go before b
// Return 1 if b should go before a
// Return 0 if there's no difference

fieldName = 'myField';

if (a.json[fieldName] < b.json[fieldName]) {
return -1;
}
if (a.json[fieldName] > b.json[fieldName]) {
return 1;
}
return 0;`,
		description: 'Javascript code to determine the order of any two items',
		displayOptions: {
			show: {
				type: ['code'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				type: ['simple'],
			},
		},
		options: [
			{
				displayName: 'Disable Dot Notation',
				name: 'disableDotNotation',
				type: 'boolean',
				default: false,
				description:
					'Whether to disallow referencing child fields using `parent.child` in the field name',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['itemList'],
		operation: ['sort'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const data: IDataObject[] = [];
			const executionData = this.helpers.constructExecutionMetaData(wrapData(data), {
				itemData: { item: i },
			});

			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
