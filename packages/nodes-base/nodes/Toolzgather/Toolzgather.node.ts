/* eslint-disable n8n-nodes-base/node-param-operation-without-no-data-expression */
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

export class Toolzgather implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Toolzgather',
		name: 'toolzgather',
		icon: 'file:toolzgather.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Toolzgather API.',
		subtitle:'Toolzgather',
		defaults: {
			name: 'Toolzgather',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'toolzgatherApi',
				required: true,
			},
		],
		properties: [
			{
				noDataExpression:true,
				displayName: 'Function',
				name: 'resource',
				type: 'options',
				options: [
					{
						name:'Invite Users to Board',
						value: 'autb',
						description: 'Invites members and invited users to your workspace boards',
					},
					{
						name: 'Remove Users From Board',
						value: 'rufb',
						description: 'Removes members and invited users from your workspace boards',
					},
					{
						name: 'Remove Users From Workspace',
						value: 'rufw',
						description: 'Removes members and invited users from your workspace',
					},
				],
				default: 'Select function',
				required: true,
				description: 'Functions to Use',
			},
			{
				displayName: 'Workspace',
				name: 'workspaceId.',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'rufw',
						],
					},
				},
				description: 'The workspace to delete users from',
				default: '',
			},
			{
				displayName: 'Boards',
				name: 'BoardList',
				type: 'number',
				default:[],
				required: true,
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add BoardId',
				},
				displayOptions: {
					show: {
						resource: [
							'autb',
							'rufb',
						],
					},
				},
				placeholder: 'BoardId',
				description: 'BoardId of the selected boards',
			},
			{
				displayName: 'Emails',
				name: 'EmailList',
				type: 'string',
				default: [],
				required: true,
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Email',
				},
				displayOptions: {
					show: {
						resource: [
							'autb',
							'rufb',
							'rufw',
						],
					},
				},
				placeholder: 'info@example.com',
				description: 'The email addresses of the recipients',
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'autb',
						],
					},
				},
				options: [
					{
						name: 'Editor',
						value: 'Editor',
					},
					{
						name: 'Guest',
						value: 'Guest',

					},
				],
				default: 'Guest',
				description: 'Invited users roles',
			},


		],
	};



	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		if (resource === 'autb') {
			const role = this.getNodeParameter('role', 0) as string;
			//Get credentials the user provided for this node
			const credentials = await this.getCredentials('toolzgatherApi') as IDataObject;
			const emails = this.getNodeParameter('EmailList', 0) as string[];
			const boards = this.getNodeParameter('BoardList', 0) as number[];
       console.log(emails)
			const options: OptionsWithUri = {
				headers: {
					'Accept': 'application/json',
					'X-Token': credentials.apiKey
				},
				method: 'POST',
				body: {
					boards: [...boards],
					emails: [...emails],
					role,
				},
				uri: `http://api.toolzgather.com/api/add.users.boards`,
				json: true,
			};

			responseData = await this.helpers.request(options);

		} else if (resource === 'rufb') {
			const credentials = await this.getCredentials('toolzgatherApi') as IDataObject;
			const emails = this.getNodeParameter('EmailList', 0) as string[];
			const boards = this.getNodeParameter('BoardList', 0) as number[];
			const options: OptionsWithUri = {
				headers: {
					'Accept': 'application/json',
					'X-Token': credentials.apiKey
				},
				method: 'POST',
				body: {
					boards: [...boards],
					emails: [...emails],

				},
				uri: `http://api.toolzgather.com/api/delete.members.boards`,
				json: true,
			};
			responseData = await this.helpers.request(options);
		} else if (resource === 'rufw') {
			const workspaceId = this.getNodeParameter('workspaceId', 0) as number;
			const emails = this.getNodeParameter('EmailList', 0) as string[];
			const credentials = await this.getCredentials('toolzgatherApi') as IDataObject;
			const options: OptionsWithUri = {
				headers: {
					'Accept': 'application/json',
					'X-Token': credentials.apiKey
				},
				method: 'POST',
				body: {

					workspaceId,
					emails: [...emails],

				},
				uri: `http://api.toolzgather.com/api/delete.members.workspace`,
				json: true,
			};

			responseData = await this.helpers.request(options);
		}
		// Map data to n8n data
		this.continueOnFail()
		return [this.helpers.returnJsonArray(responseData)];
	}
}
