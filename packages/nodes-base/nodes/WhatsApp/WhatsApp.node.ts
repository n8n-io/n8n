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

export class WhatsApp implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'WhatsApp',
        name: 'whatsApp',
        icon: 'file:whatsapp.svg',
        group: ['transform'],
        version: 1,
        description: 'Access WhatsApp API',
        defaults: {
            name: 'WhatsApp',
            color: '#1A82e2',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
          {
            name: 'whatsAppApi',
            required: true,
          },
        ],
        properties: [
            // Node properties which the user gets displayed and
            // can change on the node.
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return [[]];
    }
}