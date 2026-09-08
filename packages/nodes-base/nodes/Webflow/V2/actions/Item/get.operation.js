import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { webflowApiRequest } from '../../../GenericFunctions';
const properties = [
    {
        displayName: 'Site Name or ID',
        name: 'siteId',
        type: 'options',
        required: true,
        typeOptions: {
            loadOptionsMethod: 'getSites',
        },
        default: '',
        description: 'ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
    },
    {
        displayName: 'Collection Name or ID',
        name: 'collectionId',
        type: 'options',
        required: true,
        typeOptions: {
            loadOptionsMethod: 'getCollections',
            loadOptionsDependsOn: ['siteId'],
        },
        default: '',
        description: 'ID of the collection whose items to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
    },
    {
        displayName: 'Item ID',
        name: 'itemId',
        type: 'string',
        required: true,
        default: '',
        description: 'ID of the item to operate on',
    },
];
const displayOptions = {
    show: {
        resource: ['item'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    let responseData;
    for (let i = 0; i < items.length; i++) {
        try {
            const collectionId = this.getNodeParameter('collectionId', i);
            const itemId = this.getNodeParameter('itemId', i);
            responseData = await webflowApiRequest.call(this, 'GET', `/collections/${collectionId}/items/${itemId}`);
            const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData.body), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                returnData.push({ json: { message: error.message, error } });
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=get.operation.js.map