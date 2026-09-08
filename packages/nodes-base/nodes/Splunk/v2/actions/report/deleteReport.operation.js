import { updateDisplayOptions } from '../../../../../utils/utilities';
import { reportRLC } from '../../helpers/descriptions';
import { splunkApiRequest } from '../../transport';
const properties = [reportRLC];
const displayOptions = {
    show: {
        resource: ['report'],
        operation: ['deleteReport'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    // https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#saved.2Fsearches.2F.7Bname.7D
    const reportId = this.getNodeParameter('reportId', i, '', { extractValue: true });
    const endpoint = `/services/saved/searches/${reportId}`;
    await splunkApiRequest.call(this, 'DELETE', endpoint);
    return { success: true };
}
//# sourceMappingURL=deleteReport.operation.js.map