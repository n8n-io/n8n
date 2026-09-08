import { updateDisplayOptions } from '../../../../../utils/utilities';
import { userRLC } from '../../helpers/descriptions';
import { splunkApiJsonRequest } from '../../transport';
const properties = [userRLC];
const displayOptions = {
    show: {
        resource: ['user'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    // https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers.2F.7Bname.7D
    const userId = this.getNodeParameter('userId', i, '', { extractValue: true });
    const endpoint = `/services/authentication/users/${userId}`;
    const returnData = await splunkApiJsonRequest.call(this, 'GET', endpoint);
    return returnData;
}
//# sourceMappingURL=get.operation.js.map