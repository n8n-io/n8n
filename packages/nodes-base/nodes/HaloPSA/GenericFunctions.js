import { NodeApiError } from 'n8n-workflow';
function getAuthUrl(credentials) {
    return credentials.hostingType === 'on-premise'
        ? `${credentials.appUrl}/auth/token`
        : `${credentials.authUrl}/token?tenant=${credentials.tenant}`;
}
// API Requests ---------------------------------------------------------------------
export async function getAccessTokens() {
    const credentials = await this.getCredentials('haloPSAApi');
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        form: {
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
            grant_type: 'client_credentials',
            scope: credentials.scope,
        },
        uri: getAuthUrl(credentials),
        json: true,
    };
    try {
        const tokens = await this.helpers.request(options);
        return tokens;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function haloPSAApiRequest(method, resource, accessToken, body = {}, qs = {}, option = {}) {
    const resourceApiUrl = (await this.getCredentials('haloPSAApi')).resourceApiUrl;
    try {
        let options = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': 'https://n8n.io',
                Connection: 'keep-alive',
                Accept: '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Content-Type': 'application/json',
            },
            method,
            qs,
            body,
            uri: `${resourceApiUrl}${resource}`,
            json: true,
        };
        options = Object.assign({}, options, option);
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        const result = await this.helpers.request(options);
        if (method === 'DELETE' && result.id) {
            return { success: true };
        }
        return result;
    }
    catch (error) {
        const message = error.message;
        if (method === 'DELETE' || method === 'GET' || (method === 'POST' && message)) {
            let newErrorMessage;
            if (message.includes('400')) {
                this.logger.debug(message);
                newErrorMessage = JSON.parse(message.split(' - ')[1]);
                error.message = `For field ID, ${newErrorMessage.id || newErrorMessage['[0].id']}`;
            }
            if (message.includes('403')) {
                error.message =
                    `You don\'t have permissions to ${method.toLowerCase()} ${resource
                        .split('/')[1]
                        .toLowerCase()}.`;
            }
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
// export async function reasignTickets(
// 	this:
// 		| IHookFunctions
// 		| IExecuteFunctions
// 		| ILoadOptionsFunctions
// 		| IPollFunctions,
// 	clientId: string,
// 	reasigmentCliendId: string,
// 	accessToken: string,
// ): Promise<any> {
// 	const response = (await haloPSAApiRequest.call(
// 		this,
// 		'GET',
// 		`/tickets`,
// 		accessToken,
// 		{},
// 		{ client_id: reasigmentCliendId },
// 	)) as IDataObject;
// 	const { tickets } = response;
// 	this.logger.debug((tickets as IDataObject[]).map(t => t.id));
// 	const body: IDataObject = {
// 		id: clientId,
// 		client_id: reasigmentCliendId,
// 	};
// 	for (const ticket of (tickets as IDataObject[])) {
// 		this.logger.debug(ticket.id);
// 		await haloPSAApiRequest.call(this, 'DELETE', `/tickets/${ticket.id}`, accessToken);
// 	}
// }
export async function haloPSAApiRequestAllItems(propertyName, method, endpoint, accessToken, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page_size = 100;
    query.page_no = 1;
    query.pageinate = true;
    do {
        responseData = (await haloPSAApiRequest.call(this, method, endpoint, accessToken, body, query));
        returnData.push.apply(returnData, responseData[propertyName]);
        query.page_no++;
        //@ts-ignore
    } while (returnData.length < responseData.record_count);
    return returnData;
}
// Utilities ------------------------------------------------------------------------
export function simplifyHaloPSAGetOutput(response, fieldsList) {
    const output = [];
    for (const item of response) {
        const simplifiedItem = {};
        Object.keys(item).forEach((key) => {
            if (fieldsList.includes(key)) {
                simplifiedItem[key] = item[key];
            }
        });
        output.push(simplifiedItem);
    }
    return output;
}
export function qsSetStatus(status) {
    if (!status)
        return {};
    const qs = {};
    if (status === 'all') {
        qs.includeinactive = true;
        qs.includeactive = true;
    }
    else if (status === 'active') {
        qs.includeinactive = false;
        qs.includeactive = true;
    }
    else {
        qs.includeinactive = true;
        qs.includeactive = false;
    }
    return qs;
}
// Validation -----------------------------------------------------------------------
export async function validateCredentials(decryptedCredentials) {
    const credentials = decryptedCredentials;
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        form: {
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
            grant_type: 'client_credentials',
            scope: credentials.scope,
        },
        uri: getAuthUrl(credentials),
        json: true,
    };
    return (await this.helpers.request(options));
}
//# sourceMappingURL=GenericFunctions.js.map