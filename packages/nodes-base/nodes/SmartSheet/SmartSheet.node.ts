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
import { createRowinSheet } from './GenericFunction';

const client = require('smartsheet');

export class SmartSheet implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'SmartSheet',
        name: 'smartSheet',
        icon: 'file:autopilot.svg',
        group: ['transform'],
        version: 1,
        description: 'Consume SmartSheet API ',
        credentials: [
            {
                name: 'smartSheetApi',
                required: false,
            },
        ],
        defaults: {
            name: 'SmartSheet',
            color: '#1A82e2',
        },
        inputs: ['main'],
        outputs: ['main'],

        properties: [
            {
                displayName: 'Sheet ID',
                name: 'sheetId',
                type: 'string',
                required: true,
                default: '',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = await createRowinSheet.call(this);
        return [this.helpers.returnJsonArray(items)];

    }
}
