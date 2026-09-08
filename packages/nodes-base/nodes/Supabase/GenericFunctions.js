import { NodeApiError, UserError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
export function getSchemaHeader(context, method, contextType) {
    let useCustomSchema = false;
    if (contextType === 'loadOptions') {
        useCustomSchema = context.getNodeParameter('useCustomSchema', false);
    }
    else {
        useCustomSchema = context.getNodeParameter('useCustomSchema', 0, false);
    }
    if (useCustomSchema) {
        let schema;
        const headers = {};
        if (contextType === 'loadOptions') {
            schema = context.getNodeParameter('schema', 'public');
        }
        else {
            schema = context.getNodeParameter('schema', 0, 'public');
        }
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
            headers['Content-Profile'] = schema;
        }
        else if (['GET', 'HEAD'].includes(method)) {
            headers['Accept-Profile'] = schema;
        }
        return headers;
    }
    return {};
}
export async function supabaseApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}) {
    const credentials = await this.getCredentials('supabaseApi');
    const options = {
        headers: {
            Prefer: 'return=representation',
        },
        method,
        qs,
        body,
        uri: uri ?? `${credentials.host}/rest/v1${resource}`,
        json: true,
    };
    try {
        options.headers = Object.assign({}, options.headers, headers);
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestWithAuthentication.call(this, 'supabaseApi', options);
    }
    catch (error) {
        if (error.description) {
            error.message = `${error.message}: ${error.description}`;
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
const apiDefinitionsInFlight = new Map();
/**
 * Reads the PostgREST root document, which lists every table and column and so can run to
 * several megabytes. The editor opens one column dropdown per field and they all ask at
 * once, so overlapping callers share one request instead of a parsed copy each.
 */
export async function getApiDefinition() {
    const { host, serviceRole } = await this.getCredentials('supabaseApi');
    const header = getSchemaHeader(this, 'GET', 'loadOptions');
    const key = createHash('sha256')
        .update(JSON.stringify([host, serviceRole, header]))
        .digest('hex');
    const inFlight = apiDefinitionsInFlight.get(key);
    if (inFlight)
        return await inFlight;
    const request = supabaseApiRequest.call(this, 'GET', '/', {}, {}, undefined, header);
    apiDefinitionsInFlight.set(key, request);
    try {
        return await request;
    }
    finally {
        apiDefinitionsInFlight.delete(key);
    }
}
const mapOperations = {
    create: 'created',
    update: 'updated',
    getAll: 'retrieved',
    delete: 'deleted',
};
export function getFilters(resources, operations, { includeNoneOption = true, filterTypeDisplayName = 'Filter', filterFixedCollectionDisplayName = 'Filters', mustMatchOptions = [
    {
        name: 'Any Filter',
        value: 'anyFilter',
    },
    {
        name: 'All Filters',
        value: 'allFilters',
    },
], }) {
    return [
        {
            displayName: filterTypeDisplayName,
            name: 'filterType',
            type: 'options',
            options: [
                ...(includeNoneOption ? [{ name: 'None', value: 'none' }] : []),
                {
                    name: 'Build Manually',
                    value: 'manual',
                },
                {
                    name: 'String',
                    value: 'string',
                },
            ],
            displayOptions: {
                show: {
                    resource: resources,
                    operation: operations,
                },
            },
            default: 'manual',
        },
        {
            displayName: 'Must Match',
            name: 'matchType',
            type: 'options',
            options: mustMatchOptions,
            displayOptions: {
                show: {
                    resource: resources,
                    operation: operations,
                    filterType: ['manual'],
                },
            },
            default: 'anyFilter',
        },
        {
            displayName: filterFixedCollectionDisplayName,
            name: 'filters',
            type: 'fixedCollection',
            typeOptions: {
                multipleValues: true,
            },
            displayOptions: {
                show: {
                    resource: resources,
                    operation: operations,
                    filterType: ['manual'],
                },
            },
            default: {},
            placeholder: 'Add Condition',
            options: [
                {
                    displayName: 'Conditions',
                    name: 'conditions',
                    values: [
                        {
                            displayName: 'Field Name or ID',
                            name: 'keyName',
                            type: 'options',
                            description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                            typeOptions: {
                                loadOptionsDependsOn: ['tableId'],
                                loadOptionsMethod: 'getTableColumns',
                            },
                            default: '',
                        },
                        {
                            displayName: 'Condition',
                            name: 'condition',
                            type: 'options',
                            options: [
                                {
                                    name: 'Equals',
                                    value: 'eq',
                                },
                                {
                                    name: 'Full-Text',
                                    value: 'fullText',
                                },
                                {
                                    name: 'Greater Than',
                                    value: 'gt',
                                },
                                {
                                    name: 'Greater Than or Equal',
                                    value: 'gte',
                                },
                                {
                                    name: 'ILIKE operator',
                                    value: 'ilike',
                                    description: 'Use * in place of %',
                                },
                                {
                                    name: 'Is',
                                    value: 'is',
                                    description: 'Checking for exact equality (null,true,false,unknown)',
                                },
                                {
                                    name: 'Less Than',
                                    value: 'lt',
                                },
                                {
                                    name: 'Less Than or Equal',
                                    value: 'lte',
                                },
                                {
                                    name: 'LIKE operator',
                                    value: 'like',
                                    description: 'Use * in place of %',
                                },
                                {
                                    name: 'Not Equals',
                                    value: 'neq',
                                },
                            ],
                            default: '',
                        },
                        {
                            displayName: 'Search Function',
                            name: 'searchFunction',
                            type: 'options',
                            displayOptions: {
                                show: {
                                    condition: ['fullText'],
                                },
                            },
                            options: [
                                {
                                    name: 'to_tsquery',
                                    value: 'fts',
                                },
                                {
                                    name: 'plainto_tsquery',
                                    value: 'plfts',
                                },
                                {
                                    name: 'phraseto_tsquery',
                                    value: 'phfts',
                                },
                                {
                                    name: 'websearch_to_tsquery',
                                    value: 'wfts',
                                },
                            ],
                            default: '',
                        },
                        {
                            displayName: 'Field Value',
                            name: 'keyValue',
                            type: 'string',
                            default: '',
                        },
                    ],
                },
            ],
            description: `Filter to decide which rows get ${mapOperations[operations[0]]}`,
        },
        {
            displayName: 'See <a href="https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering" target="_blank">PostgREST guide</a> to creating filters',
            name: 'jsonNotice',
            type: 'notice',
            displayOptions: {
                show: {
                    resource: resources,
                    operation: operations,
                    filterType: ['string'],
                },
            },
            default: '',
        },
        {
            displayName: 'Filters (String)',
            name: 'filterString',
            type: 'string',
            displayOptions: {
                show: {
                    resource: resources,
                    operation: operations,
                    filterType: ['string'],
                },
            },
            default: '',
            placeholder: 'name=eq.jhon',
        },
    ];
}
const supportedFilterConditions = new Set([
    'eq',
    'gt',
    'gte',
    'ilike',
    'is',
    'lt',
    'lte',
    'like',
    'neq',
]);
const supportedSearchFunctions = new Set(['fts', 'plfts', 'phfts', 'wfts']);
// ,.():"\ - reserved characters by PostgREST
// &?= - characters used in query strings
const postgrestReservedCharacters = /[,.():"&?=\\]/;
function quotePostgrestComponent(value) {
    const stringValue = String(value);
    if (!postgrestReservedCharacters.test(stringValue)) {
        return stringValue;
    }
    return `"${stringValue.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}
function getPostgrestOperator(value) {
    const condition = String(value.condition);
    if (condition !== 'fullText') {
        if (!supportedFilterConditions.has(condition)) {
            throw new UserError(`Unsupported filter condition: "${condition}"`);
        }
        return condition;
    }
    const searchFunction = String(value.searchFunction);
    if (!supportedSearchFunctions.has(searchFunction)) {
        throw new UserError(`Unsupported search function: "${searchFunction}"`);
    }
    return searchFunction;
}
export const buildQuery = (query, value) => query.set(quotePostgrestComponent(value.keyName), `${getPostgrestOperator(value)}.${String(value.keyValue)}`);
export const buildOrQuery = (value) => `${quotePostgrestComponent(value.keyName)}.${getPostgrestOperator(value)}.${quotePostgrestComponent(value.keyValue)}`;
export const buildGetQuery = (query, value) => query.set(quotePostgrestComponent(value.keyName), `eq.${String(value.keyValue)}`);
export async function validateCredentials(decryptedCredentials) {
    const credentials = decryptedCredentials;
    const { serviceRole } = credentials;
    const options = {
        headers: {
            apikey: serviceRole,
            Authorization: 'Bearer ' + serviceRole,
        },
        method: 'GET',
        uri: `${credentials.host}/rest/v1/`,
        json: true,
    };
    return await this.helpers.request(options);
}
export function mapPairedItemsFrom(iterable) {
    return Array.from(iterable, (_, i) => i).map((index) => {
        return {
            item: index,
        };
    });
}
//# sourceMappingURL=GenericFunctions.js.map