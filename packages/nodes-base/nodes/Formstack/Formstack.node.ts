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

export class Formstack implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Formstack',
        name: 'formstack',
        icon: 'file:formstack.svg',
        group: ['transform'],
        version: 1,
        description: 'Consume Formstack API',
        defaults: {
            name: 'Formstack',
            color: '#ebfaf2', //  21b573
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
 