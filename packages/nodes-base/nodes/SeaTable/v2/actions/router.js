import * as asset from './asset';
import * as base from './base';
import * as link from './link';
import * as row from './row';
export async function router() {
    const items = this.getInputData();
    const operationResult = [];
    let responseData = [];
    for (let i = 0; i < items.length; i++) {
        const resource = this.getNodeParameter('resource', i);
        const operation = this.getNodeParameter('operation', i);
        const seatable = {
            resource,
            operation,
        };
        try {
            if (seatable.resource === 'row') {
                responseData = await row[seatable.operation].execute.call(this, i);
            }
            else if (seatable.resource === 'base') {
                responseData = await base[seatable.operation].execute.call(this, i);
            }
            else if (seatable.resource === 'link') {
                responseData = await link[seatable.operation].execute.call(this, i);
            }
            else if (seatable.resource === 'asset') {
                responseData = await asset[seatable.operation].execute.call(this, i);
            }
            const executionData = this.helpers.constructExecutionMetaData(responseData, {
                itemData: { item: i },
            });
            operationResult.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                operationResult.push({ json: this.getInputData(i)[0].json, error });
            }
            else {
                if (error.context)
                    error.context.itemIndex = i;
                throw error;
            }
        }
    }
    return [operationResult];
}
//# sourceMappingURL=router.js.map