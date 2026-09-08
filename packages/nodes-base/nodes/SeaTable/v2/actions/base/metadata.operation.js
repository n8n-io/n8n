import { updateDisplayOptions, } from 'n8n-workflow';
import { seaTableApiRequest } from '../../GenericFunctions';
export const properties = [];
const displayOptions = {
    show: {
        resource: ['base'],
        operation: ['metadata'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const responseData = await seaTableApiRequest.call(this, {}, 'GET', '/api-gateway/api/v2/dtables/{{dtable_uuid}}/metadata/');
    return this.helpers.returnJsonArray(responseData.metadata);
}
//# sourceMappingURL=metadata.operation.js.map