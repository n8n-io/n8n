import { NodeApiError } from 'n8n-workflow';
import * as contact from './contact';
import * as customer from './customer';
import * as rmm from './rmm';
import * as ticket from './ticket';
export async function router() {
    const items = this.getInputData();
    const operationResult = [];
    for (let i = 0; i < items.length; i++) {
        const resource = this.getNodeParameter('resource', i);
        let operation = this.getNodeParameter('operation', i);
        let responseData = [];
        if (operation === 'del') {
            operation = 'delete';
        }
        const syncroMsp = {
            resource,
            operation,
        };
        try {
            if (syncroMsp.resource === 'customer') {
                responseData = await customer[syncroMsp.operation].execute.call(this, i);
            }
            else if (syncroMsp.resource === 'ticket') {
                responseData = await ticket[syncroMsp.operation].execute.call(this, i);
            }
            else if (syncroMsp.resource === 'contact') {
                responseData = await contact[syncroMsp.operation].execute.call(this, i);
            }
            else if (syncroMsp.resource === 'rmm') {
                responseData = await rmm[syncroMsp.operation].execute.call(this, i);
            }
            const executionData = this.helpers.constructExecutionMetaData(responseData, {
                itemData: { item: i },
            });
            operationResult.push(...executionData);
        }
        catch (err) {
            if (this.continueOnFail()) {
                const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: err.message }), { itemData: { item: i } });
                operationResult.push(...executionErrorData);
            }
            else {
                throw new NodeApiError(this.getNode(), err, { itemIndex: i });
            }
        }
    }
    return [operationResult];
}
//# sourceMappingURL=router.js.map