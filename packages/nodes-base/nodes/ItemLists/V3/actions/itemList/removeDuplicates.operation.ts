import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Compare',
		name: 'compare',
		type: 'options',
		options: [
			{
				name: 'All Fields',
				value: 'allFields',
			},
			{
				name: 'All Fields Except',
				value: 'allFieldsExcept',
			},
			{
				name: 'Selected Fields',
				value: 'selectedFields',
			},
		],
		default: 'allFields',
		description: 'The fields of the input items to compare to see if they are the same',
	},
	{
		displayName: 'Fields To Exclude',
		name: 'fieldsToExclude',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Field To Exclude',
		default: {},
		displayOptions: {
			show: {
				compare: ['allFieldsExcept'],
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
						description: 'A field in the input to exclude from the comparison',
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
		displayName: 'Fields To Compare',
		name: 'fieldsToCompare',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Field To Compare',
		default: {},
		displayOptions: {
			show: {
				compare: ['selectedFields'],
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
						description: 'A field in the input to add to the comparison',
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
		displayOptions: {
			show: {
				compare: ['allFieldsExcept', 'selectedFields'],
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
			{
				displayName: 'Remove Other Fields',
				name: 'removeOtherFields',
				type: 'boolean',
				default: false,
				description:
					'Whether to remove any fields that are not being compared. If disabled, will keep the values from the first of the duplicates.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['itemList'],
		operation: ['removeDuplicates'],
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
