import { DateTime } from 'luxon';
import { NodeApiError } from 'n8n-workflow';
const VALID_EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const VALID_PHONE_REGEX = /((?:\+|00)[17](?: |\-)?|(?:\+|00)[1-9]\d{0,2}(?: |\-)?|(?:\+|00)1\-\d{3}(?: |\-)?)?(0\d|\([0-9]{3}\)|[1-9]{0,3})(?:((?: |\-)[0-9]{2}){4}|((?:[0-9]{2}){4})|((?: |\-)[0-9]{3}(?: |\-)[0-9]{4})|([0-9]{7}))/;
export function isEmailValid(email) {
    return VALID_EMAIL_REGEX.test(String(email).toLowerCase());
}
export function isPhoneValid(phone) {
    return VALID_PHONE_REGEX.test(String(phone));
}
function dateToIsoSupressMillis(dateTime) {
    const options = { suppressMilliseconds: true };
    return DateTime.fromISO(dateTime).toISO(options);
}
export async function taskPostReceiceAction(items, _response) {
    const contactId = this.getNodeParameter('contactId');
    items.forEach((item) => (item.json.contactId = contactId));
    return items;
}
export async function dueDatePreSendAction(requestOptions) {
    let dueDateParam = this.getNodeParameter('dueDate', null);
    if (!dueDateParam) {
        const fields = this.getNodeParameter('updateFields');
        dueDateParam = fields.dueDate;
    }
    if (!dueDateParam) {
        throw new NodeApiError(this.getNode(), {}, { message: 'dueDate is required', description: 'dueDate is required' });
    }
    const dueDate = dateToIsoSupressMillis(dueDateParam);
    requestOptions.body = (requestOptions.body || {});
    Object.assign(requestOptions.body, { dueDate });
    return requestOptions;
}
export async function contactIdentifierPreSendAction(requestOptions) {
    requestOptions.body = (requestOptions.body || {});
    let identifier = this.getNodeParameter('contactIdentifier', null);
    if (!identifier) {
        const fields = this.getNodeParameter('updateFields');
        identifier = fields.contactIdentifier;
    }
    if (isEmailValid(identifier)) {
        Object.assign(requestOptions.body, { email: identifier });
    }
    else if (isPhoneValid(identifier)) {
        Object.assign(requestOptions.body, { phone: identifier });
    }
    else {
        Object.assign(requestOptions.body, { contactId: identifier });
    }
    return requestOptions;
}
export async function validEmailAndPhonePreSendAction(requestOptions) {
    const body = (requestOptions.body || {});
    if (body.email && !isEmailValid(body.email)) {
        const message = `email "${body.email}" has invalid format`;
        throw new NodeApiError(this.getNode(), {}, { message, description: message });
    }
    if (body.phone && !isPhoneValid(body.phone)) {
        const message = `phone "${body.phone}" has invalid format`;
        throw new NodeApiError(this.getNode(), {}, { message, description: message });
    }
    return requestOptions;
}
export async function dateTimeToEpochPreSendAction(requestOptions) {
    const qs = (requestOptions.qs || {});
    const toEpoch = (dt) => new Date(dt).getTime();
    if (qs.startDate)
        qs.startDate = toEpoch(qs.startDate);
    if (qs.endDate)
        qs.endDate = toEpoch(qs.endDate);
    return requestOptions;
}
export async function highLevelApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    let options = {
        method,
        body,
        qs,
        uri: uri || `https://rest.gohighlevel.com/v1${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    options = Object.assign({}, options, option);
    return await this.helpers.requestWithAuthentication.call(this, 'highLevelApi', options);
}
export async function opportunityUpdatePreSendAction(requestOptions) {
    const body = (requestOptions.body || {});
    if (!body.status || !body.title) {
        const pipelineId = this.getNodeParameter('pipelineId');
        const opportunityId = this.getNodeParameter('opportunityId');
        const resource = `/pipelines/${pipelineId}/opportunities/${opportunityId}`;
        const responseData = await highLevelApiRequest.call(this, 'GET', resource);
        body.status = body.status || responseData.status;
        body.title = body.title || responseData.name;
        requestOptions.body = body;
    }
    return requestOptions;
}
export async function taskUpdatePreSendAction(requestOptions) {
    const body = (requestOptions.body || {});
    if (!body.title || !body.dueDate) {
        const contactId = this.getNodeParameter('contactId');
        const taskId = this.getNodeParameter('taskId');
        const resource = `/contacts/${contactId}/tasks/${taskId}`;
        const responseData = await highLevelApiRequest.call(this, 'GET', resource);
        body.title = body.title || responseData.title;
        // the api response dueDate has to be formatted or it will error on update
        body.dueDate = body.dueDate || dateToIsoSupressMillis(responseData.dueDate);
        requestOptions.body = body;
    }
    return requestOptions;
}
export async function splitTagsPreSendAction(requestOptions) {
    const body = (requestOptions.body || {});
    if (body.tags) {
        if (Array.isArray(body.tags))
            return requestOptions;
        body.tags = body.tags.split(',').map((tag) => tag.trim());
    }
    return requestOptions;
}
export async function highLevelApiPagination(requestData) {
    const responseData = [];
    const resource = this.getNodeParameter('resource');
    const returnAll = this.getNodeParameter('returnAll', false);
    const resourceMapping = {
        contact: 'contacts',
        opportunity: 'opportunities',
    };
    const rootProperty = resourceMapping[resource];
    requestData.options.qs = requestData.options.qs || {};
    if (returnAll)
        requestData.options.qs.limit = 100;
    let responseTotal = 0;
    do {
        const pageResponseData = await this.makeRoutingRequest(requestData);
        const items = pageResponseData[0].json[rootProperty];
        items.forEach((item) => responseData.push({ json: item }));
        const meta = pageResponseData[0].json.meta;
        const startAfterId = meta.startAfterId;
        const startAfter = meta.startAfter;
        requestData.options.qs = { startAfterId, startAfter };
        responseTotal = meta.total || 0;
    } while (returnAll && responseTotal > responseData.length);
    return responseData;
}
export async function getPipelineStages() {
    const pipelineId = this.getCurrentNodeParameter('pipelineId');
    const responseData = await highLevelApiRequest.call(this, 'GET', '/pipelines');
    const pipelines = responseData.pipelines;
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (pipeline) {
        const options = pipeline.stages.map((stage) => {
            const name = stage.name;
            const value = stage.id;
            return { name, value };
        });
        return options;
    }
    return [];
}
export async function getUsers() {
    const responseData = await highLevelApiRequest.call(this, 'GET', '/users');
    const users = responseData.users;
    const options = users.map((user) => {
        const name = user.name;
        const value = user.id;
        return { name, value };
    });
    return options;
}
export async function getTimezones() {
    const responseData = await highLevelApiRequest.call(this, 'GET', '/timezones');
    const timezones = responseData.timezones;
    return timezones.map((zone) => ({
        name: zone,
        value: zone,
    }));
}
//# sourceMappingURL=GenericFunctions.js.map