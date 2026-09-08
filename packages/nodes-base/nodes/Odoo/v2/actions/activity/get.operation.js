import { recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';
const properties = [
    recordRLC('Activity', 'activityId', 'searchActivities', 'Activity to retrieve'),
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        default: {},
        placeholder: 'Add Option',
        options: [
            {
                displayName: 'Fields to Include',
                name: 'fieldsList',
                type: 'multiOptions',
                description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                default: [],
                typeOptions: { loadOptionsMethod: 'getActivityFields' },
            },
        ],
    },
];
const displayOptions = {
    show: { resource: ['activity'], operation: ['get'] },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const activityId = Number(this.getNodeParameter('activityId', i, undefined, {
                extractValue: true,
            }));
            const options = this.getNodeParameter('options', i);
            const fields = options.fieldsList ?? [];
            const response = (await odooApiRequest.call(this, 'mail.activity', 'read', {
                ids: [activityId],
                fields,
            }));
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response), { itemData: { item: i } });
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
//# sourceMappingURL=get.operation.js.map