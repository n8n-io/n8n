import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	getToken,
	strapiApiRequest,
	strapiApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';

import {
	entryFields,
	entryOperations,
} from './EntryDescription';

export class Strapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Strapi',
		name: 'strapi',
		icon: 'file:strapi.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Strapi API.',
		defaults: {
			name: 'Strapi',
			color: '#725ed8',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'strapiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Entry',
						value: 'entry',
					},
				],
				default: 'entry',
				description: 'The resource to operate on.',
			},
			...entryOperations,
			...entryFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const { jwt } = await getToken.call(this);

		qs.jwt = jwt;

		if (resource === 'entry') {
			if (operation === 'create') {
				for (let i = 0; i < length; i++) {

					const body: IDataObject = {};

					const contentType = this.getNodeParameter('contentType', i) as string;

					const columns = this.getNodeParameter('columns', i) as string;

					const columnList = columns.split(',').map(column => column.trim());

					for (const key of Object.keys(items[i].json)) {
						if (columnList.includes(key)) {
							body[key] = items[i].json[key];
						}
					}
					responseData = await strapiApiRequest.call(this, 'POST', `/${contentType}`, body, qs);
					
					returnData.push(responseData);
				}
			}

			if (operation === 'delete') {
				for (let i = 0; i < length; i++) {
					const contentType = this.getNodeParameter('contentType', i) as string;

					const entryId = this.getNodeParameter('entryId', i) as string;
	
					responseData = await strapiApiRequest.call(this, 'DELETE', `/${contentType}/${entryId}`, {}, qs);

					returnData.push(responseData);
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const contentType = this.getNodeParameter('contentType', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					if (options.sort && (options.sort as string[]).length !== 0) {
						const sortFields = options.sort as string[];
						qs._sort = sortFields.join(',');
					}

					if (options.where) {
						const query = validateJSON(options.where as string);
						if (query !== undefined) {
							qs._where = query;
						} else {
							throw new Error('Query must be a valid JSON');
						}
					}

					if (options.publicationState) {
						qs._publicationState = options.publicationState as string;
					}

					if (returnAll) {
						responseData = await strapiApiRequestAllItems.call(this, 'GET', `/${contentType}`, {}, qs);
					} else {
						qs._limit = this.getNodeParameter('limit', i) as number;
	
						responseData = await strapiApiRequest.call(this, 'GET', `/${contentType}`, {}, qs);
					}
					returnData.push.apply(returnData, responseData);
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {

					const contentType = this.getNodeParameter('contentType', i) as string;

					const entryId = this.getNodeParameter('entryId', i) as string;

					responseData = await strapiApiRequest.call(this, 'GET', `/${contentType}/${entryId}`, {}, qs);

					returnData.push(responseData);
				}
			}

			if (operation === 'update') {
				for (let i = 0; i < length; i++) {

					const body: IDataObject = {};

					const contentType = this.getNodeParameter('contentType', i) as string;

					const columns = this.getNodeParameter('columns', i) as string;

					const updateKey = this.getNodeParameter('updateKey', i) as string;

					const columnList = columns.split(',').map(column => column.trim());

					const entryId = items[i].json[updateKey];

					for (const key of Object.keys(items[i].json)) {
						if (columnList.includes(key)) {
							body[key] = items[i].json[key];
						}
					}
					responseData = await strapiApiRequest.call(this, 'PUT', `/${contentType}/${entryId}`, body, qs);
					
					returnData.push(responseData);
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
