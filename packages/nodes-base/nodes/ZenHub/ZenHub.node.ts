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
	OptionsWithUri,
} from 'request';

import {
	issueOperations,
	issueFields,
	epicOperations,
	epicFields,
	workspaceOperations,
	workspaceFields,
} from './descriptions'

export class ZenHub implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'ZenHub',
			name: 'zenHub',
			icon: 'file:zenHub.svg',
			group: ['transform'],
			version: 1,
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
				// ISSUE
				...issueOperations,
				...issueFields,
				// EPIC
				...epicOperations,
				...epicFields,
				// WORKSPACE
				...workspaceOperations,
				...workspaceFields,
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const returnData = [];

		const repoId = this.getNodeParameter('repoId', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = await this.getCredentials('zenHubApi') as IDataObject;

		let uri: string | undefined;
		let method: string | undefined;
		let body: string | undefined;

		switch (resource) {
			// ISSUE
			case 'issue':
				const issueNumber = this.getNodeParameter('issueNumber', 0) as string;

				switch (operation) {
					case 'get':
						uri = `https://api.zenhub.com/p1/repositories/${repoId}/issues/${issueNumber}`;
						method = 'GET';
						break;

					case 'getEvents':
						uri = `https://api.zenhub.com/p1/repositories/${repoId}/issues/${issueNumber}/events`;
						method = 'GET';
						break;
				}
				break;

			// EPIC
			case 'epic':
				switch (operation) {
					case 'get':
						uri = `https://api.zenhub.com/p1/repositories/${repoId}/epics`;
						method = 'GET';
						break;

					case 'getEpic':
						const epicID = this.getNodeParameter('epicId', 0) as string;
						uri = `https://api.zenhub.com/p1/repositories/${repoId}/epics/${epicID}`;
						method = 'GET';
						break;
				}
				break;

			// WORKSPACE
			case 'workspace':
				switch (operation) {
					case 'get':
						uri = `https://api.zenhub.com/p2/repositories/${repoId}/workspaces`;
						method = 'GET';
						break;

					case 'getBoard':
						const workspaceId = this.getNodeParameter('workspaceId', 0) as string;
						uri = `https://api.zenhub.com/p2/workspaces/${workspaceId}/repositories/${repoId}/board`;
						method = 'GET';
						break;
				}
				break;
		}

		if (uri !== undefined && method !== undefined) {
			const options: OptionsWithUri = {
				uri: uri,
				method: method,
				headers: {
					'X-Authentication-Token': `${credentials.apiKey}`
				}
			};
			responseData = await this.helpers.request(options);
			returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
