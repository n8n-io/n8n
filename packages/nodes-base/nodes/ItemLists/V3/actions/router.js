import { NodeOperationError } from 'n8n-workflow';
import * as itemList from './itemList';
export async function router() {
    let returnData = [];
    const items = this.getInputData();
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const itemListsNodeData = {
        resource,
        operation,
    };
    switch (itemListsNodeData.resource) {
        case 'itemList':
            returnData = await itemList[itemListsNodeData.operation].execute.call(this, items);
            break;
        default:
            throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
    }
    return [returnData];
}
//# sourceMappingURL=router.js.map