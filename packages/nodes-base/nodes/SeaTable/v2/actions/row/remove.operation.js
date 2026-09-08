import { seaTableApiRequest } from '../../GenericFunctions';
export async function execute(index) {
    const tableName = this.getNodeParameter('tableName', index);
    const rowId = this.getNodeParameter('rowId', index);
    const requestBody = {
        table_name: tableName,
        row_ids: [rowId],
    };
    const responseData = await seaTableApiRequest.call(this, {}, 'DELETE', '/api-gateway/api/v2/dtables/{{dtable_uuid}}/rows/', requestBody);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=remove.operation.js.map