import { updateDisplayOptions } from '@utils/utilities';
import { googleApiRequest } from '../../transport';
import { folderNoRootRLC, permissionsOptions, shareOptions } from '../common.descriptions';
const properties = [
    {
        ...folderNoRootRLC,
        description: 'The folder to share',
    },
    permissionsOptions,
    shareOptions,
];
const displayOptions = {
    show: {
        resource: ['folder'],
        operation: ['share'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const returnData = [];
    const folderId = this.getNodeParameter('folderNoRootId', i, undefined, {
        extractValue: true,
    });
    const permissions = this.getNodeParameter('permissionsUi', i);
    const shareOption = this.getNodeParameter('options', i);
    const body = {};
    const qs = {
        supportsAllDrives: true,
    };
    if (permissions.permissionsValues) {
        Object.assign(body, permissions.permissionsValues);
    }
    Object.assign(qs, shareOption);
    const response = await googleApiRequest.call(this, 'POST', `/drive/v3/files/${folderId}/permissions`, body, qs);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response), { itemData: { item: i } });
    returnData.push(...executionData);
    return returnData;
}
//# sourceMappingURL=share.operation.js.map