import * as losslessJSON from 'lossless-json';
import moment from 'moment-timezone';
import { NodeApiError } from 'n8n-workflow';
function convertLosslessNumber(_, value) {
    if (value?.isLosslessNumber) {
        return value.toString();
    }
    else {
        return value;
    }
}
/**
 * Make an authenticated API request to GoToWebinar.
 */
export async function goToWebinarApiRequest(method, endpoint, qs, body, option = {}) {
    const operation = this.getNodeParameter('operation', 0);
    const resource = this.getNodeParameter('resource', 0);
    const options = {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        method,
        uri: `https://api.getgo.com/G2W/rest/v2/${endpoint}`,
        qs,
        body: JSON.stringify(body),
        json: false,
    };
    if (resource === 'session' && operation === 'getAll') {
        options.headers.Accept = 'application/vnd.citrix.g2wapi-v1.1+json';
    }
    if (['GET', 'DELETE'].includes(method)) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    if (Object.keys(option)) {
        Object.assign(options, option);
    }
    try {
        const response = await this.helpers.requestOAuth2.call(this, 'goToWebinarOAuth2Api', options, {
            tokenExpiredStatusCode: 403,
        });
        if (response === '') {
            return {};
        }
        // https://stackoverflow.com/questions/62190724/getting-gotowebinar-registrant
        return losslessJSON.parse(response, convertLosslessNumber);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an authenticated API request to GoToWebinar and return all results.
 */
export async function goToWebinarApiRequestAllItems(method, endpoint, query, body, resource) {
    const resourceToResponseKey = {
        session: 'sessionInfoResources',
        webinar: 'webinars',
    };
    const key = resourceToResponseKey[resource];
    let returnData = [];
    let responseData;
    do {
        responseData = await goToWebinarApiRequest.call(this, method, endpoint, query, body);
        if (responseData.page && parseInt(responseData.page.totalElements, 10) === 0) {
            return [];
        }
        else if (responseData._embedded?.[key]) {
            returnData.push(...responseData._embedded[key]);
        }
        else {
            returnData.push(...responseData);
        }
        const limit = query.limit;
        if (limit && returnData.length >= limit) {
            returnData = returnData.splice(0, limit);
            return returnData;
        }
    } while (responseData.totalElements &&
        parseInt(responseData.totalElements, 10) > returnData.length);
    return returnData;
}
export async function handleGetAll(endpoint, qs, body, resource) {
    const returnAll = this.getNodeParameter('returnAll', 0);
    if (!returnAll) {
        qs.limit = this.getNodeParameter('limit', 0);
    }
    return await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, body, resource);
}
export async function loadWebinars() {
    const { oauthTokenData } = await this.getCredentials('goToWebinarOAuth2Api');
    const endpoint = `accounts/${oauthTokenData.account_key}/webinars`;
    const qs = {
        fromTime: moment().subtract(1, 'years').format(),
        toTime: moment().add(1, 'years').format(),
    };
    const resourceItems = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, 'webinar');
    const returnData = [];
    resourceItems.forEach((item) => {
        returnData.push({
            name: item.subject,
            value: item.webinarKey,
        });
    });
    return returnData;
}
export async function loadWebinarSessions() {
    const { oauthTokenData } = await this.getCredentials('goToWebinarOAuth2Api');
    const webinarKey = this.getCurrentNodeParameter('webinarKey');
    const endpoint = `organizers/${oauthTokenData.organizer_key}/webinars/${webinarKey}/sessions`;
    const resourceItems = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, {}, {}, 'session');
    const returnData = [];
    resourceItems.forEach((item) => {
        returnData.push({
            name: `Date: ${moment(item.startTime).format('MM-DD-YYYY')} | From: ${moment(item.startTime).format('LT')} - To: ${moment(item.endTime).format('LT')}`,
            value: item.sessionKey,
        });
    });
    return returnData;
}
export async function loadRegistranSimpleQuestions() {
    const { oauthTokenData } = await this.getCredentials('goToWebinarOAuth2Api');
    const webinarkey = this.getNodeParameter('webinarKey');
    const endpoint = `organizers/${oauthTokenData.organizer_key}/webinars/${webinarkey}/registrants/fields`;
    const { questions } = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
    const returnData = [];
    questions.forEach((item) => {
        if (item.type === 'shortAnswer') {
            returnData.push({
                name: item.question,
                value: item.questionKey,
            });
        }
    });
    return returnData;
}
export async function loadAnswers() {
    const { oauthTokenData } = await this.getCredentials('goToWebinarOAuth2Api');
    const webinarKey = this.getCurrentNodeParameter('webinarKey');
    const questionKey = this.getCurrentNodeParameter('questionKey');
    const endpoint = `organizers/${oauthTokenData.organizer_key}/webinars/${webinarKey}/registrants/fields`;
    const { questions } = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
    const returnData = [];
    questions.forEach((item) => {
        if (item.type === 'multiChoice' && item.questionKey === questionKey) {
            for (const answer of item.answers) {
                returnData.push({
                    name: answer.answer,
                    value: answer.answerKey,
                });
            }
        }
    });
    return returnData;
}
export async function loadRegistranMultiChoiceQuestions() {
    const { oauthTokenData } = await this.getCredentials('goToWebinarOAuth2Api');
    const webinarkey = this.getNodeParameter('webinarKey');
    const endpoint = `organizers/${oauthTokenData.organizer_key}/webinars/${webinarkey}/registrants/fields`;
    const { questions } = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
    const returnData = [];
    questions.forEach((item) => {
        if (item.type === 'multipleChoice') {
            returnData.push({
                name: item.question,
                value: item.questionKey,
            });
        }
    });
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map