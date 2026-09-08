import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
        displayName: 'Create in',
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
    {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        required: true,
    },
    {
        displayName: 'Category',
        name: 'category',
        type: 'string',
        default: '',
        required: true,
    },
    {
        displayName: 'Content',
        name: 'content',
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
        resource: ['page'],
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const location = this.getNodeParameter('location', i);
    const title = this.getNodeParameter('title', i);
    const category = this.getNodeParameter('category', i);
    const content = this.getNodeParameter('content', i);
    let endpoint;
    if (location === 'case') {
        const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
        endpoint = `/v1/case/${caseId}/page`;
    }
    else {
        endpoint = '/v1/page';
    }
    const body = {
        title,
        category,
        content,
    };
    responseData = await theHiveApiRequest.call(this, 'POST', endpoint, body);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=create.operation.js.map