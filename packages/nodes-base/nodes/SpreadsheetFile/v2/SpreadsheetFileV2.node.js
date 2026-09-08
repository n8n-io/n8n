import { NodeConnectionTypes } from 'n8n-workflow';
import * as fromFile from './fromFile.operation';
import * as toFile from './toFile.operation';
import { operationProperty } from '../description';
export class SpreadsheetFileV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            version: 2,
            defaults: {
                name: 'Spreadsheet File',
                color: '#2244FF',
            },
            inputs: [NodeConnectionTypes.Main],
            outputs: [NodeConnectionTypes.Main],
            properties: [operationProperty, ...fromFile.description, ...toFile.description],
        };
    }
    async execute() {
        const items = this.getInputData();
        const operation = this.getNodeParameter('operation', 0);
        let returnData = [];
        if (operation === 'fromFile') {
            returnData = await fromFile.execute.call(this, items);
        }
        if (operation === 'toFile') {
            returnData = await toFile.execute.call(this, items);
        }
        return [returnData];
    }
}
//# sourceMappingURL=SpreadsheetFileV2.node.js.map