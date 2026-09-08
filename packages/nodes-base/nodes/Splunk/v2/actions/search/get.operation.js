import { updateDisplayOptions } from '../../../../../utils/utilities';
import { searchJobRLC } from '../../helpers/descriptions';
import { splunkApiJsonRequest } from '../../transport';
const properties = [searchJobRLC];
const displayOptions = {
    show: {
        resource: ['search'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    // https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs.2F.7Bsearch_id.7D
    const searchJobId = this.getNodeParameter('searchJobId', i, '', { extractValue: true });
    const endpoint = `/services/search/jobs/${searchJobId}`;
    const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint);
    return returnData;
}
//# sourceMappingURL=get.operation.js.map