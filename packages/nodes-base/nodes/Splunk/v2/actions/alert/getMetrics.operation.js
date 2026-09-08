import { updateDisplayOptions } from '../../../../../utils/utilities';
import { splunkApiJsonRequest } from '../../transport';
const properties = [];
const displayOptions = {
    show: {
        resource: ['alert'],
        operation: ['getMetrics'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(_i) {
    const endpoint = '/services/alerts/metric_alerts';
    const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint);
    return returnData;
}
//# sourceMappingURL=getMetrics.operation.js.map