import moment from 'moment-timezone';
import { jsonParse, UserError } from 'n8n-workflow';
import { Eq } from './QueryFunctions';
export async function theHiveApiRequest(method, resource, body = {}, query = {}, uri, option = {}) {
    const credentials = await this.getCredentials('theHiveApi');
    let options = {
        method,
        qs: query,
        uri: uri || `${credentials.url}/api${resource}`,
        body,
        rejectUnauthorized: !credentials.allowUnauthorizedCerts,
        json: true,
    };
    if (Object.keys(option).length !== 0) {
        options = Object.assign({}, options, option);
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    if (Object.keys(query).length === 0) {
        delete options.qs;
    }
    return await this.helpers.requestWithAuthentication.call(this, 'theHiveApi', options);
}
// Helpers functions
export function mapResource(resource) {
    switch (resource) {
        case 'alert':
            return 'alert';
        case 'case':
            return 'case';
        case 'observable':
            return 'case_artifact';
        case 'task':
            return 'case_task';
        case 'log':
            return 'case_task_log';
        default:
            return '';
    }
}
export function splitTags(tags) {
    return tags.split(',').filter((tag) => tag !== ' ' && tag);
}
// The "Analyzers" field is a multiOptions parameter, so it normally resolves to
// an array of "analyzerId::cortexId" entries. When its value comes from an
// expression wrapped in surrounding text/whitespace, n8n switches to string
// interpolation and the array is coerced to a comma-joined string. Normalize
// both shapes so the operation does not throw "(...).map is not a function".
export function parseAnalyzers(value) {
    const entries = Array.isArray(value)
        ? value
        : value
            .split(',')
            .map((entry) => entry.trim())
            .filter((entry) => entry);
    return entries.map((analyzer) => {
        const [analyzerId, cortexId] = analyzer.split('::');
        return { analyzerId, cortexId };
    });
}
export function prepareOptional(optionals) {
    const response = {};
    for (const key in optionals) {
        if (optionals[key] !== undefined && optionals[key] !== null && optionals[key] !== '') {
            if (['customFieldsJson', 'customFieldsUi'].indexOf(key) > -1) {
                continue; // Ignore customFields, they need special treatment
            }
            else if (moment(optionals[key], moment.ISO_8601).isValid()) {
                response[key] = Date.parse(optionals[key]);
            }
            else if (key === 'artifacts') {
                try {
                    response[key] = jsonParse(optionals[key]);
                }
                catch (error) {
                    throw new UserError('Invalid JSON for artifacts', { level: 'warning' });
                }
            }
            else if (key === 'tags') {
                response[key] = splitTags(optionals[key]);
            }
            else {
                response[key] = optionals[key];
            }
        }
    }
    return response;
}
export async function prepareCustomFields(additionalFields, jsonParameters = false) {
    // Check if the additionalFields object contains customFields
    if (jsonParameters) {
        let customFieldsJson = additionalFields.customFieldsJson;
        // Delete from additionalFields as some operations (e.g. alert:update) do not run prepareOptional
        // which would remove the extra fields
        delete additionalFields.customFieldsJson;
        if (typeof customFieldsJson === 'string') {
            try {
                customFieldsJson = jsonParse(customFieldsJson);
            }
            catch (error) {
                throw new UserError('Invalid JSON for customFields', { level: 'warning' });
            }
        }
        if (typeof customFieldsJson === 'object') {
            const customFields = Object.keys(customFieldsJson).reduce((acc, curr) => {
                acc[`customFields.${curr}`] = customFieldsJson[curr];
                return acc;
            }, {});
            return customFields;
        }
        else if (customFieldsJson) {
            throw new UserError('customFieldsJson value is invalid', { level: 'warning' });
        }
    }
    else if (additionalFields.customFieldsUi) {
        // Get Custom Field Types from TheHive
        const credentials = await this.getCredentials('theHiveApi');
        const version = credentials.apiVersion;
        const endpoint = version === 'v1' ? '/customField' : '/list/custom_fields';
        const requestResult = await theHiveApiRequest.call(this, 'GET', endpoint);
        // Convert TheHive3 response to the same format as TheHive 4
        // [{name, reference, type}]
        const hiveCustomFields = version === 'v1'
            ? requestResult
            : Object.keys(requestResult).map((key) => requestResult[key]);
        // Build reference to type mapping object
        const referenceTypeMapping = hiveCustomFields.reduce((acc, curr) => ((acc[curr.reference] = curr.type), acc), {});
        // Build "fieldName": {"type": "value"} objects
        const customFieldsUi = additionalFields.customFieldsUi;
        const customFields = (customFieldsUi?.customFields).reduce((acc, curr) => {
            const fieldName = curr.field;
            // Might be able to do some type conversions here if needed, TODO
            const updatedField = `customFields.${fieldName}.${[referenceTypeMapping[fieldName]]}`;
            acc[updatedField] = curr.value;
            return acc;
        }, {});
        delete additionalFields.customFieldsUi;
        return customFields;
    }
    return undefined;
}
export function buildCustomFieldSearch(customFields) {
    const searchQueries = [];
    Object.keys(customFields).forEach((customFieldName) => {
        searchQueries.push(Eq(customFieldName, customFields[customFieldName]));
    });
    return searchQueries;
}
export function prepareSortQuery(sort, body) {
    if (sort) {
        const field = sort.substring(1);
        const value = sort.charAt(0) === '+' ? 'asc' : 'desc';
        const sortOption = {};
        sortOption[field] = value;
        body.query.push({
            _name: 'sort',
            _fields: [sortOption],
        });
    }
}
export function prepareRangeQuery(range, body) {
    if (range && range !== 'all') {
        body.query.push({
            _name: 'page',
            from: parseInt(range.split('-')[0], 10),
            to: parseInt(range.split('-')[1], 10),
        });
    }
}
//# sourceMappingURL=GenericFunctions.js.map