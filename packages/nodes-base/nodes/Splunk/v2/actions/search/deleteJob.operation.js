import { updateDisplayOptions } from '../../../../../utils/utilities';
import { searchJobRLC } from '../../helpers/descriptions';
import { splunkApiRequest } from '../../transport';
const properties = [searchJobRLC];
const displayOptions = {
    show: {
        resource: ['search'],
        operation: ['deleteJob'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    // https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs.2F.7Bsearch_id.7D
    const searchJobId = this.getNodeParameter('searchJobId', i, '', { extractValue: true });
    const endpoint = `/services/search/jobs/${searchJobId}`;
    await splunkApiRequest.call(this, 'DELETE', endpoint);
    return { success: true };
}
//# sourceMappingURL=deleteJob.operation.js.map