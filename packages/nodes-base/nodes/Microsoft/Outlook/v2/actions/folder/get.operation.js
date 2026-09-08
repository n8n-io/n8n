import { updateDisplayOptions } from '@utils/utilities';
import { folderFields, folderRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    folderRLC,
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Fields',
                name: 'fields',
                type: 'multiOptions',
                description: 'The fields to add to the output',
                options: folderFields,
                default: [],
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['folder'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const qs = {};
    const folderId = decodeOutlookId(this.getNodeParameter('folderId', index, undefined, {
        extractValue: true,
    }));
    const options = this.getNodeParameter('options', index);
    if (options.fields) {
        qs.$select = options.fields.join(',');
    }
    if (options.filter) {
        qs.$filter = options.filter;
    }
    const responseData = await microsoftApiRequest.call(this, 'GET', `/mailFolders/${folderId}`, index, {}, qs);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=get.operation.js.map