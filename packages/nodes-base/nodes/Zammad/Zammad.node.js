import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { removeTrailingSlash } from '@utils/utilities';
import { groupDescription, organizationDescription, ticketDescription, userDescription, } from './descriptions';
import { doesNotBelongToZammad, fieldToLoadOption, getAllFields, getGroupCustomFields, getGroupFields, getOrganizationCustomFields, getOrganizationFields, getTicketCustomFields, getTicketFields, getUserCustomFields, getUserFields, isCustomer, isNotZammadFoundation, throwOnEmptyUpdate, zammadApiRequest, zammadApiRequestAllItems, } from './GenericFunctions';
export class Zammad {
    description = {
        displayName: 'Zammad',
        name: 'zammad',
        icon: 'file:zammad.svg',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume the Zammad API',
        defaults: {
            name: 'Zammad',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'zammadBasicAuthApi',
                required: true,
                testedBy: 'zammadBasicAuthApiTest',
                displayOptions: {
                    show: {
                        authentication: ['basicAuth'],
                    },
                },
            },
            {
                name: 'zammadTokenAuthApi',
                required: true,
                testedBy: 'zammadTokenAuthApiTest',
                displayOptions: {
                    show: {
                        authentication: ['tokenAuth'],
                    },
                },
            },
        ],
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Basic Auth',
                        value: 'basicAuth',
                    },
                    {
                        name: 'Token Auth',
                        value: 'tokenAuth',
                    },
                ],
                default: 'tokenAuth',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                noDataExpression: true,
                type: 'options',
                options: [
                    {
                        name: 'Group',
                        value: 'group',
                    },
                    {
                        name: 'Organization',
                        value: 'organization',
                    },
                    {
                        name: 'Ticket',
                        value: 'ticket',
                    },
                    {
                        name: 'User',
                        value: 'user',
                    },
                ],
                default: 'user',
            },
            ...groupDescription,
            ...organizationDescription,
            ...ticketDescription,
            ...userDescription,
        ],
    };
    methods = {
        loadOptions: {
            // ----------------------------------
            //          custom fields
            // ----------------------------------
            async loadGroupCustomFields() {
                const allFields = await getAllFields.call(this);
                return getGroupCustomFields(allFields).map(fieldToLoadOption);
            },
            async loadOrganizationCustomFields() {
                const allFields = await getAllFields.call(this);
                return getOrganizationCustomFields(allFields).map(fieldToLoadOption);
            },
            async loadUserCustomFields() {
                const allFields = await getAllFields.call(this);
                return getUserCustomFields(allFields).map(fieldToLoadOption);
            },
            async loadTicketCustomFields() {
                const allFields = await getAllFields.call(this);
                return getTicketCustomFields(allFields).map(fieldToLoadOption);
            },
            // ----------------------------------
            //          built-in fields
            // ----------------------------------
            async loadGroupFields() {
                const allFields = await getAllFields.call(this);
                return getGroupFields(allFields).map(fieldToLoadOption);
            },
            async loadOrganizationFields() {
                const allFields = await getAllFields.call(this);
                return getOrganizationFields(allFields).map(fieldToLoadOption);
            },
            async loadTicketFields() {
                const allFields = await getAllFields.call(this);
                return getTicketFields(allFields).map(fieldToLoadOption);
            },
            async loadUserFields() {
                const allFields = await getAllFields.call(this);
                return getUserFields(allFields).map(fieldToLoadOption);
            },
            // ----------------------------------
            //             resources
            // ----------------------------------
            // by non-ID attribute
            /**
             * POST /tickets requires group name instead of group ID.
             */
            async loadGroupNames() {
                const groups = (await zammadApiRequest.call(this, 'GET', '/groups'));
                return groups.map((i) => ({ name: i.name, value: i.name }));
            },
            /**
             * PUT /users requires organization name instead of organization ID.
             */
            async loadOrganizationNames() {
                const orgs = (await zammadApiRequest.call(this, 'GET', '/organizations'));
                return orgs.filter(isNotZammadFoundation).map((i) => ({ name: i.name, value: i.name }));
            },
            /**
             * POST /tickets requires customer email instead of customer ID.
             */
            async loadCustomerEmails() {
                const users = (await zammadApiRequest.call(this, 'GET', '/users'));
                return users.filter(isCustomer).map((i) => ({ name: i.email, value: i.email }));
            },
            // by ID
            /**
             * PUT /tickets requires customer ID instead of customer email.
             * Zammad API constraint: Any listings will return users own information only. -> https://docs.zammad.org/en/latest/api/user.html
             */
            async loadCustomerIds() {
                const users = (await zammadApiRequest.call(this, 'GET', '/users'));
                return users.filter(isCustomer).map((i) => ({ name: i.email, value: i.id }));
            },
            async loadGroups() {
                const groups = (await zammadApiRequest.call(this, 'GET', '/groups'));
                return groups.map((i) => ({ name: i.name, value: i.id }));
            },
            async loadOrganizations() {
                const orgs = (await zammadApiRequest.call(this, 'GET', '/organizations'));
                return orgs.filter(isNotZammadFoundation).map((i) => ({ name: i.name, value: i.id }));
            },
            async loadUsers() {
                const users = (await zammadApiRequest.call(this, 'GET', '/users'));
                return users.filter(doesNotBelongToZammad).map((i) => ({ name: i.login, value: i.id }));
            },
            async loadTicketStates() {
                const states = (await zammadApiRequest.call(this, 'GET', '/ticket_states'));
                return states.map((state) => ({ name: state.name, value: state.id }));
            },
            async loadTicketPriorities() {
                const priorities = (await zammadApiRequest.call(this, 'GET', '/ticket_priorities'));
                return priorities.map((priority) => ({ name: priority.name, value: priority.id }));
            },
        },
        credentialTest: {
            async zammadBasicAuthApiTest(credential) {
                const credentials = credential.data;
                const baseUrl = removeTrailingSlash(credentials.baseUrl);
                const options = {
                    method: 'GET',
                    uri: `${baseUrl}/api/v1/users/me`,
                    json: true,
                    rejectUnauthorized: !credentials.allowUnauthorizedCerts,
                    auth: {
                        user: credentials.username,
                        pass: credentials.password,
                    },
                };
                try {
                    await this.helpers.request(options);
                    return {
                        status: 'OK',
                        message: 'Authentication successful',
                    };
                }
                catch (error) {
                    return {
                        status: 'Error',
                        message: error.message,
                    };
                }
            },
            async zammadTokenAuthApiTest(credential) {
                const credentials = credential.data;
                const baseUrl = removeTrailingSlash(credentials.baseUrl);
                const options = {
                    method: 'GET',
                    uri: `${baseUrl}/api/v1/users/me`,
                    json: true,
                    rejectUnauthorized: !credentials.allowUnauthorizedCerts,
                    headers: {
                        Authorization: `Token token=${credentials.accessToken}`,
                    },
                };
                try {
                    await this.helpers.request(options);
                    return {
                        status: 'OK',
                        message: 'Authentication successful',
                    };
                }
                catch (error) {
                    return {
                        status: 'Error',
                        message: error.message,
                    };
                }
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let responseData;
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'user') {
                    // **********************************************************************
                    //                                  user
                    // **********************************************************************
                    if (operation === 'create') {
                        // ----------------------------------
                        //           user:create
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/user.html#create
                        const body = {
                            firstname: this.getNodeParameter('firstname', i),
                            lastname: this.getNodeParameter('lastname', i),
                        };
                        const { addressUi, customFieldsUi, ...rest } = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, addressUi?.addressDetails);
                        customFieldsUi?.customFieldPairs.forEach((pair) => {
                            body[pair.name] = pair.value;
                        });
                        Object.assign(body, rest);
                        responseData = await zammadApiRequest.call(this, 'POST', '/users', body);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //            user:update
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/user.html#update
                        const id = this.getNodeParameter('id', i);
                        const body = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (!Object.keys(updateFields).length) {
                            throwOnEmptyUpdate.call(this, resource);
                        }
                        const { addressUi, customFieldsUi, ...rest } = updateFields;
                        Object.assign(body, addressUi?.addressDetails);
                        customFieldsUi?.customFieldPairs.forEach((pair) => {
                            body[pair.name] = pair.value;
                        });
                        Object.assign(body, rest);
                        responseData = await zammadApiRequest.call(this, 'PUT', `/users/${id}`, body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //            user:delete
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/user.html#delete
                        const id = this.getNodeParameter('id', i);
                        await zammadApiRequest.call(this, 'DELETE', `/users/${id}`);
                        responseData = { success: true };
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //            user:get
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/user.html#show
                        const id = this.getNodeParameter('id', i);
                        responseData = await zammadApiRequest.call(this, 'GET', `/users/${id}`);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //           user:getAll
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/user.html#list
                        // https://docs.zammad.org/en/latest/api/user.html#search
                        const qs = {};
                        const { sortUi, ...rest } = this.getNodeParameter('filters', i);
                        Object.assign(qs, sortUi?.sortDetails);
                        Object.assign(qs, rest);
                        qs.query ||= ''; // otherwise triggers 500
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const limit = returnAll ? 0 : this.getNodeParameter('limit', i);
                        responseData = await zammadApiRequestAllItems
                            .call(this, 'GET', '/users/search', {}, qs, limit)
                            .then((response) => {
                            return response.map((user) => {
                                const { _preferences, ...data } = user;
                                return data;
                            });
                        });
                    }
                    else if (operation === 'getSelf') {
                        // ----------------------------------
                        //             user:me
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/user.html#me-current-user
                        responseData = await zammadApiRequest.call(this, 'GET', '/users/me');
                    }
                }
                else if (resource === 'organization') {
                    // **********************************************************************
                    //                             organization
                    // **********************************************************************
                    if (operation === 'create') {
                        // ----------------------------------
                        //        organization:create
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/organization.html#create
                        const body = {
                            name: this.getNodeParameter('name', i),
                        };
                        const { customFieldsUi, ...rest } = this.getNodeParameter('additionalFields', i);
                        customFieldsUi?.customFieldPairs.forEach((pair) => {
                            body[pair.name] = pair.value;
                        });
                        Object.assign(body, rest);
                        responseData = await zammadApiRequest.call(this, 'POST', '/organizations', body);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //       organization:update
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/organization.html#update
                        const id = this.getNodeParameter('id', i);
                        const body = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (!Object.keys(updateFields).length) {
                            throwOnEmptyUpdate.call(this, resource);
                        }
                        const { customFieldsUi, ...rest } = updateFields;
                        customFieldsUi?.customFieldPairs.forEach((pair) => {
                            body[pair.name] = pair.value;
                        });
                        Object.assign(body, rest);
                        responseData = await zammadApiRequest.call(this, 'PUT', `/organizations/${id}`, body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         organization:delete
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/organization.html#delete
                        const id = this.getNodeParameter('id', i);
                        await zammadApiRequest.call(this, 'DELETE', `/organizations/${id}`);
                        responseData = { success: true };
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         organization:get
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/organization.html#show
                        const id = this.getNodeParameter('id', i);
                        responseData = await zammadApiRequest.call(this, 'GET', `/organizations/${id}`);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         organization:getAll
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/organization.html#list
                        // https://docs.zammad.org/en/latest/api/organization.html#search - returning empty always
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const limit = returnAll ? 0 : this.getNodeParameter('limit', i);
                        responseData = await zammadApiRequestAllItems.call(this, 'GET', '/organizations', {}, {}, limit);
                    }
                }
                else if (resource === 'group') {
                    // **********************************************************************
                    //                                  group
                    // **********************************************************************
                    if (operation === 'create') {
                        // ----------------------------------
                        //           group:create
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/group.html#create
                        const body = {
                            name: this.getNodeParameter('name', i),
                        };
                        const { customFieldsUi, ...rest } = this.getNodeParameter('additionalFields', i);
                        customFieldsUi?.customFieldPairs.forEach((pair) => {
                            body[pair.name] = pair.value;
                        });
                        Object.assign(body, rest);
                        responseData = await zammadApiRequest.call(this, 'POST', '/groups', body);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //            group:update
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/group.html#update
                        const id = this.getNodeParameter('id', i);
                        const body = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (!Object.keys(updateFields).length) {
                            throwOnEmptyUpdate.call(this, resource);
                        }
                        const { customFieldsUi, ...rest } = updateFields;
                        customFieldsUi?.customFieldPairs.forEach((pair) => {
                            body[pair.name] = pair.value;
                        });
                        Object.assign(body, rest);
                        responseData = await zammadApiRequest.call(this, 'PUT', `/groups/${id}`, body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //            group:delete
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/group.html#delete
                        const id = this.getNodeParameter('id', i);
                        await zammadApiRequest.call(this, 'DELETE', `/groups/${id}`);
                        responseData = { success: true };
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //             group:get
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/group.html#show
                        const id = this.getNodeParameter('id', i);
                        responseData = await zammadApiRequest.call(this, 'GET', `/groups/${id}`);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //           group:getAll
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/group.html#list
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const limit = returnAll ? 0 : this.getNodeParameter('limit', i);
                        responseData = await zammadApiRequestAllItems.call(this, 'GET', '/groups', {}, {}, limit);
                    }
                }
                else if (resource === 'ticket') {
                    // **********************************************************************
                    //                                  ticket
                    // **********************************************************************
                    if (operation === 'create') {
                        // ----------------------------------
                        //           ticket:create
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/ticket/index.html#create
                        const body = {
                            article: {},
                            title: this.getNodeParameter('title', i),
                            group: this.getNodeParameter('group', i),
                            customer: this.getNodeParameter('customer', i),
                        };
                        const { customFieldsUi, ...additionalFields } = this.getNodeParameter('additionalFields', i);
                        if (customFieldsUi) {
                            const customFields = customFieldsUi;
                            for (const pair of customFields.customFieldPairs) {
                                const resolvedName = pair.name;
                                body[resolvedName] = pair.value;
                            }
                        }
                        Object.assign(body, additionalFields);
                        const article = this.getNodeParameter('article', i);
                        if (!Object.keys(article).length) {
                            throw new NodeOperationError(this.getNode(), 'Article is required', { itemIndex: i });
                        }
                        const { articleDetails: { visibility, ...rest }, } = article;
                        body.article = {
                            ...rest,
                            internal: visibility === 'internal',
                        };
                        responseData = await zammadApiRequest.call(this, 'POST', '/tickets', body);
                        const { id } = responseData;
                        responseData.articles = await zammadApiRequest.call(this, 'GET', `/ticket_articles/by_ticket/${id}`);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //          ticket:update
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/ticket/index.html#update
                        const id = this.getNodeParameter('id', i);
                        const body = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (!Object.keys(updateFields).length) {
                            throwOnEmptyUpdate.call(this, resource);
                        }
                        const { note, customFieldsUi, ...rest } = updateFields;
                        if (note) {
                            body.article = {
                                body: note,
                                internal: true,
                                type: 'note',
                                content_type: 'text/html',
                            };
                        }
                        if (customFieldsUi) {
                            const customFields = customFieldsUi;
                            for (const pair of customFields.customFieldPairs) {
                                const resolvedName = pair.name;
                                body[resolvedName] = pair.value;
                            }
                        }
                        Object.assign(body, rest);
                        if (body.pending_time === '') {
                            delete body.pending_time;
                        }
                        responseData = await zammadApiRequest.call(this, 'PUT', `/tickets/${id}`, body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //          ticket:delete
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/ticket/index.html#delete
                        const id = this.getNodeParameter('id', i);
                        await zammadApiRequest.call(this, 'DELETE', `/tickets/${id}`);
                        responseData = { success: true };
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //            ticket:get
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/ticket/index.html#show
                        const id = this.getNodeParameter('id', i);
                        responseData = await zammadApiRequest.call(this, 'GET', `/tickets/${id}`);
                        responseData.articles = await zammadApiRequest.call(this, 'GET', `/ticket_articles/by_ticket/${id}`);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //           ticket:getAll
                        // ----------------------------------
                        // https://docs.zammad.org/en/latest/api/ticket/index.html#list
                        // https://docs.zammad.org/en/latest/api/ticket/index.html#search - returning empty always
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const limit = returnAll ? 0 : this.getNodeParameter('limit', i);
                        responseData = await zammadApiRequestAllItems.call(this, 'GET', '/tickets', {}, {}, limit);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Zammad.node.js.map