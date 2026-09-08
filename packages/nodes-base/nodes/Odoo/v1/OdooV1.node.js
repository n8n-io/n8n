import { capitalCase } from 'change-case';
import { NodeConnectionTypes, deepCopy, randomInt } from 'n8n-workflow';
import { contactDescription, contactOperations, customResourceDescription, customResourceOperations, noteDescription, noteOperations, opportunityDescription, opportunityOperations, } from './descriptions';
import { odooCreate, odooDelete, odooGet, odooGetAll, odooGetDBName, odooGetModelFields, odooGetUserID, odooJSONRPCRequest, odooUpdate, processNameValueFields, } from './GenericFunctions';
export class OdooV1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            displayName: 'Odoo',
            name: 'odoo',
            icon: 'file:odoo.svg',
            group: ['transform'],
            version: 1,
            description: 'Consume Odoo API',
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            defaults: {
                name: 'Odoo',
            },
            usableAsTool: true,
            inputs: [NodeConnectionTypes.Main],
            outputs: [NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'odooApi',
                    required: true,
                    testedBy: 'odooApiTest',
                },
            ],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    default: 'contact',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Contact',
                            value: 'contact',
                        },
                        {
                            name: 'Custom Resource',
                            value: 'custom',
                        },
                        {
                            name: 'Note',
                            value: 'note',
                        },
                        {
                            name: 'Opportunity',
                            value: 'opportunity',
                        },
                    ],
                },
                ...customResourceOperations,
                ...customResourceDescription,
                ...opportunityOperations,
                ...opportunityDescription,
                ...contactOperations,
                ...contactDescription,
                ...noteOperations,
                ...noteDescription,
            ],
        };
    }
    methods = {
        loadOptions: {
            async getModelFields() {
                let resource;
                resource = this.getCurrentNodeParameter('resource');
                if (resource === 'custom') {
                    resource = this.getCurrentNodeParameter('customResource');
                    if (!resource)
                        return [];
                }
                const credentials = await this.getCredentials('odooApi');
                const url = credentials.url;
                const username = credentials.username;
                const password = credentials.password;
                const db = odooGetDBName(credentials.db, url);
                const userID = await odooGetUserID.call(this, db, username, password, url);
                const response = await odooGetModelFields.call(this, db, userID, password, resource, url);
                const options = Object.entries(response).map(([key, field]) => {
                    const optionField = field;
                    try {
                        optionField.name = capitalCase(optionField.name);
                    }
                    catch (error) {
                        optionField.name = optionField.string;
                    }
                    return {
                        name: optionField.name,
                        value: key,
                        // nodelinter-ignore-next-line
                        description: `name: ${key}, type: ${optionField?.type} required: ${optionField?.required}`,
                    };
                });
                return options.sort((a, b) => a.name?.localeCompare(b.name) || 0);
            },
            async getModels() {
                const credentials = await this.getCredentials('odooApi');
                const url = credentials.url;
                const username = credentials.username;
                const password = credentials.password;
                const db = odooGetDBName(credentials.db, url);
                const userID = await odooGetUserID.call(this, db, username, password, url);
                const body = {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        service: 'object',
                        method: 'execute',
                        args: [db, userID, password, 'ir.model', 'search_read', [], ['name', 'model']],
                    },
                    id: randomInt(100),
                };
                const response = (await odooJSONRPCRequest.call(this, body, url));
                const options = response.map((model) => {
                    return {
                        name: model.name,
                        value: model.model,
                        description: `model: ${model.model}`,
                    };
                });
                return options;
            },
            async getStates() {
                const credentials = await this.getCredentials('odooApi');
                const url = credentials.url;
                const username = credentials.username;
                const password = credentials.password;
                const db = odooGetDBName(credentials.db, url);
                const userID = await odooGetUserID.call(this, db, username, password, url);
                const body = {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        service: 'object',
                        method: 'execute',
                        args: [db, userID, password, 'res.country.state', 'search_read', [], ['id', 'name']],
                    },
                    id: randomInt(100),
                };
                const response = (await odooJSONRPCRequest.call(this, body, url));
                const options = response.map((state) => {
                    return {
                        name: state.name,
                        value: state.id,
                    };
                });
                return options.sort((a, b) => a.name?.localeCompare(b.name) || 0);
            },
            async getCountries() {
                const credentials = await this.getCredentials('odooApi');
                const url = credentials.url;
                const username = credentials.username;
                const password = credentials.password;
                const db = odooGetDBName(credentials.db, url);
                const userID = await odooGetUserID.call(this, db, username, password, url);
                const body = {
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        service: 'object',
                        method: 'execute',
                        args: [db, userID, password, 'res.country', 'search_read', [], ['id', 'name']],
                    },
                    id: randomInt(100),
                };
                const response = (await odooJSONRPCRequest.call(this, body, url));
                const options = response.map((country) => {
                    return {
                        name: country.name,
                        value: country.id,
                    };
                });
                return options.sort((a, b) => a.name?.localeCompare(b.name) || 0);
            },
        },
        credentialTest: {
            async odooApiTest(credential) {
                const credentials = credential.data;
                try {
                    const body = {
                        jsonrpc: '2.0',
                        method: 'call',
                        params: {
                            service: 'common',
                            method: 'login',
                            args: [
                                odooGetDBName(credentials?.db, credentials?.url),
                                credentials?.username,
                                credentials?.password,
                            ],
                        },
                        id: randomInt(100),
                    };
                    const options = {
                        headers: {
                            Connection: 'keep-alive',
                            Accept: '*/*',
                            'Content-Type': 'application/json',
                        },
                        method: 'POST',
                        body,
                        uri: `${(credentials?.url).replace(/\/$/, '')}/jsonrpc`,
                        json: true,
                    };
                    const result = await this.helpers.request(options);
                    if (result.error || !result.result) {
                        return {
                            status: 'Error',
                            message: 'Credentials are not valid',
                        };
                    }
                    else if (result.error) {
                        return {
                            status: 'Error',
                            message: `Credentials are not valid: ${result.error.data.message}`,
                        };
                    }
                }
                catch (error) {
                    return {
                        status: 'Error',
                        message: `Settings are not valid: ${error}`,
                    };
                }
                return {
                    status: 'OK',
                    message: 'Authentication successful!',
                };
            },
        },
    };
    async execute() {
        let items = this.getInputData();
        items = deepCopy(items);
        const returnData = [];
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        const credentials = await this.getCredentials('odooApi');
        const url = credentials.url.replace(/\/$/, '');
        const username = credentials.username;
        const password = credentials.password;
        const db = odooGetDBName(credentials.db, url);
        const userID = await odooGetUserID.call(this, db, username, password, url);
        //----------------------------------------------------------------------
        //                            Main loop
        //----------------------------------------------------------------------
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'contact') {
                    if (operation === 'create') {
                        let additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.address) {
                            const addressFields = additionalFields.address.value;
                            if (addressFields) {
                                additionalFields = {
                                    ...additionalFields,
                                    ...addressFields,
                                };
                            }
                            delete additionalFields.address;
                        }
                        const name = this.getNodeParameter('contactName', i);
                        const fields = {
                            name,
                            ...additionalFields,
                        };
                        responseData = await odooCreate.call(this, db, userID, password, resource, operation, url, fields);
                    }
                    if (operation === 'delete') {
                        const contactId = this.getNodeParameter('contactId', i);
                        responseData = await odooDelete.call(this, db, userID, password, resource, operation, url, contactId);
                    }
                    if (operation === 'get') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        responseData = await odooGet.call(this, db, userID, password, resource, operation, url, contactId, fields);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        if (returnAll) {
                            responseData = await odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = await odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, limit);
                        }
                    }
                    if (operation === 'update') {
                        const contactId = this.getNodeParameter('contactId', i);
                        let updateFields = this.getNodeParameter('updateFields', i);
                        if (updateFields.address) {
                            const addressFields = updateFields.address.value;
                            if (addressFields) {
                                updateFields = {
                                    ...updateFields,
                                    ...addressFields,
                                };
                            }
                            delete updateFields.address;
                        }
                        responseData = await odooUpdate.call(this, db, userID, password, resource, operation, url, contactId, updateFields);
                    }
                }
                if (resource === 'custom') {
                    const customResource = this.getNodeParameter('customResource', i);
                    if (operation === 'create') {
                        const fields = this.getNodeParameter('fieldsToCreateOrUpdate', i);
                        responseData = await odooCreate.call(this, db, userID, password, customResource, operation, url, processNameValueFields(fields));
                    }
                    if (operation === 'delete') {
                        const customResourceId = this.getNodeParameter('customResourceId', i);
                        responseData = await odooDelete.call(this, db, userID, password, customResource, operation, url, customResourceId);
                    }
                    if (operation === 'get') {
                        const customResourceId = this.getNodeParameter('customResourceId', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        responseData = await odooGet.call(this, db, userID, password, customResource, operation, url, customResourceId, fields);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        const filter = this.getNodeParameter('filterRequest', i);
                        if (returnAll) {
                            responseData = await odooGetAll.call(this, db, userID, password, customResource, operation, url, filter, fields);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = await odooGetAll.call(this, db, userID, password, customResource, operation, url, filter, fields, limit);
                        }
                    }
                    if (operation === 'update') {
                        const customResourceId = this.getNodeParameter('customResourceId', i);
                        const fields = this.getNodeParameter('fieldsToCreateOrUpdate', i);
                        responseData = await odooUpdate.call(this, db, userID, password, customResource, operation, url, customResourceId, processNameValueFields(fields));
                    }
                }
                if (resource === 'note') {
                    if (operation === 'create') {
                        const memo = this.getNodeParameter('memo', i);
                        const fields = {
                            memo,
                        };
                        responseData = await odooCreate.call(this, db, userID, password, resource, operation, url, fields);
                    }
                    if (operation === 'delete') {
                        const noteId = this.getNodeParameter('noteId', i);
                        responseData = await odooDelete.call(this, db, userID, password, resource, operation, url, noteId);
                    }
                    if (operation === 'get') {
                        const noteId = this.getNodeParameter('noteId', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        responseData = await odooGet.call(this, db, userID, password, resource, operation, url, noteId, fields);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        if (returnAll) {
                            responseData = await odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = await odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, limit);
                        }
                    }
                    if (operation === 'update') {
                        const noteId = this.getNodeParameter('noteId', i);
                        const memo = this.getNodeParameter('memo', i);
                        const fields = {
                            memo,
                        };
                        responseData = await odooUpdate.call(this, db, userID, password, resource, operation, url, noteId, fields);
                    }
                }
                if (resource === 'opportunity') {
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const name = this.getNodeParameter('opportunityName', i);
                        const fields = {
                            name,
                            ...additionalFields,
                        };
                        responseData = await odooCreate.call(this, db, userID, password, resource, operation, url, fields);
                    }
                    if (operation === 'delete') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        responseData = await odooDelete.call(this, db, userID, password, resource, operation, url, opportunityId);
                    }
                    if (operation === 'get') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        responseData = await odooGet.call(this, db, userID, password, resource, operation, url, opportunityId, fields);
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const fields = options.fieldsList || [];
                        if (returnAll) {
                            responseData = await odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = await odooGetAll.call(this, db, userID, password, resource, operation, url, undefined, fields, limit);
                        }
                    }
                    if (operation === 'update') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        responseData = await odooUpdate.call(this, db, userID, password, resource, operation, url, opportunityId, updateFields);
                    }
                }
                if (responseData !== undefined) {
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                    returnData.push(...executionData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=OdooV1.node.js.map