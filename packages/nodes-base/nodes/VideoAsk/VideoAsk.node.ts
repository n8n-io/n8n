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

export class VideoAsk implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'VideoAsk',
			name: 'videoAsk',
			icon: 'file:videoAsk.png',
			group: ['transform'],
			version: 1,
			description: 'Consume VideoAsk API',
			defaults: {
					name: 'VideoAsk',
					color: '#1A82e2',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'videoAskOAuth2Api',
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
							name: 'Forms',
							value: 'form',
						},
					],
					default: 'form',
					required: true,
					description: 'Resource to consume',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
						show: {
							resource: [
								'form',
							],
						},
					},
					options: [
						{
							name: 'Create',
							value: 'create',
							description: 'Create forms',
						},
					],
					default: 'create',
					description: 'The operation to perform.',
				},
				{
					displayName: 'Title',
					name: 'title',
					type: 'string',
					required: true,
					displayOptions: {
						show: {
							operation: [
								'create',
							],
							resource: [
								'form',
							],
						},
					},
					default:'',
					description:'Title of the form',
				},
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('videoAskOAuth2Api') as { oauthTokenData: {access_token: string}};

		if (resource === 'form') {
			if (operation === 'create') {
				const title = this.getNodeParameter('title', 0) as string;

				const options: OptionsWithUri = {
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${credentials.oauthTokenData.access_token}`,
					},
					method: 'POST',
					body: {
							title
					},
					uri: `https://api.videoask.com/forms`,
					json: true,
				};
				responseData = await this.helpers.request(options);
			}
		}

		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
	}

}
