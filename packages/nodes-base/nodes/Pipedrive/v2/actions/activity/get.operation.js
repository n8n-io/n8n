import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { resolveCustomFieldsV2 } from '../../helpers';
import { rawCustomFieldOutputOption } from '../common.description';
const properties = [
    {
        displayName: 'Activity ID',
        name: 'activityId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the activity to get',
    },
    rawCustomFieldOutputOption,
];
const displayOptions = {
    show: {
        resource: ['activity'],
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
        customProperties = await pipedriveGetCustomProperties.call(this, 'activity');
    }
    for (let i = 0; i < items.length; i++) {
        try {
            const activityId = this.getNodeParameter('activityId', i);
            const responseData = await pipedriveApiRequest.call(this, 'GET', `/activities/${activityId}`, {});
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