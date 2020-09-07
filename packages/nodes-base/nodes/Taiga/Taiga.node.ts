import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	taigaApiRequest,
	getVersion,
} from './GenericFunctions';

import {
	issueOperations,
} from './IssueOperations';

import {
	issueOperationFields,
} from './issueOperationFields'

export class Taiga implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taiga',
		name: 'taiga',
		icon: 'file:taiga.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage issues on Taiga',
		defaults: {
			name: 'Taiga',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'taigaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Taiga URL',
				name: 'taigaUrl',
				type: 'string',
				default: '',
				placeholder: 'taiga.yourdomain.com',
				description: 'The self hosted URL.',
			},
			{
				displayName: 'Project ID',
				name: 'project',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'issue',
						],
						operation: [
							'create', 'update',
						],
					},
				},
				default: '',
				placeholder: '1',
				description: 'An ID for a Taiga project',
				required: true,
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
		]
	};

	methods = {
		loadOptions: {
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const taigaUrl = this.getCurrentNodeParameter('taigaUrl') as string;
				const project = this.getCurrentNodeParameter('project') as string;
				const returnData: INodePropertyOptions[] = [];

				const types = await taigaApiRequest.call(this, taigaUrl, 'GET', `issue-types?project=${project}`);
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
				const taigaUrl = this.getCurrentNodeParameter('taigaUrl') as string;
				const returnData: INodePropertyOptions[] = [];

				const statuses = await taigaApiRequest.call(this, taigaUrl, 'GET', 'issue-statuses');
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

		for (let i=0; i<items.length; i++) {
			if (resource === 'issue') {
				if (operation === 'create') {
					const taigaUrl = this.getNodeParameter('taigaUrl', i) as string;
					const project = this.getNodeParameter('project', i) as number;
					const subject = this.getNodeParameter('subjectCreate', i) as string;
					const description = this.getNodeParameter('description', i) as string;
					const type = this.getNodeParameter('type', i) as string;
					const tag = this.getNodeParameter('tags', i) as string;
					const tags = tag ? tag.split(',') : undefined;

					const body: IDataObject = {
						project,
						subject,
						description,
						type,
						tags,
					};

					responseData = await taigaApiRequest.call(this, taigaUrl, 'POST', 'issues', body);
				}

				if (operation === 'update') {
					const taigaUrl = this.getNodeParameter('taigaUrl', i) as string;
					const id = this.getNodeParameter('id', i) as string;
					const subject = this.getNodeParameter('subjectEdit', i) as string;
					const description = this.getNodeParameter('description', i) as string;
					const type = this.getNodeParameter('type', i) as string;
					const tags = this.getNodeParameter('tags', i) as string;
					const status = this.getNodeParameter('status', i) as string;
					const version = await getVersion.call(this, taigaUrl, id);

					const body: IDataObject = {
						version,
					};

					if(subject) {
						body.subject = subject;
					}
					if(description) {
						body.description = description;
					}
					if(type) {
						body.type = type;
					}
					if(tags) {
						body.tags = tags.split(',');
					}
					if(status) {
						body.status = status;
					}

					responseData = await taigaApiRequest.call(this, taigaUrl, 'PATCH', `issues/${id}`, body);
				}

				if (operation === 'delete') {
					const taigaUrl = this.getNodeParameter('taigaUrl', i) as string;
					const id = this.getNodeParameter('id', i) as string;

					responseData = await taigaApiRequest.call(this, taigaUrl, 'DELETE', `issues/${id}`);
				}

				if (operation === 'get') {
					const taigaUrl = this.getNodeParameter('taigaUrl', i) as string;
					const id = this.getNodeParameter('id', i) as string;

					responseData = await taigaApiRequest.call(this, taigaUrl, 'GET', `issues/${id}`);
				}

				if (operation === 'list') {
					const taigaUrl = this.getNodeParameter('taigaUrl', i) as string;

					responseData = await taigaApiRequest.call(this, taigaUrl, 'GET', `issues`);
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
