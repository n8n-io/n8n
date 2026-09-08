import { isResourceLocatorValue, NodeApiError, NodeOperationError, sanitizeXmlName, } from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';
import { validateUserTargetId } from '../GenericFunctions';
const ID_FORMAT_HINT = 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315';
const ENTRA_USER_MESSAGES = {
    required: {
        message: 'The user is empty',
        description: `Select a user from the list, or set the ID. ${ID_FORMAT_HINT}, or a user principal name e.g. jane@contoso.com.`,
    },
    dotsOnly: {
        message: 'The user ID is invalid',
        description: `${ID_FORMAT_HINT}.`,
    },
    invalid: {
        message: 'The user ID is invalid',
        description: `${ID_FORMAT_HINT}, or a user principal name e.g. jane@contoso.com. Enter it as it appears in Entra, not URL-encoded.`,
    },
};
const ENTRA_GROUP_MESSAGES = {
    required: {
        message: 'The group is empty',
        description: `Select a group from the list, or set the ID. ${ID_FORMAT_HINT}.`,
    },
    invalid: {
        message: 'The group ID is invalid',
        description: `${ID_FORMAT_HINT}. Groups are addressed by object ID, not by name or email address.`,
    },
};
/**
 * Validates a user ID before it is encoded into a Graph URL path. Graph accepts either an object
 * ID or a user principal name, guests included. The value is validated untrimmed, because the URL
 * interpolates it untrimmed. Both accepted alphabets are closed under substring, so no substring
 * of an accepted ID can contain `/ \ ? % #`.
 *
 * Exported for tests. Production callers must go through the `preSend` wrappers below, which also
 * refuse a stored extraction rule.
 */
export function validateEntraUserId(id, node) {
    if (id.trim() === '') {
        throw new NodeOperationError(node, ENTRA_USER_MESSAGES.required.message, {
            description: ENTRA_USER_MESSAGES.required.description,
        });
    }
    validateUserTargetId(id, node, ENTRA_USER_MESSAGES);
}
const GROUP_OBJECT_ID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
/**
 * Graph resolves `/groups/{id}` and `/directoryObjects/{id}` by object ID only. Exported for
 * tests, same caveat as {@link validateEntraUserId}.
 */
export function validateEntraGroupId(id, node) {
    if (id.trim() === '') {
        throw new NodeOperationError(node, ENTRA_GROUP_MESSAGES.required.message, {
            description: ENTRA_GROUP_MESSAGES.required.description,
        });
    }
    if (!GROUP_OBJECT_ID.test(id)) {
        throw new NodeOperationError(node, ENTRA_GROUP_MESSAGES.invalid.message, {
            description: ENTRA_GROUP_MESSAGES.invalid.description,
        });
    }
}
/**
 * Reads an ID the way the routing layer does, so the guard sees what the URL will interpolate.
 * A stored `__regex` is refused because the two readers apply it differently: `$parameter[...]`
 * honours it, `extractValue` does not. No Entra mode declares `extractValue`, so nothing
 * legitimate ever carries one.
 */
function readEntraId(name) {
    const stored = this.getNodeParameter(name);
    if (isResourceLocatorValue(stored) && stored.__regex) {
        throw new NodeOperationError(this.getNode(), `The ${name} ID is invalid`, {
            description: 'Remove the ID extraction rule from this field and set the ID directly.',
        });
    }
    return String(this.getNodeParameter(name, undefined, { extractValue: true }) ?? '');
}
/**
 * Last-mile check on the path that is about to be sent. Encoding keeps every other character
 * inside its segment, but a bare `.` or `..` segment still re-points the request, and the URL is
 * composed from its own read of the parameter. No Graph path has a `.` or `..` segment, so this
 * refuses nothing legitimate.
 */
