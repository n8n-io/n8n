import { updateDisplayOptions } from '@utils/utilities';
import { folderRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    {
        displayName: 'Name',
        name: 'displayName',
        description: 'Name of the folder',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'e.g. My Folder',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [{ ...folderRLC, displayName: 'Parent Folder', required: false }],
    },
];
const displayOptions = {
    show: {
        resource: ['folder'],
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const displayName = this.getNodeParameter('displayName', index);
    const folderId = decodeOutlookId(this.getNodeParameter('options.folderId', index, '', {
        extractValue: true,
    }));
    const body = {
        displayName,
    };
    let endpoint;
    if (folderId) {
        endpoint = `/mailFolders/${folderId}/childFolders`;
    }
    else {
        endpoint = '/mailFolders';
    }
    const responseData = await microsoftApiRequest.call(this, 'POST', endpoint, index, body);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=create.operation.js.map