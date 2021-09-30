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
	epicFields
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
					name: 'repoID',
					type: 'string',
					required: true,
					description: '',
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
				},
				// ISSUE
				...issueOperations,
				...issueFields,
				// EPIC
				...epicOperations,
				...epicFields,
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const returnData = [];

		const repoID = this.getNodeParameter('repoID', 0) as string;
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
						uri = `https://api.zenhub.com/p1/repositories/${repoID}/issues/${issueNumber}`;
						method = 'GET';
						break;

					case 'getEvents':
						uri = `https://api.zenhub.com/p1/repositories/${repoID}/issues/${issueNumber}/events`;
						method = 'GET';
						break;
				}
				break;

			// EPIC
			case 'epic':
				switch (operation) {
					case 'get':
						uri = `https://api.zenhub.com/p1/repositories/${repoID}/epics`;
						method = 'GET';
						break;

					case 'getEpic':
						const epicID = this.getNodeParameter('epicID', 0) as string;
						uri = `https://api.zenhub.com/p1/repositories/${repoID}/epics/${epicID}`;
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
