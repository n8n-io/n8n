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
import { addressFields, addressOperations } from './AddressDescription';

export class OnOffice implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'OnOffice',
        name: 'onOffice',
        icon: 'file:onoffice.svg',
        group: ['transform'],
        version: 1,
        description: 'Consume OnOffice API',
        defaults: {
            name: 'OnOffice',
            color: '#80a9d7',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'onOfficeApi',
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
                        name: 'Estates',
                        value: 'estates',
                    },
                    {
                        name: 'Address',
                        value: 'address',
                    },
                ],
                default: 'address',
                required: true,
                description: 'Resource to consume',
            },
            
            ...addressOperations,
            ...addressFields
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        let responseData;
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
        //Get credentials the user provided for this node
        const credentials = await this.getCredentials('friendGridApi') as IDataObject;
    
        if (resource === 'contact') {
            if (operation === 'create') {
                // get email input
                const email = this.getNodeParameter('email', 0) as string;
                // get additional fields input
                const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
                const data: IDataObject = {
                    email,
                };
    
                Object.assign(data, additionalFields);
    
                //Make http request according to <https://sendgrid.com/docs/api-reference/>
                const options: OptionsWithUri = {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${credentials.apiKey}`,
                    },
                    method: 'PUT',
                    body: {
                        contacts: [
                            data,
                        ],
                    },
                    uri: `https://api.sendgrid.com/v3/marketing/contacts`,
                    json: true,
                };
    
                responseData = await this.helpers.request(options);
            }
        }
    
        // Map data to n8n data
        return [this.helpers.returnJsonArray(responseData)];
    }
}
 