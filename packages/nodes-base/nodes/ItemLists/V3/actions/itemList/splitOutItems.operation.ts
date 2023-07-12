import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { deepCopy, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import get from 'lodash/get';
import unset from 'lodash/unset';
import { disableDotNotationBoolean } from '../common.descriptions';
import { prepareFieldsArray } from '../../helpers/utils';

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
		type: 'string',
		placeholder: 'e.g. email, name',
		requiresDataPath: 'multiple',
		description: 'Fields in the input items to aggregate together',
		default: '',
		displayOptions: {
			show: {
				include: ['selectedOtherFields'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			disableDotNotationBoolean,
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
		const fieldsToSplitOut = (this.getNodeParameter('fieldToSplitOut', i) as string)
			.split(',')
			.map((field) => field.trim());
		const disableDotNotation = this.getNodeParameter(
			'options.disableDotNotation',
			0,
			false,
		) as boolean;

		const destinationFields = (
			this.getNodeParameter('options.destinationFieldName', i, '') as string
		)
			.split(',')
			.filter((field) => field.trim() !== '')
			.map((field) => field.trim());

		if (destinationFields.length && destinationFields.length !== fieldsToSplitOut.length) {
			throw new NodeOperationError(
				this.getNode(),
				'If multiple fields to split out are given, the same number of destination fields must be given',
			);
		}

		const include = this.getNodeParameter('include', i) as
			| 'selectedOtherFields'
			| 'allOtherFields'
			| 'noOtherFields';

		const multiSplit = fieldsToSplitOut.length > 1;

		const item = { ...items[i].json };
		const splited: IDataObject[] = [];
		for (const [entryIndex, fieldToSplitOut] of fieldsToSplitOut.entries()) {
			const destinationFieldName = destinationFields[entryIndex] || '';

			let arrayToSplit;
			if (!disableDotNotation) {
				arrayToSplit = get(item, fieldToSplitOut);
			} else {
				arrayToSplit = item[fieldToSplitOut];
			}

			if (arrayToSplit === undefined) {
				arrayToSplit = [];
			}

			if (typeof arrayToSplit !== 'object' || arrayToSplit === null) {
				arrayToSplit = [arrayToSplit];
			}

			if (!Array.isArray(arrayToSplit)) {
				arrayToSplit = Object.values(arrayToSplit);
			}

			for (const [elementIndex, element] of arrayToSplit.entries()) {
				if (splited[elementIndex] === undefined) {
					splited[elementIndex] = {};
				}

				const fieldName = destinationFieldName || fieldToSplitOut;

				if (typeof element === 'object' && element !== null && include === 'noOtherFields') {
					if (destinationFieldName === '' && !multiSplit) {
						splited[elementIndex] = { ...splited[elementIndex], ...element };
					} else {
						splited[elementIndex][fieldName] = element;
					}
				} else {
					splited[elementIndex][fieldName] = element;
				}
			}
		}

		for (const splitEntry of splited) {
			let newItem: IDataObject = {};

			if (include === 'noOtherFields') {
				newItem = splitEntry;
			}

			if (include === 'allOtherFields') {
				const itemCopy = deepCopy(item);
				for (const fieldToSplitOut of fieldsToSplitOut) {
					if (!disableDotNotation) {
						unset(itemCopy, fieldToSplitOut);
					} else {
						delete itemCopy[fieldToSplitOut];
					}
				}
				newItem = { ...itemCopy, ...splitEntry };
			}

			if (include === 'selectedOtherFields') {
				const fieldsToInclude = prepareFieldsArray(
					this.getNodeParameter('fieldsToInclude', i, '') as string,
					'Fields To Include',
				);

				if (!fieldsToInclude.length) {
					throw new NodeOperationError(this.getNode(), 'No fields specified', {
						description: 'Please add a field to include',
					});
				}

				for (const field of fieldsToInclude) {
					if (!disableDotNotation) {
						splitEntry[field] = get(item, field);
					} else {
						splitEntry[field] = item[field];
					}
				}

				newItem = splitEntry;
			}

			returnData.push({
				json: newItem,
				pairedItem: {
					item: i,
				},
			});
		}
	}

	return returnData;
}
