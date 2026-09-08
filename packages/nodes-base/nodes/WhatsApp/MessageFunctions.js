import set from 'lodash/set';
import { NodeApiError } from 'n8n-workflow';
import { getUploadFormData } from './MediaFunctions';
export async function addTemplateComponents(requestOptions) {
    const params = this.getNodeParameter('templateParameters');
    if (!params?.parameter) {
        return requestOptions;
    }
    const components = [
        {
            type: 'body',
            parameters: params.parameter,
        },
    ];
    if (!requestOptions.body) {
        requestOptions.body = {};
    }
    set(requestOptions.body, 'template.components', components);
    return requestOptions;
}
export async function setType(requestOptions) {
    const operation = this.getNodeParameter('operation');
    const messageType = this.getNodeParameter('messageType', null);
    let actualType = messageType;
    if (operation === 'sendTemplate') {
        actualType = 'template';
    }
    if (requestOptions.body) {
        Object.assign(requestOptions.body, { type: actualType });
    }
    return requestOptions;
}
export async function mediaUploadFromItem(requestOptions) {
    const uploadData = await getUploadFormData.call(this);
    const phoneNumberId = this.getNodeParameter('phoneNumberId');
    const result = (await this.helpers.httpRequestWithAuthentication.call(this, 'whatsAppApi', {
        url: `/${phoneNumberId}/media`,
        baseURL: requestOptions.baseURL,
        method: 'POST',
        body: uploadData.formData,
    }));
    const operation = this.getNodeParameter('messageType');
    if (!requestOptions.body) {
        requestOptions.body = {};
    }
    set(requestOptions.body, [operation, 'id'], result.id);
    if (operation === 'document') {
        set(requestOptions.body, [operation, 'filename'], uploadData.fileName);
    }
    return requestOptions;
}
export async function templateInfo(requestOptions) {
    const template = this.getNodeParameter('template');
    const [name, language] = template.split('|');
    if (!requestOptions.body) {
        requestOptions.body = {};
    }
    set(requestOptions.body, 'template.name', name);
    set(requestOptions.body, 'template.language.code', language);
    return requestOptions;
}
export async function componentsRequest(requestOptions) {
    const components = this.getNodeParameter('components');
    const componentsRet = [];
    if (!components?.component) {
        return requestOptions;
    }
    for (const component of components.component) {
        const comp = {
            type: component.type,
        };
        if (component.type === 'body') {
            comp.parameters = (component.bodyParameters.parameter || []).map((i) => {
                if (i.type === 'text') {
                    return i;
                }
                else if (i.type === 'currency') {
                    return {
                        type: 'currency',
                        currency: {
                            code: i.code,
                            fallback_value: i.fallback_value,
                            amount_1000: i.amount_1000 * 1000,
                        },
                    };
                }
                else if (i.type === 'date_time') {
                    return {
                        type: 'date_time',
                        date_time: {
                            fallback_value: i.date_time,
                        },
                    };
                }
            });
        }
        else if (component.type === 'button') {
            comp.index = component.index?.toString();
            comp.sub_type = component.sub_type;
            comp.parameters = [component.buttonParameters.parameter];
        }
        else if (component.type === 'header') {
            comp.parameters = component.headerParameters.parameter.map((i) => {
                if (i.type === 'image') {
                    return {
                        type: 'image',
                        image: {
                            link: i.imageLink,
                        },
                    };
                }
                return i;
            });
        }
        componentsRet.push(comp);
    }
    if (!requestOptions.body) {
        requestOptions.body = {};
    }
    set(requestOptions.body, 'template.components', componentsRet);
    return requestOptions;
}
export const sanitizePhoneNumber = (phoneNumber) => phoneNumber.replace(/[\-\(\)\+]/g, '');
export async function cleanPhoneNumber(requestOptions) {
    const phoneNumber = sanitizePhoneNumber(this.getNodeParameter('recipientPhoneNumber'));
    if (!requestOptions.body) {
        requestOptions.body = {};
    }
    set(requestOptions.body, 'to', phoneNumber);
    return requestOptions;
}
export async function sendErrorPostReceive(data, response) {
    if (response.statusCode === 500) {
        throw new NodeApiError(this.getNode(), {}, {
            message: 'Sending failed',
            description: 'If you’re sending to a new test number, try sending a message to it from within the Meta developer portal first.',
            httpCode: '500',
        });
    }
    else if (response.statusCode === 400) {
        const error = { ...response.body.error };
        error.message = error.message.replace(/^\(#\d+\) /, '');
        const messageType = this.getNodeParameter('messageType', 'media');
        if (error.message.endsWith('is not a valid whatsapp business account media attachment ID')) {
            throw new NodeApiError(this.getNode(), { error }, {
                message: `Invalid ${messageType} ID`,
                description: error.message,
                httpCode: '400',
            });
        }
        else if (error.message.endsWith('is not a valid URI.')) {
            throw new NodeApiError(this.getNode(), { error }, {
                message: `Invalid ${messageType} URL`,
                description: error.message,
                httpCode: '400',
            });
        }
        throw new NodeApiError(this.getNode(), { ...response, body: { error } }, {});
    }
    else if (response.statusCode > 399) {
        throw new NodeApiError(this.getNode(), response);
    }
    return data;
}
//# sourceMappingURL=MessageFunctions.js.map