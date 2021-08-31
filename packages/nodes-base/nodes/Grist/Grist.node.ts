import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError,} from 'n8n-workflow';

import {apiRequest, parseListOptions, parseRecordId, processInputData, RawListOptions,} from './GenericFunctions';

import * as _ from 'lodash';

export class Grist implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Grist',
		name: 'grist',
		icon: 'file:grist.svg',
		group: ['input'],
		version: 1,
		description: 'Read, update, write and delete data from Grist',
		defaults: {
			name: 'Grist',
			color: '#394650',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gristApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Append records to a table',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete records from a table',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Read records from a table',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update records in a table',
					},
				],
				default: 'list',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: 'docs.getgrist.com',
				required: true,
				description: 'Domain of the address where your document lives. Only applicable to teams with custom domains.',
			},
			{
				displayName: 'Document ID',
				name: 'docId',
				type: 'string',
				default: '',
				required: true,
				description: 'In your document, click your profile icon, then Document Settings, ' +
					'then copy the value under "This document\'s ID"',
			},
			{
				displayName: 'Table ID',
				name: 'tableId',
				type: 'string',
				default: '',
				placeholder: 'Table1',
				required: true,
				description: 'The ID of table to access. If unsure, look at the Code View.',
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'Record ID',
				name: 'id',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to delete.',
			},

			// ----------------------------------
			//         list
			// ----------------------------------

			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
					},
				},
				default: {},
				description: 'Additional options which decide which records should be returned',
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 100,
						},
						default: 100,
						description: 'Maximum number of results to return.',
					},
					{
						displayName: 'Filter',
						name: 'filter',
						placeholder: 'Add Filter Field',
						description: 'Only return records matching all of the given filters. For complex filters, create a formula column and filter for the value "true".',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'filter',
								displayName: 'Filter Field',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'string',
										default: '',
										description: 'Name of the field (column) to filter by',
										required: true,
									},
									{
										displayName: 'Values',
										name: 'values',
										type: 'string',
										typeOptions: {
											multipleValues: true,
										},
										default: '',
										placeholder: 'Add Field Value',
										description: 'Possible values for the field (column). ' +
											'The result will include records where the value for this field ' +
											'is equal to one of the values in this list.',
									},
								],
							},
						],
					},
					{
						displayName: 'Sort',
						name: 'sort',
						placeholder: 'Add Sort Field',
						description: 'Defines how the returned records should be ordered.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Sort Field',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'string',
										default: '',
										required: true,
										description: 'Name of the field (column) to sort on.',
									},
									{
										displayName: 'Direction',
										name: 'direction',
										type: 'options',
										options: [
											{
												name: 'Ascending',
												value: 'asc',
												description: 'Sort in ascending order (small -> large)',
											},
											{
												name: 'Descending',
												value: 'desc',
												description: 'Sort in descending order (large -> small)',
											},
										],
										default: 'asc',
										description: 'Whether to sort in ascending (small -> large) or descending (large -> small) order.',
									},
								],
							},
						],
					},
				],
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'Record ID',
				name: 'id',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to update.',
			},

			// ----------------------------------
			//         append + update
			// ----------------------------------
			{
				displayName: 'Send All Fields',
				name: 'allFields',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'append',
							'update',
						],
					},
				},
				default: true,
				description: 'If all fields should be sent to Grist or only specific ones.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Field',
				},
				displayOptions: {
					show: {
						allFields: [
							false,
						],
						operation: [
							'append',
							'update',
						],
					},
				},
				default: [],
				placeholder: 'Field ID',
				required: true,
				description: 'The IDs of fields (columns) for which data should be sent to Grist.',
			},

			// ----------------------------------
			//         append + delete + update
			// ----------------------------------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: [
							'append',
							'delete',
							'update',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Bulk Size',
						name: 'bulkSize',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 100,
						},
						default: 100,
						description: `Number of records to process at once.`,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;

		const domain = this.getNodeParameter('domain', 0) as string;
		const docId = this.getNodeParameter('docId', 0) as string;
		const tableId = this.getNodeParameter('tableId', 0) as string;

		const options = this.getNodeParameter('options', 0, {}) as IDataObject;
		const bulkSize = options.bulkSize as number || 100;

		const uriBase = `https://${domain}/api/docs/${docId}/tables/${tableId}/`;

		const onError = (error: Error, data: IDataObject) => {
			if (this.continueOnFail()) {
				returnData.push({error: error.message, data});
			} else {
				throw error;
			}
		};

		const extractRecord = (item: IDataObject, i: number) => {
			const record: IDataObject = {fields: _.omit(item, 'id')};
			const allFields = this.getNodeParameter('allFields', i) as boolean;
			if (!allFields) {
				const fields = this.getNodeParameter('fields', i, []) as string[];
				record.fields = _.pick(record.fields, fields);
			}
			return record;
		};

		const getRecordId = (i: number) => {
			return parseRecordId(this.getNodeParameter('id', i) as string);
		};

		const process = processInputData.bind(this, bulkSize, onError);

		if (operation === 'append') {
			// ----------------------------------
			//         append
			// ----------------------------------
			const result = await process(
				{method: 'POST', uri: uriBase + 'records'},
				records => ({records}),
				(item, i) => extractRecord(item, i),
			);

			result.responses.forEach(response => returnData.push(...response.records));

		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------
			const result = await process(
				{method: 'PATCH', uri: uriBase + 'records'},
				records => ({records}),
				(item, i) => ({...extractRecord(item, i), id: getRecordId(i)}),
			);

			// PATCH doesn't return anything
			returnData.push(...result.records as IDataObject[]);

		} else if (operation === 'delete') {
			// ----------------------------------
			//         delete
			// ----------------------------------
			const result = await process(
				{method: 'POST', uri: uriBase + 'data/delete'},
				ids => ids,
				(item, i) => getRecordId(i),
			);

			// delete doesn't return anything
			returnData.push(...result.records.map(id => ({id: id as number})));

		} else if (operation === 'list') {
			// ----------------------------------
			//         list
			// ----------------------------------
			const additionalOptions = this.getNodeParameter('additionalOptions', 0, {}) as RawListOptions;
			const responseData = await apiRequest.call(
				this,
				{
					method: 'GET',
					uri: uriBase + 'records',
					qs: parseListOptions(additionalOptions),
				},
			);

			returnData.push(...responseData.records);
		} else {
			throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
