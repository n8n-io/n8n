import {
    IExecuteFunctions,
} from 'n8n-core';

import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodePropertyTypes,
} from 'n8n-workflow';

import {
    OptionsWithUri,
} from 'request';

export class ScrapingBee implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'ScrapingBee',
        name: 'scrapingBee',
        icon: 'file:logo.svg',
        group: ['input'],
        version: 1,
        description: 'Consume ScrapingBee API',
        defaults: {
            name: 'ScrapingBee',
            color: '#f26c23',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'scrapingBeeApi',
                required: true,
            }
        ],
        properties: [
            // Node properties which the user gets displayed and
            // can change on the node.
            {
                displayName: 'Target URL',
                name: 'url',
                type: 'string',
                default: '',
                required: true,
                description: 'The URL of the page you want to scrape',
            },
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                options: [
                    {
                        displayName: 'JSON Response',
                        name: 'json_response',
                        type: 'boolean',
                        default: false,
                        description: 'Wrap response in JSON',        
                    }
                ]
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        //Get credentials the user provided for this node
    	const credentials = this.getCredentials('scrapingBeeApi') as unknown as IDataObject;

        return [this.helpers.returnJsonArray(credentials)];
    }
}