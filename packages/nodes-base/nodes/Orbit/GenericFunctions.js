import { NodeApiError } from 'n8n-workflow';
export async function orbitApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    try {
        const credentials = await this.getCredentials('orbitApi');
        let options = {
            headers: {
                Authorization: `Bearer ${credentials.accessToken}`,
            },
            method,
            qs,
            body,
            uri: uri || `https://app.orbit.love/api/v1${resource}`,
            json: true,
        };
        options = Object.assign({}, options, option);
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export function resolveIdentities(responseData) {
    const identities = {};
    for (const data of responseData.included) {
        identities[data.id] = data;
    }
    if (!Array.isArray(responseData.data)) {
        responseData.data = [responseData.data];
    }
    for (let i = 0; i < responseData.data.length; i++) {
        for (let y = 0; y < responseData.data[i].relationships.identities.data.length; y++) {
            //@ts-ignore
            responseData.data[i].relationships.identities.data[y] =
                identities[responseData.data[i].relationships.identities.data[y].id];
        }
    }
}
export function resolveMember(responseData) {
    const members = {};
    for (const data of responseData.included) {
        members[data.id] = data;
    }
    if (!Array.isArray(responseData.data)) {
        responseData.data = [responseData.data];
    }
    for (let i = 0; i < responseData.data.length; i++) {
        //@ts-ignore
        responseData.data[i].relationships.member.data =
            //@ts-ignore
            members[responseData.data[i].relationships.member.data.id];
    }
}
/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function orbitApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page = 1;
    do {
        responseData = await orbitApiRequest.call(this, method, resource, body, query);
        returnData.push.apply(returnData, responseData[propertyName]);
        if (query.resolveIdentities === true) {
            resolveIdentities(responseData);
        }
        if (query.resolveMember === true) {
            resolveMember(responseData);
        }
        query.page++;
        const limit = query.limit;
        if (limit && returnData.length >= limit) {
            return returnData;
        }
    } while (responseData.data.length !== 0);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map