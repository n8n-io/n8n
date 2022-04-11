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
	getAdditionalOptions,
	getItem,
	xataApiFetchAllWrapper,
	xataApiRequest
} from './GenericFunctions';

export class Xata implements INodeType {

	description: INodeTypeDescription = {

		displayName: 'Xata',
		name: 'Xata',
		icon: 'file:xata.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Xata API',
		defaults: {
			name: 'Xata',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'xataApi',
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
						description: 'Append the data to a table.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete data from a table.',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List data from a table.',
					},
					{
						name: 'Read',
						value: 'read',
						description: 'Read data from a table.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update data in a table.',
					},


				],
				default: 'read',
				description: 'The operation to perform.',
			},
			// Node properties which the user gets displayed and
			// can change on the node.

			//-------------------------
			//         All
			//-------------------------
			{
				displayName: 'Workspace-slug',
				name: 'slug',
				type: 'string',
				default: '',
				required: true,
				description: 'The Slug of your workspace.',
			},
			{
				displayName: 'Database name',
				name: 'database',
				type: 'string',
				default: '',
				required: true,
				description: 'The Database you want to access.',
			},
			{
				displayName: 'Branch name',
				name: 'branch',
				type: 'string',
				default: '',
				required: true,
				description: 'The Branch you want to access.',
			},
			{
				displayName: 'Table name',
				name: 'table',
				type: 'string',
				default: '',
				required: true,
				description: 'The Table you want to access.',
			},
			//-------------------------
			//         Append
			//-------------------------


			//-------------------------
			//        delete
			//-------------------------
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
				description: 'Id of the record to delete.',
			},
			//-------------------------
			//         List
			//-------------------------
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
				default: false,
				description: 'If all records should be returned or only up to a given limit.',
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
					maxValue: 200,
				},
				default: 200,
				description: 'Number of records to return.',
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
				description: 'Filter records and choose the columns to return.',
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Columns',
						name: 'columns',
						type: 'string',
						typeOptions: {
							multipleValueButtonText: 'Add Column',
							multipleValues: true,
						},
						default: [],
						placeholder: 'Name',
						description: 'Only data for columns whose names are in this list will be included in the records.',
					},
					{
						displayName: 'Filter (JSON)',
						name: 'filter',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Filter (JSON) as specified in the documentation. If you use expressions make sure you stringify the arguments.',


					},
					/* Xata sort feature is buggy for the moment
					{
						displayName: 'Sort (JSON)',
						name:'sort',
						type: 'string',
						default:'',
						placeholder: '',
						description:'Sort (JSON) as specified in the documentation. If you use expression make sure you stringify the arguments.'


					}
					*/

				],
			}
			,
			//-------------------------
			//         Read
			//-------------------------
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
				description: 'Id of the record to return.',
			},

			{
				displayName: 'Pull All Columns',
				name: 'pullAllColumns',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'read',
						],
					},
				},
				default: true,
				description: `If set to true it returns all the record's columns.`,
			},

			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				typeOptions: {
					multipleValueButtonText: 'Add Column',
					multipleValues: true,
				},
				default: [],
				displayOptions: {
					show: {
						operation: [
							'read',
						],
						pullAllColumns: [
							false,
						],

					},
				},
				placeholder: 'Name',
				description: 'Only data for columns whose names are in this list will be included in the record.',
			}
			,

			//-------------------------
			//        update
			//-------------------------
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
				description: 'Id of the record to update',
			},
			//-------------------------
			//        update + append
			//-------------------------
			{
				displayName: 'Send All',
				name: 'sendAll',
				type: 'boolean',
				default: true,

				description: 'Send all the columns to Xata.',
				displayOptions: {
					show: {
						operation: [
							'append',
							'update',
						],
					},
				},
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'update',
							'append',
						],
						sendAll: [
							false,
						],
					},
				},
				default: {},
				description: 'Additional options which decide which column values should be pushed to the table.',
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Columns',
						name: 'columns',
						type: 'string',
						typeOptions: {
							multipleValueButtonText: 'Add Column',
							multipleValues: true,
						},


						default: [],
						placeholder: 'Name',
						description: 'Columns in this list will be push to the table.',

					},
					{
						displayName: 'Ignore Columns',
						name: 'ignoreColumns',
						type: 'string',
						typeOptions: {
							multipleValueButtonText: 'Add Column',
							multipleValues: true,
						},


						default: [],
						placeholder: 'Name',
						description: 'Columns in this list will be not pushed to the table.',

					}],
			},


		]
	};
	/*
	(this: IExecuteFunctions, apiKey: string, method: string,
		slug: string,branch: string, table: string,
		resource: string, body: IDataObject = {}, uri?:string): Promise<any> { // tslint:disable-line:no-any
		const options: OptionsWithUri = {
			headers: {
			*/
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const credentials = await this.getCredentials('xataApi');

		if (credentials === undefined) {

			throw new NodeOperationError(this.getNode(), 'No credentials provided for Xata Api');

		}

		const apiKey = credentials.apiKey as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const slug = this.getNodeParameter('slug', 0) as string;
		const database = (this.getNodeParameter('database', 0) as string).trim().toLowerCase().replace(/\s/g, '-') as string;
		const branch = this.getNodeParameter('branch', 0) as string;
		const table = this.getNodeParameter('table', 0) as string;

		const returnData: IDataObject[] = [];

		if (operation === 'append') {

			try {

				const records = [];

				for (let i = 0; i < items.length; i++) {

					const item = getItem.call(this, i, items[i].json, `${slug}/${database}:${branch}/${table}`);
					records.push(item);

				}

				const responseData = await xataApiRequest.call(this, apiKey, 'POST', slug, database, branch, table, 'bulk', { 'records': records });
				return [this.helpers.returnJsonArray(responseData)];

			} catch (error) {

				if (this.continueOnFail()) {

					returnData.push({ error: error.message });

				} else {

					throw error;

				}
			}

		} else if (operation === 'delete') {

			for (let i = 0; i < items.length; i++) {

				try {

					const id = this.getNodeParameter('id', i) as string;
					const resource = `data/${id}` as string;
					const responseData = await xataApiRequest.call(this, apiKey, 'DELETE', slug, database, branch, table, resource, {}, { returnFullResponse: true });
					const statusCode = responseData['statusCode'];

					if (statusCode !== 204) {

						throw new Error(`${responseData.message}, ID: ${id} StatusCode: ${statusCode}`);

					}
					returnData.push({ 'recordId': id, 'respondeData': responseData });

				} catch (error) {

					if (this.continueOnFail()) {

						returnData.push({ error: error.message });
						continue;

					} else {

						throw error;

					}

				}

			}

		} else if (operation === 'list') {

			try {

				const resource = 'query';
				const body = getAdditionalOptions.call(this, this.getNodeParameter('additionalOptions', 0, {}) as IDataObject) as IDataObject;
				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const limit = returnAll ? undefined : (this.getNodeParameter('limit', 0) as number) as any;  // tslint:disable-line:no-any
				const responseData = await xataApiFetchAllWrapper.call(this, apiKey, 'POST', slug, database, branch, table, resource, body, returnAll, limit);

				return [this.helpers.returnJsonArray(responseData)];

			} catch (error) {

				if (this.continueOnFail()) {

					returnData.push({ error: error.message });

				} else {

					throw error;

				}

			}

		} else if (operation === 'read') {

			for (let i = 0; i < items.length; i++) {

				try {

					const id = this.getNodeParameter('id', i) as string;
					const resource = `data/${id}` as string;
					const columns = this.getNodeParameter('pullAllColumns', i) as boolean ? undefined : this.getNodeParameter('columns', i) as string[];
					const body = columns ? { 'columns': columns } : {} as IDataObject;
					const responseData = await xataApiRequest.call(this, apiKey, 'GET', slug, database, branch, table, resource, body);
					returnData.push(responseData);

				} catch (error) {

					if (this.continueOnFail()) {

						returnData.push({ error: error.message });
						continue;

					} else {

						throw error;

					}
				}
			}
		} else if (operation === 'update') {

			//const columnsRequest = await xataApiRequest.call(this,apiKey,'GET',slug,database,branch,table,'columns',{});

			for (let i = 0; i < items.length; i++) {

				try {

					const id = this.getNodeParameter('id', i) as string;
					const item = getItem.call(this, i, items[i].json, `${slug}/${database}:${branch}/${table}`);
					const responseData = await xataApiRequest.call(this, apiKey, 'PATCH', slug, database, branch, table, `data/${id}`, item);
					returnData.push(responseData);


				} catch (error) {

					if (this.continueOnFail()) {

						returnData.push({ error: error.message });
						continue;

					} else {

						throw error;

					}
				}
			}

		} else {

			throw new NodeOperationError(this.getNode(), 'Operation undefined');

		}
		return [this.helpers.returnJsonArray(returnData)];


	}
}
