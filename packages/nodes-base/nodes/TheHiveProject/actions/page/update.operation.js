import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC, pageRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
        displayName: 'Update in',
        name: 'location',
        type: 'options',
        options: [
            {
                name: 'Case',
                value: 'case',
            },
            {
                name: 'Knowledge Base',
                value: 'knowledgeBase',
            },
        ],
        default: 'case',
    },
    {
        ...caseRLC,
        displayOptions: {
            show: {
                location: ['case'],
            },
        },
    },
    pageRLC,
    {
        displayName: 'Content',
        name: 'content',
        type: 'string',
        default: '',
        typeOptions: {
            rows: 2,
        },
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Category',
                name: 'category',
                type: 'string',
                default: '',
            },
            {
                displayName: 'Title',
                name: 'title',
                type: 'string',
                default: '',
            },
            {
                displayName: 'Order',
                name: 'order',
                type: 'number',
                default: 0,
                typeOptions: {
                    minValue: 0,
                },
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['page'],
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const location = this.getNodeParameter('location', i);
    const pageId = this.getNodeParameter('pageId', i, '', { extractValue: true });
    const content = this.getNodeParameter('content', i, '');
    const options = this.getNodeParameter('options', i, {});
    let endpoint;
    if (location === 'case') {
        const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
        endpoint = `/v1/case/${caseId}/page/${pageId}`;
    }
    else {
        endpoint = `/v1/page/${pageId}`;
    }
    const body = options;
    if (content) {
        body.content = content;
    }
    responseData = await theHiveApiRequest.call(this, 'PATCH', endpoint, body);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=update.operation.js.map