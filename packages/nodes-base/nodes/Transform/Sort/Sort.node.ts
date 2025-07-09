import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import lt from 'lodash/lt';
import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { shuffleArray } from '@utils/utilities';

import { sortByCode } from './utils';

export class Sort implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sort',
		name: 'sort',
		icon: 'file:sort.svg',
		group: ['transform'],
		subtitle: '',
		version: 1,
		description: 'Change items order',
		defaults: {
			name: 'Sort',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
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
				description: 'The type of sorting to perform',
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
				description: 'The fields of the input items to sort by',
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
					editor: 'jsEditor',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData = [...items];
		const type = this.getNodeParameter('type', 0) as string;
		const disableDotNotation = this.getNodeParameter(
			'options.disableDotNotation',
			0,
			false,
		) as boolean;

		if (type === 'random') {
			shuffleArray(returnData);
			return [returnData];
		}

		if (type === 'simple') {
			const sortFieldsUi = this.getNodeParameter('sortFieldsUi', 0) as IDataObject;
			const sortFields = sortFieldsUi.sortField as Array<{
				fieldName: string;
				order: 'ascending' | 'descending';
			}>;

			if (!sortFields?.length) {
				throw new NodeOperationError(
					this.getNode(),
					'No sorting specified. Please add a field to sort by',
				);
			}

			for (const { fieldName } of sortFields) {
				let found = false;
				for (const item of items) {
					if (!disableDotNotation) {
						if (get(item.json, fieldName) !== undefined) {
							found = true;
						}
					} else if (item.json.hasOwnProperty(fieldName)) {
						found = true;
					}
				}
				if (!found && disableDotNotation && fieldName.includes('.')) {
					throw new NodeOperationError(
						this.getNode(),
						`Couldn't find the field '${fieldName}' in the input data`,
						{
							description:
								"If you're trying to use a nested field, make sure you turn off 'disable dot notation' in the node options",
						},
					);
				} else if (!found) {
					throw new NodeOperationError(
						this.getNode(),
						`Couldn't find the field '${fieldName}' in the input data`,
					);
				}
			}

			const sortFieldsWithDirection = sortFields.map((field) => ({
				name: field.fieldName,
				dir: field.order === 'ascending' ? 1 : -1,
			}));

			returnData.sort((a, b) => {
				let result = 0;
				for (const field of sortFieldsWithDirection) {
					let equal;
					if (!disableDotNotation) {
						const _a =
							typeof get(a.json, field.name) === 'string'
								? (get(a.json, field.name) as string).toLowerCase()
								: get(a.json, field.name);
						const _b =
							typeof get(b.json, field.name) === 'string'
								? (get(b.json, field.name) as string).toLowerCase()
								: get(b.json, field.name);
						equal = isEqual(_a, _b);
					} else {
						const _a =
							typeof a.json[field.name] === 'string'
								? (a.json[field.name] as string).toLowerCase()
								: a.json[field.name];
						const _b =
							typeof b.json[field.name] === 'string'
								? (b.json[field.name] as string).toLowerCase()
								: b.json[field.name];
						equal = isEqual(_a, _b);
					}

					if (!equal) {
						let lessThan;
						if (!disableDotNotation) {
							const _a =
								typeof get(a.json, field.name) === 'string'
									? (get(a.json, field.name) as string).toLowerCase()
									: get(a.json, field.name);
							const _b =
								typeof get(b.json, field.name) === 'string'
									? (get(b.json, field.name) as string).toLowerCase()
									: get(b.json, field.name);
							lessThan = lt(_a, _b);
						} else {
							const _a =
								typeof a.json[field.name] === 'string'
									? (a.json[field.name] as string).toLowerCase()
									: a.json[field.name];
							const _b =
								typeof b.json[field.name] === 'string'
									? (b.json[field.name] as string).toLowerCase()
									: b.json[field.name];
							lessThan = lt(_a, _b);
						}
						if (lessThan) {
							result = -1 * field.dir;
						} else {
							result = 1 * field.dir;
						}
						break;
					}
				}
				return result;
			});
		} else {
			returnData = sortByCode.call(this, returnData);
		}
		return [returnData];
	}
}
