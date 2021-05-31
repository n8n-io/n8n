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
	netlifyApiRequest,
} from './GenericFunctions';

import { siteFields, siteOperations } from './SiteDescription'

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
			{
				name: 'netlifyOAuth2Api',
				required: true
			}
        ],
        properties: [
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
						name: 'Site',
						value: 'site',
					},
				],
				default: 'site',
				required: true,
				description: 'Resource to consume',
			},
            ...siteOperations,
			...siteFields
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		const credentials = this.getCredentials('netlifyOAuth2Api') as IDataObject;

		if(resource === 'site'){
			if(operation === 'getAllSites') {
				responseData = await netlifyApiRequest.call(this, 'GET', '/sites', {}, {})
			}
		}
		return [this.helpers.returnJsonArray(responseData)]
    }
}