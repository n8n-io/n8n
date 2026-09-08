import { updateDisplayOptions, } from 'n8n-workflow';
import { seaTableApiRequest } from '../../GenericFunctions';
export const properties = [];
const displayOptions = {
    show: {
        resource: ['base'],
        operation: ['snapshot'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const responseData = await seaTableApiRequest.call(this, {}, 'POST', '/api-gateway/api/v2/dtables/{{dtable_uuid}}/snapshot/', { dtable_name: 'snapshot' });
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=snapshot.operation.js.map