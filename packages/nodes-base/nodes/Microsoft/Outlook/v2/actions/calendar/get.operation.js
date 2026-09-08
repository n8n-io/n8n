import { updateDisplayOptions } from '@utils/utilities';
import { calendarRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
export const properties = [calendarRLC];
const displayOptions = {
    show: {
        resource: ['calendar'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const qs = {};
    const calendarId = this.getNodeParameter('calendarId', index, undefined, {
        extractValue: true,
    });
    const responseData = await microsoftApiRequest.call(this, 'GET', `/calendars/${calendarId}`, index, undefined, qs);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=get.operation.js.map