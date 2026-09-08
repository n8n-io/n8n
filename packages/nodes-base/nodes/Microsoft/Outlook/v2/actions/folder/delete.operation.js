import { updateDisplayOptions } from '@utils/utilities';
import { folderRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [folderRLC];
const displayOptions = {
    show: {
        resource: ['folder'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const folderId = decodeOutlookId(this.getNodeParameter('folderId', index, undefined, {
        extractValue: true,
    }));
    await microsoftApiRequest.call(this, 'DELETE', `/mailFolders/${folderId}`, index);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=delete.operation.js.map