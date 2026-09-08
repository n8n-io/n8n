import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';
const properties = [
    {
        displayName: 'Deal ID',
        name: 'dealId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the deal whose product to remove',
    },
    {
        displayName: 'Product Attachment ID',
        name: 'productAttachmentId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the deal-product (the ID of the product attached to the deal, not the product ID itself)',
    },
];
const displayOptions = {
    show: {
        resource: ['dealProduct'],
        operation: ['remove'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const dealId = this.getNodeParameter('dealId', i);
            const productAttachmentId = this.getNodeParameter('productAttachmentId', i);
            await pipedriveApiRequest.call(this, 'DELETE', `/deals/${dealId}/products/${productAttachmentId}`, {});
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                returnData.push(...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } }));
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=remove.operation.js.map