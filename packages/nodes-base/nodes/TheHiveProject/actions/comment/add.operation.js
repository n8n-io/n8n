import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { alertRLC, caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
        displayName: 'Add to',
        name: 'addTo',
        type: 'options',
        options: [
            {
                name: 'Alert',
                value: 'alert',
            },
            {
                name: 'Case',
                value: 'case',
            },
        ],
        default: 'alert',
    },
    {
        ...caseRLC,
        name: 'id',
        displayOptions: {
            show: {
                addTo: ['case'],
            },
        },
    },
    {
        ...alertRLC,
        name: 'id',
        displayOptions: {
            show: {
                addTo: ['alert'],
            },
        },
    },
    {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        default: '',
        required: true,
        typeOptions: {
            rows: 2,
        },
    },
];
const displayOptions = {
    show: {
        resource: ['comment'],
        operation: ['add'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const addTo = this.getNodeParameter('addTo', i);
    const id = this.getNodeParameter('id', i, '', { extractValue: true });
    const message = this.getNodeParameter('message', i);
    const body = {
        message,
    };
    responseData = await theHiveApiRequest.call(this, 'POST', `/v1/${addTo}/${id}/comment`, body);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=add.operation.js.map