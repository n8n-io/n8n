import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { resolveCustomFieldsV2 } from '../../helpers';
import { rawCustomFieldOutputOption } from '../common.description';
const properties = [
    {
        displayName: 'Person ID',
        name: 'personId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the person to get',
    },
    rawCustomFieldOutputOption,
];
const displayOptions = {
    show: {
        resource: ['person'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    const rawOutput = this.getNodeParameter('rawCustomFieldOutput', 0, false);
    let customProperties;
    if (!rawOutput) {
        customProperties = await pipedriveGetCustomProperties.call(this, 'person');
    }
    for (let i = 0; i < items.length; i++) {
        try {
            const personId = this.getNodeParameter('personId', i);
            const responseData = await pipedriveApiRequest.call(this, 'GET', `/persons/${personId}`, {});
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData.data), { itemData: { item: i } });
            if (customProperties) {
                for (const item of executionData) {
                    resolveCustomFieldsV2(customProperties, item);
                }
            }
            returnData.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                returnData.push(...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } }));
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=get.operation.js.map