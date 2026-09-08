import { NodeOperationError } from 'n8n-workflow';
import * as record from './database/Database.resource';
export async function router() {
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    let returnData = [];
    const googleBigQuery = {
        resource,
        operation,
    };
    switch (googleBigQuery.resource) {
        case 'database':
            returnData = await record[googleBigQuery.operation].execute.call(this);
            break;
        default:
            throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
    }
    return [returnData];
}
//# sourceMappingURL=router.js.map