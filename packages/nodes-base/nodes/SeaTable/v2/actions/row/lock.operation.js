import { seaTableApiRequest } from '../../GenericFunctions';
export async function execute(index) {
    const tableName = this.getNodeParameter('tableName', index);
    const rowId = this.getNodeParameter('rowId', index);
    const responseData = await seaTableApiRequest.call(this, {}, 'PUT', '/api-gateway/api/v2/dtables/{{dtable_uuid}}/lock-rows/', {
        table_name: tableName,
        row_ids: [rowId],
    });
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=lock.operation.js.map