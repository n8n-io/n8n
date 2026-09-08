import { updateDisplayOptions } from '@utils/utilities';
import { calendarRLC, eventRLC } from '../../descriptions';
import { decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [calendarRLC, eventRLC];
const displayOptions = {
    show: {
        resource: ['event'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const eventId = decodeOutlookId(this.getNodeParameter('eventId', index, undefined, {
        extractValue: true,
    }));
    await microsoftApiRequest.call(this, 'DELETE', `/calendar/events/${eventId}`, index);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=delete.operation.js.map