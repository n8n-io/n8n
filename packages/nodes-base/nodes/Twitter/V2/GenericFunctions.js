import { NodeApiError, NodeOperationError, UserError } from 'n8n-workflow';
export async function twitterApiRequest(method, resource, body = {}, qs = {}, fullOutput, uri, option = {}) {
    let options = {
        method,
        body,
        qs,
        url: uri || `https://api.x.com/2${resource}`,
        json: true,
    };
    try {
        if (Object.keys(option).length !== 0) {
            options = Object.assign({}, options, option);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        if (Object.keys(qs).length === 0) {
            delete options.qs;
        }
        if (fullOutput) {
            return await this.helpers.requestOAuth2.call(this, 'twitterOAuth2Api', options);
        }
        else {
            const { data } = await this.helpers.requestOAuth2.call(this, 'twitterOAuth2Api', options);
            return data;
        }
    }
    catch (error) {
        if (error.error?.required_enrollment === 'Appropriate Level of API Access') {
            throw new NodeOperationError(this.getNode(), error.error.detail ??
                'This operation requires a higher level of X (Twitter) API access. Please check your subscription at developer.twitter.com.');
        }
        else if (error.errors && error.error?.errors[0].message.includes('must be ')) {
            throw new NodeOperationError(this.getNode(), error.error.errors[0].message);
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function twitterApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.max_results = 10;
    do {
        responseData = await twitterApiRequest.call(this, method, endpoint, body, query, true);
        query.next_token = responseData.meta.next_token;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.meta.next_token);
    return returnData;
}
export function returnId(tweetId) {
    if (tweetId.mode === 'id') {
        return tweetId.value;
    }
    else if (tweetId.mode === 'url') {
        try {
            const url = new URL(tweetId.value);
            if (!/(twitter|x).com$/.test(url.hostname)) {
                throw new UserError('Invalid domain');
            }
            const parts = url.pathname.split('/');
            if (parts.length !== 4 || parts[2] !== 'status' || !/^\d+$/.test(parts[3])) {
                throw new UserError('Invalid path');
            }
            return parts[3];
        }
        catch (error) {
            throw new UserError('Not a valid tweet url', { level: 'warning', cause: error });
        }
    }
    else {
        throw new UserError(`The mode ${tweetId.mode} is not valid!`, { level: 'warning' });
    }
}
export async function returnIdFromUsername(usernameRlc) {
    usernameRlc.value = usernameRlc.value.includes('@')
        ? usernameRlc.value.replace('@', '')
        : usernameRlc.value;
    if (usernameRlc.mode === 'username' ||
        (usernameRlc.mode === 'name' && this.getNode().parameters.list !== undefined)) {
        const user = (await twitterApiRequest.call(this, 'GET', `/users/by/username/${usernameRlc.value}`, {}));
        return user.id;
    }
    else if (this.getNode().parameters.list === undefined) {
        const list = (await twitterApiRequest.call(this, 'GET', `/list/by/name/${usernameRlc.value}`, {}));
        return list.id;
    }
    else
        throw new UserError(`The username mode ${usernameRlc.mode} is not valid!`, {
            level: 'warning',
        });
}
//# sourceMappingURL=GenericFunctions.js.map