import { recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';
const properties = [
    recordRLC('Activity', 'activityId', 'searchActivities', 'Activity to delete'),
];
const displayOptions = {
    show: { resource: ['activity'], operation: ['delete'] },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const activityId = Number(this.getNodeParameter('activityId', i, undefined, {
                extractValue: true,
            }));
            await odooApiRequest.call(this, 'mail.activity', 'unlink', {
                ids: [activityId],
            });
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ id: activityId, deleted: true }), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                returnData.push(...executionData);
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=delete.operation.js.map