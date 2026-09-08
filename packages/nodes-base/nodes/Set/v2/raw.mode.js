import { NodeOperationError } from 'n8n-workflow';
import { parseJsonParameter, composeReturnItem, resolveRawData } from './helpers/utils';
import { updateDisplayOptions } from '../../../utils/utilities';
const properties = [
    {
        displayName: 'JSON',
        name: 'jsonOutput',
        type: 'json',
        typeOptions: {
            rows: 5,
        },
        default: '{\n  "my_field_1": "value",\n  "my_field_2": 1\n}\n',
        validateType: 'object',
        ignoreValidationDuringExecution: true,
    },
];
const displayOptions = {
    show: {
        mode: ['raw'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(item, i, options, rawData, node) {
    try {
        let newData;
        if (rawData.jsonOutput === undefined) {
            const json = this.getNodeParameter('jsonOutput', i);
            newData = parseJsonParameter(json, node, i);
        }
        else {
            newData = parseJsonParameter(resolveRawData.call(this, rawData.jsonOutput, i), node, i);
        }
        return composeReturnItem.call(this, i, item, newData, options, node.typeVersion);
    }
    catch (error) {
        if (this.continueOnFail()) {
            return { json: { error: error.message }, pairedItem: { item: i } };
        }
        throw new NodeOperationError(node, error, {
            itemIndex: i,
            description: error.description,
        });
    }
}
//# sourceMappingURL=raw.mode.js.map