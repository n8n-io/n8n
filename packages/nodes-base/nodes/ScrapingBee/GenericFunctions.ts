import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, JsonObject, NodeApiError,
} from 'n8n-workflow';

const DEFAULT_HEADERS: Record<string, any> = { 'User-Agent': 'n8n'};

export async function scrapingBeeApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, headers: IDataObject, qs: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('scrapingBeeApi') as IDataObject;
	const host = 'app.scrapingbee.com';
	const endpoint = '/api/v1';

    qs['api_key'] = `${credentials.apiKey}`;

	const options: OptionsWithUri = {
		uri: `https://${host}${endpoint}`,
		method: method,
        headers: headers,
		qs: qs,
		json: true,
	};

	try {
		//@ts-ignore
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

function camelToSnake(str: string): string {
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function processJsSnippet(js_snippet: string): string {
    return Buffer.from(js_snippet).toString('base64');
}

function processCookies(cookies: string | Record<string, string>): string {
    if (typeof cookies === 'string') {
        return cookies;
    }

    // It's an object
    var cookiesArray: Array<string> = [];
    for (let key in cookies) {
        cookiesArray.push(`${key}=${cookies[key]}`);
    }
    return cookiesArray.join(';');
}

function processExtractRules(extractRules: string): string {
	var extractRulesObj: object = JSON.parse(decodeURI(extractRules));
    return JSON.stringify(extractRulesObj);
}

function isEmpty(value: any) {
    switch (typeof value) {
        case 'string':
            return value === '';
        case 'object':
            return value && Object.keys(value).length === 0 && value.constructor === Object;
        default:
            return false;
    }
}

export function processParams(params: IDataObject): IDataObject {
	var copyParams: IDataObject = Object.assign({}, params);
    var cleanParams: IDataObject = {};
	var snakeKey: string;

    for (let key in copyParams) {
        // Snake case all parameters
		snakeKey = camelToSnake(key);
		if (snakeKey !== key) {
			copyParams[snakeKey] = copyParams[key];
			delete copyParams[key];
			key = snakeKey;
		}

        if (isEmpty(copyParams[key])) {
            continue;
        }

        switch (key) {
            case 'js_snippet':
                cleanParams[key] = processJsSnippet(copyParams[key] as string);
                break;
            case 'cookies':
                cleanParams[key] = processCookies(copyParams[key] as string | Record<string, string>);
                break;
            case 'extract_rules':
                cleanParams[key] = processExtractRules(copyParams[key] as string);
                break;
            default:
                cleanParams[key] = copyParams[key];
        }
    }

    return cleanParams;
}

export function processHeaders(headers: IDataObject, prefix: string = 'Spb-'): IDataObject {
    var new_headers: IDataObject = {};

    new_headers = Object.assign(new_headers, DEFAULT_HEADERS);

    if (!('headerValues' in headers)) {
        return new_headers;
    }

    for (let obj of headers['headerValues'] as IDataObject[]) {
        var new_key: string = `${prefix}${obj['key']}`;
        new_headers[new_key] = obj['value'];
    }

    return new_headers;
}