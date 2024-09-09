/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import lt from 'lodash/lt';
import pick from 'lodash/pick';
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
import { prepareFieldsArray } from '../../utils/utils';
import { validateInputData } from '../utils';
import { compareItems, flattenKeys } from '@utils/utilities';
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
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Remove Duplicate Input Items',
					value: 'removeDuplicateInputItems',
					description: 'Remove duplicates from incoming items',
					action: 'Remove Duplicate Input Items',
				},
				{
					name: 'Remove Items Seen in Previous Executions',
					value: 'removeItemsSeenInPreviousExecutions',
					description: 'Remove items already processed in previous executions (using the database)',
					action: 'Remove Items Seen in Previous Executions',
				},
				{
					name: 'Manage Key Values in Database (No Removal)',
					value: 'ManageKeyValuesInDatabase',
					description: 'Store or delete key values in the database without removing items',
					action: 'Manage Key Values in Database (No Removal)',
				},
			],
			default: 'removeDuplicateInputItems',
		},
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
			displayOptions: {
				show: {
					operation: ['removeDuplicateInputItems'],
				},
			},
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
		// ----------------------------------
		{
			displayName:
				'This operation removes input items already processed in previous executions by matching the key field values stored in the database',
			name: 'notice_tip',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					operation: ['removeItemsSeenInPreviousExecutions'],
				},
			},
		},
		{
			displayName: 'Logic',
			name: 'logic',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Remove Items With Already Seen Key Values',
					value: 'removeItemsWithAlreadySeenKeyValues',
					description:
						'Remove all input items with key values matching those stored in the dedupe database',
				},
				{
					name: 'Remove Items Up to Stored Incremental Key',
					value: 'removeItemsUpToStoredIncrementalKey',
					description:
						'Works with incremental key values, removes all input items with key values up to the stored value. Stores only the highest key value.',
				},
				{
					name: 'Remove Items Up to Stored Date',
					value: 'RemoveItemsUpToStoredDate',
					description:
						'Works with date key values, removes all input items with key values up to the stored value. Stores only the latest key value.',
				},
			],
			default: 'removeDuplicateInputItems',
			description:
				'How to select input items for removal based on key values stored in the dedupe database',
			displayOptions: {
				show: {
					operation: ['removeItemsSeenInPreviousExecutions'],
				},
			},
		},
		{
			displayName: 'Key Field',
			name: 'keyField',
			type: 'string',
			default: '',
			hint: 'The input field used as a key for deduplication. Type or drag the field name from the input panel.',
			placeholder: 'e.g. ID',
			displayOptions: {
				show: {
					logic: ['removeItemsWithAlreadySeenKeyValues'],
				},
			},
		},
		{
			displayName: 'Key Field',
			name: 'incrementalKeyField',
			type: 'number',
			default: '',
			hint: 'The input field used as a key for deduplication. Type or drag the field name from the input panel.',
			placeholder: 'e.g. ID',
			displayOptions: {
				show: {
					logic: ['removeItemsUpToStoredIncrementalKey'],
				},
			},
		},
		{
			displayName: 'Key Field',
			name: 'dateKeyField',
			type: 'dateTime',
			default: '',
			hint: 'The input field used as a key for deduplication. Type or drag the field name from the input panel.',
			placeholder: ' e.g. 2024-08-09T13:44:16Z',
			displayOptions: {
				show: {
					logic: ['RemoveItemsUpToStoredDate'],
				},
			},
		},
		{
			displayName: 'Options',
			name: 'dedupeOptions',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					operation: ['removeItemsSeenInPreviousExecutions'],
				},
			},
			options: [
				{
					displayName: 'Allow Duplicate Items in the Same Execution',
					name: 'allowDuplicateItemsInTheSameExecution',
					type: 'boolean',
					default: false,
					description:
						'Whether input items with the same key field value should be allowed in the same execution',
				},
				{
					displayName: 'Context',
					name: 'context',
					type: 'options',
					default: 'workflow',
					description:
						'If set to ‘workflow,’ key values will be shared across all nodes in the workflow. If set to ‘node,’ key values will be specific to this node.',
					options: [
						{
							name: 'Workflow',
							value: 'workflow',
							description: 'Deduplication info will be shared by all the nodes in the workflow',
						},
						{
							name: 'Node',
							value: 'node',
							description: 'Deduplication info will be stored only for this node',
						},
					],
				},
				{
					displayName: 'Don’t Update Key Values on Database',
					name: 'dontUpdateKeyValuesOnDatabase',
					type: 'boolean',
					default: false,
					description:
						'Whether to just remove duplicates based on the stored key values without updating the database',
				},
				{
					displayName: 'Max Key Values to Store in Database',
					name: 'maxKeyValuesToStoreInDatabase',
					type: 'number',
					default: 1000,
					description: 'Maximum value for “Max Key Values to Store in Database',
				},
			],
		},
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			default: 'updateKeyValuesInDatabase',
			description:
				'How you want to modify the key values stored on the database. None of these modes removes input items.',
			displayOptions: {
				show: {
					operation: ['ManageKeyValuesInDatabase'],
				},
			},
			options: [
				// {
				// 	name: 'Update Key Values in Database',
				// 	value: 'updateKeyValuesInDatabase',
				// 	description: 'Store item key values in the database without removing items',
				// },
				// {
				// 	name: 'Delete Key Values From Database',
				// 	value: 'deleteKeyValuesFromDatabase',
				// 	description: 'Delete input item key values from the database without removing items',
				// },
				{
					name: 'Clean Database',
					value: 'cleanDatabase',
					description: 'Clear all values stored for a key in the database',
				},
			],
		},
		{
			displayName: 'Context',
			name: 'cleanDatabaseContext',
			type: 'options',
			default: 'workflow',
			description:
				'If set to ‘workflow,’ key values will be shared across all nodes in the workflow. If set to ‘node,’ key values will be specific to this node.',
			options: [
				{
					name: 'Workflow',
					value: 'workflow',
					description: 'Deduplication info will be shared by all the nodes in the workflow',
				},
				{
					name: 'Node',
					value: 'node',
					description: 'Deduplication info will be stored only for this node',
				},
			],
			displayOptions: {
				show: {
					operation: ['ManageKeyValuesInDatabase'],
				},
			},
		},
		// {
		// 	displayName: 'Logic',
		// 	name: 'updateKeyValuesInDatabaseLogic',
		// 	type: 'options',
		// 	default: 'addNewKeyValues',
		// 	description: 'The logic to follow to update the key values in the database',
		// 	displayOptions: {
		// 		show: {
		// 			mode: ['updateKeyValuesInDatabase'],
		// 		},
		// 	},
		// 	options: [
		// 		{
		// 			name: 'Add New Key Values',
		// 			value: 'addNewKeyValues',
		// 			description: 'Store all the new key values from incoming items in the database',
		// 		},
		// 		{
		// 			name: 'Update Incremental Key Value With Highest',
		// 			value: 'updateIncrementalKeyValueWithHighest',
		// 			description:
		// 				'Works with incremental key values, replace the key value in the database with the highest from incoming items',
		// 		},
		// 		{
		// 			name: 'Update Date Key Value With Latest',
		// 			value: 'updateDateKeyValueWithLatest',
		// 			description:
		// 				'Works with date key values, replace the key value in the database with the latest from incoming items',
		// 		},
		// 	],
		// },
		// {
		// 	displayName: 'Logic',
		// 	name: 'deleteKeyValuesFromDatabaseLogic',
		// 	type: 'options',
		// 	default: 'removeAllMatchingKeyValues',
		// 	description: 'The logic to follow to remove the keys from the database',
		// 	displayOptions: {
		// 		show: {
		// 			mode: ['deleteKeyValuesFromDatabase'],
		// 		},
		// 	},
		// 	options: [
		// 		{
		// 			name: 'Remove All Matching Key Values',
		// 			value: 'removeAllMatchingKeyValues',
		// 			description: 'Remove all the key values from incoming items from the database',
		// 		},
		// 		{
		// 			name: 'Reset Incremental Key Value to Lowest',
		// 			value: 'resetIncrementalKeyValueToLowest',
		// 			description:
		// 				'Works with incremental key values, replace the key value in the database with the lowest from incoming items',
		// 		},
		// 		{
		// 			name: 'Reset Incremental Key Value to Less Recent',
		// 			value: 'resetIncrementalKeyValueToLessRecent',
		// 			description:
		// 				'Works with date key values, replace the key value in the database with the less recent date from incoming items',
		// 		},
		// 	],
		// },
	],
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
		if (operation === 'removeDuplicateInputItems') {
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
			let returnData = items.filter((_, index) => !removedIndexes.includes(index));

			if (removeOtherFields) {
				returnData = returnData.map((item, index) => ({
					json: pick(item.json, ...keys),
					pairedItem: { item: index },
				}));
			}

			return [returnData];
		} else if (operation === 'removeItemsSeenInPreviousExecutions') {
			const logic = this.getNodeParameter('logic', 0);
			if (logic === 'removeItemsWithAlreadySeenKeyValues') {
				const context = this.getNodeParameter('dedupeOptions.context', 0, 'workflow');

				if (!['node', 'workflow'].includes(context as string)) {
					throw new NodeOperationError(
						this.getNode(),
						`The context '${context}' is not supported. Please select either "node" or "workflow".`,
					);
				}

				const node = this.getNode();
				console.log('\nEXECUTE NODE: ', node.name);

				let checkValue: string;
				const itemMapping: {
					[key: string]: INodeExecutionData[];
				} = {};

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					checkValue = this.getNodeParameter('keyField', itemIndex, '')?.toString() || '';
					if (itemMapping[checkValue]) {
						itemMapping[checkValue].push(items[itemIndex]);
					} else {
						itemMapping[checkValue] = [items[itemIndex]];
					}
					// TODO: Add continueOnFail, where should it and up?
				}
				const addProcessedValue = !this.getNodeParameter(
					'dedupeOptions.dontUpdateKeyValuesOnDatabase',
					0,
					false,
				);
				const maxEntries = this.getNodeParameter(
					'dedupeOptions.maxKeyValuesToStoreInDatabase',
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

				const returnData: INodeExecutionData[] = itemsProcessed.new
					.map((key) => {
						return itemMapping[key];
					})
					.flat();

				return [returnData];
			} else if (logic === 'removeItemsUpToStoredIncrementalKey') {
				const context = this.getNodeParameter('dedupeOptions.context', 0, 'workflow');

				if (!['node', 'workflow'].includes(context as string)) {
					throw new NodeOperationError(
						this.getNode(),
						`The context '${context}' is not supported. Please select either "node" or "workflow".`,
					);
				}

				const node = this.getNode();
				console.log('\nEXECUTE NODE: ', node.name);

				let checkValue: string;
				const itemMapping: {
					[key: string]: INodeExecutionData[];
				} = {};

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					checkValue =
						this.getNodeParameter('incrementalKeyField', itemIndex, '')?.toString() || '';
					if (itemMapping[checkValue]) {
						itemMapping[checkValue].push(items[itemIndex]);
					} else {
						itemMapping[checkValue] = [items[itemIndex]];
					}
					// TODO: Add continueOnFail, where should it and up?
				}
				const addProcessedValue = !this.getNodeParameter(
					'dedupeOptions.dontUpdateKeyValuesOnDatabase',
					0,
					false,
				);
				const maxEntries = this.getNodeParameter(
					'dedupeOptions.maxKeyValuesToStoreInDatabase',
					0,
					1000,
				);

				let itemsProcessed: ICheckProcessedOutput;
				if (addProcessedValue) {
					itemsProcessed = await this.helpers.checkProcessedAndRecord(
						Object.keys(itemMapping),
						context as ProcessedDataContext,
						{ mode: 'latest', maxEntries } as ICheckProcessedOptions,
					);
				} else {
					itemsProcessed = await this.helpers.checkProcessed(
						Object.keys(itemMapping),
						context as ProcessedDataContext,
						{ mode: 'latest' } as ICheckProcessedOptions,
					);
				}

				const returnData: INodeExecutionData[] = itemsProcessed.new
					.map((key) => {
						return itemMapping[key];
					})
					.flat();

				return [returnData];
			} else if (logic === 'RemoveItemsUpToStoredDate') {
				const context = this.getNodeParameter('dedupeOptions.context', 0, 'workflow');

				if (!['node', 'workflow'].includes(context as string)) {
					throw new NodeOperationError(
						this.getNode(),
						`The context '${context}' is not supported. Please select either "node" or "workflow".`,
					);
				}

				const node = this.getNode();
				console.log('\nEXECUTE NODE: ', node.name);

				let checkValue: string;
				const itemMapping: {
					[key: string]: INodeExecutionData[];
				} = {};

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					checkValue = this.getNodeParameter('dateKeyField', itemIndex, '')?.toString() || '';
					if (itemMapping[checkValue]) {
						itemMapping[checkValue].push(items[itemIndex]);
					} else {
						itemMapping[checkValue] = [items[itemIndex]];
					}
					// TODO: Add continueOnFail, where should it and up?
				}
				const addProcessedValue = !this.getNodeParameter(
					'dedupeOptions.dontUpdateKeyValuesOnDatabase',
					0,
					false,
				);
				const maxEntries = this.getNodeParameter(
					'dedupeOptions.maxKeyValuesToStoreInDatabase',
					0,
					1000,
				);
				let itemsProcessed: ICheckProcessedOutput;
				if (addProcessedValue) {
					itemsProcessed = await this.helpers.checkProcessedAndRecord(
						Object.keys(itemMapping),
						context as ProcessedDataContext,
						{ mode: 'latest', maxEntries } as ICheckProcessedOptions,
					);
				} else {
					itemsProcessed = await this.helpers.checkProcessed(
						Object.keys(itemMapping),
						context as ProcessedDataContext,
						{ mode: 'latest' } as ICheckProcessedOptions,
					);
				}

				const returnData: INodeExecutionData[] = itemsProcessed.new
					.map((key) => {
						return itemMapping[key];
					})
					.flat();

				return [returnData];
			} else {
				return [items];
			}
		} else if (operation === 'ManageKeyValuesInDatabase') {
			const mode = this.getNodeParameter('mode', 0) as string;
			if (mode === 'updateKeyValuesInDatabase') {
			} else if (mode === 'deleteKeyValuesFromDatabase') {
			} else if (mode === 'cleanDatabase') {
				const context = this.getNodeParameter('cleanDatabaseContext', 0, 'workflow');
				await this.helpers.clearAllProcessedItems(context as ProcessedDataContext, {
					mode: 'entries',
				});
			}

			return [items];
		} else {
			return [items];
		}
	}
}
