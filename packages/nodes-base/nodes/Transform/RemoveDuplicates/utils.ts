import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import lt from 'lodash/lt';
import pick from 'lodash/pick';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import { compareItems, flattenKeys } from '@utils/utilities';

import { prepareFieldsArray } from '../utils/utils';

export const validateInputData = (
	node: INode,
	items: INodeExecutionData[],
	keysToCompare: string[],
	disableDotNotation: boolean,
) => {
	for (const key of keysToCompare) {
		let type: any = undefined;
		for (const [i, item] of items.entries()) {
			if (key === '') {
				throw new NodeOperationError(node, 'Name of field to compare is blank');
			}
			const value = !disableDotNotation ? get(item.json, key) : item.json[key];
			if (value === null && node.typeVersion > 1) continue;

			if (value === undefined && disableDotNotation && key.includes('.')) {
				throw new NodeOperationError(node, `'${key}' field is missing from some input items`, {
					description:
						"If you're trying to use a nested field, make sure you turn off 'disable dot notation' in the node options",
				});
			} else if (value === undefined) {
				throw new NodeOperationError(node, `'${key}' field is missing from some input items`);
			}
			if (type !== undefined && value !== undefined && type !== typeof value) {
				const description =
					'The type of this field varies between items' +
					(node.typeVersion > 1
						? `, in item [${i - 1}] it's a ${type} and in item [${i}] it's a ${typeof value} `
						: '');
				throw new NodeOperationError(node, `'${key}' isn't always the same type`, {
					description,
				});
			} else {
				type = typeof value;
			}
		}
	}
};

export function removeDuplicateInputItems(context: IExecuteFunctions, items: INodeExecutionData[]) {
	const compare = context.getNodeParameter('compare', 0) as string;
	const disableDotNotation = context.getNodeParameter(
		'options.disableDotNotation',
		0,
		false,
	) as boolean;
	const removeOtherFields = context.getNodeParameter(
		'options.removeOtherFields',
		0,
		false,
	) as boolean;

	let keys = disableDotNotation
		? Object.keys(items[0].json)
		: Object.keys(flattenKeys(items[0].json));

	for (const item of items) {
		const itemKeys = disableDotNotation
			? Object.keys(item.json)
			: Object.keys(flattenKeys(item.json));
		for (const key of itemKeys) {
			if (!keys.includes(key)) {
				keys.push(key);
			}
		}
	}

	if (compare === 'allFieldsExcept') {
		const fieldsToExclude = prepareFieldsArray(
			context.getNodeParameter('fieldsToExclude', 0, '') as string,
			'Fields To Exclude',
		);

		if (!fieldsToExclude.length) {
			throw new NodeOperationError(
				context.getNode(),
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
			context.getNodeParameter('fieldsToCompare', 0, '') as string,
			'Fields To Compare',
		);
		if (!fieldsToCompare.length) {
			throw new NodeOperationError(
				context.getNode(),
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

	validateInputData(context.getNode(), newItems, keys, disableDotNotation);

	// collect the original indexes of items to be removed
	const removedIndexes: number[] = [];
	let temp = newItems[0];
	for (let index = 1; index < newItems.length; index++) {
		if (compareItems(newItems[index], temp, keys, disableDotNotation)) {
			removedIndexes.push(newItems[index].json.__INDEX as unknown as number);
		} else {
			temp = newItems[index];
		}
	}
	let updatedItems: INodeExecutionData[] = items.filter(
		(_, index) => !removedIndexes.includes(index),
	);

	if (removeOtherFields) {
		updatedItems = updatedItems.map((item, index) => ({
			json: pick(item.json, ...keys),
			pairedItem: { item: index },
		}));
	}
	return [updatedItems];
}
