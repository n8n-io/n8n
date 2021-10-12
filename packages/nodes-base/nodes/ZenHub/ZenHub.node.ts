import { Moment } from 'moment';
import moment = require('moment');
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	epicFields,
	epicOperations,
	issueFields,
	issueOperations,
	milestoneFields,
	milestoneOperations,
	workspaceFields,
	workspaceOperations,
} from './descriptions'

export class ZenHub implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'ZenHub',
			name: 'zenHub',
			icon: 'file:zenHub.svg',
			group: ['transform'],
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume ZenHub API',
			defaults: {
					name: 'ZenHub',
					color: '#5d60ba',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'zenHubApi',
					required: true,
				},
			],
			properties: [
				{
					displayName: 'Repository ID',
					name: 'repoId',
					type: 'string',
					required: true,
					description: 'GitHub Repository ID',
					default: ''
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
						{
							name: 'Epic',
							value: 'epic',
						},
						{
							name: 'Workspace',
							value: 'workspace',
						},
						{
							name: 'Milestone',
							value: 'milestone',
						},
					],
					default: 'issue',
					required: true,
					description: 'Resource to consume',
					noDataExpression: true,
				},
				// EPIC
				...epicOperations,
				...epicFields,
				// ISSUE
				...issueOperations,
				...issueFields,
				// MILESTONE
				...milestoneOperations,
				...milestoneFields,
				// WORKSPACE
				...workspaceOperations,
				...workspaceFields,
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const returnData = [];

		try {

			const repoId = this.getNodeParameter('repoId', 0) as string;
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;

			const credentials = await this.getCredentials('zenHubApi') as IDataObject;
			const endpoint = credentials.endpoint as string;
			console.log(endpoint);

			let path = '';
			let requestMethod: IHttpRequestOptions["method"] = 'GET';
			let body: IDataObject = {};

			switch (resource) {
				// EPIC
				case 'epic':
					switch (operation) {
						case 'get':
							path = `/p1/repositories/${repoId}/epics`;
							requestMethod = 'GET';
							break;

						case 'getEpic':
							const epicID = this.getNodeParameter('epicId', 0) as string;
							path = `/p1/repositories/${repoId}/epics/${epicID}`;
							requestMethod = 'GET';
							break;
					}
					break;

				// ISSUE
				case 'issue':
					const issueNumber = this.getNodeParameter('issueNumber', 0) as string;

					switch (operation) {
						case 'get':
							path = `/p1/repositories/${repoId}/issues/${issueNumber}`;
							requestMethod = 'GET';
							break;

						case 'getEvents':
							path = `/p1/repositories/${repoId}/issues/${issueNumber}/events`;
							requestMethod = 'GET';
							break;
					}
					break;

				// MILESTONE
				case 'milestone':
					const milestoneNumber = this.getNodeParameter('milestoneNumber', 0) as string;
					switch (operation) {
						case 'get':
							path = `/p1/repositories/${repoId}/milestones/${milestoneNumber}/start_date`;
							requestMethod = 'GET';
							break;

						case 'set':
							const startDate = this.getNodeParameter('startDate', 0) as Date;
							path = `/p1/repositories/${repoId}/milestones/${milestoneNumber}/start_date`;
							requestMethod = 'POST';
							body.start_date = moment(startDate).toISOString();
							break;
					}
					break;

				// WORKSPACE
				case 'workspace':
					switch (operation) {
						case 'get':
							path = `/p2/repositories/${repoId}/workspaces`;
							requestMethod = 'GET';
							break;

						case 'getBoard':
							const workspaceId = this.getNodeParameter('workspaceId', 0) as string;
							path = `/p2/workspaces/${workspaceId}/repositories/${repoId}/board`;
							requestMethod = 'GET';
							break;

						case 'getOldest':
							path = `/p1/repositories/${repoId}/board`;
							requestMethod = 'GET';
							break;
					}
					break;

				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			if (path !== undefined) {
				const options: IHttpRequestOptions = {
					url: endpoint.replace(/\/$/, '') + path,
					method: requestMethod,
					headers: {
						'User-Agent': 'n8n',
						'X-Authentication-Token': `${credentials.apiKey}`,
					},
					body: body,
				};
				responseData = await this.helpers.httpRequest(options);
				returnData.push(responseData);
			}
		} catch (error) {
			if (!this.continueOnFail()) {
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
