import { NodeApiError, OperationalError } from 'n8n-workflow';
export const FormstackFieldFormats = {
    ID: 'id',
    Label: 'label',
    Name: 'name',
};
/**
 * Make an API request to Formstack
 *
 */
export async function apiRequest(method, endpoint, body = {}, query = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    const options = {
        headers: {},
        method,
        body,
        qs: query || {},
        uri: `https://www.formstack.com/api/v2/${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    try {
        if (authenticationMethod === 'accessToken') {
            const credentials = await this.getCredentials('formstackApi');
            options.headers.Authorization = `Bearer ${credentials.accessToken}`;
            return await this.helpers.request(options);
        }
        else {
            return await this.helpers.requestOAuth2.call(this, 'formstackOAuth2Api', options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an API request to paginated Formstack endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(method, endpoint, body, dataKey, query) {
    if (query === undefined) {
        query = {};
    }
    query.per_page = 200;
    query.page = 0;
    const returnData = {
        items: [],
    };
    let responseData;
    do {
        query.page += 1;
        responseData = await apiRequest.call(this, method, endpoint, body, query);
        returnData.items.push.apply(returnData.items, responseData[dataKey]);
    } while (responseData.total !== undefined &&
        Math.ceil(responseData.total / query.per_page) > query.page);
    return returnData;
}
/**
 * Returns all the available forms
 *
 */
export async function getForms() {
    const endpoint = 'form.json';
    const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {}, 'forms', {
        folders: false,
    });
    if (responseData.items === undefined) {
        throw new OperationalError('No data got returned', { level: 'warning' });
    }
    const returnData = [];
    for (const baseData of responseData.items) {
        returnData.push({
            name: baseData.name,
            value: baseData.id,
        });
    }
    return returnData;
}
/**
 * Returns all the fields of a form
 *
 */
export async function getFields(formID) {
    const endpoint = `form/${formID}.json`;
    const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {}, 'fields');
    if (responseData.items === undefined) {
        throw new OperationalError('No form fields meta data got returned', { level: 'warning' });
    }
    const fields = responseData.items;
    const fieldMap = {};
    fields.forEach((field) => {
        fieldMap[field.id] = field;
    });
    return fieldMap;
}
/**
 * Returns all the fields of a form
 *
 */
export async function getSubmission(uniqueId) {
    const endpoint = `submission/${uniqueId}.json`;
    const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {}, 'data');
    if (responseData.items === undefined) {
        throw new OperationalError('No form fields meta data got returned', { level: 'warning' });
    }
    return responseData.items;
}
//# sourceMappingURL=GenericFunctions.js.map