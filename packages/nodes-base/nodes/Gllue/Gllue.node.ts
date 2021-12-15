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

export class Gllue implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Gllue',
        name: 'gllue',
        icon: 'file:gllue.svg',
        group: ['transform'],
        version: 1,
        description: 'Consume Gllue API',
        defaults: {
            name: 'Gllue',
            color: '#1A82e2',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
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
