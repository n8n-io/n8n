import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiRequest,
	apiRequestAllItems,
	downloadRecordAttachments,
} from './GenericFunctions';

export class NocoDB implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NocoDB',
		name: 'nocoDb',
		icon: 'file:nocodb.png',
		group: ['input'],
		version: 1,
		description: 'Read, update, write and delete data from NocoDB',
		defaults: {
			name: 'NocoDB',
			color: '#0989ff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'nocoDb',
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
						description: 'Append the data to a table',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete data from a table',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List data from a table',
					},
					{
						name: 'Read',
						value: 'read',
						description: 'Read data from a table',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update data in a table',
					},
				],
				default: 'read',
				description: 'The operation to perform.',
			},
			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Project ID',
				name: 'project',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the project to access.',
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				default: '',
				required: true,
				description: 'The name of table to access.',
			},

			// ----------------------------------
			//         append
			// ----------------------------------
			{
				displayName: 'Add All Fields',
				name: 'addAllFields',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'append',
						],
					},
				},
				default: true,
				description: 'If all fields should be sent to NocoDB or only specific ones.',
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
						addAllFields: [
							false,
						],
						operation: [
							'append',
						],
					},
				},
				default: [],
				placeholder: 'Name',
				required: true,
				description: 'The name of fields for which data should be sent to NocoDB.',
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'ID',
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
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
					},
				},
				default: true,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Number of results to return.',
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
					},
				},
				default: false,
				description: `When set to true the attachment fields define in 'Download Fields' will be downloaded.`,
			},
			{
				displayName: 'Download Fields',
				name: 'downloadFieldNames',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'list',
						],
						downloadAttachments: [
							true,
						],
					},
				},
				default: '',
				description: `Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.`,
			},
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
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Field',
						},
						default: [],
						placeholder: 'Name',
						description: 'Only data for fields whose names are in this list will be included in the records.',
					},
					{
						displayName: 'Filter By Formula',
						name: 'where',
						type: 'string',
						default: '',
						placeholder: '(name,like,example%)~or(name,eq,test)',
						description: 'A formula used to filter records. The formula will be evaluated for each record.',
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'string',
						default: '',
						description: 'An offset for the retrieved records.',
					},
					{
						displayName: 'Sort',
						name: 'sort',
						placeholder: 'Add Sort Rule',
						description: 'Defines how the returned records should be ordered.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'string',
										default: '',
										description: 'Name of the field to sort on.',
									},
									{
										displayName: 'Direction',
										name: 'direction',
										type: 'options',
										options: [
											{
												name: 'ASC',
												value: 'asc',
												description: 'Sort in ascending order (small -> large)',
											},
											{
												name: 'DESC',
												value: 'desc',
												description: 'Sort in descending order (large -> small)',
											},
										],
										default: 'asc',
										description: 'The sort direction.',
									},
								],
							},
						],
					},

				],
			},

			// ----------------------------------
			//         read
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'read',
						],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to return.',
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'ID',
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
			{
				displayName: 'Update All Fields',
				name: 'updateAllFields',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
					},
				},
				default: true,
				description: 'If all fields should be sent to NocoDB or only specific ones.',
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
						updateAllFields: [
							false,
						],
						operation: [
							'update',
						],
					},
				},
				default: [],
				placeholder: 'Name',
				required: true,
				description: 'The name of fields for which data should be sent to NocoDB.',
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
							maxValue: 10,
						},
						default: 10,
						description: `Number of records to process at once.`,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const operation = this.getNodeParameter('operation', 0) as string;

		const project = this.getNodeParameter('project', 0) as string;
		const table = encodeURI(this.getNodeParameter('table', 0) as string);

		let returnAll = false;
		let endpoint = '';
		let requestMethod = '';

		const body: IDataObject = {};
		let qs: IDataObject = {};


		if (operation === 'append') {

			requestMethod = 'POST';
			endpoint = `/nc/${project}/api/v1/${table}/bulk`;

			let addAllFields: boolean;
			let fields: string[];
			let options: IDataObject;

			const rows: IDataObject[] = [];
			let bulkSize = 10;

			for (let i = 0; i < items.length; i++) {
				addAllFields = this.getNodeParameter('addAllFields', i) as boolean;
				options = this.getNodeParameter('options', i, {}) as IDataObject;
				bulkSize = options.bulkSize as number || bulkSize;

				let row: IDataObject = {};

				if (addAllFields === true) {
					// Add all the fields the item has
					row = { ...items[i].json };
				} else {
					// Add only the specified fields
					row = {} as IDataObject;

					fields = this.getNodeParameter('fields', i, []) as string[];

					for (const fieldName of fields) {
						// @ts-ignore
						row[fieldName] = items[i].json[fieldName];
					}
				}

				rows.push(row);

				if (rows.length === bulkSize || i === items.length - 1) {

					responseData = await apiRequest.call(this, requestMethod, endpoint, rows, qs);
					// @ts-ignore
					returnData.push(...responseData.map(value => ({lastAddedID: value})));

					rows.length = 0;
				}
			}

		} else if (operation === 'delete') {

			requestMethod = 'DELETE';
			endpoint = `/nc/${project}/api/v1/${table}/bulk`;

			const rows: IDataObject[] = [];
			const options = this.getNodeParameter('options', 0, {}) as IDataObject;
			const bulkSize = options.bulkSize as number || 10;

			for (let i = 0; i < items.length; i++) {
				let id: string;

				id = this.getNodeParameter('id', i) as string;

				rows.push({
					id,
				});

				if (rows.length === bulkSize || i === items.length - 1) {

					responseData = await apiRequest.call(this, requestMethod, endpoint, rows, qs);

					// @ts-ignore
					returnData.push(...responseData.map(() => ({ success: true})));

					rows.length = 0;
				}
			}

		} else if (operation === 'list') {

			requestMethod = 'GET';
			endpoint = `/nc/${project}/api/v1/${table}`;

			returnAll = this.getNodeParameter('returnAll', 0) as boolean;

			const downloadAttachments = this.getNodeParameter('downloadAttachments', 0) as boolean;

			qs = this.getNodeParameter('additionalOptions', 0, {}) as IDataObject;

			if ( qs.sort ) {
				const properties = (qs.sort as IDataObject).property as Array<{field: string, direction: string}>;
				qs.sort = properties.map(prop => `${prop.direction === 'asc' ? '':'-'}${prop.field}`).join(',');
			}

			if ( qs.fields ) {
				qs.fields = (qs.fields as IDataObject[]).join(',');
			}

			if (returnAll === true) {
				responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
			} else {
				qs.limit = this.getNodeParameter('limit', 0) as number;
				responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
			}

			returnData.push.apply(returnData, responseData);

			if (downloadAttachments === true) {
				const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', 0) as string).split(',');
				const data = await downloadRecordAttachments.call(this, responseData, downloadFieldNames);
				return [data];
			}

		} else if (operation === 'read') {

			requestMethod = 'GET';

			let id: string;
			for (let i = 0; i < items.length; i++) {

				id = this.getNodeParameter('id', i) as string;

				endpoint = `/nc/${project}/api/v1/${table}/${id}`;

				responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

				returnData.push(responseData);
			}

		} else if (operation === 'update') {

			requestMethod = 'PUT';
			endpoint = `/nc/${project}/api/v1/${table}/bulk`;

			let updateAllFields: boolean;
			let fields: string[];
			let options: IDataObject;

			const rows: IDataObject[] = [];
			let bulkSize = 10;

			for (let i = 0; i < items.length; i++) {
				updateAllFields = this.getNodeParameter('updateAllFields', i) as boolean;
				options = this.getNodeParameter('options', i, {}) as IDataObject;
				bulkSize = options.bulkSize as number || bulkSize;

				let row: IDataObject = {};

				if (updateAllFields === true) {
					// Update all the fields the item has
					row = { ...items[i].json };

				} else {
					fields = this.getNodeParameter('fields', i, []) as string[];

					for (const fieldName of fields) {
						// @ts-ignore
						row[fieldName] = items[i].json[fieldName];
					}
				}

				row.id = this.getNodeParameter('id', i) as string;

				rows.push(row);

				if (rows.length === bulkSize || i === items.length - 1) {

					responseData = await apiRequest.call(this, requestMethod, endpoint, rows, qs);
					// @ts-ignore
					returnData.push(...responseData.map(() => ({ success: true})));

					// empty rows
					rows.length = 0;
				}
			}

		} else {
			throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
