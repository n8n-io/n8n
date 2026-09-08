import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { commentRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [
    commentRLC,
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
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const commentId = this.getNodeParameter('commentId', i, '', { extractValue: true });
    const message = this.getNodeParameter('message', i);
    const body = {
        message,
    };
    responseData = await theHiveApiRequest.call(this, 'PATCH', `/v1/comment/${commentId}`, body);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=update.operation.js.map