import mergeWith from 'lodash/mergeWith';
import { BINARY_ENCODING, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { searchAtlassianSites } from '@utils/atlassian';
import { filterSortSearchListItems, getUsers, jiraSoftwareCloudApiRequest, jiraSoftwareCloudApiRequestAllItems, simplifyIssueOutput, validateJSON, } from './GenericFunctions';
import { issueAttachmentFields, issueAttachmentOperations } from './IssueAttachmentDescription';
import { issueCommentFields, issueCommentOperations } from './IssueCommentDescription';
import { issueFields, issueOperations } from './IssueDescription';
import { userFields, userOperations } from './UserDescription';
export class Jira {
    description = {
        displayName: 'Jira Software',
        name: 'jira',
        icon: 'file:jira.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Jira Software API',
        defaults: {
            name: 'Jira Software',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        usableAsTool: true,
        credentials: [
            {
                name: 'jiraSoftwareCloudApi',
                required: true,
                displayOptions: {
                    show: {
                        jiraVersion: ['cloud'],
                    },
                },
            },
            {
                name: 'jiraSoftwareServerApi',
                required: true,
                displayOptions: {
                    show: {
                        jiraVersion: ['server'],
                    },
                },
            },
            {
                name: 'jiraSoftwareServerPatApi',
                required: true,
                displayOptions: {
                    show: {
                        jiraVersion: ['serverPat'],
                    },
                },
            },
            {
                name: 'jiraSoftwareCloudOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        jiraVersion: ['cloudOAuth2'],
                    },
                },
            },
            {
                name: 'atlassianServiceAccountApi',
                required: true,
                displayOptions: {
                    show: {
                        jiraVersion: ['cloudServiceAccount'],
                    },
                },
            },
        ],
        properties: [
            {
                displayName: 'Jira Version',
                name: 'jiraVersion',
                type: 'options',
                options: [
                    {
                        name: 'Cloud',
                        value: 'cloud',
                    },
                    {
                        name: 'Cloud (OAuth2)',
                        value: 'cloudOAuth2',
                    },
                    {
                        name: 'Cloud (Service Account)',
                        value: 'cloudServiceAccount',
                    },
                    {
                        name: 'Server (Self Hosted)',
                        value: 'server',
                    },
                    {
                        name: 'Server Pat (Self Hosted)',
                        value: 'serverPat',
                    },
                ],
                default: 'cloud',
            },
            {
                displayName: 'Site',
                name: 'site',
                type: 'resourceLocator',
                default: { mode: 'list', value: '' },
                description: 'The Jira site to use. Can be left empty when the service account has access to exactly one site.',
                displayOptions: {
                    show: {
                        jiraVersion: ['cloudServiceAccount'],
                    },
                },
                modes: [
                    {
                        displayName: 'From List',
                        name: 'list',
                        type: 'list',
                        typeOptions: {
                            searchListMethod: 'getSites',
                            searchable: true,
                        },
                    },
                    {
                        displayName: 'By URL',
                        name: 'url',
                        type: 'string',
                        placeholder: 'e.g. https://your-site.atlassian.net',
                    },
                ],
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Issue',
                        value: 'issue',
                        description: 'Creates an issue or, where the option to create subtasks is enabled in Jira, a subtask',
                    },
                    {
                        name: 'Issue Attachment',
                        value: 'issueAttachment',
                        description: 'Add, remove, and get an attachment from an issue',
                    },
                    {
                        name: 'Issue Comment',
                        value: 'issueComment',
                        description: 'Get, create, update, and delete a comment from an issue',
                    },
                    {
                        name: 'User',
                        value: 'user',
                        description: 'Get, create and delete a user',
                    },
                ],
                default: 'issue',
            },
            ...issueOperations,
            ...issueFields,
            ...issueAttachmentOperations,
            ...issueAttachmentFields,
            ...issueCommentOperations,
            ...issueCommentFields,
            ...userOperations,
            ...userFields,
        ],
    };
    methods = {
        listSearch: {
            async getSites(filter) {
                return await searchAtlassianSites.call(this, 'atlassianServiceAccountApi', filter);
            },
            // Get all the projects to display them to user so that they can
            // select them easily
            async getProjects(filter) {
                const returnData = [];
                const jiraVersion = this.getCurrentNodeParameter('jiraVersion');
                let endpoint = '';
                let projects;
                if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
                    endpoint = '/api/2/project';
                    projects = await jiraSoftwareCloudApiRequest.call(this, endpoint, 'GET');
                }
                else {
                    endpoint = '/api/2/project/search';
                    projects = await jiraSoftwareCloudApiRequestAllItems.call(this, 'values', endpoint, 'GET');
                }
                if (projects.values && Array.isArray(projects.values)) {
                    projects = projects.values;
                }
                for (const project of projects) {
                    const projectName = project.name;
                    const projectId = project.id;
                    returnData.push({
                        name: projectName,
                        value: projectId,
                    });
                }
                return { results: filterSortSearchListItems(returnData, filter) };
            },
            // Get all the issue types to display them to user so that they can
            // select them easily
            async getIssueTypes() {
                const projectId = this.getCurrentNodeParameter('project', { extractValue: true });
                const returnData = [];
                const { issueTypes } = await jiraSoftwareCloudApiRequest.call(this, `/api/2/project/${projectId}`, 'GET');
                if (!issueTypes)
                    return { results: [] };
                for (const issueType of issueTypes) {
                    const issueTypeName = issueType.name;
                    const issueTypeId = issueType.id;
                    returnData.push({
                        name: issueTypeName,
                        value: issueTypeId,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return { results: returnData };
            },
            // Get all the users to display them to user so that they can
            // select them easily
            async getUsers(filter) {
                const users = await getUsers.call(this);
                return { results: filterSortSearchListItems(users, filter) };
            },
            // Get all the priorities to display them to user so that they can
            // select them easily
            async getPriorities() {
                const returnData = [];
                const priorities = await jiraSoftwareCloudApiRequest.call(this, '/api/2/priority', 'GET');
                for (const priority of priorities) {
                    const priorityName = priority.name;
                    const priorityId = priority.id;
                    returnData.push({
                        name: priorityName,
                        value: priorityId,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return { results: returnData };
            },
            // Get all the transitions (status) to display them to user so that they can
            // select them easily
            async getTransitions() {
                const returnData = [];
                const issueKey = this.getCurrentNodeParameter('issueKey');
                const transitions = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}/transitions`, 'GET');
                for (const transition of transitions.transitions) {
                    returnData.push({
                        name: transition.name,
                        value: transition.id,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return { results: returnData };
            },
            // Get all the custom fields to display them to user so that they can
            // select them easily
            async getCustomFields() {
                const returnData = [];
                const operation = this.getCurrentNodeParameter('operation');
                const jiraVersion = this.getNodeParameter('jiraVersion', 0);
                let projectId;
                let issueTypeId;
                let issueId = ''; // /editmeta endpoint requires issueId
                if (operation === 'create') {
                    projectId = this.getCurrentNodeParameter('project', { extractValue: true });
                    issueTypeId = this.getCurrentNodeParameter('issueType', { extractValue: true });
                }
                else {
                    const issueKey = this.getCurrentNodeParameter('issueKey');
                    const res = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}`, 'GET', {}, {});
                    projectId = res.fields.project.id;
                    issueTypeId = res.fields.issuetype.id;
                    issueId = res.id;
                }
                if (jiraVersion === 'server' && operation === 'update' && issueId) {
                    // https://developer.atlassian.com/server/jira/platform/jira-rest-api-example-edit-issues-6291632/?utm_source=chatgpt.com
                    const { fields } = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueId}/editmeta`, 'GET');
                    for (const field of Object.keys(fields || {})) {
                        if (field.startsWith('customfield_')) {
                            returnData.push({
                                name: fields[field].name,
                                value: field,
                            });
                        }
                    }
                    return { results: returnData };
                }
                const res = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/createmeta?projectIds=${projectId}&issueTypeIds=${issueTypeId}&expand=projects.issuetypes.fields`, 'GET');
                const fields = res.projects
                    .find((o) => o.id === projectId)
                    .issuetypes.find((o) => o.id === issueTypeId).fields;
                for (const key of Object.keys(fields)) {
                    const field = fields[key];
                    if (field.schema && Object.keys(field.schema).includes('customId')) {
                        returnData.push({
                            name: field.name,
                            value: field.key || field.fieldId,
                        });
                    }
                }
                return { results: returnData };
            },
        },
        loadOptions: {
            // Get all the labels to display them to user so that they can
            // select them easily
            async getLabels() {
                const returnData = [];
                const labels = await jiraSoftwareCloudApiRequest.call(this, '/api/2/label', 'GET');
                for (const label of labels.values) {
                    const labelName = label;
                    const labelId = label;
                    returnData.push({
                        name: labelName,
                        value: labelId,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return returnData;
            },
            // Get all the users to display them to user so that they can
            // select them easily
            async getUsers() {
                return await getUsers.call(this);
            },
            // Get all the groups to display them to user so that they can
            // select them easily
            async getGroups() {
                const returnData = [];
                const groups = await jiraSoftwareCloudApiRequest.call(this, '/api/2/groups/picker', 'GET');
                for (const group of groups.groups) {
                    const groupName = group.name;
                    const groupId = group.name;
                    returnData.push({
                        name: groupName,
                        value: groupId,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return returnData;
            },
            // Get all the components to display them to user so that they can
            // select them easily
            async getProjectComponents() {
                const returnData = [];
                const project = this.getCurrentNodeParameter('project', { extractValue: true });
                const { values: components } = await jiraSoftwareCloudApiRequest.call(this, `/api/2/project/${project}/component`, 'GET');
                for (const component of components) {
                    returnData.push({
                        name: component.name,
                        value: component.id,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const qs = {};
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        const jiraVersion = this.getNodeParameter('jiraVersion', 0);
        if (resource === 'issue') {
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-post
            if (operation === 'create') {
                for (let i = 0; i < length; i++) {
                    try {
                        const summary = this.getNodeParameter('summary', i);
                        const projectId = this.getNodeParameter('project', i, '', {
                            extractValue: true,
                        });
                        const issueTypeId = this.getNodeParameter('issueType', i, '', {
                            extractValue: true,
                        });
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const assignee = this.getNodeParameter('additionalFields.assignee', i, '', {
                            extractValue: true,
                        });
                        if (assignee)
                            additionalFields.assignee = assignee;
                        const reporter = this.getNodeParameter('additionalFields.reporter', i, '', {
                            extractValue: true,
                        });
                        if (reporter)
                            additionalFields.reporter = reporter;
                        const priority = this.getNodeParameter('additionalFields.priority', i, '', {
                            extractValue: true,
                        });
                        if (priority)
                            additionalFields.priority = priority;
                        const body = {};
                        const fields = {
                            summary,
                            project: {
                                id: projectId,
                            },
                            issuetype: {
                                id: issueTypeId,
                            },
                        };
                        if (additionalFields.labels) {
                            fields.labels = additionalFields.labels;
                        }
                        if (additionalFields.serverLabels) {
                            fields.labels = additionalFields.serverLabels;
                        }
                        if (additionalFields.priority) {
                            fields.priority = {
                                id: additionalFields.priority,
                            };
                        }
                        if (additionalFields.assignee) {
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
                                fields.assignee = {
                                    name: additionalFields.assignee,
                                };
                            }
                            else {
                                fields.assignee = {
                                    id: additionalFields.assignee,
                                };
                            }
                        }
                        if (additionalFields.reporter) {
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
                                fields.reporter = {
                                    name: additionalFields.reporter,
                                };
                            }
                            else {
                                fields.reporter = {
                                    id: additionalFields.reporter,
                                };
                            }
                        }
                        if (additionalFields.description) {
                            fields.description = additionalFields.description;
                        }
                        if (additionalFields.updateHistory) {
                            qs.updateHistory = additionalFields.updateHistory;
                        }
                        if (additionalFields.componentIds) {
                            fields.components = additionalFields.componentIds.map((id) => ({ id }));
                        }
                        if (additionalFields.customFieldsUi) {
                            const customFields = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                // resolve resource locator fieldId value
                                customFields.forEach((cf) => {
                                    if (typeof cf.fieldId !== 'string') {
                                        cf.fieldId = cf.fieldId.value.trim();
                                    }
                                });
                                const data = customFields.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
                                Object.assign(fields, data);
                            }
                        }
                        const issueTypes = await jiraSoftwareCloudApiRequest.call(this, '/api/2/issuetype', 'GET', {}, qs);
                        const subtaskIssues = [];
                        for (const issueType of issueTypes) {
                            if (issueType.subtask) {
                                subtaskIssues.push(issueType.id);
                            }
                        }
                        if (!additionalFields.parentIssueKey && subtaskIssues.includes(issueTypeId)) {
                            throw new NodeOperationError(this.getNode(), 'You must define a Parent Issue Key when Issue type is sub-task', { itemIndex: i });
                        }
                        else if (additionalFields.parentIssueKey && subtaskIssues.includes(issueTypeId)) {
                            fields.parent = {
                                key: additionalFields.parentIssueKey.toUpperCase(),
                            };
                        }
                        body.fields = fields;
                        responseData = await jiraSoftwareCloudApiRequest.call(this, '/api/2/issue', 'POST', body);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-put
            if (operation === 'update') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const assignee = this.getNodeParameter('updateFields.assignee', i, '', {
                            extractValue: true,
                        });
                        if (assignee)
                            updateFields.assignee = assignee;
                        const reporter = this.getNodeParameter('updateFields.reporter', i, '', {
                            extractValue: true,
                        });
                        if (reporter)
                            updateFields.reporter = reporter;
                        const priority = this.getNodeParameter('updateFields.priority', i, '', {
                            extractValue: true,
                        });
                        if (priority)
                            updateFields.priority = priority;
                        const statusId = this.getNodeParameter('updateFields.statusId', i, '', {
                            extractValue: true,
                        });
                        if (statusId)
                            updateFields.statusId = statusId;
                        const body = {};
                        const fields = {};
                        if (updateFields.summary) {
                            fields.summary = updateFields.summary;
                        }
                        if (updateFields.issueType) {
                            fields.issuetype = {
                                id: updateFields.issueType,
                            };
                        }
                        if (updateFields.labels) {
                            fields.labels = updateFields.labels;
                        }
                        if (updateFields.serverLabels) {
                            fields.labels = updateFields.serverLabels;
                        }
                        if (updateFields.priority) {
                            fields.priority = {
                                id: updateFields.priority,
                            };
                        }
                        if (updateFields.assignee) {
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
                                fields.assignee = {
                                    name: updateFields.assignee,
                                };
                            }
                            else {
                                fields.assignee = {
                                    id: updateFields.assignee,
                                };
                            }
                        }
                        if (updateFields.reporter) {
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
                                fields.reporter = {
                                    name: updateFields.reporter,
                                };
                            }
                            else {
                                fields.reporter = {
                                    id: updateFields.reporter,
                                };
                            }
                        }
                        if (updateFields.description) {
                            fields.description = updateFields.description;
                        }
                        if (updateFields.customFieldsUi) {
                            const customFields = updateFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                // resolve resource locator fieldId value
                                customFields.forEach((cf) => {
                                    if (typeof cf.fieldId !== 'string') {
                                        cf.fieldId = cf.fieldId.value.trim();
                                    }
                                });
                                const data = customFields.reduce((obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }), {});
                                Object.assign(fields, data);
                            }
                        }
                        const issueTypes = await jiraSoftwareCloudApiRequest.call(this, '/api/2/issuetype', 'GET');
                        const subtaskIssues = [];
                        for (const issueType of issueTypes) {
                            if (issueType.subtask) {
                                subtaskIssues.push(issueType.id);
                            }
                        }
                        if (!updateFields.parentIssueKey && subtaskIssues.includes(updateFields.issueType)) {
                            throw new NodeOperationError(this.getNode(), 'You must define a Parent Issue Key when Issue type is sub-task', { itemIndex: i });
                        }
                        else if (updateFields.parentIssueKey &&
                            subtaskIssues.includes(updateFields.issueType)) {
                            fields.parent = {
                                key: updateFields.parentIssueKey.toUpperCase(),
                            };
                        }
                        body.fields = fields;
                        if (updateFields.statusId) {
                            responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}/transitions`, 'POST', { transition: { id: updateFields.statusId } });
                        }
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}`, 'PUT', body);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-get
            if (operation === 'get') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const simplifyOutput = this.getNodeParameter('simplifyOutput', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.fields) {
                            qs.fields = additionalFields.fields;
                        }
                        if (additionalFields.fieldsByKey) {
                            qs.fieldsByKey = additionalFields.fieldsByKey;
                        }
                        if (additionalFields.expand) {
                            qs.expand = additionalFields.expand;
                        }
                        if (simplifyOutput) {
                            qs.expand = `${qs.expand || ''},names`;
                        }
                        if (additionalFields.properties) {
                            qs.properties = additionalFields.properties;
                        }
                        if (additionalFields.updateHistory) {
                            qs.updateHistory = additionalFields.updateHistory;
                        }
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}`, 'GET', {}, qs);
                        if (simplifyOutput) {
                            // Use rendered fields if requested and available
                            qs.expand = qs.expand || '';
                            if (qs.expand.toLowerCase().indexOf('renderedfields') !== -1 &&
                                responseData.renderedFields &&
                                Object.keys(responseData.renderedFields).length) {
                                responseData.fields = mergeWith(responseData.fields, responseData.renderedFields, (a, b) => (b === null ? a : b));
                            }
                            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(simplifyIssueOutput(responseData)), { itemData: { item: i } });
                            returnData.push(...executionData);
                        }
                        else {
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-search-post
            if (operation === 'getAll') {
                for (let i = 0; i < length; i++) {
                    try {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        const body = {};
                        if (!options.fields) {
                            // By default, the new endpoint returns only the ids, before it used to return `*navigable` fields
                            options.fields = '*navigable';
                        }
                        body.fields = options.fields.split(',');
                        if (!options.jql) {
                            // Jira API returns an error if the JQL query is unbounded (i.e. does not include any filters)
                            options.jql = 'created >= "1970-01-01"';
                        }
                        body.jql = options.jql;
                        if (options.expand) {
                            const expand = Array.isArray(options.expand)
                                ? options.expand.join(',')
                                : String(options.expand);
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
                                // The legacy search endpoint expects expand as an array
                                body.expand = expand.split(',');
                            }
                            else {
                                // The Jira Cloud enhanced search endpoint expects expand as a comma-separated string
                                body.expand = expand;
                            }
                        }
                        if (returnAll) {
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
                                responseData = await jiraSoftwareCloudApiRequestAllItems.call(this, 'issues', '/api/2/search', 'POST', body);
                            }
                            else {
                                responseData = await jiraSoftwareCloudApiRequestAllItems.call(this, 'issues', '/api/2/search/jql', 'POST', body, {}, 'token');
                            }
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            body.maxResults = limit;
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
                                responseData = await jiraSoftwareCloudApiRequest.call(this, '/api/2/search', 'POST', body);
                            }
                            else {
                                responseData = await jiraSoftwareCloudApiRequest.call(this, '/api/2/search/jql', 'POST', body);
                            }
                            responseData = responseData.issues;
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-changelog-get
            if (operation === 'changelog') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        if (returnAll) {
                            responseData = await jiraSoftwareCloudApiRequestAllItems.call(this, 'values', `/api/2/issue/${issueKey}/changelog`, 'GET');
                        }
                        else {
                            qs.maxResults = this.getNodeParameter('limit', i);
                            responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}/changelog`, 'GET', {}, qs);
                            responseData = responseData.values;
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-notify-post
            if (operation === 'notify') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const jsonActive = this.getNodeParameter('jsonParameters', 0);
                        const body = {};
                        if (additionalFields.textBody) {
                            body.textBody = additionalFields.textBody;
                        }
                        if (additionalFields.htmlBody) {
                            body.htmlBody = additionalFields.htmlBody;
                        }
                        if (!jsonActive) {
                            const notificationRecipientsValues = this.getNodeParameter('notificationRecipientsUi', i).notificationRecipientsValues;
                            const notificationRecipients = {};
                            if (notificationRecipientsValues) {
                                if (notificationRecipientsValues.reporter) {
                                    notificationRecipients.reporter =
                                        notificationRecipientsValues.reporter;
                                }
                                if (notificationRecipientsValues.assignee) {
                                    notificationRecipients.assignee =
                                        notificationRecipientsValues.assignee;
                                }
                                if (notificationRecipientsValues.assignee) {
                                    notificationRecipients.watchers =
                                        notificationRecipientsValues.watchers;
                                }
                                if (notificationRecipientsValues.voters) {
                                    notificationRecipients.watchers = notificationRecipientsValues.voters;
                                }
                                if ((notificationRecipientsValues.users || []).length > 0) {
                                    notificationRecipients.users = notificationRecipientsValues.users.map((user) => {
                                        return {
                                            accountId: user,
                                        };
                                    });
                                }
                                if ((notificationRecipientsValues.groups || []).length > 0) {
                                    notificationRecipients.groups = notificationRecipientsValues.groups.map((group) => {
                                        return {
                                            name: group,
                                        };
                                    });
                                }
                            }
                            body.to = notificationRecipients;
                            const notificationRecipientsRestrictionsValues = this.getNodeParameter('notificationRecipientsRestrictionsUi', i).notificationRecipientsRestrictionsValues;
                            const notificationRecipientsRestrictions = {};
                            if (notificationRecipientsRestrictionsValues) {
                                if ((notificationRecipientsRestrictionsValues.groups || [])
                                    .length > 0) {
                                    notificationRecipientsRestrictions.groups = notificationRecipientsRestrictionsValues.groups.map((group) => {
                                        return {
                                            name: group,
                                        };
                                    });
                                }
                            }
                            body.restrict = notificationRecipientsRestrictions;
                        }
                        else {
                            const notificationRecipientsJson = validateJSON(this.getNodeParameter('notificationRecipientsJson', i));
                            if (notificationRecipientsJson) {
                                body.to = notificationRecipientsJson;
                            }
                            const notificationRecipientsRestrictionsJson = validateJSON(this.getNodeParameter('notificationRecipientsRestrictionsJson', i));
                            if (notificationRecipientsRestrictionsJson) {
                                body.restrict = notificationRecipientsRestrictionsJson;
                            }
                        }
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}/notify`, 'POST', body, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-transitions-get
            if (operation === 'transitions') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.transitionId) {
                            qs.transitionId = additionalFields.transitionId;
                        }
                        if (additionalFields.expand) {
                            qs.expand = additionalFields.expand;
                        }
                        if (additionalFields.skipRemoteOnlyCondition) {
                            qs.skipRemoteOnlyCondition = additionalFields.skipRemoteOnlyCondition;
                        }
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}/transitions`, 'GET', {}, qs);
                        responseData = responseData.transitions;
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-delete
            if (operation === 'delete') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const deleteSubtasks = this.getNodeParameter('deleteSubtasks', i);
                        qs.deleteSubtasks = deleteSubtasks;
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}`, 'DELETE', {}, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
        }
        if (resource === 'issueAttachment') {
            const apiVersion = jiraVersion === 'server' || jiraVersion === 'serverPat' ? '2' : '3';
            //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-issue-issueidorkey-attachments-post
            if (operation === 'add') {
                for (let i = 0; i < length; i++) {
                    try {
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        let uploadData;
                        if (binaryData.id) {
                            uploadData = await this.helpers.getBinaryStream(binaryData.id);
                        }
                        else {
                            uploadData = Buffer.from(binaryData.data, BINARY_ENCODING);
                        }
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/issue/${issueKey}/attachments`, 'POST', {}, {}, undefined, {
                            formData: {
                                file: {
                                    value: uploadData,
                                    options: {
                                        filename: binaryData.fileName,
                                    },
                                },
                            },
                        });
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-id-delete
            if (operation === 'remove') {
                for (let i = 0; i < length; i++) {
                    try {
                        const attachmentId = this.getNodeParameter('attachmentId', i);
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/attachment/${attachmentId}`, 'DELETE', {}, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-id-get
            if (operation === 'get') {
                const download = this.getNodeParameter('download', 0);
                for (let i = 0; i < length; i++) {
                    try {
                        const attachmentId = this.getNodeParameter('attachmentId', i);
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/attachment/${attachmentId}`, 'GET', {}, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
                if (download) {
                    const binaryPropertyName = this.getNodeParameter('binaryProperty', 0);
                    for (const [index, attachment] of returnData.entries()) {
                        if (attachment.json.error)
                            continue;
                        try {
                            returnData[index].binary = {};
                            const buffer = await jiraSoftwareCloudApiRequest.call(this, '', 'GET', {}, {}, attachment?.json.content, {
                                json: false,
                                encoding: null,
                                useStream: true,
                                sendCredentialsOnCrossOriginRedirect: false,
                            });
                            returnData[index].binary[binaryPropertyName] = await this.helpers.prepareBinaryData(buffer, attachment.json.filename, attachment.json.mimeType);
                        }
                        catch (error) {
                            if (this.continueOnFail()) {
                                returnData[index].json = { error: error.message };
                                continue;
                            }
                            throw error;
                        }
                    }
                }
            }
            if (operation === 'getAll') {
                const download = this.getNodeParameter('download', 0);
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const { fields: { attachment }, } = await jiraSoftwareCloudApiRequest.call(this, `/api/2/issue/${issueKey}`, 'GET', {}, qs);
                        responseData = attachment;
                        if (!returnAll) {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = responseData.slice(0, limit);
                        }
                        responseData = responseData.map((data) => ({ json: data }));
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
                if (download) {
                    const binaryPropertyName = this.getNodeParameter('binaryProperty', 0);
                    for (const [index, attachment] of returnData.entries()) {
                        if (attachment.json.error)
                            continue;
                        try {
                            returnData[index].binary = {};
                            const buffer = await jiraSoftwareCloudApiRequest.call(this, '', 'GET', {}, {}, attachment.json.content, {
                                json: false,
                                encoding: null,
                                useStream: true,
                                sendCredentialsOnCrossOriginRedirect: false,
                            });
                            returnData[index].binary[binaryPropertyName] = await this.helpers.prepareBinaryData(buffer, attachment.json.filename, attachment.json.mimeType);
                        }
                        catch (error) {
                            if (this.continueOnFail()) {
                                returnData[index].json = { error: error.message };
                                continue;
                            }
                            throw error;
                        }
                    }
                }
            }
        }
        if (resource === 'issueComment') {
            let apiVersion = jiraVersion === 'server' || jiraVersion === 'serverPat' ? '2' : '3';
            //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-post
            if (operation === 'add') {
                for (let i = 0; i < length; i++) {
                    try {
                        const jsonParameters = this.getNodeParameter('jsonParameters', 0);
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.wikiMarkup) {
                            apiVersion = '2';
                        }
                        const body = {};
                        if (options.expand) {
                            qs.expand = options.expand;
                            delete options.expand;
                        }
                        Object.assign(body, options);
                        if (!jsonParameters) {
                            const comment = this.getNodeParameter('comment', i);
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat' || options.wikiMarkup) {
                                Object.assign(body, { body: comment });
                            }
                            else {
                                Object.assign(body, {
                                    body: {
                                        type: 'doc',
                                        version: 1,
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: comment,
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                });
                            }
                        }
                        else {
                            const commentJson = this.getNodeParameter('commentJson', i);
                            const json = validateJSON(commentJson);
                            if (json === '') {
                                throw new NodeOperationError(this.getNode(), 'Document Format must be a valid JSON', {
                                    itemIndex: i,
                                });
                            }
                            Object.assign(body, { body: json });
                        }
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/issue/${issueKey}/comment`, 'POST', body, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v2/#api-rest-api-2-issue-issueIdOrKey-get
            if (operation === 'get') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const commentId = this.getNodeParameter('commentId', i);
                        const options = this.getNodeParameter('options', i);
                        Object.assign(qs, options);
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/issue/${issueKey}/comment/${commentId}`, 'GET', {}, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-get
            if (operation === 'getAll') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        Object.assign(qs, options);
                        if (returnAll) {
                            responseData = await jiraSoftwareCloudApiRequestAllItems.call(this, 'comments', `/api/${apiVersion}/issue/${issueKey}/comment`, 'GET', {}, qs);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', i);
                            qs.maxResults = limit;
                            responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/issue/${issueKey}/comment`, 'GET', {}, qs);
                            responseData = responseData.comments;
                        }
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-delete
            if (operation === 'remove') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const commentId = this.getNodeParameter('commentId', i);
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/issue/${issueKey}/comment/${commentId}`, 'DELETE', {}, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-put
            if (operation === 'update') {
                for (let i = 0; i < length; i++) {
                    try {
                        const issueKey = this.getNodeParameter('issueKey', i);
                        const commentId = this.getNodeParameter('commentId', i);
                        const options = this.getNodeParameter('options', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', 0);
                        const body = {};
                        if (options.expand) {
                            qs.expand = options.expand;
                            delete options.expand;
                        }
                        if (options.wikiMarkup) {
                            apiVersion = '2';
                        }
                        Object.assign(qs, options);
                        if (!jsonParameters) {
                            const comment = this.getNodeParameter('comment', i);
                            if (jiraVersion === 'server' || jiraVersion === 'serverPat' || options.wikiMarkup) {
                                Object.assign(body, { body: comment });
                            }
                            else {
                                Object.assign(body, {
                                    body: {
                                        type: 'doc',
                                        version: 1,
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: comment,
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                });
                            }
                        }
                        else {
                            const commentJson = this.getNodeParameter('commentJson', i);
                            const json = validateJSON(commentJson);
                            if (json === '') {
                                throw new NodeOperationError(this.getNode(), 'Document Format must be a valid JSON', {
                                    itemIndex: i,
                                });
                            }
                            Object.assign(body, { body: json });
                        }
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/issue/${issueKey}/comment/${commentId}`, 'PUT', body, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
        }
        if (resource === 'user') {
            const apiVersion = jiraVersion === 'server' || jiraVersion === 'serverPat' ? '2' : '3';
            if (operation === 'create') {
                // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-post
                for (let i = 0; i < length; i++) {
                    try {
                        const body = {
                            name: this.getNodeParameter('username', i),
                            emailAddress: this.getNodeParameter('emailAddress', i),
                            displayName: this.getNodeParameter('displayName', i),
                        };
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/user`, 'POST', body, {});
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            else if (operation === 'delete') {
                // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-delete
                for (let i = 0; i < length; i++) {
                    try {
                        qs.accountId = this.getNodeParameter('accountId', i);
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/user`, 'DELETE', {}, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
            else if (operation === 'get') {
                // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-get
                for (let i = 0; i < length; i++) {
                    try {
                        qs.accountId = this.getNodeParameter('accountId', i);
                        const { expand } = this.getNodeParameter('additionalFields', i);
                        if (expand) {
                            qs.expand = expand.join(',');
                        }
                        responseData = await jiraSoftwareCloudApiRequest.call(this, `/api/${apiVersion}/user`, 'GET', {}, qs);
                        const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                        returnData.push(...executionData);
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
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Jira.node.js.map