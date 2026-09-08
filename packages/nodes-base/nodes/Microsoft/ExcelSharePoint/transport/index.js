import { SERVICE_PRINCIPAL_AUTH } from '../helpers/constants';
import { buildRequestOptions } from '../helpers/converters';
import { getErrorMapper } from '../helpers/errorMappers';
// Not expected to be reused outside this file yet; move it back to its own
// helpers/credentials.ts if a second consumer (e.g. a load-options dropdown) needs it.
export function getExcelSharePointCredentialType() {
    // In load-options contexts the 2nd arg is the fallback, not an item index — keep the 2-arg form
    const selected = this.getNodeParameter('authentication', 0);
    return selected === SERVICE_PRINCIPAL_AUTH ? SERVICE_PRINCIPAL_AUTH : 'microsoftOAuth2Api';
}
export async function microsoftApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}) {
    const credentialType = getExcelSharePointCredentialType.call(this);
    const mapError = getErrorMapper(credentialType);
    const credentials = await this.getCredentials(credentialType);
    const options = buildRequestOptions({
        method,
        resource,
        body,
        qs,
        uri,
        headers,
        graphApiBaseUrl: credentials.graphApiBaseUrl,
    });
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        throw mapError.call(this, error);
    }
}
/**
 * Accumulates every page of a Graph collection for "Return All". Only the first
 * request carries `qs`; every following page is fetched from `@odata.nextLink`
 * verbatim, exactly as Graph returned it, never rebuilt with extra params.
 */
export async function microsoftApiRequestAllItems(endpoint, qs = {}) {
    const returnData = [];
    let uri;
    do {
        const response = uri
            ? await (microsoftApiRequest).call(this, 'GET', '', {}, {}, uri)
            : await (microsoftApiRequest).call(this, 'GET', endpoint, {}, { ...qs, $top: 100 });
        returnData.push.apply(returnData, response.value ?? []);
        uri = response['@odata.nextLink'];
    } while (uri !== undefined);
    return returnData;
}
//# sourceMappingURL=index.js.map