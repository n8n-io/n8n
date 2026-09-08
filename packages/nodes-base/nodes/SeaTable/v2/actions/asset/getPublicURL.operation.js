import { updateDisplayOptions, } from 'n8n-workflow';
import { seaTableApiRequest } from '../../GenericFunctions';
const properties = [
    {
        displayName: 'Asset Path',
        name: 'assetPath',
        type: 'string',
        placeholder: '/images/2023-09/logo.png',
        required: true,
        default: '',
    },
];
const displayOptions = {
    show: {
        resource: ['asset'],
        operation: ['getPublicURL'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const assetPath = this.getNodeParameter('assetPath', index);
    let responseData = [];
    if (assetPath) {
        responseData = await seaTableApiRequest.call(this, {}, 'GET', `/api/v2.1/dtable/app-download-link/?path=${assetPath}`);
    }
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=getPublicURL.operation.js.map