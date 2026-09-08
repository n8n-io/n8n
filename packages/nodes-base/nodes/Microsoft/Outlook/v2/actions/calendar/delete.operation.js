import { updateDisplayOptions } from '@utils/utilities';
import { calendarRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
export const properties = [calendarRLC];
const displayOptions = {
    show: {
        resource: ['calendar'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const calendarId = this.getNodeParameter('calendarId', index, undefined, {
        extractValue: true,
    });
    await microsoftApiRequest.call(this, 'DELETE', `/calendars/${calendarId}`, index);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=delete.operation.js.map