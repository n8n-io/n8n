import { snakeCase } from 'change-case';
import { createHash } from 'crypto';
import omit from 'lodash/omit';
export async function woocommerceApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('wooCommerceApi');
    let options = {
        method,
        qs,
        body,
        uri: uri || `${credentials.url}/wp-json/wc/v3${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.form;
    }
    options = Object.assign({}, options, option);
    return await this.helpers.requestWithAuthentication.call(this, 'wooCommerceApi', options);
}
export async function woocommerceApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    query.per_page = 100;
    do {
        responseData = await woocommerceApiRequest.call(this, method, endpoint, body, query, uri, {
            resolveWithFullResponse: true,
        });
        const links = responseData.headers.link.split(',');
        const nextLink = links.find((link) => link.indexOf('rel="next"') !== -1);
        if (nextLink) {
            uri = nextLink.split(';')[0].replace(/<(.*)>/, '$1');
        }
        returnData.push.apply(returnData, responseData.body);
    } while (responseData.headers.link?.includes('rel="next"'));
    return returnData;
}
/**
 * Creates a secret from the credentials
 *
 */
export function getAutomaticSecret(credentials) {
    const data = `${credentials.consumerKey},${credentials.consumerSecret}`;
    return createHash('md5').update(data).digest('hex');
}
export function setMetadata(data) {
    for (let i = 0; i < data.length; i++) {
        //@ts-ignore\
        if (data[i].metadataUi?.metadataValues) {
            //@ts-ignore
            data[i].meta_data = data[i].metadataUi.metadataValues;
            //@ts-ignore
            delete data[i].metadataUi;
        }
        else {
            //@ts-ignore
            delete data[i].metadataUi;
        }
    }
}
export function toSnakeCase(data) {
    if (!Array.isArray(data)) {
        data = [data];
    }
    let remove = false;
    for (let i = 0; i < data.length; i++) {
        for (const key of Object.keys(data[i])) {
            //@ts-ignore
            if (data[i][snakeCase(key)] === undefined) {
                remove = true;
            }
            //@ts-ignore
            data[i][snakeCase(key)] = data[i][key];
            if (remove) {
                //@ts-ignore
                delete data[i][key];
                remove = false;
            }
        }
    }
}
export function setFields(fieldsToSet, body) {
    for (const fields in fieldsToSet) {
        if (fields === 'tags') {
            body.tags = fieldsToSet[fields].map((tag) => ({ id: parseInt(tag, 10) }));
        }
        else {
            body[snakeCase(fields.toString())] = fieldsToSet[fields];
        }
    }
}
export function adjustMetadata(fields) {
    if (!fields.meta_data)
        return fields;
    return {
        ...omit(fields, ['meta_data']),
        meta_data: fields.meta_data.meta_data_fields,
    };
}
//# sourceMappingURL=GenericFunctions.js.map