import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { resolveCustomFieldsV2 } from '../../helpers';
import { rawCustomFieldOutputOption } from '../common.description';
const properties = [
    {
        displayName: 'Organization ID',
        name: 'organizationId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the organization to get',
    },
    rawCustomFieldOutputOption,
];
const displayOptions = {
    show: {
        resource: ['organization'],
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
        customProperties = await pipedriveGetCustomProperties.call(this, 'organization');
    }
    for (let i = 0; i < items.length; i++) {
        try {
            const organizationId = this.getNodeParameter('organizationId', i);
            const responseData = await pipedriveApiRequest.call(this, 'GET', `/organizations/${organizationId}`, {});
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