import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields To Split Out',
		name: 'fieldToSplitOut',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the input fields to break out into separate items',
		requiresDataPath: 'multiple',
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
		description: 'Whether to copy any other fields into the new items',
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
				include: ['selectedOtherFields'],
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
						description: 'A field in the input items to aggregate together',
						// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
						placeholder: 'e.g. id',
						hint: ' Enter the field name as text',
						requiresDataPath: 'single',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Disable Dot Notation',
				name: 'disableDotNotation',
				type: 'boolean',
				default: false,
				description:
					'Whether to disallow referencing child fields using `parent.child` in the field name',
			},
			{
				displayName: 'Destination Field Name',
				name: 'destinationFieldName',
				type: 'string',
				requiresDataPath: 'multiple',
				default: '',
				description: 'The field in the output under which to put the split field contents',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['itemList'],
		operation: ['splitOutItems'],
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
