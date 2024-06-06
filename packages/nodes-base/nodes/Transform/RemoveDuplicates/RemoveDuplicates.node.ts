import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import lt from 'lodash/lt';
import pick from 'lodash/pick';
import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { prepareFieldsArray } from '../utils/utils';
import { compareItems, flattenKeys, validateInputData } from './utils';

export class RemoveDuplicates implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Remove Duplicates',
		name: 'removeDuplicates',
		icon: 'file:removeDuplicates.svg',
		group: ['transform'],
		subtitle: '',
		version: [1, 1.1],
		description: 'Delete items with matching field values',
		defaults: {
			name: 'Remove Duplicates',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
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
				type: 'string',
				placeholder: 'e.g. email, name',
				requiresDataPath: 'multiple',
				description: 'Fields in the input to exclude from the comparison',
				default: '',
				displayOptions: {
					show: {
						compare: ['allFieldsExcept'],
					},
				},
			},
			{
				displayName: 'Fields To Compare',
				name: 'fieldsToCompare',
				type: 'string',
				placeholder: 'e.g. email, name',
				requiresDataPath: 'multiple',
				description: 'Fields in the input to add to the comparison',
				default: '',
				displayOptions: {
					show: {
						compare: ['selectedFields'],
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const compare = this.getNodeParameter('compare', 0) as string;
		const disableDotNotation = this.getNodeParameter(
			'options.disableDotNotation',
			0,
			false,
		) as boolean;
		const removeOtherFields = this.getNodeParameter(
			'options.removeOtherFields',
			0,
			false,
		) as boolean;

		let keys = disableDotNotation
			? Object.keys(items[0].json)
			: Object.keys(flattenKeys(items[0].json));

		for (const item of items) {
			for (const key of disableDotNotation
				? Object.keys(item.json)
				: Object.keys(flattenKeys(item.json))) {
				if (!keys.includes(key)) {
					keys.push(key);
				}
			}
		}

		if (compare === 'allFieldsExcept') {
			const fieldsToExclude = prepareFieldsArray(
				this.getNodeParameter('fieldsToExclude', 0, '') as string,
				'Fields To Exclude',
			);

			if (!fieldsToExclude.length) {
				throw new NodeOperationError(
					this.getNode(),
					'No fields specified. Please add a field to exclude from comparison',
				);
			}
			if (!disableDotNotation) {
				keys = Object.keys(flattenKeys(items[0].json));
			}
			keys = keys.filter((key) => !fieldsToExclude.includes(key));
		}
		if (compare === 'selectedFields') {
			const fieldsToCompare = prepareFieldsArray(
				this.getNodeParameter('fieldsToCompare', 0, '') as string,
				'Fields To Compare',
			);
			if (!fieldsToCompare.length) {
				throw new NodeOperationError(
					this.getNode(),
					'No fields specified. Please add a field to compare on',
				);
			}
			if (!disableDotNotation) {
				keys = Object.keys(flattenKeys(items[0].json));
			}
			keys = fieldsToCompare.map((key) => key.trim());
		}

		// This solution is O(nlogn)
		// add original index to the items
		const newItems = items.map(
			(item, index) =>
				({
					json: { ...item.json, __INDEX: index },
					pairedItem: { item: index },
				}) as INodeExecutionData,
		);
		//sort items using the compare keys
		newItems.sort((a, b) => {
			let result = 0;

			for (const key of keys) {
				let equal;
				if (!disableDotNotation) {
					equal = isEqual(get(a.json, key), get(b.json, key));
				} else {
					equal = isEqual(a.json[key], b.json[key]);
				}
				if (!equal) {
					let lessThan;
					if (!disableDotNotation) {
						lessThan = lt(get(a.json, key), get(b.json, key));
					} else {
						lessThan = lt(a.json[key], b.json[key]);
					}
					result = lessThan ? -1 : 1;
					break;
				}
			}
			return result;
		});

		validateInputData(this.getNode(), newItems, keys, disableDotNotation);

		// collect the original indexes of items to be removed
		const removedIndexes: number[] = [];
		let temp = newItems[0];
		for (let index = 1; index < newItems.length; index++) {
			if (compareItems(newItems[index], temp, keys, disableDotNotation, this.getNode())) {
				removedIndexes.push(newItems[index].json.__INDEX as unknown as number);
			} else {
				temp = newItems[index];
			}
		}

		let returnData = items.filter((_, index) => !removedIndexes.includes(index));

		if (removeOtherFields) {
			returnData = returnData.map((item, index) => ({
				json: pick(item.json, ...keys),
				pairedItem: { item: index },
			}));
		}

		return [returnData];
	}
}
