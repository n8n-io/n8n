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

export class Future implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Future',
        name: 'Future',
        icon: 'file:Future.svg',
        group: ['transform'],
        version: 1,
        description: 'Consume Future API',
        defaults: {
            name: 'Future',
            color: '#72084e',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'futureApi',
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
                        name: 'Broadcast',
                        value: 'broadcast',
                    },
                ],
                default: 'broadcast',
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
                            'broadcast',
                        ],
                    },
                },
                options: [
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Create a broadcast',
                    },
                ],
                default: 'create',
                description: 'The operation to perform.',
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'string',
                required: true,
                displayOptions: {
                    show: {
                        operation: [
                            'create',
                        ],
                        resource: [
                            'broadcast',
                        ],
                    },
                },
                default:'',
                description:'Message body',
            },
            {
                displayName: 'Recipient IDs',
                name: 'recipient',
                type: 'string',
                required: true,
                displayOptions: {
                    show: {
                        operation: [
                            'create',
                        ],
                        resource: [
                            'broadcast',
                        ],
                    },
                },
                default:'',
                description:'Recipient ids',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        let responseData;
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
        //Get credentials the user provided for this node
        const credentials = this.getCredentials('futureApi') as IDataObject;
    
        if (resource === 'broadcast') {
            if (operation === 'create') {
                // get email input
                const message = this.getNodeParameter('message', 0) as string;
                // get additional fields input
                // const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
                const data: IDataObject = {
                    message,
                };
    
                //Object.assign(data, additionalFields);
                Object.assign(data);
    
                //Make http request according to <https://sendgrid.com/docs/api-reference/>
                const options: OptionsWithUri = {
                    headers: {
                        'Accept': 'application/json',
                        'token': `${credentials.token}`,
                    },
                    method: 'GET',
                    body: {
                        contacts: [
                            data,
                        ],
                    },
                    uri: `https://sandbox-api.futureinvest.io/v9/user/me`,
                    json: true,
                };
    
                responseData = await this.helpers.request(options);
            }
        }
    
        // Map data to n8n data
        return [this.helpers.returnJsonArray(responseData)];
    }
    
}
 