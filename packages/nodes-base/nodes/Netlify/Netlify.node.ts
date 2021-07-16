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
	OptionsWithUri,
} from 'request';

import {
	netlifyApiRequest,
} from './GenericFunctions';

// import { siteFields, siteOperations } from './SiteDescription';
import {
	deployFields,
	deployOperations
} from './DeployDescription';

export class Netlify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Netlify',
		name: 'netlify',
		icon: 'file:netlify.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Netlify API',
		defaults: {
			name: 'Netlify',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			// {
			// 	name: 'netlifyOAuth2Api',
			// 	required: true,
			// 	displayOptions: {
			// 		show: {
			// 			authentication: [
			// 				'oAuth2'
			// 			]
			// 		}
			// 	}
			// },
			{
				name: 'netlifyApi',
				required: true,
				// displayOptions: {
				// 	show: {
				// 		authentication: [
				// 			'accessToken',
				// 		],
				// 	},
				// },
			},
		],
		properties: [
			// {
			// 	displayName: 'Authentication',
			// 	name: 'authentication',
			// 	type: 'options',
			// 	options: [
			// 		{
			// 			name: 'Access Token',
			// 			value: 'accessToken',
			// 		},
			// 		{
			// 			name: 'OAuth2',
			// 			value: 'oAuth2',
			// 		},
			// 	],
			// 	default: 'accessToken',
			// 	description: 'The authentication method to use',
			// },
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Deploy',
						value: 'deploy',
					},
					{
						name: 'Forms',
						value: 'forms',
					},
					// {
					// 	name: 'Site',
					// 	value: 'site',
					// },
				],
				default: 'deploy',
				required: true,
				description: 'Resource to consume',
			},
			...deployOperations,
			...deployFields,
		],
	};

	methods = {
		loadOptions: {
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const sites = await netlifyApiRequest.call(
					this,
					'GET',
					'/sites',
				);
				for (const site of sites) {
					returnData.push({
						name: site.name,
						value: site.site_id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const body: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		// const credentials = this.getCredentials('netlifyOAuth2Api') as IDataObject;

			if(resource === 'deploy'){
				if(operation === 'listSiteDeploys') {
					for (let i = 0; i < length; i++) {
						const siteId = this.getNodeParameter('siteId',i);
						// TO DO: Implement Pagination
					responseData = await netlifyApiRequest.call(this, 'GET', `/sites/${siteId}/deploys`, {}, {});
					}
				}
				if(operation === 'createSiteDeploy') {
					for (let i = 0; i < length; i++) {
						const siteId = this.getNodeParameter('siteId',i);
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if(additionalFields.title) {
							qs.title = additionalFields.title as string;
						}

						if(additionalFields.async) {
							body.async = additionalFields.async as boolean;
						}

						if(additionalFields.branch) {
							body.branch = additionalFields.branch as string;
						}

						if(additionalFields.draft) {
							body.draft = additionalFields.draft as boolean;
						}

						if(additionalFields.framework) {
							body.framework = additionalFields.framework as string;
						}

						responseData = await netlifyApiRequest.call(this, 'POST', `/sites/${siteId}/deploys`, body, qs);
					}
				}
				if(operation === 'getSiteDeploy') {
					for (let i = 0; i < length; i++) {
						const siteId = this.getNodeParameter('siteId',i);
						const deployId = this.getNodeParameter('deployId',i);
						responseData = await netlifyApiRequest.call(this, 'GET', `/sites/${siteId}/deploys/${deployId}`, body, qs);
					}
				}

				if (operation === 'cancelSiteDeploy') {
					for (let i=0; i<length; i++) {
						const deployId = this.getNodeParameter('deployId',i);
						responseData = await netlifyApiRequest.call(this, 'POST', `/deploys/${deployId}/cancel`, body, qs);
					}
				}

				if (operation === 'rollbackSiteDeploy') {
					for (let i=0; i<length; i++) {
						const siteId = this.getNodeParameter('siteId',i);
						responseData = await netlifyApiRequest.call(this, 'POST', `/sites/${siteId}/rollback`, body, qs);
					}
				}
			}
		return [this.helpers.returnJsonArray(responseData)];
	}
}