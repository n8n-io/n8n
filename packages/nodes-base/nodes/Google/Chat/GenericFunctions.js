import { NodeApiError } from 'n8n-workflow';
import { getSendAndWaitConfig } from '../../../utils/sendAndWait/utils';
import { createUtmCampaignLink } from '../../../utils/utilities';
import { getGoogleAccessToken } from '../GenericFunctions';
async function googleServiceAccountApiRequest(options, noCredentials = false) {
    if (noCredentials) {
        return await this.helpers.request(options);
    }
    const credentials = await this.getCredentials('googleApi');
    const { access_token } = await getGoogleAccessToken.call(this, credentials, 'chat');
    options.headers.Authorization = `Bearer ${access_token}`;
    return await this.helpers.request(options);
}
export async function googleApiRequest(method, resource, body = {}, qs = {}, uri, noCredentials = false, encoding) {
    const options = {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://chat.googleapis.com${resource}`,
        qsStringifyOptions: {
            arrayFormat: 'repeat',
        },
        json: true,
    };
    if (encoding === null) {
        options.encoding = null;
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    let responseData;
    try {
        if (noCredentials || this.getNodeParameter('authentication', 0) === 'serviceAccount') {
            responseData = await googleServiceAccountApiRequest.call(this, options, noCredentials);
        }
        else {
            responseData = await this.helpers.requestWithAuthentication.call(this, 'googleChatOAuth2Api', options);
        }
    }
    catch (error) {
        if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
            error.statusCode = '401';
        }
        throw new NodeApiError(this.getNode(), error);
    }
    if (Object.keys(responseData).length !== 0) {
        return responseData;
    }
    else {
        return { success: true };
    }
}
export async function googleApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.pageSize = 100;
    do {
        responseData = await googleApiRequest.call(this, method, endpoint, body, query);
        query.pageToken = responseData.nextPageToken;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');
    return returnData;
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = undefined;
    }
    return result;
}
export function getPagingParameters(resource, operation = 'getAll') {
    const pagingParameters = [
        {
            displayName: 'Return All',
            name: 'returnAll',
            type: 'boolean',
            displayOptions: {
                show: {
                    resource: [resource],
                    operation: [operation],
                },
            },
            default: false,
            description: 'Whether to return all results or only up to a given limit',
        },
        {
            displayName: 'Limit',
            name: 'limit',
            type: 'number',
            typeOptions: {
                maxValue: 1000,
            },
            displayOptions: {
                show: {
                    resource: [resource],
                    operation: [operation],
                    returnAll: [false],
                },
            },
            default: 100,
            description: 'Max number of results to return',
        },
    ];
    return pagingParameters;
}
export function createSendAndWaitMessageBody(context) {
    const config = getSendAndWaitConfig(context);
    const buttons = config.options.map((option) => `*<${`${option.url}`}|${option.label}>*`);
    let text = `${config.message}\n\n\n${buttons.join('   ')}`;
    if (config.appendAttribution !== false) {
        const instanceId = context.getInstanceId();
        const attributionText = '_This_ _message_ _was_ _sent_ _automatically_ _with_';
        const link = createUtmCampaignLink('n8n-nodes-base.googleChat', instanceId);
        const attribution = `${attributionText} _<${link}|n8n>_`;
        text += `\n\n${attribution}`;
    }
    const body = {
        text,
    };
    return body;
}
//# sourceMappingURL=GenericFunctions.js.map