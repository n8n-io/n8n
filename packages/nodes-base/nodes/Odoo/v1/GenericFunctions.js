import { NodeApiError, randomInt } from 'n8n-workflow';
const serviceJSONRPC = 'object';
const methodJSONRPC = 'execute';
export const mapOperationToJSONRPC = {
    create: 'create',
    get: 'read',
    getAll: 'search_read',
    update: 'write',
    delete: 'unlink',
};
export const mapOdooResources = {
    contact: 'res.partner',
    opportunity: 'crm.lead',
    note: 'note.note',
};
export const mapFilterOperationToJSONRPC = {
    equal: '=',
    notEqual: '!=',
    greaterThen: '>',
    lesserThen: '<',
    greaterOrEqual: '>=',
    lesserOrEqual: '<=',
    like: 'like',
    in: 'in',
    notIn: 'not in',
    childOf: 'child_of',
};
export function odooGetDBName(databaseName, url) {
    if (databaseName)
        return databaseName;
    const odooURL = new URL(url);
    const hostname = odooURL.hostname;
    if (!hostname)
        return '';
    return odooURL.hostname.split('.')[0];
}
function processFilters(value) {
    return value.filter?.map((item) => {
        const operator = item.operator;
        item.operator = mapFilterOperationToJSONRPC[operator];
        return Object.values(item);
    });
}
export function processNameValueFields(value) {
    const data = value;
    return data?.fields?.reduce((acc, record) => {
        return Object.assign(acc, { [record.fieldName]: record.fieldValue });
    }, {});
}
// function processResponseFields(value: IDataObject) {
// 	const data = value as unknown as IOdooResponseFields;
// 	return data?.fields?.map((entry) => entry.field);
// }
export async function odooJSONRPCRequest(body, url) {
    try {
        const options = {
            headers: {
                Connection: 'keep-alive',
                Accept: '*/*',
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body,
            uri: `${url}/jsonrpc`,
            json: true,
        };
        const response = await this.helpers.request(options);
        if (response.error) {
            throw new NodeApiError(this.getNode(), response.error.data, {
                message: response.error.data.message,
            });
        }
        return response.result;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function odooGetModelFields(db, userID, password, resource, url) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: serviceJSONRPC,
                method: methodJSONRPC,
                args: [
                    db,
                    userID,
                    password,
                    mapOdooResources[resource] || resource,
                    'fields_get',
                    [],
                    ['string', 'type', 'help', 'required', 'name'],
                ],
            },
            id: randomInt(100),
        };
        const result = await odooJSONRPCRequest.call(this, body, url);
        return result;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function odooCreate(db, userID, password, resource, operation, url, newItem) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: serviceJSONRPC,
                method: methodJSONRPC,
                args: [
                    db,
                    userID,
                    password,
                    mapOdooResources[resource] || resource,
                    mapOperationToJSONRPC[operation],
                    newItem || {},
                ],
            },
            id: randomInt(100),
        };
        const result = await odooJSONRPCRequest.call(this, body, url);
        return { id: result };
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function odooGet(db, userID, password, resource, operation, url, itemsID, fieldsToReturn) {
    try {
        if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
            throw new NodeApiError(this.getNode(), {
                status: 'Error',
                message: `Please specify a valid ID: ${itemsID}`,
            });
        }
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: serviceJSONRPC,
                method: methodJSONRPC,
                args: [
                    db,
                    userID,
                    password,
                    mapOdooResources[resource] || resource,
                    mapOperationToJSONRPC[operation],
                    itemsID ? [+itemsID] : [],
                    fieldsToReturn || [],
                ],
            },
            id: randomInt(100),
        };
        const result = await odooJSONRPCRequest.call(this, body, url);
        return result;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function odooGetAll(db, userID, password, resource, operation, url, filters, fieldsToReturn, limit = 0) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: serviceJSONRPC,
                method: methodJSONRPC,
                args: [
                    db,
                    userID,
                    password,
                    mapOdooResources[resource] || resource,
                    mapOperationToJSONRPC[operation],
                    (filters && processFilters(filters)) || [],
                    fieldsToReturn || [],
                    0, // offset
                    limit,
                ],
            },
            id: randomInt(100),
        };
        const result = await odooJSONRPCRequest.call(this, body, url);
        return result;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function odooUpdate(db, userID, password, resource, operation, url, itemsID, fieldsToUpdate) {
    try {
        if (!Object.keys(fieldsToUpdate).length) {
            throw new NodeApiError(this.getNode(), {
                status: 'Error',
                message: 'Please specify at least one field to update',
            });
        }
        if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
            throw new NodeApiError(this.getNode(), {
                status: 'Error',
                message: `Please specify a valid ID: ${itemsID}`,
            });
        }
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: serviceJSONRPC,
                method: methodJSONRPC,
                args: [
                    db,
                    userID,
                    password,
                    mapOdooResources[resource] || resource,
                    mapOperationToJSONRPC[operation],
                    itemsID ? [+itemsID] : [],
                    fieldsToUpdate,
                ],
            },
            id: randomInt(100),
        };
        await odooJSONRPCRequest.call(this, body, url);
        return { id: itemsID };
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function odooDelete(db, userID, password, resource, operation, url, itemsID) {
    if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
        throw new NodeApiError(this.getNode(), {
            status: 'Error',
            message: `Please specify a valid ID: ${itemsID}`,
        });
    }
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: serviceJSONRPC,
                method: methodJSONRPC,
                args: [
                    db,
                    userID,
                    password,
                    mapOdooResources[resource] || resource,
                    mapOperationToJSONRPC[operation],
                    itemsID ? [+itemsID] : [],
                ],
            },
            id: randomInt(100),
        };
        await odooJSONRPCRequest.call(this, body, url);
        return { success: true };
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function odooGetUserID(db, username, password, url) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'common',
                method: 'login',
                args: [db, username, password],
            },
            id: randomInt(100),
        };
        const loginResult = await odooJSONRPCRequest.call(this, body, url);
        return loginResult;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function odooGetServerVersion(url) {
    try {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
                service: 'common',
                method: 'version',
                args: [],
            },
            id: randomInt(100),
        };
        const result = await odooJSONRPCRequest.call(this, body, url);
        return result;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map