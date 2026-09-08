import { NodeApiError } from 'n8n-workflow';
export async function mailerliteApiRequest(method, path, body = {}, qs = {}, _option = {}) {
    const options = {
        method,
        body,
        qs,
        url: this.getNode().typeVersion === 1
            ? `https://api.mailerlite.com/api/v2${path}`
            : `https://connect.mailerlite.com/api${path}`,
        json: true,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.httpRequestWithAuthentication.call(this, 'mailerLiteApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function mailerliteApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.limit = 1000;
    query.offset = 0;
    if (this.getNode().typeVersion === 1) {
        do {
            responseData = await mailerliteApiRequest.call(this, method, endpoint, body, query);
            returnData.push(...responseData);
            query.offset += query.limit;
        } while (responseData.length !== 0);
    }
    else {
        do {
            responseData = await mailerliteApiRequest.call(this, method, endpoint, body, query);
            returnData.push(...responseData.data);
            query.cursor = responseData.meta.next_cursor;
        } while (responseData.links.next !== null);
    }
    return returnData;
}
export async function getCustomFields() {
    const returnData = [];
    const endpoint = '/fields';
    const fieldsResponse = await mailerliteApiRequest.call(this, 'GET', endpoint);
    if (this.getNode().typeVersion === 1) {
        const fields = fieldsResponse;
        fields.forEach((field) => {
            returnData.push({
                name: field.key,
                value: field.key,
            });
        });
    }
    else {
        const fields = fieldsResponse.data;
        fields.forEach((field) => {
            returnData.push({
                name: field.name,
                value: field.key,
            });
        });
    }
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map