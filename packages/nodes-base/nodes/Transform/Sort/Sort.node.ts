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
} from 'n8n-workflow';
import { shuffleArray, sortByCode } from './utils';

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
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
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
