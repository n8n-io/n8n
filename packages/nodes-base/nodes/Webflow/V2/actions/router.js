import { NodeOperationError } from 'n8n-workflow';
import * as item from './Item/Item.resource';
export async function router() {
    let returnData = [];
    const items = this.getInputData();
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const webflowNodeData = {
        resource,
        operation,
    };
    switch (webflowNodeData.resource) {
        case 'item':
            returnData = await item[webflowNodeData.operation].execute.call(this, items);
            break;
        default:
            throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
    }
    return [returnData];
}
//# sourceMappingURL=router.js.map