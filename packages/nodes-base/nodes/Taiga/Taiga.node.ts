import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	taigaApiRequest,
	taigaApiRequestAllItems,
} from './GenericFunctions';

import {
	issueOperations,
} from './IssueOperations';

import {
	issueOperationFields,
} from './issueOperationFields';

export class Taiga implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taiga',
		name: 'taiga',
		icon: 'file:taiga.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Taiga API',
		defaults: {
			name: 'Taiga',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'taigaCloudApi',
				displayOptions: {
					show: {
						version: [
							'cloud',
						],
					},
				},
				required: true,
			},
			{
				name: 'taigaServerApi',
				displayOptions: {
					show: {
						version: [
							'server',
						],
					},
				},
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Taiga Version',
				name: 'version',
				type: 'options',
				options: [
					{
						name: 'Cloud',
						value: 'cloud',
					},
					{
						name: 'Server (Self Hosted)',
						value: 'server',
					},
				],
				default: 'cloud',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Issue',
						value: 'issue',
					},
				],
				default: 'issue',
				description: 'Resource to consume.',
			},
			...issueOperations,
			...issueOperationFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const slug = this.getCurrentNodeParameter('projectSlug') as string;

				const returnData: INodePropertyOptions[] = [];

				const { project } = await taigaApiRequest.call(this, 'GET', '/resolver', {}, { project: slug });

				const types = await taigaApiRequest.call(this, 'GET', `/issue-types?project=${project}`);
				for (const type of types) {
					const typeName = type.name;
					const typeId = type.id;
					returnData.push({
						name: typeName,
						value: typeId,
					});
				}
				return returnData;
			},

			// Get all the available statuses to display them to user so that he can
			// select them easily
			async getStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const statuses = await taigaApiRequest.call(this,'GET', '/issue-statuses');
				for (const status of statuses) {
					const statusName = status.name;
					const statusId = status.id;
					returnData.push({
						name: statusName,
						value: statusId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const qs: IDataObject = {};

		for (let i = 0; i < items.length; i++) {
			if (resource === 'issue') {
				if (operation === 'create') {
					const slug = this.getNodeParameter('projectSlug', i) as number;
					const subject = this.getNodeParameter('subject', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const { project } = await taigaApiRequest.call(this, 'GET', '/resolver', {}, { project: slug });

					const body: IDataObject = {
						project,
						subject,
					};

					Object.assign(body, additionalFields);

					if (body.tags) {
						body.tags = (body.tags as string).split(',') as string[];
					}

					if (body.watchers) {
						body.watchers = (body.watchers as string).split(',') as string[];
					}

					responseData = await taigaApiRequest.call(this, 'POST', '/issues', body);
				}

				if (operation === 'update') {

					const issueId = this.getNodeParameter('issueId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const body: IDataObject = {};

					Object.assign(body, updateFields);

					if (body.tags) {
						body.tags = (body.tags as string).split(',') as string[];
					}

					if (body.watchers) {
						body.watchers = (body.watchers as string).split(',') as string[];
					}

					const { version } = await taigaApiRequest.call(this, 'GET', `/issues/${issueId}`);

					body.version = version;

					responseData = await taigaApiRequest.call(this, 'PATCH', `/issues/${issueId}`, body);
				}

				if (operation === 'delete') {
					const issueId = this.getNodeParameter('issueId', i) as string;
					responseData = await taigaApiRequest.call(this, 'DELETE', `/issues/${issueId}`);
					responseData = { success: true };
				}

				if (operation === 'get') {
					const issueId = this.getNodeParameter('issueId', i) as string;
					responseData = await taigaApiRequest.call(this, 'GET', `/issues/${issueId}`);
				}

				if (operation === 'getAll') {

					const slug = this.getNodeParameter('projectSlug', i) as number;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const { project } = await taigaApiRequest.call(this, 'GET', '/resolver', {}, { project: slug });

					qs.project = project;

					if (returnAll === true) {
						responseData = await taigaApiRequestAllItems.call(this, 'GET', '/issues', {}, qs);

					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await taigaApiRequestAllItems.call(this, 'GET', '/issues', {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