function assertNoDotSegment(url, copy) {
    const segments = (url ?? '').split('?')[0].split('/');
    if (segments.some((segment) => segment === '.' || segment === '..')) {
        throw new NodeOperationError(this.getNode(), copy.message, {
            description: copy.description,
        });
    }
}
export async function validateUserPreSend(requestOptions) {
    validateEntraUserId(readEntraId.call(this, 'user'), this.getNode());
    assertNoDotSegment.call(this, requestOptions.url, ENTRA_USER_MESSAGES.invalid);
    return requestOptions;
}
export async function validateGroupPreSend(requestOptions) {
    validateEntraGroupId(readEntraId.call(this, 'group'), this.getNode());
    assertNoDotSegment.call(this, requestOptions.url, ENTRA_GROUP_MESSAGES.invalid);
    return requestOptions;
}
/**
 * Resolves the URL a request is sent to. An explicit `url` (e.g. a next-page link from Graph) is
 * used verbatim, but only after it is confirmed to be on the credential's Graph host: the bearer
 * token must never travel to an unexpected origin. Graph's own @odata.nextLink is always
 * same-origin, so nothing legitimate is refused.
 */
async function resolveGraphTarget(endpoint, url) {
    const credentials = await this.getCredentials('microsoftEntraOAuth2Api');
    const baseUrl = (typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
        ? credentials.graphApiBaseUrl
        : 'https://graph.microsoft.com').replace(/\/+$/, '');
    // `URL.origin` is the string "null" for a scheme without a defined origin, which would make
    // the comparison below pass for any host.
    if (!URL.canParse(baseUrl) || new URL(baseUrl).origin === 'null') {
        throw new NodeOperationError(this.getNode(), 'The Graph API base URL is not a valid URL', {
            description: 'Set a full URL on the credential, e.g. https://graph.microsoft.com, and try again.',
        });
    }
    const target = url ?? `${baseUrl}/v1.0${endpoint}`;
    if (!URL.canParse(target)) {
        throw new NodeOperationError(this.getNode(), 'The request URL is not a valid URL');
    }
    if (new URL(target).origin !== new URL(baseUrl).origin) {
        throw new NodeOperationError(this.getNode(), 'Refusing to send credentials to an unexpected host');
    }
    return target;
}
export async function microsoftApiRequest(method, endpoint, body = {}, qs, headers, url) {
    const target = await resolveGraphTarget.call(this, endpoint, url);
    const options = {
        method,
        url: target,
        json: true,
        headers,
        body,
        qs,
    };
    return await this.helpers.requestWithAuthentication.call(this, 'microsoftEntraOAuth2Api', options);
}
export async function microsoftApiPaginateRequest(method, endpoint, body = {}, qs, headers, url, itemIndex = 0) {
    const target = await resolveGraphTarget.call(this, endpoint, url);
    // Todo: IHttpRequestOptions doesn't have uri property which is required for requestWithAuthenticationPaginated
    const options = {
        method,
        uri: target,
        json: true,
        headers,
        body,
        qs,
    };
    const pages = await this.helpers.requestWithAuthenticationPaginated.call(this, options, itemIndex, {
        continue: '={{ !!$response.body?.["@odata.nextLink"] }}',
        request: {
            url: '={{ $response.body?.["@odata.nextLink"] ?? $request.url }}',
        },
        requestInterval: 0,
    }, 'microsoftEntraOAuth2Api');
    let results = [];
    for (const page of pages) {
        const items = page.body.value;
        if (items) {
            results = results.concat(items);
        }
    }
    return results;
}
export async function handleErrorPostReceive(data, response) {
    if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
        const resource = this.getNodeParameter('resource');
        const operation = this.getNodeParameter('operation');
        const { code: errorCode, message: errorMessage, details: errorDetails, } = response.body?.error;
        // Operation specific errors
        if (resource === 'group') {
            if (operation === 'create') {
            }
            else if (operation === 'delete') {
                if (errorCode === 'Request_ResourceNotFound') {
                    throw new NodeApiError(this.getNode(), response, {
                        message: "The required group doesn't match any existing one",
                        description: "Double-check the value in the parameter 'Group to Delete' and try again",
                    });
                }
            }
            else if (operation === 'get') {
                if (errorCode === 'Request_ResourceNotFound') {
                    throw new NodeApiError(this.getNode(), response, {
                        message: "The required group doesn't match any existing one",
                        description: "Double-check the value in the parameter 'Group to Get' and try again",
                    });
                }
            }
            else if (operation === 'getAll') {
            }
            else if (operation === 'update') {
                if (errorCode === 'BadRequest' &&
                    errorMessage === 'Empty Payload. JSON content expected.') {
                    // Ignore empty payload error. Currently n8n deletes the empty body object from the request.
                    return data;
                }
                if (errorCode === 'Request_ResourceNotFound') {
                    throw new NodeApiError(this.getNode(), response, {
                        message: "The required group doesn't match any existing one",
                        description: "Double-check the value in the parameter 'Group to Update' and try again",
                    });
                }
            }
        }
        else if (resource === 'user') {
            if (operation === 'addGroup') {
                if (errorCode === 'Request_BadRequest' &&
                    errorMessage ===
                        "One or more added object references already exist for the following modified properties: 'members'.") {
                    throw new NodeApiError(this.getNode(), response, {
                        message: 'The user is already in the group',
                        description: 'The specified user cannot be added to the group because they are already a member',
                    });
                }
                else if (errorCode === 'Request_ResourceNotFound') {
                    const group = this.getNodeParameter('group.value');
                    if (errorMessage.includes(group)) {
                        throw new NodeApiError(this.getNode(), response, {
                            message: "The required group doesn't match any existing one",
                            description: "Double-check the value in the parameter 'Group' and try again",
                        });
                    }
                    else {
                        throw new NodeApiError(this.getNode(), response, {
                            message: "The required user doesn't match any existing one",
                            description: "Double-check the value in the parameter 'User to Add' and try again",
                        });
                    }
                }
            }
            else if (operation === 'create') {
            }
            else if (operation === 'delete') {
                if (errorCode === 'Request_ResourceNotFound') {
                    throw new NodeApiError(this.getNode(), response, {
                        message: "The required user doesn't match any existing one",
                        description: "Double-check the value in the parameter 'User to Delete' and try again",
                    });
                }
            }
            else if (operation === 'get') {
                if (errorCode === 'Request_ResourceNotFound') {
                    throw new NodeApiError(this.getNode(), response, {
                        message: "The required user doesn't match any existing one",
                        description: "Double-check the value in the parameter 'User to Get' and try again",
                    });
                }
            }
            else if (operation === 'getAll') {
            }
            else if (operation === 'removeGroup') {
                if (errorCode === 'Request_ResourceNotFound') {
                    throw new NodeApiError(this.getNode(), response, {
                        message: 'The user is not in the group',
                        description: 'The specified user cannot be removed from the group because they are not a member of the group',
                    });
                }
                else if (errorCode === 'Request_UnsupportedQuery' &&
                    errorMessage ===
                        "Unsupported referenced-object resource identifier for link property 'members'.") {
                    throw new NodeApiError(this.getNode(), response, {
                        message: 'The user ID is invalid',
                        description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
                    });
                }
            }
            else if (operation === 'update') {
                if (errorCode === 'BadRequest' &&
                    errorMessage === 'Empty Payload. JSON content expected.') {
                    // Ignore empty payload error. Currently n8n deletes the empty body object from the request.
                    return data;
                }
                if (errorCode === 'Request_ResourceNotFound') {
                    throw new NodeApiError(this.getNode(), response, {
                        message: "The required user doesn't match any existing one",
                        description: "Double-check the value in the parameter 'User to Update' and try again",
                    });
                }
            }
        }
        // Generic errors
        if (errorCode === 'Request_BadRequest' &&
            errorMessage.startsWith('Invalid object identifier')) {
            const group = this.getNodeParameter('group.value', '');
            const parameterResource = resource === 'group' || errorMessage.includes(group) ? 'group' : 'user';
            throw new NodeApiError(this.getNode(), response, {
                message: `The ${parameterResource} ID is invalid`,
                description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
            });
        }
        if (errorDetails?.some((x) => x.code === 'ObjectConflict' || x.code === 'ConflictingObjects')) {
            throw new NodeApiError(this.getNode(), response, {
                message: `The ${resource} already exists`,
                description: errorMessage,
            });
        }
        throw new NodeApiError(this.getNode(), response);
    }
    return data;
}
export async function getGroupProperties() {
    const returnData = [];
    const response = await microsoftApiRequest.call(this, 'GET', '/$metadata#groups');
    const metadata = await parseStringPromise(response, {
        explicitArray: false,
        tagNameProcessors: [sanitizeXmlName],
        attrNameProcessors: [sanitizeXmlName],
    });
    /* eslint-disable */
    const entities = metadata['edmx:Edmx']['edmx:DataServices']['Schema']
        .find((x) => x['$']['Namespace'] === 'microsoft.graph')['EntityType'].filter((x) => ['entity', 'directoryObject', 'group'].includes(x['$']['Name']));
    let properties = entities
        .flatMap((x) => x['Property'])
        .map((x) => x['$']['Name']);
    /* eslint-enable */
    properties = properties.filter((x) => !['id', 'isArchived', 'hasMembersWithLicenseErrors'].includes(x));
    properties = properties.sort();
    for (const property of properties) {
        returnData.push({
            name: property,
            value: property,
        });
    }
    return returnData;
}
export async function getUserProperties() {
    const returnData = [];
    const response = await microsoftApiRequest.call(this, 'GET', '/$metadata#users');
    const metadata = await parseStringPromise(response, {
        explicitArray: false,
        tagNameProcessors: [sanitizeXmlName],
        attrNameProcessors: [sanitizeXmlName],
    });
    /* eslint-disable */
    const entities = metadata['edmx:Edmx']['edmx:DataServices']['Schema']
        .find((x) => x['$']['Namespace'] === 'microsoft.graph')['EntityType'].filter((x) => ['entity', 'directoryObject', 'user'].includes(x['$']['Name']));
    let properties = entities
        .flatMap((x) => x['Property'])
        .map((x) => x['$']['Name']);
    /* eslint-enable */
    // signInActivity requires AuditLog.Read.All
    // mailboxSettings MailboxSettings.Read
    properties = properties.filter((x) => !['id', 'deviceEnrollmentLimit', 'mailboxSettings', 'print', 'signInActivity'].includes(x));
    properties = properties.sort();
    for (const property of properties) {
        returnData.push({
            name: property,
            value: property,
        });
    }
    return returnData;
}
export async function getGroups(filter, paginationToken) {
    let response;
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '/groups', {}, undefined, undefined, paginationToken);
    }
    else {
        const qs = {
            $select: 'id,displayName',
        };
        const headers = {};
        if (filter) {
            headers.ConsistencyLevel = 'eventual';
            qs.$search = `"displayName:${filter}"`;
        }
        response = await microsoftApiRequest.call(this, 'GET', '/groups', {}, qs, headers);
    }
    const groups = response.value;
    const results = groups
        .map((g) => ({
        name: g.displayName,
        value: g.id,
    }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    return { results, paginationToken: response['@odata.nextLink'] };
}
export async function getUsers(filter, paginationToken) {
    let response;
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '/users', {}, undefined, undefined, paginationToken);
    }
    else {
        const qs = {
            $select: 'id,displayName',
        };
        const headers = {};
        if (filter) {
            qs.$filter = `startsWith(displayName, '${filter}') OR startsWith(userPrincipalName, '${filter}')`;
        }
        response = await microsoftApiRequest.call(this, 'GET', '/users', {}, qs, headers);
    }
    const users = response.value;
    const results = users
        .map((u) => ({
        name: u.displayName,
        value: u.id,
    }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    return { results, paginationToken: response['@odata.nextLink'] };
}
//# sourceMappingURL=GenericFunctions.js.map