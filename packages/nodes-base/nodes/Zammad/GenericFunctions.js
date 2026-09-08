import flow from 'lodash/flow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { removeTrailingSlash } from '@utils/utilities';
export async function zammadApiRequest(method, endpoint, body = {}, qs = {}) {
    const options = {
        method,
        body,
        qs,
        uri: '',
        json: true,
    };
    const authentication = this.getNodeParameter('authentication', 0);
    if (authentication === 'basicAuth') {
        const credentials = await this.getCredentials('zammadBasicAuthApi');
        const baseUrl = removeTrailingSlash(credentials.baseUrl);
        options.uri = `${baseUrl}/api/v1${endpoint}`;
        options.auth = {
            user: credentials.username,
            pass: credentials.password,
        };
        options.rejectUnauthorized = !credentials.allowUnauthorizedCerts;
    }
    else {
        const credentials = await this.getCredentials('zammadTokenAuthApi');
        const baseUrl = removeTrailingSlash(credentials.baseUrl);
        options.uri = `${baseUrl}/api/v1${endpoint}`;
        options.headers = {
            Authorization: `Token token=${credentials.accessToken}`,
        };
        options.rejectUnauthorized = !credentials.allowUnauthorizedCerts;
    }
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        if (error.error.error === 'Object already exists!') {
            error.error.error = 'An entity with this name already exists.';
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function zammadApiRequestAllItems(method, endpoint, body = {}, qs = {}, limit = 0) {
    // https://docs.zammad.org/en/latest/api/intro.html#pagination
    const returnData = [];
    let responseData;
    qs.per_page = 20;
    qs.page = 1;
    do {
        responseData = await zammadApiRequest.call(this, method, endpoint, body, qs);
        returnData.push(...responseData);
        if (limit && returnData.length > limit) {
            return returnData.slice(0, limit);
        }
        qs.page++;
    } while (responseData.length);
    return returnData;
}
export function throwOnEmptyUpdate(resource) {
    throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}`);
}
// ----------------------------------
//        loadOptions utils
// ----------------------------------
export const prettifyDisplayName = (fieldName) => fieldName.replace('name', ' Name');
export const fieldToLoadOption = (i) => {
    return { name: i.display ? prettifyDisplayName(i.display) : i.name, value: i.name };
};
export const isCustomer = (user) => user.role_ids.includes(3) && !user.email.endsWith('@zammad.org');
export async function getAllFields() {
    return (await zammadApiRequest.call(this, 'GET', '/object_manager_attributes'));
}
const isTypeField = (resource) => (arr) => arr.filter((i) => i.object === resource);
export const getGroupFields = isTypeField('Group');
export const getOrganizationFields = isTypeField('Organization');
export const getUserFields = isTypeField('User');
export const getTicketFields = isTypeField('Ticket');
const getCustomFields = (arr) => arr.filter((i) => i.created_by_id !== 1);
export const getGroupCustomFields = flow(getGroupFields, getCustomFields);
export const getOrganizationCustomFields = flow(getOrganizationFields, getCustomFields);
export const getUserCustomFields = flow(getUserFields, getCustomFields);
export const getTicketCustomFields = flow(getTicketFields, getCustomFields);
export const isNotZammadFoundation = (i) => i.name !== 'Zammad Foundation';
export const doesNotBelongToZammad = (i) => !i.email.endsWith('@zammad.org') && i.login !== '-';
//# sourceMappingURL=GenericFunctions.js.map