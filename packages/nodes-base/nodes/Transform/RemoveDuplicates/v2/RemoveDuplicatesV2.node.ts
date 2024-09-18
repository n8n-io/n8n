import { get, isEqual, lt, pick } from 'lodash';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	INodeTypeBaseDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ICheckProcessedOptions,
	ProcessedDataContext,
	ICheckProcessedOutput,
} from 'n8n-workflow';

import { compareItems, flattenKeys } from '@utils/utilities';

import { removeDuplicatesNodeFields } from './RemoveDuplicatesV2.description';
import { prepareFieldsArray } from '../../utils/utils';
import { validateInputData } from '../utils';
const versionDescription: INodeTypeDescription = {
	displayName: 'Remove Duplicates',
	name: 'removeDuplicates',
	icon: 'file:removeDuplicates.svg',
	group: ['transform'],
	subtitle: '',
	version: [2],
	description: 'Delete items with matching field values',
	defaults: {
		name: 'Remove Duplicates',
	},
	inputs: [NodeConnectionType.Main],
	outputs: [NodeConnectionType.Main],
	properties: [...removeDuplicatesNodeFields],
};
export class RemoveDuplicatesV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		const returnData: INodeExecutionData[] = [];
		switch (operation) {
			case 'removeDuplicateInputItems': {
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
				returnData.push(...updatedItems);

				return [returnData];
			}
			case 'removeItemsSeenInPreviousExecutions': {
				const logic = this.getNodeParameter('logic', 0);
				if (logic === 'removeItemsWithAlreadySeenKeyValues') {
					const context = this.getNodeParameter('options.context', 0, 'node');
					const allowDuplicateItemsInTheSameExecution = this.getNodeParameter(
						'options.allowDuplicateItemsInTheSameExecution',
						0,
						false,
					);

					if (!['node', 'workflow'].includes(context as string)) {
						throw new NodeOperationError(
							this.getNode(),
							`The context '${context}' is not supported. Please select either "node" or "workflow".`,
						);
					}

					let checkValue: string;
					const itemMapping: {
						[key: string]: INodeExecutionData[];
					} = {};
					const uniqueItems: any[] = [];
					for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
						checkValue = this.getNodeParameter('keyField', itemIndex, '')?.toString() || '';
						if (
							itemMapping[checkValue] &&
							(allowDuplicateItemsInTheSameExecution ?? !uniqueItems.includes(checkValue))
						) {
							itemMapping[checkValue].push(items[itemIndex]);
						} else {
							itemMapping[checkValue] = [items[itemIndex]];
							if (!allowDuplicateItemsInTheSameExecution) uniqueItems.push(checkValue);
						}
						// TODO: Add continueOnFail, where should it and up?
					}
					const addProcessedValue = !this.getNodeParameter(
						'options.dontUpdateKeyValuesOnDatabase',
						0,
						false,
					);
					const maxEntries = this.getNodeParameter(
						'options.maxKeyValuesToStoreInDatabase',
						0,
						1000,
					);

					let itemsProcessed: ICheckProcessedOutput;
					if (addProcessedValue) {
						itemsProcessed = await this.helpers.checkProcessedAndRecord(
							Object.keys(itemMapping),
							context as ProcessedDataContext,
							{ mode: 'entries', maxEntries } as ICheckProcessedOptions,
						);
					} else {
						itemsProcessed = await this.helpers.checkProcessed(
							Object.keys(itemMapping),
							context as ProcessedDataContext,
							{ mode: 'entries' } as ICheckProcessedOptions,
						);
					}
					returnData.push(
						...itemsProcessed.new
							.map((key) => {
								return itemMapping[key];
							})
							.flat(),
					);

					return [returnData];
				} else if (logic === 'removeItemsUpToStoredIncrementalKey') {
					const context = this.getNodeParameter('options.context', 0, 'node');
					const allowDuplicateItemsInTheSameExecution = this.getNodeParameter(
						'options.allowDuplicateItemsInTheSameExecution',
						0,
						false,
					);
					if (!['node', 'workflow'].includes(context as string)) {
						throw new NodeOperationError(
							this.getNode(),
							`The context '${context}' is not supported. Please select either "node" or "workflow".`,
						);
					}

					let parsedIncrementalKey: number;
					const itemMapping: {
						[key: string]: INodeExecutionData[];
					} = {};
					const uniqueItems: any[] = [];

					for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
						const incrementalKey = this.getNodeParameter('incrementalKeyField', itemIndex, '');
						parsedIncrementalKey = Number(incrementalKey);
						if (isNaN(parsedIncrementalKey)) {
							throw new NodeOperationError(
								this.getNode(),
								`The value '${incrementalKey}' is not a number. Please provide a number.`,
							);
						}
						if (
							itemMapping[parsedIncrementalKey] &&
							(allowDuplicateItemsInTheSameExecution ?? !uniqueItems.includes(parsedIncrementalKey))
						) {
							itemMapping[parsedIncrementalKey].push(items[itemIndex]);
						} else {
							itemMapping[parsedIncrementalKey] = [items[itemIndex]];
							if (!allowDuplicateItemsInTheSameExecution) uniqueItems.push(parsedIncrementalKey);
						}
						// TODO: Add continueOnFail, where should it and up?
					}
					const addProcessedValue = !this.getNodeParameter(
						'options.dontUpdateKeyValuesOnDatabase',
						0,
						false,
					);
					const maxEntries = this.getNodeParameter(
						'options.maxKeyValuesToStoreInDatabase',
						0,
						1000,
					);

					let itemsProcessed: ICheckProcessedOutput;
					if (addProcessedValue) {
						itemsProcessed = await this.helpers.checkProcessedAndRecord(
							Object.keys(itemMapping),
							context as ProcessedDataContext,
							{ mode: 'latestIncrementalKey', maxEntries } as ICheckProcessedOptions,
						);
					} else {
						itemsProcessed = await this.helpers.checkProcessed(
							Object.keys(itemMapping),
							context as ProcessedDataContext,
							{ mode: 'latestIncrementalKey' } as ICheckProcessedOptions,
						);
					}

					returnData.push(
						...itemsProcessed.new
							.map((key) => {
								return itemMapping[key];
							})
							.flat(),
					);

					return [returnData];
				} else if (logic === 'RemoveItemsUpToStoredDate') {
					const context = this.getNodeParameter('options.context', 0, 'node');
					const allowDuplicateItemsInTheSameExecution = this.getNodeParameter(
						'options.allowDuplicateItemsInTheSameExecution',
						0,
						false,
					);
					if (!['node', 'workflow'].includes(context as string)) {
						throw new NodeOperationError(
							this.getNode(),
							`The context '${context}' is not supported. Please select either "node" or "workflow".`,
						);
					}

					let checkValue: string;
					const itemMapping: {
						[key: string]: INodeExecutionData[];
					} = {};
					const uniqueItems: any[] = [];

					for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
						checkValue = this.getNodeParameter('dateKeyField', itemIndex, '')?.toString() || '';
						const date = new Date(checkValue);
						if (isNaN(date.getTime())) {
							throw new NodeOperationError(
								this.getNode(),
								`The value '${checkValue}' is not a valid date. Please provide a valid date.`,
							);
						}
						if (
							itemMapping[checkValue] &&
							(allowDuplicateItemsInTheSameExecution ?? !uniqueItems.includes(checkValue))
						) {
							itemMapping[checkValue].push(items[itemIndex]);
						} else {
							itemMapping[checkValue] = [items[itemIndex]];
							if (!allowDuplicateItemsInTheSameExecution) uniqueItems.push(checkValue);
						}
						// TODO: Add continueOnFail, where should it and up?
					}
					const addProcessedValue = !this.getNodeParameter(
						'options.dontUpdateKeyValuesOnDatabase',
						0,
						false,
					);
					const maxEntries = this.getNodeParameter(
						'options.maxKeyValuesToStoreInDatabase',
						0,
						1000,
					);
					let itemsProcessed: ICheckProcessedOutput;
					if (addProcessedValue) {
						itemsProcessed = await this.helpers.checkProcessedAndRecord(
							Object.keys(itemMapping),
							context as ProcessedDataContext,
							{ mode: 'latestDate', maxEntries } as ICheckProcessedOptions,
						);
					} else {
						itemsProcessed = await this.helpers.checkProcessed(
							Object.keys(itemMapping),
							context as ProcessedDataContext,
							{ mode: 'latestDate' } as ICheckProcessedOptions,
						);
					}

					returnData.push(
						...itemsProcessed.new
							.map((key) => {
								return itemMapping[key];
							})
							.flat(),
					);

					return [returnData];
				} else {
					return [items];
				}
			}
			case 'manageKeyValuesInDatabase': {
				const mode = this.getNodeParameter('mode', 0) as string;
				if (mode === 'updateKeyValuesInDatabase') {
				} else if (mode === 'deleteKeyValuesFromDatabase') {
				} else if (mode === 'cleanDatabase') {
					const context = this.getNodeParameter('options.context', 0, 'node');
					await this.helpers.clearAllProcessedItems(context as ProcessedDataContext, {
						mode: 'entries',
					});
				}

				return [items];
			}
			default: {
				return [items];
			}
		}
	}
}
