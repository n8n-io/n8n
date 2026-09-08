import { updateDisplayOptions } from '@utils/utilities';
import { folderRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    folderRLC,
    {
        displayName: 'Name',
        name: 'displayName',
        description: 'Name of the folder',
        type: 'string',
        default: '',
        required: true,
    },
];
const displayOptions = {
    show: {
        resource: ['folder'],
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const folderId = decodeOutlookId(this.getNodeParameter('folderId', index, undefined, {
        extractValue: true,
    }));
    const displayName = this.getNodeParameter('displayName', index, undefined);
    const responseData = await microsoftApiRequest.call(this, 'PATCH', `/mailFolders/${folderId}`, index, { displayName });
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=update.operation.js.map