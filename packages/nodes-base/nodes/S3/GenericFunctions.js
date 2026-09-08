import { sign } from 'aws4';
import get from 'lodash/get';
import { NodeApiError, NodeOperationError, sanitizeXmlName } from 'n8n-workflow';
import { URL } from 'url';
import { parseString } from 'xml2js';
function queryToString(params) {
    return Object.keys(params)
        .map((key) => key + '=' + params[key])
        .join('&');
}
export async function s3ApiRequest(bucket, method, path, body, query = {}, headers, option = {}, region) {
    const credentials = await this.getCredentials('s3');
    if (!credentials.endpoint.startsWith('http')) {
        throw new NodeOperationError(this.getNode(), 'HTTP(S) Scheme is required in endpoint definition');
    }
    const endpoint = new URL(credentials.endpoint);
    if (bucket) {
        if (credentials.forcePathStyle) {
            path = `/${bucket}${path}`;
        }
        else {
            endpoint.host = `${bucket}.${endpoint.host}`;
        }
    }
    endpoint.pathname = `${endpoint.pathname === '/' ? '' : endpoint.pathname}${path}`;
    // Sign AWS API request with the user credentials
    const signOpts = {
        headers: headers || {},
        region: region || credentials.region,
        host: endpoint.host,
        method,
        path: `${endpoint.pathname}?${queryToString(query).replace(/\+/g, '%2B')}`,
        service: 's3',
        body,
    };
    const securityHeaders = {
        accessKeyId: `${credentials.accessKeyId}`.trim(),
        secretAccessKey: `${credentials.secretAccessKey}`.trim(),
        sessionToken: credentials.temporaryCredentials
            ? `${credentials.sessionToken}`.trim()
            : undefined,
    };
    sign(signOpts, securityHeaders);
    const options = {
        headers: signOpts.headers,
        method,
        qs: query,
        uri: endpoint.toString(),
        body: signOpts.body,
        rejectUnauthorized: !credentials.ignoreSSLIssues,
    };
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function s3ApiRequestREST(bucket, method, path, body, query = {}, headers, options = {}, region) {
    const response = await s3ApiRequest.call(this, bucket, method, path, body, query, headers, options, region);
    try {
        return JSON.parse(response);
    }
    catch (error) {
        return response;
    }
}
export async function s3ApiRequestSOAP(bucket, method, path, body, query = {}, headers, option = {}, region) {
    const response = await s3ApiRequest.call(this, bucket, method, path, body, query, headers, option, region);
    try {
        return await new Promise((resolve, reject) => {
            parseString(response, {
                explicitArray: false,
                tagNameProcessors: [sanitizeXmlName],
                attrNameProcessors: [sanitizeXmlName],
            }, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });
    }
    catch (error) {
        return error;
    }
}
export async function s3ApiRequestSOAPAllItems(propertyName, service, method, path, body, query = {}, headers = {}, option = {}, region) {
    const returnData = [];
    let responseData;
    do {
        responseData = await s3ApiRequestSOAP.call(this, service, method, path, body, query, headers, option, region);
        //https://forums.aws.amazon.com/thread.jspa?threadID=55746
        if (get(responseData, [propertyName.split('.')[0], 'NextContinuationToken'])) {
            query['continuation-token'] = get(responseData, [
                propertyName.split('.')[0],
                'NextContinuationToken',
            ]);
        }
        if (get(responseData, propertyName)) {
            if (Array.isArray(get(responseData, propertyName))) {
                returnData.push.apply(returnData, get(responseData, propertyName));
            }
            else {
                returnData.push(get(responseData, propertyName));
            }
        }
        const limit = query.limit;
        if (limit && limit <= returnData.length) {
            return returnData;
        }
    } while (get(responseData, [propertyName.split('.')[0], 'IsTruncated']) !== undefined &&
        get(responseData, [propertyName.split('.')[0], 'IsTruncated']) !== 'false');
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map