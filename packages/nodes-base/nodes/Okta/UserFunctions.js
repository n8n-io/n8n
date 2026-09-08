export async function oktaApiRequest(method, resource, body = {}, qs = {}, url, option = {}) {
    const credentials = await this.getCredentials('oktaApi');
    const baseUrl = `${credentials.url}/api/v1/${resource}`;
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body: Object.keys(body).length ? body : undefined,
        qs: Object.keys(qs).length ? qs : undefined,
        url: url ?? baseUrl,
        json: true,
        ...option,
    };
    return await this.helpers.httpRequestWithAuthentication.call(this, 'oktaApi', options);
}
export async function getUsers(filter) {
    const responseData = await oktaApiRequest.call(this, 'GET', '/users/');
    const filteredUsers = responseData.filter((user) => {
        if (!filter)
            return true;
        const username = `${user.profile.login}`.toLowerCase();
        return username.includes(filter.toLowerCase());
    });
    const users = filteredUsers.map((user) => ({
        name: `${user.profile.login}`,
        value: user.id,
    }));
    return {
        results: users,
    };
}
function simplifyOktaUser(item) {
    return {
        id: item.id,
        status: item.status,
        created: item.created,
        activated: item.activated,
        lastLogin: item.lastLogin,
        lastUpdated: item.lastUpdated,
        passwordChanged: item.passwordChanged,
        profile: {
            firstName: item.profile.firstName,
            lastName: item.profile.lastName,
            login: item.profile.login,
            email: item.profile.email,
        },
    };
}
export async function simplifyGetAllResponse(items, _response) {
    if (items.length === 0)
        return items;
    const simplify = this.getNodeParameter('simplify');
    if (!simplify)
        return (items[0].json ?? []).map((item) => ({
            json: item,
            headers: _response.headers,
        }));
    let simplifiedItems = [];
    if (items[0].json) {
        const jsonArray = items[0].json;
        simplifiedItems = jsonArray.map((item) => {
            const simplifiedItem = simplifyOktaUser(item);
            return {
                json: simplifiedItem,
                headers: _response.headers,
            };
        });
    }
    return simplifiedItems;
}
export async function simplifyGetResponse(items, _response) {
    const simplify = this.getNodeParameter('simplify');
    if (!simplify)
        return items;
    const item = items[0].json;
    const simplifiedItem = simplifyOktaUser(item);
    return [
        {
            json: simplifiedItem,
        },
    ];
}
export const getCursorPaginator = () => {
    return async function cursorPagination(requestOptions) {
        if (!requestOptions.options.qs) {
            requestOptions.options.qs = {};
        }
        let items = [];
        let responseData;
        let nextCursor = undefined;
        const returnAll = this.getNodeParameter('returnAll', true);
        do {
            requestOptions.options.qs.limit = 200;
            requestOptions.options.qs.after = nextCursor;
            responseData = await this.makeRoutingRequest(requestOptions);
            if (responseData.length > 0) {
                const headers = responseData[responseData.length - 1].headers;
                const headersLink = headers?.link;
                nextCursor = headersLink?.split('after=')[1]?.split('&')[0]?.split('>')[0];
            }
            items = items.concat(responseData);
        } while (returnAll && nextCursor);
        return items;
    };
};
//# sourceMappingURL=UserFunctions.js.map