import get from 'lodash/get';
import { NodeApiError } from 'n8n-workflow';
export async function mondayComApiRequest(body = {}, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    let options = {
        headers: {
            'API-Version': '2023-10',
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body,
        uri: 'https://api.monday.com/v2/',
        json: true,
    };
    options = Object.assign({}, options, option);
    try {
        let credentialType = 'mondayComApi';
        if (authenticationMethod === 'oAuth2') {
            credentialType = 'mondayComOAuth2Api';
        }
        return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function mondayComApiRequestAllItems(propertyName, body = {}) {
    const returnData = [];
    let responseData;
    body.variables.limit = 50;
    body.variables.page = 1;
    do {
        responseData = await mondayComApiRequest.call(this, body);
        returnData.push.apply(returnData, get(responseData, propertyName));
        body.variables.page++;
    } while (get(responseData, propertyName).length > 0);
    return returnData;
}
export async function mondayComApiPaginatedRequest(itemsPath, fieldsToReturn, body = {}) {
    const returnData = [];
    const initialResponse = await mondayComApiRequest.call(this, body);
    const data = get(initialResponse, itemsPath);
    if (data) {
        returnData.push.apply(returnData, data.items);
        let cursor = data.cursor;
        while (cursor) {
            const responseData = (await mondayComApiRequest.call(this, {
                query: `query ( $cursor: String!) { next_items_page (cursor: $cursor, limit: 100) { cursor items ${fieldsToReturn} } }`,
                variables: {
                    cursor,
                },
            })).data;
            if (responseData && responseData.next_items_page) {
                returnData.push.apply(returnData, responseData.next_items_page.items);
                cursor = responseData.next_items_page.cursor;
            }
            else {
                cursor = null;
            }
        }
    }
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map