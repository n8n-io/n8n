import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import set from 'lodash/set';
import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPairedItemData,
	NodeConnectionTypes,
	type NodeExecutionHint,
} from 'n8n-workflow';

import { addBinariesToItem } from './utils';
import { prepareFieldsArray } from '../utils/utils';

/**
 * Checks if two field paths conflict due to nested path relationships.
 * Returns true if one path is a parent/ancestor of another path.
 * Examples:
 * - 'user' and 'user.name' conflict (user is parent of user.name)
 * - 'user.address' and 'user.address.city' conflict
 * - 'user' and 'profile' do NOT conflict (different paths)
 */
function hasNestedPathConflict(path1: string, path2: string): boolean {
	if (path1 === path2) return true;

	// Check if path1 is a parent of path2 or vice versa
	const segments1 = path1.split('.');
	const segments2 = path2.split('.');

	// One path is a prefix of the other
	const minLength = Math.min(segments1.length, segments2.length);

	// Check if all segments of the shorter path match the longer path
	for (let i = 0; i < minLength; i++) {
		if (segments1[i] !== segments2[i]) {
			return false; // Paths diverge, no conflict
		}
	}

	// If we got here, one path is a prefix of the other
	return true;
}

export class Aggregate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Aggregate',
		name: 'aggregate',
		icon: 'file:aggregate.svg',
		group: ['transform'],
		subtitle: '',
		version: 1,
		description: 'Combine a field from many items into a list in a single item',
		defaults: {
			name: 'Aggregate',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Aggregate',
				name: 'aggregate',
				type: 'options',
				default: 'aggregateIndividualFields',
				options: [
					{
						name: 'Individual Fields',
						value: 'aggregateIndividualFields',
					},
					{
						name: 'All Item Data (Into a Single List)',
						value: 'aggregateAllItemData',
					},
				],
			},
			{
				displayName: 'Fields To Aggregate',
				name: 'fieldsToAggregate',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Field To Aggregate',
				default: { fieldToAggregate: [{ fieldToAggregate: '', renameField: false }] },
				displayOptions: {
					show: {
						aggregate: ['aggregateIndividualFields'],
					},
				},
				options: [
					{
						displayName: '',
						name: 'fieldToAggregate',
						values: [
							{
								displayName: 'Input Field Name',
								name: 'fieldToAggregate',
								type: 'string',
								default: '',
								description: 'The name of a field in the input items to aggregate together',
								// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
								placeholder: 'e.g. id',
								hint: ' Enter the field name as text',
								requiresDataPath: 'single',
							},
							{
								displayName: 'Rename Field',
								name: 'renameField',
								type: 'boolean',
								default: false,
								description: 'Whether to give the field a different name in the output',
							},
							{
								displayName: 'Output Field Name',
								name: 'outputFieldName',
								displayOptions: {
									show: {
										renameField: [true],
									},
								},
								type: 'string',
								default: '',
								description:
									'The name of the field to put the aggregated data in. Leave blank to use the input field name.',
								requiresDataPath: 'single',
							},
						],
					},
				],
			},
			{
				displayName: 'Put Output in Field',
				name: 'destinationFieldName',
				type: 'string',
				displayOptions: {
					show: {
						aggregate: ['aggregateAllItemData'],
					},
				},
				default: 'data',
				description: 'The name of the output field to put the data in',
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				default: 'allFields',
				options: [
					{
						name: 'All Fields',
						value: 'allFields',
					},
					{
						name: 'Specified Fields',
						value: 'specifiedFields',
					},
					{
						name: 'All Fields Except',
						value: 'allFieldsExcept',
					},
				],
				displayOptions: {
					show: {
						aggregate: ['aggregateAllItemData'],
					},
				},
			},
			{
				displayName: 'Fields To Exclude',
				name: 'fieldsToExclude',
				type: 'string',
				placeholder: 'e.g. email, name',
				default: '',
				requiresDataPath: 'multiple',
				displayOptions: {
					show: {
						aggregate: ['aggregateAllItemData'],
						include: ['allFieldsExcept'],
					},
				},
			},
			{
				displayName: 'Fields To Include',
				name: 'fieldsToInclude',
				type: 'string',
				placeholder: 'e.g. email, name',
				default: '',
				requiresDataPath: 'multiple',
				displayOptions: {
					show: {
						aggregate: ['aggregateAllItemData'],
						include: ['specifiedFields'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Group By Fields',
						name: 'groupByFields',
						type: 'string',
						default: '',
						placeholder: 'e.g. category, type',
						description:
							'Comma-separated list of fields to group by. Creates one output item per unique combination of these field values. Dot-notation is supported to access nested fields.',
						requiresDataPath: 'multiple',
					},
					{
						displayName: 'Disable Dot Notation',
						name: 'disableDotNotation',
						type: 'boolean',
						default: false,
						description:
							'Whether to disallow referencing child fields using `parent.child` in the field name',
						displayOptions: {
							hide: {
								'/aggregate': ['aggregateAllItemData'],
							},
						},
					},
					{
						displayName: 'Merge Lists',
						name: 'mergeLists',
						type: 'boolean',
						default: false,
						description:
							'Whether to merge the output into a single flat list (rather than a list of lists), if the field to aggregate is a list',
						displayOptions: {
							hide: {
								'/aggregate': ['aggregateAllItemData'],
							},
						},
					},
					{
						displayName: 'Include Binaries',
						name: 'includeBinaries',
						type: 'boolean',
						default: false,
						description: 'Whether to include the binary data in the new item',
					},
					{
						displayName: 'Keep Only Unique Binaries',
						name: 'keepOnlyUnique',
						type: 'boolean',
						default: false,
						description:
							'Whether to keep only unique binaries by comparing mime types, file types, file sizes and file extensions',
						displayOptions: {
							show: {
								includeBinaries: [true],
							},
						},
					},
					{
						displayName: 'Keep Missing And Null Values',
						name: 'keepMissing',
						type: 'boolean',
						default: false,
						description:
							'Whether to add a null entry to the aggregated list when there is a missing or null value',
						displayOptions: {
							hide: {
								'/aggregate': ['aggregateAllItemData'],
							},
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData = { json: {}, pairedItem: [] };
		const items = this.getInputData();
		const notFoundedFields: { [key: string]: boolean[] } = {};

		const aggregate = this.getNodeParameter('aggregate', 0, '') as string;
		const groupByFieldsParam = this.getNodeParameter('options.groupByFields', 0, '') as string;
		const groupByFields = prepareFieldsArray(groupByFieldsParam, 'Group By Fields');

		if (aggregate === 'aggregateIndividualFields') {
			const disableDotNotation = this.getNodeParameter(
				'options.disableDotNotation',
				0,
				false,
			) as boolean;
			const mergeLists = this.getNodeParameter('options.mergeLists', 0, false) as boolean;
			const fieldsToAggregate = this.getNodeParameter(
				'fieldsToAggregate.fieldToAggregate',
				0,
				[],
			) as [{ fieldToAggregate: string; renameField: boolean; outputFieldName: string }];
			const keepMissing = this.getNodeParameter('options.keepMissing', 0, false) as boolean;

			if (!fieldsToAggregate.length) {
				throw new NodeOperationError(this.getNode(), 'No fields specified', {
					description: 'Please add a field to aggregate',
				});
			}

			const newItem: INodeExecutionData = {
				json: {},
				pairedItem: Array.from({ length: items.length }, (_, i) => i).map((index) => {
					return {
						item: index,
					};
				}),
			};

			const values: { [key: string]: any } = {};
			const outputFields: string[] = [];

			for (const { fieldToAggregate, outputFieldName, renameField } of fieldsToAggregate) {
				const field = renameField ? outputFieldName : fieldToAggregate;

				if (outputFields.includes(field)) {
					throw new NodeOperationError(
						this.getNode(),
						`The '${field}' output field is used more than once`,
						{ description: 'Please make sure each output field name is unique' },
					);
				} else {
					outputFields.push(field);
				}

				const getFieldToAggregate = () =>
					!disableDotNotation && fieldToAggregate.includes('.')
						? fieldToAggregate.split('.').pop()
						: fieldToAggregate;

				const _outputFieldName = outputFieldName
					? outputFieldName
					: (getFieldToAggregate() as string);

				if (fieldToAggregate !== '') {
					values[_outputFieldName] = [];
					for (let i = 0; i < items.length; i++) {
						if (notFoundedFields[fieldToAggregate] === undefined) {
							notFoundedFields[fieldToAggregate] = [];
						}

						if (!disableDotNotation) {
							let value = get(items[i].json, fieldToAggregate);
							notFoundedFields[fieldToAggregate].push(value === undefined ? false : true);

							if (!keepMissing) {
								if (Array.isArray(value)) {
									value = value.filter((entry) => entry !== null);
								} else if (value === null || value === undefined) {
									continue;
								}
							}

							if (Array.isArray(value) && mergeLists) {
								values[_outputFieldName].push(...value);
							} else {
								values[_outputFieldName].push(value);
							}
						} else {
							let value = items[i].json[fieldToAggregate];
							notFoundedFields[fieldToAggregate].push(value === undefined ? false : true);

							if (!keepMissing) {
								if (Array.isArray(value)) {
									value = value.filter((entry) => entry !== null);
								} else if (value === null || value === undefined) {
									continue;
								}
							}

							if (Array.isArray(value) && mergeLists) {
								values[_outputFieldName].push(...value);
							} else {
								values[_outputFieldName].push(value);
							}
						}
					}
				}
			}

			for (const key of Object.keys(values)) {
				if (!disableDotNotation) {
					set(newItem.json, key, values[key]);
				} else {
					newItem.json[key] = values[key];
				}
			}

			returnData = newItem;
		} else {
			let newItems: IDataObject[] = items.map((item) => item.json);
			let pairedItem: IPairedItemData[] = [];
			const destinationFieldName = this.getNodeParameter('destinationFieldName', 0) as string;

			const fieldsToExclude = prepareFieldsArray(
				this.getNodeParameter('fieldsToExclude', 0, '') as string,
				'Fields To Exclude',
			);

			const fieldsToInclude = prepareFieldsArray(
				this.getNodeParameter('fieldsToInclude', 0, '') as string,
				'Fields To Include',
			);

			if (fieldsToExclude.length || fieldsToInclude.length) {
				newItems = newItems.reduce((acc, item, index) => {
					const newItem: IDataObject = {};
					let outputFields = Object.keys(item);

					if (fieldsToExclude.length) {
						outputFields = outputFields.filter((key) => !fieldsToExclude.includes(key));
					}
					if (fieldsToInclude.length) {
						outputFields = outputFields.filter((key) =>
							fieldsToInclude.length ? fieldsToInclude.includes(key) : true,
						);
					}

					outputFields.forEach((key) => {
						newItem[key] = item[key];
					});

					if (isEmpty(newItem)) {
						return acc;
					}

					pairedItem.push({ item: index });
					return acc.concat([newItem]);
				}, [] as IDataObject[]);
			} else {
				pairedItem = Array.from({ length: newItems.length }, (_, item) => ({
					item,
				}));
			}

			const output: INodeExecutionData = { json: { [destinationFieldName]: newItems }, pairedItem };

			returnData = output;
		}

		if (Object.keys(notFoundedFields).length) {
			const hints: NodeExecutionHint[] = [];

			for (const [field, values] of Object.entries(notFoundedFields)) {
				if (values.every((value) => !value)) {
					hints.push({
						message: `The field '${field}' wasn't found in any input item`,
						location: 'outputPane',
					});
				}
			}

			if (hints.length) {
				this.addExecutionHints(...hints);
			}
		}

		// Apply grouping if specified
		if (groupByFields.length > 0) {
			const groups: {
				[key: string]: { items: IDataObject[]; pairedItems: number[]; values: any[] };
			} = {};

			// Group original items by the specified fields
			items.forEach((item, index) => {
				const groupValues = groupByFields.map((field) => {
					const value = get(item.json, field);
					if (typeof value === 'object' && value !== null) {
						throw new NodeOperationError(
							this.getNode(),
							`Field "${field}" has a non-scalar value which cannot be used for grouping.`,
							{
								description:
									'Only scalar values (string, number, boolean, null) can be used in "Group By Fields".',
							},
						);
					}
					return value;
				});
				const groupKey = JSON.stringify(groupValues);

				if (!groups[groupKey]) {
					groups[groupKey] = { items: [], pairedItems: [], values: groupValues };
				}

				groups[groupKey].items.push(item.json);
				groups[groupKey].pairedItems.push(index);
			});

			// Create output items for each group
			const result: INodeExecutionData[] = [];
			const groupPairedItems: number[][] = []; // Track all items in each group for binary aggregation

			Object.values(groups).forEach((groupData) => {
				const groupItem: IDataObject = {};

				// Add the grouping field values to the output
				groupByFields.forEach((field, index) => {
					const value = groupData.values[index];
					set(groupItem, field, value);
				});

				if (aggregate === 'aggregateAllItemData') {
					const destinationFieldName = this.getNodeParameter('destinationFieldName', 0) as string;

					// Check for conflicts with group-by field names (including nested paths)
					const conflictingGroupByField = groupByFields.find((groupByField) =>
						hasNestedPathConflict(destinationFieldName, groupByField),
					);
					if (conflictingGroupByField) {
						throw new NodeOperationError(
							this.getNode(),
							`The destination field '${destinationFieldName}' conflicts with a Group By field '${conflictingGroupByField}'`,
							{ description: 'Please choose a different destination field name or Group By field' },
						);
					}

					const fieldsToExclude = prepareFieldsArray(
						this.getNodeParameter('fieldsToExclude', 0, '') as string,
						'Fields To Exclude',
					);
					const fieldsToInclude = prepareFieldsArray(
						this.getNodeParameter('fieldsToInclude', 0, '') as string,
						'Fields To Include',
					);

					let groupedAndFilteredItems = groupData.items;

					if (fieldsToExclude.length || fieldsToInclude.length) {
						groupedAndFilteredItems = groupedAndFilteredItems
							.map((item) => {
								const newItem: IDataObject = {};
								let outputFields = Object.keys(item);

								if (fieldsToExclude.length) {
									outputFields = outputFields.filter((key) => !fieldsToExclude.includes(key));
								}
								if (fieldsToInclude.length) {
									outputFields = outputFields.filter((key) =>
										fieldsToInclude.length ? fieldsToInclude.includes(key) : true,
									);
								}

								outputFields.forEach((key) => {
									newItem[key] = item[key];
								});
								return newItem;
							})
							.filter((item) => !isEmpty(item));
					}

					groupItem[destinationFieldName] = groupedAndFilteredItems;
				} else {
					// For aggregateIndividualFields mode, recompute aggregation for the group
					const fieldsToAggregate = this.getNodeParameter(
						'fieldsToAggregate.fieldToAggregate',
						0,
						[],
					) as [{ fieldToAggregate: string; renameField: boolean; outputFieldName: string }];
					const disableDotNotation = this.getNodeParameter(
						'options.disableDotNotation',
						0,
						false,
					) as boolean;
					const mergeLists = this.getNodeParameter('options.mergeLists', 0, false) as boolean;
					const keepMissing = this.getNodeParameter('options.keepMissing', 0, false) as boolean;

					// Validate that fields are specified
					if (!fieldsToAggregate.length) {
						throw new NodeOperationError(this.getNode(), 'No fields specified', {
							description: 'Please add a field to aggregate',
						});
					}

					// Validate unique output field names and detect conflicts with group-by fields
					const outputFields: string[] = [];
					for (const { fieldToAggregate, outputFieldName, renameField } of fieldsToAggregate) {
						const getFieldToAggregate = () =>
							!disableDotNotation && fieldToAggregate.includes('.')
								? fieldToAggregate.split('.').pop()
								: fieldToAggregate;

						const field = renameField ? outputFieldName : (getFieldToAggregate() as string);

						if (outputFields.includes(field)) {
							throw new NodeOperationError(
								this.getNode(),
								`The '${field}' output field is used more than once`,
								{ description: 'Please make sure each output field name is unique' },
							);
						}

						// Check for conflicts with group-by field names (including nested paths)
						const conflictingGroupByField = groupByFields.find((groupByField) =>
							hasNestedPathConflict(field, groupByField),
						);
						if (conflictingGroupByField) {
							throw new NodeOperationError(
								this.getNode(),
								`The output field '${field}' conflicts with a Group By field '${conflictingGroupByField}'`,
								{
									description:
										'Please rename the aggregated field or choose a different Group By field',
								},
							);
						}

						outputFields.push(field);
					}

					const values: { [key: string]: any } = {};

					for (const { fieldToAggregate, outputFieldName } of fieldsToAggregate) {
						const getFieldToAggregate = () =>
							!disableDotNotation && fieldToAggregate.includes('.')
								? fieldToAggregate.split('.').pop()
								: fieldToAggregate;

						const _outputFieldName = outputFieldName
							? outputFieldName
							: (getFieldToAggregate() as string);

						if (fieldToAggregate !== '') {
							values[_outputFieldName] = [];
							for (const itemJson of groupData.items) {
								// Track missing fields
								if (notFoundedFields[fieldToAggregate] === undefined) {
									notFoundedFields[fieldToAggregate] = [];
								}

								let value;
								if (!disableDotNotation) {
									value = get(itemJson, fieldToAggregate);
								} else {
									value = itemJson[fieldToAggregate];
								}

								notFoundedFields[fieldToAggregate].push(value === undefined ? false : true);

								if (!keepMissing) {
									if (Array.isArray(value)) {
										// Align with standard flow: filter only null, not undefined
										value = value.filter((entry) => entry !== null);
									} else if (value === null || value === undefined) {
										continue;
									}
								}

								if (Array.isArray(value) && mergeLists) {
									values[_outputFieldName].push(...value);
								} else {
									values[_outputFieldName].push(value);
								}
							}
						}
					}

					for (const key of Object.keys(values)) {
						if (!disableDotNotation) {
							set(groupItem, key, values[key]);
						} else {
							groupItem[key] = values[key];
						}
					}
				}

				// Store all paired items for binary aggregation
				groupPairedItems.push(groupData.pairedItems);

				result.push({
					json: groupItem,
					pairedItem: { item: groupData.pairedItems[0] },
				});
			});

			const includeBinaries = this.getNodeParameter('options.includeBinaries', 0, false) as boolean;
			if (includeBinaries) {
				const keepOnlyUnique = this.getNodeParameter('options.keepOnlyUnique', 0, false) as boolean;
				for (let i = 0; i < result.length; i++) {
					const resultItem = result[i];
					const pairedItemIndices = groupPairedItems[i];
					const aggregatedItems = pairedItemIndices.map((itemIndex) => items[itemIndex]);
					addBinariesToItem(resultItem, aggregatedItems, keepOnlyUnique);
				}
			}

			return [result];
		}

		const includeBinaries = this.getNodeParameter('options.includeBinaries', 0, false) as boolean;

		if (includeBinaries) {
			const pairedItems = (returnData.pairedItem || []) as IPairedItemData[];

			const aggregatedItems = pairedItems.map((item) => {
				return items[item.item];
			});

			const keepOnlyUnique = this.getNodeParameter('options.keepOnlyUnique', 0, false) as boolean;

			addBinariesToItem(returnData, aggregatedItems, keepOnlyUnique);
		}

		return [[returnData]];
	}
}
