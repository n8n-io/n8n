import get from 'lodash/get';
import unset from 'lodash/unset';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { deepCopy, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { prepareFieldsArray } from '../../helpers/utils';
import { disableDotNotationBoolean } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields To Split Out',
		name: 'fieldToSplitOut',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'Drag fields from the left or type their names',
		description:
			'The name of the input fields to break out into separate items. Separate multiple field names by commas. For binary data, use $binary.',
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
			{
				displayName: 'Include Binary',
				name: 'includeBinary',
				type: 'boolean',
				default: false,
				description: 'Whether to include the binary data in the new items',
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
			.map((field) => field.trim().replace(/^\$json\./, ''));

		const options = this.getNodeParameter('options', i, {});

		const disableDotNotation = options.disableDotNotation as boolean;

		const destinationFields = ((options.destinationFieldName as string) || '')
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
		const splited: INodeExecutionData[] = [];
		for (const [entryIndex, fieldToSplitOut] of fieldsToSplitOut.entries()) {
			const destinationFieldName = destinationFields[entryIndex] || '';

			let entityToSplit: IDataObject[] = [];

			if (fieldToSplitOut === '$binary') {
				entityToSplit = Object.entries(items[i].binary || {}).map(([key, value]) => ({
					[key]: value,
				}));
			} else {
				if (!disableDotNotation) {
					entityToSplit = get(item, fieldToSplitOut) as IDataObject[];
				} else {
					entityToSplit = item[fieldToSplitOut] as IDataObject[];
				}

				if (entityToSplit === undefined) {
					entityToSplit = [];
				}

				if (typeof entityToSplit !== 'object' || entityToSplit === null) {
					entityToSplit = [entityToSplit] as unknown as IDataObject[];
				}

				if (!Array.isArray(entityToSplit)) {
					entityToSplit = Object.values(entityToSplit);
				}
			}

			for (const [elementIndex, element] of entityToSplit.entries()) {
				if (splited[elementIndex] === undefined) {
					splited[elementIndex] = { json: {}, pairedItem: { item: i } };
				}

				const fieldName = destinationFieldName || fieldToSplitOut;

				if (fieldToSplitOut === '$binary') {
					if (splited[elementIndex].binary === undefined) {
						splited[elementIndex].binary = {};
					}
					splited[elementIndex].binary[Object.keys(element)[0]] = Object.values(
						element,
					)[0] as IBinaryData;

					continue;
				}

				if (typeof element === 'object' && element !== null && include === 'noOtherFields') {
					if (destinationFieldName === '' && !multiSplit) {
						splited[elementIndex] = {
							json: { ...splited[elementIndex].json, ...element },
							pairedItem: { item: i },
						};
					} else {
						splited[elementIndex].json[fieldName] = element;
					}
				} else {
					splited[elementIndex].json[fieldName] = element;
				}
			}
		}

		for (const splitEntry of splited) {
			let newItem: INodeExecutionData = splitEntry;

			if (include === 'allOtherFields') {
				const itemCopy = deepCopy(item);
				for (const fieldToSplitOut of fieldsToSplitOut) {
					if (!disableDotNotation) {
						unset(itemCopy, fieldToSplitOut);
					} else {
						delete itemCopy[fieldToSplitOut];
					}
				}
				newItem.json = { ...itemCopy, ...splitEntry.json };
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
						splitEntry.json[field] = get(item, field);
					} else {
						splitEntry.json[field] = item[field];
					}
				}

				newItem = splitEntry;
			}

			const includeBinary = options.includeBinary as boolean;

			if (includeBinary) {
				if (items[i].binary && !newItem.binary) {
					newItem.binary = items[i].binary;
				}
			}

			returnData.push(newItem);
		}
	}

	return returnData;
}
