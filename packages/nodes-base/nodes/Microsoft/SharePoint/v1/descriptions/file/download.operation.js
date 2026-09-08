import { updateDisplayOptions } from 'n8n-workflow';
import { fileRLC, folderRLC, siteRLC, untilFolderSelected, untilSiteSelected, } from '../common.descriptions';
const properties = [
    {
        ...siteRLC,
        description: 'Select the site to retrieve folders from',
    },
    {
        ...folderRLC,
        description: 'Select the folder to download the file from',
        displayOptions: {
            hide: {
                ...untilSiteSelected,
            },
        },
    },
    {
        ...fileRLC,
        description: 'Select the file to download',
        displayOptions: {
            hide: {
                ...untilSiteSelected,
                ...untilFolderSelected,
            },
        },
    },
];
const displayOptions = {
    show: {
        resource: ['file'],
        operation: ['download'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=download.operation.js.map