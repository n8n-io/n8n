import { updateDisplayOptions } from '@utils/utilities';
import * as createEvent from '../../../ICalendar/createEvent.operation';
export const description = updateDisplayOptions({
    show: {
        operation: ['iCal'],
    },
}, createEvent.description);
export async function execute(items) {
    const returnData = await createEvent.execute.call(this, items);
    return returnData;
}
//# sourceMappingURL=iCall.operation.js.map