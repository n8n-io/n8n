import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { commentRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [commentRLC];
const displayOptions = {
    show: {
        resource: ['comment'],
        operation: ['deleteComment'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const commentId = this.getNodeParameter('commentId', i, '', { extractValue: true });
    await theHiveApiRequest.call(this, 'DELETE', `/v1/comment/${commentId}`);
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=deleteComment.operation.js.map