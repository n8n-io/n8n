import { updateDisplayOptions } from '../../../../../utils/utilities';
import { splunkApiJsonRequest } from '../../transport';
const properties = [];
const displayOptions = {
    show: {
        resource: ['alert'],
        operation: ['getReport'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(_i) {
    // https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTsearch#alerts.2Ffired_alerts
    const endpoint = '/services/alerts/fired_alerts';
    const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint);
    return returnData;
}
//# sourceMappingURL=getReport.operation.js.map