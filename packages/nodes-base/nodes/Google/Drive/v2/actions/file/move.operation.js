import { updateDisplayOptions } from '@utils/utilities';
import { setParentFolder } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';
import { driveRLC, fileRLC, folderRLC } from '../common.descriptions';
const properties = [
    {
        ...fileRLC,
        description: 'The file to move',
    },
    {
        ...driveRLC,
        displayName: 'Parent Drive',
        description: 'The drive where to move the file',
    },
    {
        ...folderRLC,
        displayName: 'Parent Folder',
        description: 'The folder where to move the file',
    },
];
const displayOptions = {
    show: {
        resource: ['file'],
        operation: ['move'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const fileId = this.getNodeParameter('fileId', i, undefined, {
        extractValue: true,
    });
    const driveId = this.getNodeParameter('driveId', i, undefined, {
        extractValue: true,
    });
    const folderId = this.getNodeParameter('folderId', i, undefined, {
        extractValue: true,
    });
    const qs = {
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        spaces: 'appDataFolder, drive',
        corpora: 'allDrives',
    };
    const { parents } = await googleApiRequest.call(this, 'GET', `/drive/v3/files/${fileId}`, undefined, {
        ...qs,
        fields: 'parents',
    });
    const response = await googleApiRequest.call(this, 'PATCH', `/drive/v3/files/${fileId}`, undefined, {
        ...qs,
        addParents: setParentFolder(folderId, driveId),
        removeParents: (parents || []).join(','),
    });
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response), { itemData: { item: i } });
    return executionData;
}
//# sourceMappingURL=move.operation.js.map