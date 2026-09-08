import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC, pageRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [
    {
        displayName: 'Delete From ...',
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
        default: 'knowledgeBase',
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
];
const displayOptions = {
    show: {
        resource: ['page'],
        operation: ['deletePage'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const location = this.getNodeParameter('location', i);
    const pageId = this.getNodeParameter('pageId', i, '', { extractValue: true });
    let endpoint;
    if (location === 'case') {
        const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
        endpoint = `/v1/case/${caseId}/page/${pageId}`;
    }
    else {
        endpoint = `/v1/page/${pageId}`;
    }
    await theHiveApiRequest.call(this, 'DELETE', endpoint);
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=deletePage.operation.js.map