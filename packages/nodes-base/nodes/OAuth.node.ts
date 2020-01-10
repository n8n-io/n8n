import { IExecuteFunctions } from 'n8n-core';
import {
    GenericValue,
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import { set } from 'lodash';

import * as util from 'util';
import { connectionFields } from './ActiveCampaign/ConnectionDescription';

export class OAuth implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'OAuth',
        name: 'oauth',
		icon: 'fa:code-branch',
        group: ['input'],
        version: 1,
        description: 'Gets, sends data to Oauth API Endpoint and receives generic information.',
        defaults: {
            name: 'OAuth',
            color: '#0033AA',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'OAuth2Api',
                required: true,
            }
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    {
                        name: 'Get',
                        value: 'get',
                        description: 'Returns the value of a key from oauth.',
                    },
                ],
                default: 'get',
                description: 'The operation to perform.',
            },

            // ----------------------------------
            //         get
            // ----------------------------------
            {
                displayName: 'Name',
                name: 'propertyName',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: [
                            'get'
                        ],
                    },
                },
                default: 'propertyName',
                required: true,
                description: 'Name of the property to write received data to.<br />Supports dot-notation.<br />Example: "data.person[0].name"',
            },
        ]
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const credentials = this.getCredentials('OAuth2Api');
        if (credentials === undefined) {
            throw new Error('No credentials got returned!');
        }

        if (credentials.oauthTokenData === undefined) {
            throw new Error('OAuth credentials not connected');
        }

        const operation = this.getNodeParameter('operation', 0) as string;
        if (operation === 'get') {
            const items = this.getInputData();
            const returnItems: INodeExecutionData[] = [];

            let item: INodeExecutionData;

            // credentials.oauthTokenData has the refreshToken and accessToken available
            // it would be nice to have credentials.getOAuthToken() which returns the accessToken
            // and also handles an error case where if the token is to be refreshed, it does so
            // without knowledge of the node.
            console.log('Got OAuth credentials!', credentials.oauthTokenData);

            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                item = { json: { itemIndex } };
                returnItems.push(item);
            }
            return [returnItems];
        } else {
            throw new Error('Unknown operation');
        }
    }
}
