import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { accountFields, accountOperations } from './AccountDescription';
import { attachmentFields, attachmentOperations } from './AttachmentDescription';
import { caseFields, caseOperations } from './CaseDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { customObjectFields, customObjectOperations } from './CustomObjectDescription';
import { documentFields, documentOperations } from './DocumentDescription';
import { flowFields, flowOperations } from './FlowDescription';
import { escapeSoqlString, getQuery, getResourceLocatorValue, salesforceApiRequest, salesforceApiRequestAllItems, sortOptions, } from './GenericFunctions';
import { leadFields, leadOperations } from './LeadDescription';
import { opportunityFields, opportunityOperations } from './OpportunityDescription';
import { searchFields, searchOperations } from './SearchDescription';
import { taskFields, taskOperations } from './TaskDescription';
import { userFields, userOperations } from './UserDescription';
// 200 is Salesforce's minimum query batchSize; smaller values are ignored.
const USER_SEARCH_PAGE_SIZE = 200;
async function searchOwners(queueSobjectType, filter, paginationToken) {
    const results = [];
    if (queueSobjectType && !paginationToken) {
        // Owner queues have no SOQL typeahead, so fetch them all once (as the legacy
        // owner loaders did) and filter/sort in-memory alongside the users.
        const queueRecords = (await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, {
            q: `SELECT Queue.Id, Queue.Name FROM QueuesObject WHERE Queue.Type = 'Queue' AND SobjectType = '${queueSobjectType}'`,
        }));
        const lowerFilter = (filter ?? '').toLowerCase();
        const queues = queueRecords
            .filter((record) => !lowerFilter || record.Queue.Name.toLowerCase().includes(lowerFilter))
            .map((record) => ({ name: `Queue: ${record.Queue.Name}`, value: record.Queue.Id }))
            .sort((a, b) => a.name.localeCompare(b.name));
        results.push(...queues);
    }
    let userResponse;
    if (paginationToken) {
        // `nextRecordsUrl` is a full Salesforce path like
        // `/services/data/v59.0/query/01g4o00000abcdef-2000`. salesforceApiRequest
        // re-prefixes the API base itself, so we pass only the `/query/<locator>` suffix.
        const locator = paginationToken.split('/').pop();
        userResponse = (await salesforceApiRequest.call(this, 'GET', `/query/${locator}`));
    }
    else {
        const escapedFilter = filter ? escapeSoqlString(filter) : '';
        const whereClause = escapedFilter ? `WHERE Name LIKE '%${escapedFilter}%' ` : '';
        // No LIMIT: it would cap the result below the batch size and suppress the
        // nextRecordsUrl cursor. batchSize bounds the page instead.
        userResponse = (await salesforceApiRequest.call(this, 'GET', '/query', {}, { q: `SELECT Id, Name FROM User ${whereClause}ORDER BY Name` }, undefined, { headers: { 'Sforce-Query-Options': `batchSize=${USER_SEARCH_PAGE_SIZE}` } }));
    }
    // Prefix users with "User: " only when queues share this result (mirrors the legacy
    // labels); a list of just users — including any paginated page — stays unprefixed.
    const userPrefix = results.length > 0 ? 'User: ' : '';
    for (const user of userResponse.records ?? []) {
        results.push({ name: `${userPrefix}${user.Name}`, value: user.Id });
    }
    return { results, paginationToken: userResponse.nextRecordsUrl };
}
export class Salesforce {
    description = {
        displayName: 'Salesforce',
        name: 'salesforce',
        icon: 'file:salesforce.svg',
        group: ['output'],
        version: [1, 1.1],
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Salesforce API',
        defaults: {
            name: 'Salesforce',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'salesforceOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['oAuth2'],
                    },
                },
            },
            {
                name: 'salesforceJwtApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['jwt'],
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
                        name: 'OAuth2',
                        value: 'oAuth2',
                    },
                    {
                        name: 'OAuth2 JWT',
                        value: 'jwt',
                    },
                ],
                default: 'oAuth2',
                description: 'OAuth Authorization Flow',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Account',
                        value: 'account',
                        description: 'Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners)',
                    },
                    {
                        name: 'Attachment',
                        value: 'attachment',
                        description: 'Represents a file that a has uploaded and attached to a parent object',
                    },
                    {
                        name: 'Case',
                        value: 'case',
                        description: 'Represents a case, which is a customer issue or problem',
                    },
                    {
                        name: 'Contact',
                        value: 'contact',
                        description: 'Represents a contact, which is an individual associated with an account',
                    },
                    {
                        name: 'Custom Object',
                        value: 'customObject',
                        description: 'Represents a custom object',
                    },
                    {
                        name: 'Document',
                        value: 'document',
                        description: 'Represents a document',
                    },
                    {
                        name: 'Flow',
                        value: 'flow',
                        description: 'Represents an autolaunched flow',
                    },
                    {
                        name: 'Lead',
                        value: 'lead',
                        description: 'Represents a prospect or potential',
                    },
                    {
                        name: 'Opportunity',
                        value: 'opportunity',
                        description: 'Represents an opportunity, which is a sale or pending deal',
                    },
                    {
                        name: 'Search',
                        value: 'search',
                        description: 'Search records',
                    },
                    {
                        name: 'Task',
                        value: 'task',
                        description: 'Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities.',
                    },
                    {
                        name: 'User',
                        value: 'user',
                        description: 'Represents a person, which is one user in system',
                    },
                ],
                default: 'lead',
            },
            ...leadOperations,
            ...leadFields,
            ...contactOperations,
            ...contactFields,
            ...customObjectOperations,
            ...customObjectFields,
            ...documentOperations,
            ...documentFields,
            ...opportunityOperations,
            ...opportunityFields,
            ...accountOperations,
            ...accountFields,
            ...searchOperations,
            ...searchFields,
            ...caseOperations,
            ...caseFields,
            ...taskOperations,
            ...taskFields,
            ...attachmentOperations,
            ...attachmentFields,
            ...userOperations,
            ...userFields,
            ...flowOperations,
            ...flowFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the lead statuses to display them to user so that they can
            // select them easily
            async getLeadStatuses() {
                const returnData = [];
                const qs = {
                    q: 'SELECT id, MasterLabel FROM LeadStatus',
                };
                const statuses = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                for (const status of statuses) {
                    const statusName = status.MasterLabel;
                    returnData.push({
                        name: statusName,
                        value: statusName,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the lead sources to display them to user so that they can
            // select them easily
            async getLeadSources() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/lead/describe');
                for (const field of fields) {
                    if (field.name === 'LeadSource') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the lead custom fields to display them to user so that they can
            // select them easily
            async getCustomFields() {
                const returnData = [];
                const resource = this.getNodeParameter('resource', 0);
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', `/sobjects/${resource}/describe`);
                for (const field of fields) {
                    if (field.custom === true) {
                        const fieldName = field.label;
                        const fieldId = field.name;
                        returnData.push({
                            name: fieldName,
                            value: fieldId,
                        });
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the record types to display them to user so that they can
            // select them easily
            async getRecordTypes() {
                const returnData = [];
                let resource = this.getNodeParameter('resource', 0);
                if (resource === 'customObject') {
                    resource = this.getNodeParameter('customObject', 0);
                }
                resource = escapeSoqlString(resource);
                const qs = {
                    q: `SELECT Id, Name, SobjectType, IsActive FROM RecordType WHERE SobjectType = '${resource}'`,
                };
                const types = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                for (const type of types) {
                    if (type.IsActive === true) {
                        returnData.push({
                            name: type.Name,
                            value: type.Id,
                        });
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the external id fields to display them to user so that they can
            // select them easily
            async getExternalIdFields() {
                const returnData = [];
                let resource = this.getCurrentNodeParameter('resource');
                resource =
                    resource === 'customObject'
                        ? this.getCurrentNodeParameter('customObject')
                        : resource;
                const { fields } = await salesforceApiRequest.call(this, 'GET', `/sobjects/${resource}/describe`);
                for (const field of fields) {
                    if (field.externalId === true || field.idLookup === true) {
                        const fieldName = field.label;
                        const fieldId = field.name;
                        returnData.push({
                            name: fieldName,
                            value: fieldId,
                        });
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the campaigns to display them to user so that they can
            // select them easily
            async getCampaigns() {
                const returnData = [];
                const qs = {
                    q: 'SELECT id, Name FROM Campaign',
                };
                const campaigns = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                for (const campaign of campaigns) {
                    const campaignName = campaign.Name;
                    const campaignId = campaign.Id;
                    returnData.push({
                        name: campaignName,
                        value: campaignId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the stages to display them to user so that they can
            // select them easily
            async getStages() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/opportunity/describe');
                for (const field of fields) {
                    if (field.name === 'StageName') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the stages to display them to user so that they can
            // select them easily
            async getAccountTypes() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/account/describe');
                for (const field of fields) {
                    if (field.name === 'Type') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the account sources to display them to user so that they can
            // select them easily
            async getAccountSources() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/account/describe');
                for (const field of fields) {
                    if (field.name === 'AccountSource') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the case types to display them to user so that they can
            // select them easily
            async getCaseTypes() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
                for (const field of fields) {
                    if (field.name === 'Type') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the case statuses to display them to user so that they can
            // select them easily
            async getCaseStatuses() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
                for (const field of fields) {
                    if (field.name === 'Status') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the case reasons to display them to user so that they can
            // select them easily
            async getCaseReasons() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
                for (const field of fields) {
                    if (field.name === 'Reason') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the case origins to display them to user so that they can
            // select them easily
            async getCaseOrigins() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
                for (const field of fields) {
                    if (field.name === 'Origin') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the case priorities to display them to user so that they can
            // select them easily
            async getCasePriorities() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
                for (const field of fields) {
                    if (field.name === 'Priority') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the task statuses to display them to user so that they can
            // select them easily
            async getTaskStatuses() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
                for (const field of fields) {
                    if (field.name === 'Status') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the task types to display them to user so that they can
            // select them easily
            async getTaskTypes() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
                for (const field of fields) {
                    if (field.name === 'TaskSubtype') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the task subjects to display them to user so that they can
            // select them easily
            async getTaskSubjects() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
                for (const field of fields) {
                    if (field.name === 'Subject') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the task call types to display them to user so that they can
            // select them easily
            async getTaskCallTypes() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
                for (const field of fields) {
                    if (field.name === 'CallType') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the task call priorities to display them to user so that they can
            // select them easily
            async getTaskPriorities() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
                for (const field of fields) {
                    if (field.name === 'Priority') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the task recurrence types to display them to user so that they can
            // select them easily
            async getTaskRecurrenceTypes() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
                for (const field of fields) {
                    if (field.name === 'RecurrenceType') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the task recurrence instances to display them to user so that they can
            // select them easily
            async getTaskRecurrenceInstances() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
                for (const field of fields) {
                    if (field.name === 'RecurrenceInstance') {
                        for (const pickValue of field.picklistValues) {
                            const pickValueName = pickValue.label;
                            const pickValueId = pickValue.value;
                            returnData.push({
                                name: pickValueName,
                                value: pickValueId,
                            });
                        }
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the custom objects recurrence instances to display them to user so that they can
            // select them easily
            async getCustomObjects() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { sobjects: objects } = await salesforceApiRequest.call(this, 'GET', '/sobjects');
                for (const object of objects) {
                    if (object.custom === true) {
                        const objectName = object.label;
                        const objectId = object.name;
                        returnData.push({
                            name: objectName,
                            value: objectId,
                        });
                    }
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the custom objects fields recurrence instances to display them to user so that they can
            // select them easily
            async getCustomObjectFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const customObject = this.getCurrentNodeParameter('customObject');
                const { fields } = await salesforceApiRequest.call(this, 'GET', `/sobjects/${customObject}/describe`);
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the account fields recurrence instances to display them to user so that they can
            // select them easily
            async getAccountFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/account/describe');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the attachment fields recurrence instances to display them to user so that they can
            // select them easily
            async getAtachmentFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/attachment/describe');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the case fields recurrence instances to display them to user so that they can
            // select them easily
            async getCaseFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the lead fields recurrence instances to display them to user so that they can
            // select them easily
            async getLeadFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/lead/describe');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the opportunity fields recurrence instances to display them to user so that they can
            // select them easily
            async getOpportunityFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/opportunity/describe');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the opportunity fields recurrence instances to display them to user so that they can
            // select them easily
            async getTaskFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the users fields recurrence instances to display them to user so that they can
            // select them easily
            async getUserFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/user/describe');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // Get all the contact fields recurrence instances to display them to user so that they can
            // select them easily
            async getContactFields() {
                const returnData = [];
                // TODO: find a way to filter this object to get just the lead sources instead of the whole object
                const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/contact/describe');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.name;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
                    });
                }
                sortOptions(returnData);
                return returnData;
            },
            // // Get all folders to display them to user so that they can
            // // select them easily
            // async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
            // 	const returnData: INodePropertyOptions[] = [];
            // 	const fields = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/sobjects/folder/describe');
            // 	this.logger.debug(JSON.stringify(fields, undefined, 2))
            // 	const qs = {
            // 		//ContentFolderItem ContentWorkspace ContentFolder
            // 		q: `SELECT Id, Title FROM ContentVersion`,
            // 		//q: `SELECT Id FROM Folder where Type = 'Document'`,
            // 	};
            // 	const folders = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
            // 	for (const folder of folders) {
            // 		returnData.push({
            // 			name: folder.Name,
            // 			value: folder.Id,
            // 		});
            // 	}
            // 	return returnData;
            // },
        },
        listSearch: {
            async searchAccounts(filter, paginationToken) {
                // 200 is Salesforce's minimum query batchSize; smaller values are ignored.
                const PAGE_SIZE = 200;
                let response;
                if (paginationToken) {
                    // Follow Salesforce's queryMore cursor. salesforceApiRequest re-prefixes
                    // the API base, so pass only the `/query/<locator>` suffix.
                    const locator = paginationToken.split('/').pop();
                    response = (await salesforceApiRequest.call(this, 'GET', `/query/${locator}`));
                }
                else {
                    const escapedFilter = filter ? escapeSoqlString(filter) : '';
                    const whereClause = escapedFilter ? `WHERE Name LIKE '%${escapedFilter}%' ` : '';
                    // No LIMIT: it would cap the result below the batch size and suppress the
                    // nextRecordsUrl cursor. batchSize bounds the page instead.
                    const qs = {
                        q: `SELECT Id, Name FROM Account ${whereClause}ORDER BY Name`,
                    };
                    response = (await salesforceApiRequest.call(this, 'GET', '/query', {}, qs, undefined, {
                        headers: { 'Sforce-Query-Options': `batchSize=${PAGE_SIZE}` },
                    }));
                }
                const accounts = (response.records ?? []);
                const results = accounts.map((account) => ({
                    name: account.Name,
                    value: account.Id,
                }));
                return {
                    results,
                    paginationToken: response.nextRecordsUrl,
                };
            },
            // Server-side typeahead for the owner (User) selectors.
            async searchUsers(filter, paginationToken) {
                return await searchOwners.call(this, undefined, filter, paginationToken);
            },
            // Owner selector for Case fields — users plus case queues.
            async searchCaseOwners(filter, paginationToken) {
                return await searchOwners.call(this, 'Case', filter, paginationToken);
            },
            // Owner selector for Lead fields — users plus lead queues.
            async searchLeadOwners(filter, paginationToken) {
                return await searchOwners.call(this, 'Lead', filter, paginationToken);
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        let responseData;
        const qs = {};
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        const nodeVersion = this.getNode().typeVersion;
        this.logger.debug(`Running "Salesforce" node named "${this.getNode.name}" resource "${resource}" operation "${operation}"`);
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'lead') {
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Lead/post-lead
                    if (operation === 'create' || operation === 'upsert') {
                        const company = this.getNodeParameter('company', i);
                        const lastname = this.getNodeParameter('lastname', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            Company: company,
                            LastName: lastname,
                        };
                        if (additionalFields.hasOptedOutOfEmail !== undefined) {
                            body.HasOptedOutOfEmail = additionalFields.hasOptedOutOfEmail;
                        }
                        if (additionalFields.hasOptedOutOfFax !== undefined) {
                            body.HasOptedOutOfFax = additionalFields.hasOptedOutOfFax;
                        }
                        if (additionalFields.email !== undefined) {
                            body.Email = additionalFields.email;
                        }
                        if (additionalFields.city !== undefined) {
                            body.City = additionalFields.city;
                        }
                        if (additionalFields.phone !== undefined) {
                            body.Phone = additionalFields.phone;
                        }
                        if (additionalFields.state !== undefined) {
                            body.State = additionalFields.state;
                        }
                        if (additionalFields.title !== undefined) {
                            body.Title = additionalFields.title;
                        }
                        if (additionalFields.jigsaw !== undefined) {
                            body.Jigsaw = additionalFields.jigsaw;
                        }
                        if (additionalFields.rating !== undefined) {
                            body.Rating = additionalFields.rating;
                        }
                        if (additionalFields.status !== undefined) {
                            body.Status = additionalFields.status;
                        }
                        if (additionalFields.street !== undefined) {
                            body.Street = additionalFields.street;
                        }
                        if (additionalFields.country !== undefined) {
                            body.Country = additionalFields.country;
                        }
                        {
                            const owner = getResourceLocatorValue(additionalFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (additionalFields.website !== undefined) {
                            body.Website = additionalFields.website;
                        }
                        if (additionalFields.industry !== undefined) {
                            body.Industry = additionalFields.industry;
                        }
                        if (additionalFields.fax !== undefined) {
                            body.Fax = additionalFields.fax;
                        }
                        if (additionalFields.firstname !== undefined) {
                            body.FirstName = additionalFields.firstname;
                        }
                        if (additionalFields.leadSource !== undefined) {
                            body.LeadSource = additionalFields.leadSource;
                        }
                        if (additionalFields.postalCode !== undefined) {
                            body.PostalCode = additionalFields.postalCode;
                        }
                        if (additionalFields.salutation !== undefined) {
                            body.Salutation = additionalFields.salutation;
                        }
                        if (additionalFields.description !== undefined) {
                            body.Description = additionalFields.description;
                        }
                        if (additionalFields.annualRevenue !== undefined) {
                            body.AnnualRevenue = additionalFields.annualRevenue;
                        }
                        if (additionalFields.isUnreadByOwner !== undefined) {
                            body.IsUnreadByOwner = additionalFields.isUnreadByOwner;
                        }
                        if (additionalFields.numberOfEmployees !== undefined) {
                            body.NumberOfEmployees = additionalFields.numberOfEmployees;
                        }
                        if (additionalFields.mobilePhone !== undefined) {
                            body.MobilePhone = additionalFields.mobilePhone;
                        }
                        if (additionalFields.recordTypeId !== undefined) {
                            body.RecordTypeId = additionalFields.recordTypeId;
                        }
                        if (additionalFields.customFieldsUi) {
                            const customFields = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        let endpoint = '/sobjects/lead';
                        let method = 'POST';
                        if (operation === 'upsert') {
                            method = 'PATCH';
                            const externalId = this.getNodeParameter('externalId', 0);
                            const externalIdValue = this.getNodeParameter('externalIdValue', i);
                            endpoint = `/sobjects/lead/${externalId}/${externalIdValue}`;
                            if (body[externalId] !== undefined) {
                                delete body[externalId];
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, method, endpoint, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Lead/patch-lead-id
                    if (operation === 'update') {
                        const leadId = this.getNodeParameter('leadId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (!Object.keys(updateFields).length) {
                            throw new NodeOperationError(this.getNode(), 'You must add at least one update field', { itemIndex: i });
                        }
                        if (updateFields.hasOptedOutOfEmail !== undefined) {
                            body.HasOptedOutOfEmail = updateFields.hasOptedOutOfEmail;
                        }
                        if (updateFields.hasOptedOutOfFax !== undefined) {
                            body.hasOptedOutOfFax = updateFields.hasOptedOutOfFax;
                        }
                        if (updateFields.lastname !== undefined) {
                            body.LastName = updateFields.lastname;
                        }
                        if (updateFields.company !== undefined) {
                            body.Company = updateFields.company;
                        }
                        if (updateFields.email !== undefined) {
                            body.Email = updateFields.email;
                        }
                        if (updateFields.city !== undefined) {
                            body.City = updateFields.city;
                        }
                        if (updateFields.phone !== undefined) {
                            body.Phone = updateFields.phone;
                        }
                        if (updateFields.state !== undefined) {
                            body.State = updateFields.state;
                        }
                        if (updateFields.title !== undefined) {
                            body.Title = updateFields.title;
                        }
                        if (updateFields.jigsaw !== undefined) {
                            body.Jigsaw = updateFields.jigsaw;
                        }
                        if (updateFields.rating !== undefined) {
                            body.Rating = updateFields.rating;
                        }
                        if (updateFields.status !== undefined) {
                            body.Status = updateFields.status;
                        }
                        if (updateFields.street !== undefined) {
                            body.Street = updateFields.street;
                        }
                        if (updateFields.country !== undefined) {
                            body.Country = updateFields.country;
                        }
                        {
                            const owner = getResourceLocatorValue(updateFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (updateFields.website !== undefined) {
                            body.Website = updateFields.website;
                        }
                        if (updateFields.industry !== undefined) {
                            body.Industry = updateFields.industry;
                        }
                        if (updateFields.firstname !== undefined) {
                            body.FirstName = updateFields.firstname;
                        }
                        if (updateFields.fax !== undefined) {
                            body.Fax = updateFields.fax;
                        }
                        if (updateFields.leadSource !== undefined) {
                            body.LeadSource = updateFields.leadSource;
                        }
                        if (updateFields.postalCode !== undefined) {
                            body.PostalCode = updateFields.postalCode;
                        }
                        if (updateFields.salutation !== undefined) {
                            body.Salutation = updateFields.salutation;
                        }
                        if (updateFields.description !== undefined) {
                            body.Description = updateFields.description;
                        }
                        if (updateFields.annualRevenue !== undefined) {
                            body.AnnualRevenue = updateFields.annualRevenue;
                        }
                        if (updateFields.isUnreadByOwner !== undefined) {
                            body.IsUnreadByOwner = updateFields.isUnreadByOwner;
                        }
                        if (updateFields.numberOfEmployees !== undefined) {
                            body.NumberOfEmployees = updateFields.numberOfEmployees;
                        }
                        if (updateFields.mobilePhone !== undefined) {
                            body.MobilePhone = updateFields.mobilePhone;
                        }
                        if (updateFields.recordTypeId !== undefined) {
                            body.RecordTypeId = updateFields.recordTypeId;
                        }
                        if (updateFields.customFieldsUi) {
                            const customFields = updateFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/lead/${leadId}`, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Lead/get-lead-id
                    if (operation === 'get') {
                        const leadId = this.getNodeParameter('leadId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/lead/${leadId}`);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, 'Lead', returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, 'Lead', returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Lead/delete-lead-id
                    if (operation === 'delete') {
                        const leadId = this.getNodeParameter('leadId', i);
                        try {
                            responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/lead/${leadId}`);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Lead/get-lead
                    if (operation === 'getSummary') {
                        responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/lead');
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/CampaignMember
                    if (operation === 'addToCampaign') {
                        const leadId = this.getNodeParameter('leadId', i);
                        const campaignId = this.getNodeParameter('campaignId', i);
                        const options = this.getNodeParameter('options', i);
                        const body = {
                            LeadId: leadId,
                            CampaignId: campaignId,
                        };
                        if (options.status) {
                            body.Status = options.status;
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/CampaignMember', body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Note/post-note
                    if (operation === 'addNote') {
                        const leadId = this.getNodeParameter('leadId', i);
                        const title = this.getNodeParameter('title', i);
                        const options = this.getNodeParameter('options', i);
                        const body = {
                            Title: title,
                            ParentId: leadId,
                        };
                        if (options.body) {
                            body.Body = options.body;
                        }
                        {
                            const owner = getResourceLocatorValue(options.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (options.isPrivate) {
                            body.IsPrivate = options.isPrivate;
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/note', body);
                    }
                }
                if (resource === 'contact') {
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Contact/post-contact
                    if (operation === 'create' || operation === 'upsert') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const lastname = this.getNodeParameter('lastname', i);
                        const body = {
                            LastName: lastname,
                        };
                        if (additionalFields.fax !== undefined) {
                            body.Fax = additionalFields.fax;
                        }
                        if (additionalFields.email !== undefined) {
                            body.Email = additionalFields.email;
                        }
                        if (additionalFields.phone !== undefined) {
                            body.Phone = additionalFields.phone;
                        }
                        if (additionalFields.title !== undefined) {
                            body.Title = additionalFields.title;
                        }
                        if (additionalFields.jigsaw !== undefined) {
                            body.Jigsaw = additionalFields.jigsaw;
                        }
                        if (additionalFields.recordTypeId !== undefined) {
                            body.RecordTypeId = additionalFields.recordTypeId;
                        }
                        {
                            const owner = getResourceLocatorValue(additionalFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        {
                            // Account is a resourceLocator; extractValue resolves it to the id and
                            // passes through legacy raw-string values from pre-RLC workflows.
                            const accountId = this.getNodeParameter('additionalFields.acconuntId', i, '', {
                                extractValue: true,
                            });
                            if (accountId) {
                                body.AccountId = accountId;
                            }
                        }
                        if (additionalFields.birthdate !== undefined) {
                            body.Birthdate = additionalFields.birthdate;
                        }
                        if (additionalFields.firstName !== undefined) {
                            body.FirstName = additionalFields.firstName;
                        }
                        if (additionalFields.homePhone !== undefined) {
                            body.HomePhone = additionalFields.homePhone;
                        }
                        if (additionalFields.otherCity !== undefined) {
                            body.OtherCity = additionalFields.otherCity;
                        }
                        if (additionalFields.department !== undefined) {
                            body.Department = additionalFields.department;
                        }
                        if (additionalFields.leadSource !== undefined) {
                            body.LeadSource = additionalFields.leadSource;
                        }
                        if (additionalFields.otherPhone !== undefined) {
                            body.OtherPhone = additionalFields.otherPhone;
                        }
                        if (additionalFields.otherState !== undefined) {
                            body.OtherState = additionalFields.otherState;
                        }
                        if (additionalFields.salutation !== undefined) {
                            body.Salutation = additionalFields.salutation;
                        }
                        if (additionalFields.description !== undefined) {
                            body.Description = additionalFields.description;
                        }
                        if (additionalFields.mailingCity !== undefined) {
                            body.MailingCity = additionalFields.mailingCity;
                        }
                        if (additionalFields.mobilePhone !== undefined) {
                            body.MobilePhone = additionalFields.mobilePhone;
                        }
                        if (additionalFields.otherStreet !== undefined) {
                            body.OtherStreet = additionalFields.otherStreet;
                        }
                        if (additionalFields.mailingState !== undefined) {
                            body.MailingState = additionalFields.mailingState;
                        }
                        if (additionalFields.otherCountry !== undefined) {
                            body.OtherCountry = additionalFields.otherCountry;
                        }
                        if (additionalFields.assistantName !== undefined) {
                            body.AssistantName = additionalFields.assistantName;
                        }
                        if (additionalFields.mailingStreet !== undefined) {
                            body.MailingStreet = additionalFields.mailingStreet;
                        }
                        if (additionalFields.assistantPhone !== undefined) {
                            body.AssistantPhone = additionalFields.assistantPhone;
                        }
                        if (additionalFields.mailingCountry !== undefined) {
                            body.MailingCountry = additionalFields.mailingCountry;
                        }
                        if (additionalFields.otherPostalCode !== undefined) {
                            body.OtherPostalCode = additionalFields.otherPostalCode;
                        }
                        if (additionalFields.emailBouncedDate !== undefined) {
                            body.EmailBouncedDate = additionalFields.emailBouncedDate;
                        }
                        if (additionalFields.mailingPostalCode !== undefined) {
                            body.MailingPostalCode = additionalFields.mailingPostalCode;
                        }
                        if (additionalFields.emailBouncedReason !== undefined) {
                            body.EmailBouncedReason = additionalFields.emailBouncedReason;
                        }
                        if (additionalFields.middleName !== undefined) {
                            body.MiddleName = additionalFields.middleName;
                        }
                        if (additionalFields.suffix !== undefined) {
                            body.Suffix = additionalFields.suffix;
                        }
                        if (additionalFields.hasOptedOutOfEmail !== undefined) {
                            body.HasOptedOutOfEmail = additionalFields.hasOptedOutOfEmail;
                        }
                        if (additionalFields.pronouns !== undefined) {
                            body.Pronouns = additionalFields.pronouns;
                        }
                        if (additionalFields.genderIdentity !== undefined) {
                            body.GenderIdentity = additionalFields.genderIdentity;
                        }
                        if (additionalFields.customFieldsUi) {
                            const customFields = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        let endpoint = '/sobjects/contact';
                        let method = 'POST';
                        if (operation === 'upsert') {
                            method = 'PATCH';
                            const externalId = this.getNodeParameter('externalId', 0);
                            const externalIdValue = this.getNodeParameter('externalIdValue', i);
                            endpoint = `/sobjects/contact/${externalId}/${externalIdValue}`;
                            if (body[externalId] !== undefined) {
                                delete body[externalId];
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, method, endpoint, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Contact/patch-contact-id
                    if (operation === 'update') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (!Object.keys(updateFields).length) {
                            throw new NodeOperationError(this.getNode(), 'You must add at least one update field', { itemIndex: i });
                        }
                        if (updateFields.lastName !== undefined) {
                            body.LastName = updateFields.lastName;
                        }
                        if (updateFields.fax !== undefined) {
                            body.Fax = updateFields.fax;
                        }
                        if (updateFields.email !== undefined) {
                            body.Email = updateFields.email;
                        }
                        if (updateFields.recordTypeId !== undefined) {
                            body.RecordTypeId = updateFields.recordTypeId;
                        }
                        if (updateFields.phone !== undefined) {
                            body.Phone = updateFields.phone;
                        }
                        if (updateFields.title !== undefined) {
                            body.Title = updateFields.title;
                        }
                        if (updateFields.jigsaw !== undefined) {
                            body.Jigsaw = updateFields.jigsaw;
                        }
                        {
                            const owner = getResourceLocatorValue(updateFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        {
                            const accountId = this.getNodeParameter('updateFields.acconuntId', i, '', {
                                extractValue: true,
                            });
                            if (accountId) {
                                body.AccountId = accountId;
                            }
                        }
                        if (updateFields.birthdate !== undefined) {
                            body.Birthdate = updateFields.birthdate;
                        }
                        if (updateFields.firstName !== undefined) {
                            body.FirstName = updateFields.firstName;
                        }
                        if (updateFields.homePhone !== undefined) {
                            body.HomePhone = updateFields.homePhone;
                        }
                        if (updateFields.otherCity !== undefined) {
                            body.OtherCity = updateFields.otherCity;
                        }
                        if (updateFields.department !== undefined) {
                            body.Department = updateFields.department;
                        }
                        if (updateFields.leadSource !== undefined) {
                            body.LeadSource = updateFields.leadSource;
                        }
                        if (updateFields.otherPhone !== undefined) {
                            body.OtherPhone = updateFields.otherPhone;
                        }
                        if (updateFields.otherState !== undefined) {
                            body.OtherState = updateFields.otherState;
                        }
                        if (updateFields.salutation !== undefined) {
                            body.Salutation = updateFields.salutation;
                        }
                        if (updateFields.description !== undefined) {
                            body.Description = updateFields.description;
                        }
                        if (updateFields.mailingCity !== undefined) {
                            body.MailingCity = updateFields.mailingCity;
                        }
                        if (updateFields.mobilePhone !== undefined) {
                            body.MobilePhone = updateFields.mobilePhone;
                        }
                        if (updateFields.otherStreet !== undefined) {
                            body.OtherStreet = updateFields.otherStreet;
                        }
                        if (updateFields.mailingState !== undefined) {
                            body.MailingState = updateFields.mailingState;
                        }
                        if (updateFields.otherCountry !== undefined) {
                            body.OtherCountry = updateFields.otherCountry;
                        }
                        if (updateFields.assistantName !== undefined) {
                            body.AssistantName = updateFields.assistantName;
                        }
                        if (updateFields.mailingStreet !== undefined) {
                            body.MailingStreet = updateFields.mailingStreet;
                        }
                        if (updateFields.assistantPhone !== undefined) {
                            body.AssistantPhone = updateFields.assistantPhone;
                        }
                        if (updateFields.mailingCountry !== undefined) {
                            body.MailingCountry = updateFields.mailingCountry;
                        }
                        if (updateFields.otherPostalCode !== undefined) {
                            body.OtherPostalCode = updateFields.otherPostalCode;
                        }
                        if (updateFields.emailBouncedDate !== undefined) {
                            body.EmailBouncedDate = updateFields.emailBouncedDate;
                        }
                        if (updateFields.mailingPostalCode !== undefined) {
                            body.MailingPostalCode = updateFields.mailingPostalCode;
                        }
                        if (updateFields.emailBouncedReason !== undefined) {
                            body.EmailBouncedReason = updateFields.emailBouncedReason;
                        }
                        if (updateFields.middleName !== undefined) {
                            body.MiddleName = updateFields.middleName;
                        }
                        if (updateFields.suffix !== undefined) {
                            body.Suffix = updateFields.suffix;
                        }
                        if (updateFields.hasOptedOutOfEmail !== undefined) {
                            body.HasOptedOutOfEmail = updateFields.hasOptedOutOfEmail;
                        }
                        if (updateFields.pronouns !== undefined) {
                            body.Pronouns = updateFields.pronouns;
                        }
                        if (updateFields.genderIdentity !== undefined) {
                            body.GenderIdentity = updateFields.genderIdentity;
                        }
                        if (updateFields.customFieldsUi) {
                            const customFields = updateFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/contact/${contactId}`, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Contact/get-contact-id
                    if (operation === 'get') {
                        const contactId = this.getNodeParameter('contactId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/contact/${contactId}`);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, 'Contact', returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, 'Contact', returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Contact/delete-contact-id
                    if (operation === 'delete') {
                        const contactId = this.getNodeParameter('contactId', i);
                        try {
                            responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/contact/${contactId}`);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Contact/get-contact
                    if (operation === 'getSummary') {
                        responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/contact');
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/CampaignMember
                    if (operation === 'addToCampaign') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const campaignId = this.getNodeParameter('campaignId', i);
                        const options = this.getNodeParameter('options', i);
                        const body = {
                            ContactId: contactId,
                            CampaignId: campaignId,
                        };
                        if (options.status) {
                            body.Status = options.status;
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/CampaignMember', body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Note/post-note
                    if (operation === 'addNote') {
                        const contactId = this.getNodeParameter('contactId', i);
                        const title = this.getNodeParameter('title', i);
                        const options = this.getNodeParameter('options', i);
                        const body = {
                            Title: title,
                            ParentId: contactId,
                        };
                        if (options.body !== undefined) {
                            body.Body = options.body;
                        }
                        {
                            const owner = getResourceLocatorValue(options.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (options.isPrivate !== undefined) {
                            body.IsPrivate = options.isPrivate;
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/note', body);
                    }
                }
                if (resource === 'customObject') {
                    if (operation === 'create' || operation === 'upsert') {
                        const customObject = this.getNodeParameter('customObject', i);
                        const customFieldsUi = this.getNodeParameter('customFieldsUi', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        if (customFieldsUi) {
                            const customFields = customFieldsUi.customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        if (additionalFields.recordTypeId) {
                            body.RecordTypeId = additionalFields.recordTypeId;
                        }
                        let endpoint = `/sobjects/${customObject}`;
                        let method = 'POST';
                        if (operation === 'upsert') {
                            method = 'PATCH';
                            const externalId = this.getNodeParameter('externalId', 0);
                            const externalIdValue = this.getNodeParameter('externalIdValue', i);
                            endpoint = `/sobjects/${customObject}/${externalId}/${externalIdValue}`;
                            if (body[externalId] !== undefined) {
                                delete body[externalId];
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, method, endpoint, body);
                    }
                    if (operation === 'update') {
                        const recordId = this.getNodeParameter('recordId', i);
                        const customObject = this.getNodeParameter('customObject', i);
                        const customFieldsUi = this.getNodeParameter('customFieldsUi', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.recordTypeId) {
                            body.RecordTypeId = updateFields.recordTypeId;
                        }
                        if (customFieldsUi) {
                            const customFields = customFieldsUi.customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/${customObject}/${recordId}`, body);
                    }
                    if (operation === 'get') {
                        const customObject = this.getNodeParameter('customObject', i);
                        const recordId = this.getNodeParameter('recordId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/${customObject}/${recordId}`);
                    }
                    if (operation === 'getAll') {
                        const customObject = this.getNodeParameter('customObject', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, customObject, returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, customObject, returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    if (operation === 'delete') {
                        const customObject = this.getNodeParameter('customObject', i);
                        const recordId = this.getNodeParameter('recordId', i);
                        try {
                            responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/${customObject}/${recordId}`);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                }
                if (resource === 'document') {
                    //https://developer.salesforce.com/docs/atlas.en-us.206.0.api_rest.meta/api_rest/dome_sobject_insert_update_blob.htm
                    if (operation === 'upload') {
                        const title = this.getNodeParameter('title', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                        const body = {
                            entity_content: {
                                Title: title,
                                ContentLocation: 'S',
                            },
                        };
                        {
                            const ownerId = getResourceLocatorValue(additionalFields.ownerId);
                            if (ownerId !== undefined) {
                                body.entity_content.ownerId = ownerId;
                            }
                        }
                        if (additionalFields.linkToObjectId) {
                            body.entity_content.FirstPublishLocationId =
                                additionalFields.linkToObjectId;
                        }
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                        body.entity_content.PathOnClient = `${title}.${additionalFields.fileExtension || binaryData.fileExtension}`;
                        const data = {
                            entity_content: {
                                value: JSON.stringify(body.entity_content),
                                options: {
                                    contentType: 'application/json',
                                },
                            },
                            VersionData: {
                                value: dataBuffer,
                                options: {
                                    filename: body.entity_content.PathOnClient,
                                },
                            },
                        };
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/ContentVersion', {}, {}, undefined, { formData: data });
                    }
                }
                if (resource === 'opportunity') {
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/post-opportunity
                    if (operation === 'create' || operation === 'upsert') {
                        const name = this.getNodeParameter('name', i);
                        const closeDate = this.getNodeParameter('closeDate', i);
                        const stageName = this.getNodeParameter('stageName', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            Name: name,
                            CloseDate: closeDate,
                            StageName: stageName,
                        };
                        if (additionalFields.type !== undefined) {
                            body.Type = additionalFields.type;
                        }
                        if (additionalFields.amount !== undefined) {
                            body.Amount = additionalFields.amount;
                        }
                        {
                            const owner = getResourceLocatorValue(additionalFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (additionalFields.nextStep !== undefined) {
                            body.NextStep = additionalFields.nextStep;
                        }
                        {
                            const accountId = this.getNodeParameter('additionalFields.accountId', i, '', {
                                extractValue: true,
                            });
                            if (accountId) {
                                body.AccountId = accountId;
                            }
                        }
                        if (additionalFields.campaignId !== undefined) {
                            body.CampaignId = additionalFields.campaignId;
                        }
                        if (additionalFields.leadSource !== undefined) {
                            body.LeadSource = additionalFields.leadSource;
                        }
                        if (additionalFields.description !== undefined) {
                            body.Description = additionalFields.description;
                        }
                        if (additionalFields.probability !== undefined) {
                            body.Probability = additionalFields.probability;
                        }
                        if (additionalFields.pricebook2Id !== undefined) {
                            body.Pricebook2Id = additionalFields.pricebook2Id;
                        }
                        if (additionalFields.forecastCategoryName !== undefined) {
                            body.ForecastCategoryName = additionalFields.forecastCategoryName;
                        }
                        if (additionalFields.customFieldsUi) {
                            const customFields = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        let endpoint = '/sobjects/opportunity';
                        let method = 'POST';
                        if (operation === 'upsert') {
                            method = 'PATCH';
                            const externalId = this.getNodeParameter('externalId', 0);
                            const externalIdValue = this.getNodeParameter('externalIdValue', i);
                            endpoint = `/sobjects/opportunity/${externalId}/${externalIdValue}`;
                            if (body[externalId] !== undefined) {
                                delete body[externalId];
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, method, endpoint, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/post-opportunity
                    if (operation === 'update') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.name !== undefined) {
                            body.Name = updateFields.name;
                        }
                        if (updateFields.closeDate !== undefined) {
                            body.CloseDate = updateFields.closeDate;
                        }
                        if (updateFields.stageName !== undefined) {
                            body.StageName = updateFields.stageName;
                        }
                        if (updateFields.type !== undefined) {
                            body.Type = updateFields.type;
                        }
                        if (updateFields.amount !== undefined) {
                            body.Amount = updateFields.amount;
                        }
                        {
                            const owner = getResourceLocatorValue(updateFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (updateFields.nextStep !== undefined) {
                            body.NextStep = updateFields.nextStep;
                        }
                        {
                            const accountId = this.getNodeParameter('updateFields.accountId', i, '', {
                                extractValue: true,
                            });
                            if (accountId) {
                                body.AccountId = accountId;
                            }
                        }
                        if (updateFields.campaignId !== undefined) {
                            body.CampaignId = updateFields.campaignId;
                        }
                        if (updateFields.leadSource !== undefined) {
                            body.LeadSource = updateFields.leadSource;
                        }
                        if (updateFields.description !== undefined) {
                            body.Description = updateFields.description;
                        }
                        if (updateFields.probability !== undefined) {
                            body.Probability = updateFields.probability;
                        }
                        if (updateFields.pricebook2Id !== undefined) {
                            body.Pricebook2Id = updateFields.pricebook2Id;
                        }
                        if (updateFields.forecastCategoryName !== undefined) {
                            body.ForecastCategoryName = updateFields.forecastCategoryName;
                        }
                        if (updateFields.customFieldsUi) {
                            const customFields = updateFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/opportunity/${opportunityId}`, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/get-opportunity-id
                    if (operation === 'get') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/opportunity/${opportunityId}`);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, 'Opportunity', returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, 'Opportunity', returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/delete-opportunity-id
                    if (operation === 'delete') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        try {
                            responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/opportunity/${opportunityId}`);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/get-opportunity
                    if (operation === 'getSummary') {
                        responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/opportunity');
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Note/post-note
                    if (operation === 'addNote') {
                        const opportunityId = this.getNodeParameter('opportunityId', i);
                        const title = this.getNodeParameter('title', i);
                        const options = this.getNodeParameter('options', i);
                        const body = {
                            Title: title,
                            ParentId: opportunityId,
                        };
                        if (options.body !== undefined) {
                            body.Body = options.body;
                        }
                        {
                            const owner = getResourceLocatorValue(options.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (options.isPrivate !== undefined) {
                            body.IsPrivate = options.isPrivate;
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/note', body);
                    }
                }
                if (resource === 'account') {
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Account/post-account
                    if (operation === 'create' || operation === 'upsert') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const name = this.getNodeParameter('name', i);
                        const body = {
                            Name: name,
                        };
                        if (additionalFields.fax !== undefined) {
                            body.Fax = additionalFields.fax;
                        }
                        if (additionalFields.type !== undefined) {
                            body.Type = additionalFields.type;
                        }
                        if (additionalFields.jigsaw !== undefined) {
                            body.Jigsaw = additionalFields.jigsaw;
                        }
                        if (additionalFields.phone !== undefined) {
                            body.Phone = additionalFields.phone;
                        }
                        {
                            const owner = getResourceLocatorValue(additionalFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (additionalFields.sicDesc !== undefined) {
                            body.SicDesc = additionalFields.sicDesc;
                        }
                        if (additionalFields.website !== undefined) {
                            body.Website = additionalFields.website;
                        }
                        if (additionalFields.industry !== undefined) {
                            body.Industry = additionalFields.industry;
                        }
                        if (additionalFields.parentId !== undefined) {
                            body.ParentId = additionalFields.parentId;
                        }
                        if (additionalFields.billingCity !== undefined) {
                            body.BillingCity = additionalFields.billingCity;
                        }
                        if (additionalFields.description !== undefined) {
                            body.Description = additionalFields.description;
                        }
                        if (additionalFields.billingState !== undefined) {
                            body.BillingState = additionalFields.billingState;
                        }
                        if (additionalFields.shippingCity !== undefined) {
                            body.ShippingCity = additionalFields.shippingCity;
                        }
                        if (additionalFields.accountNumber !== undefined) {
                            body.AccountNumber = additionalFields.accountNumber;
                        }
                        if (additionalFields.accountSource !== undefined) {
                            body.AccountSource = additionalFields.accountSource;
                        }
                        if (additionalFields.annualRevenue !== undefined) {
                            body.AnnualRevenue = additionalFields.annualRevenue;
                        }
                        if (additionalFields.billingStreet !== undefined) {
                            body.BillingStreet = additionalFields.billingStreet;
                        }
                        if (additionalFields.shippingState !== undefined) {
                            body.ShippingState = additionalFields.shippingState;
                        }
                        if (additionalFields.billingCountry !== undefined) {
                            body.BillingCountry = additionalFields.billingCountry;
                        }
                        if (additionalFields.shippingStreet !== undefined) {
                            body.ShippingStreet = additionalFields.shippingStreet;
                        }
                        if (additionalFields.shippingCountry !== undefined) {
                            body.ShippingCountry = additionalFields.shippingCountry;
                        }
                        if (additionalFields.billingPostalCode !== undefined) {
                            body.BillingPostalCode = additionalFields.billingPostalCode;
                        }
                        if (additionalFields.numberOfEmployees !== undefined) {
                            body.NumberOfEmployees = additionalFields.numberOfEmployees;
                        }
                        if (additionalFields.shippingPostalCode !== undefined) {
                            body.ShippingPostalCode = additionalFields.shippingPostalCode;
                        }
                        if (additionalFields.shippingPostalCode !== undefined) {
                            body.ShippingPostalCode = additionalFields.shippingPostalCode;
                        }
                        if (additionalFields.recordTypeId !== undefined) {
                            body.RecordTypeId = additionalFields.recordTypeId;
                        }
                        if (additionalFields.customFieldsUi) {
                            const customFields = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        let endpoint = '/sobjects/account';
                        let method = 'POST';
                        if (operation === 'upsert') {
                            method = 'PATCH';
                            const externalId = this.getNodeParameter('externalId', 0);
                            const externalIdValue = this.getNodeParameter('externalIdValue', i);
                            endpoint = `/sobjects/account/${externalId}/${externalIdValue}`;
                            if (body[externalId] !== undefined) {
                                delete body[externalId];
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, method, endpoint, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Account/patch-account-id
                    if (operation === 'update') {
                        const accountId = this.getNodeParameter('accountId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.name !== undefined) {
                            body.Name = updateFields.name;
                        }
                        if (updateFields.fax !== undefined) {
                            body.Fax = updateFields.fax;
                        }
                        if (updateFields.type !== undefined) {
                            body.Type = updateFields.type;
                        }
                        if (updateFields.jigsaw !== undefined) {
                            body.Jigsaw = updateFields.jigsaw;
                        }
                        if (updateFields.phone !== undefined) {
                            body.Phone = updateFields.phone;
                        }
                        {
                            const ownerId = getResourceLocatorValue(updateFields.ownerId);
                            if (ownerId !== undefined) {
                                body.OwnerId = ownerId;
                            }
                        }
                        if (updateFields.sicDesc !== undefined) {
                            body.SicDesc = updateFields.sicDesc;
                        }
                        if (updateFields.recordTypeId !== undefined) {
                            body.RecordTypeId = updateFields.recordTypeId;
                        }
                        if (updateFields.website !== undefined) {
                            body.Website = updateFields.website;
                        }
                        if (updateFields.industry !== undefined) {
                            body.Industry = updateFields.industry;
                        }
                        if (updateFields.parentId !== undefined) {
                            body.ParentId = updateFields.parentId;
                        }
                        if (updateFields.billingCity !== undefined) {
                            body.BillingCity = updateFields.billingCity;
                        }
                        if (updateFields.description !== undefined) {
                            body.Description = updateFields.description;
                        }
                        if (updateFields.billingState !== undefined) {
                            body.BillingState = updateFields.billingState;
                        }
                        if (updateFields.shippingCity !== undefined) {
                            body.ShippingCity = updateFields.shippingCity;
                        }
                        if (updateFields.accountNumber !== undefined) {
                            body.AccountNumber = updateFields.accountNumber;
                        }
                        if (updateFields.accountSource !== undefined) {
                            body.AccountSource = updateFields.accountSource;
                        }
                        if (updateFields.annualRevenue !== undefined) {
                            body.AnnualRevenue = updateFields.annualRevenue;
                        }
                        if (updateFields.billingStreet !== undefined) {
                            body.BillingStreet = updateFields.billingStreet;
                        }
                        if (updateFields.shippingState !== undefined) {
                            body.ShippingState = updateFields.shippingState;
                        }
                        if (updateFields.billingCountry !== undefined) {
                            body.BillingCountry = updateFields.billingCountry;
                        }
                        if (updateFields.shippingStreet !== undefined) {
                            body.ShippingStreet = updateFields.shippingStreet;
                        }
                        if (updateFields.shippingCountry !== undefined) {
                            body.ShippingCountry = updateFields.shippingCountry;
                        }
                        if (updateFields.billingPostalCode !== undefined) {
                            body.BillingPostalCode = updateFields.billingPostalCode;
                        }
                        if (updateFields.numberOfEmployees !== undefined) {
                            body.NumberOfEmployees = updateFields.numberOfEmployees;
                        }
                        if (updateFields.shippingPostalCode !== undefined) {
                            body.ShippingPostalCode = updateFields.shippingPostalCode;
                        }
                        if (updateFields.shippingPostalCode !== undefined) {
                            body.ShippingPostalCode = updateFields.shippingPostalCode;
                        }
                        if (updateFields.customFieldsUi) {
                            const customFields = updateFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/account/${accountId}`, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Account/get-account-id
                    if (operation === 'get') {
                        const accountId = this.getNodeParameter('accountId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/account/${accountId}`);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, 'Account', returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, 'Account', returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Account/delete-account-id
                    if (operation === 'delete') {
                        const accountId = this.getNodeParameter('accountId', i);
                        try {
                            responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/account/${accountId}`);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Account/get-account
                    if (operation === 'getSummary') {
                        responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/account');
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Note/post-note
                    if (operation === 'addNote') {
                        const accountId = this.getNodeParameter('accountId', i);
                        const title = this.getNodeParameter('title', i);
                        const options = this.getNodeParameter('options', i);
                        const body = {
                            Title: title,
                            ParentId: accountId,
                        };
                        if (options.body !== undefined) {
                            body.Body = options.body;
                        }
                        {
                            const ownerId = getResourceLocatorValue(options.ownerId);
                            if (ownerId !== undefined) {
                                body.OwnerId = ownerId;
                            }
                        }
                        if (options.isPrivate !== undefined) {
                            body.IsPrivate = options.isPrivate;
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/note', body);
                    }
                }
                if (resource === 'case') {
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Case/post-case
                    if (operation === 'create') {
                        const type = this.getNodeParameter('type', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            Type: type,
                        };
                        if (additionalFields.origin !== undefined) {
                            body.Origin = additionalFields.origin;
                        }
                        if (additionalFields.reason !== undefined) {
                            body.Reason = additionalFields.reason;
                        }
                        if (additionalFields.status !== undefined) {
                            body.Status = additionalFields.status;
                        }
                        {
                            const owner = getResourceLocatorValue(additionalFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (additionalFields.subject !== undefined) {
                            body.Subject = additionalFields.subject;
                        }
                        if (additionalFields.ParentId !== undefined) {
                            body.ParentId = additionalFields.ParentId;
                        }
                        if (additionalFields.priority !== undefined) {
                            body.Priority = additionalFields.priority;
                        }
                        if (additionalFields.accountId !== undefined) {
                            body.AccountId = additionalFields.accountId;
                        }
                        if (additionalFields.contactId !== undefined) {
                            body.ContactId = additionalFields.contactId;
                        }
                        if (additionalFields.description !== undefined) {
                            body.Description = additionalFields.description;
                        }
                        if (additionalFields.isEscalated !== undefined) {
                            body.IsEscalated = additionalFields.isEscalated;
                        }
                        if (additionalFields.suppliedName !== undefined) {
                            body.SuppliedName = additionalFields.suppliedName;
                        }
                        if (additionalFields.suppliedEmail !== undefined) {
                            body.SuppliedEmail = additionalFields.suppliedEmail;
                        }
                        if (additionalFields.suppliedPhone !== undefined) {
                            body.SuppliedPhone = additionalFields.suppliedPhone;
                        }
                        if (additionalFields.suppliedCompany !== undefined) {
                            body.SuppliedCompany = additionalFields.suppliedCompany;
                        }
                        if (additionalFields.recordTypeId !== undefined) {
                            body.RecordTypeId = additionalFields.recordTypeId;
                        }
                        if (additionalFields.customFieldsUi) {
                            const customFields = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    //@ts-ignore
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/case', body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Case/patch-case-id
                    if (operation === 'update') {
                        const caseId = this.getNodeParameter('caseId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.type !== undefined) {
                            body.Type = updateFields.type;
                        }
                        if (updateFields.origin !== undefined) {
                            body.Origin = updateFields.origin;
                        }
                        if (updateFields.reason !== undefined) {
                            body.Reason = updateFields.reason;
                        }
                        if (updateFields.status !== undefined) {
                            body.Status = updateFields.status;
                        }
                        {
                            const owner = getResourceLocatorValue(updateFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (updateFields.subject !== undefined) {
                            body.Subject = updateFields.subject;
                        }
                        if (updateFields.ParentId !== undefined) {
                            body.ParentId = updateFields.ParentId;
                        }
                        if (updateFields.priority !== undefined) {
                            body.Priority = updateFields.priority;
                        }
                        if (updateFields.accountId !== undefined) {
                            body.AccountId = updateFields.accountId;
                        }
                        if (updateFields.recordTypeId !== undefined) {
                            body.RecordTypeId = updateFields.recordTypeId;
                        }
                        if (updateFields.contactId !== undefined) {
                            body.ContactId = updateFields.contactId;
                        }
                        if (updateFields.description !== undefined) {
                            body.Description = updateFields.description;
                        }
                        if (updateFields.isEscalated !== undefined) {
                            body.IsEscalated = updateFields.isEscalated;
                        }
                        if (updateFields.suppliedName !== undefined) {
                            body.SuppliedName = updateFields.suppliedName;
                        }
                        if (updateFields.suppliedEmail !== undefined) {
                            body.SuppliedEmail = updateFields.suppliedEmail;
                        }
                        if (updateFields.suppliedPhone !== undefined) {
                            body.SuppliedPhone = updateFields.suppliedPhone;
                        }
                        if (updateFields.suppliedCompany !== undefined) {
                            body.SuppliedCompany = updateFields.suppliedCompany;
                        }
                        if (updateFields.customFieldsUi) {
                            const customFields = updateFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    //@ts-ignore
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/case/${caseId}`, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Case/get-case-id
                    if (operation === 'get') {
                        const caseId = this.getNodeParameter('caseId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/case/${caseId}`);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, 'Case', returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, 'Case', returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Case/delete-case-id
                    if (operation === 'delete') {
                        const caseId = this.getNodeParameter('caseId', i);
                        try {
                            responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/case/${caseId}`);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Case/get-case
                    if (operation === 'getSummary') {
                        responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/case');
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/CaseComment/post-casecomment
                    if (operation === 'addComment') {
                        const caseId = this.getNodeParameter('caseId', i);
                        const options = this.getNodeParameter('options', i);
                        const body = {
                            ParentId: caseId,
                        };
                        if (options.commentBody !== undefined) {
                            body.CommentBody = options.commentBody;
                        }
                        if (options.isPublished !== undefined) {
                            body.IsPublished = options.isPublished;
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/casecomment', body);
                    }
                }
                if (resource === 'task') {
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Task/post-task
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const status = this.getNodeParameter('status', i);
                        const body = {
                            Status: status,
                        };
                        if (additionalFields.type !== undefined) {
                            body.TaskSubtype = additionalFields.type;
                        }
                        if (additionalFields.whoId !== undefined) {
                            body.WhoId = additionalFields.whoId;
                        }
                        if (additionalFields.whatId !== undefined) {
                            body.WhatId = additionalFields.whatId;
                        }
                        {
                            const owner = getResourceLocatorValue(additionalFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (additionalFields.subject !== undefined) {
                            body.Subject = additionalFields.subject;
                        }
                        if (additionalFields.callType !== undefined) {
                            body.CallType = additionalFields.callType;
                        }
                        if (additionalFields.priority !== undefined) {
                            body.Priority = additionalFields.priority;
                        }
                        if (additionalFields.callObject !== undefined) {
                            body.CallObject = additionalFields.callObject;
                        }
                        if (additionalFields.description !== undefined) {
                            body.Description = additionalFields.description;
                        }
                        if (additionalFields.activityDate !== undefined) {
                            body.ActivityDate = additionalFields.activityDate;
                        }
                        if (additionalFields.isReminderSet !== undefined) {
                            body.IsReminderSet = additionalFields.isReminderSet;
                        }
                        if (additionalFields.recurrenceType !== undefined) {
                            body.RecurrenceType = additionalFields.recurrenceType;
                        }
                        if (additionalFields.callDisposition !== undefined) {
                            body.CallDisposition = additionalFields.callDisposition;
                        }
                        if (additionalFields.reminderDateTime !== undefined) {
                            body.ReminderDateTime = additionalFields.reminderDateTime;
                        }
                        if (additionalFields.recurrenceInstance !== undefined) {
                            body.RecurrenceInstance = additionalFields.recurrenceInstance;
                        }
                        if (additionalFields.recurrenceInterval !== undefined) {
                            body.RecurrenceInterval = additionalFields.recurrenceInterval;
                        }
                        if (additionalFields.recurrenceDayOfMonth !== undefined) {
                            body.RecurrenceDayOfMonth = additionalFields.recurrenceDayOfMonth;
                        }
                        if (additionalFields.callDurationInSeconds !== undefined) {
                            body.CallDurationInSeconds = additionalFields.callDurationInSeconds;
                        }
                        if (additionalFields.recurrenceEndDateOnly !== undefined) {
                            body.RecurrenceEndDateOnly = additionalFields.recurrenceEndDateOnly;
                        }
                        if (additionalFields.recurrenceMonthOfYear !== undefined) {
                            body.RecurrenceMonthOfYear = additionalFields.recurrenceMonthOfYear;
                        }
                        if (additionalFields.recurrenceDayOfWeekMask !== undefined) {
                            body.RecurrenceDayOfWeekMask = additionalFields.recurrenceDayOfWeekMask;
                        }
                        if (additionalFields.recurrenceStartDateOnly !== undefined) {
                            body.RecurrenceStartDateOnly = additionalFields.recurrenceStartDateOnly;
                        }
                        if (additionalFields.recurrenceTimeZoneSidKey !== undefined) {
                            body.RecurrenceTimeZoneSidKey = additionalFields.recurrenceTimeZoneSidKey;
                        }
                        if (additionalFields.recurrenceRegeneratedType !== undefined) {
                            body.RecurrenceRegeneratedType = additionalFields.recurrenceRegeneratedType;
                        }
                        if (additionalFields.customFieldsUi) {
                            const customFields = additionalFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    //@ts-ignore
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/task', body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Task/patch-task-id
                    if (operation === 'update') {
                        const taskId = this.getNodeParameter('taskId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.type !== undefined) {
                            body.TaskSubtype = updateFields.type;
                        }
                        if (updateFields.whoId !== undefined) {
                            body.WhoId = updateFields.whoId;
                        }
                        if (updateFields.status !== undefined) {
                            body.Status = updateFields.status;
                        }
                        if (updateFields.whatId !== undefined) {
                            body.WhatId = updateFields.whatId;
                        }
                        {
                            const owner = getResourceLocatorValue(updateFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (updateFields.subject !== undefined) {
                            body.Subject = updateFields.subject;
                        }
                        if (updateFields.callType !== undefined) {
                            body.CallType = updateFields.callType;
                        }
                        if (updateFields.priority !== undefined) {
                            body.Priority = updateFields.priority;
                        }
                        if (updateFields.callObject !== undefined) {
                            body.CallObject = updateFields.callObject;
                        }
                        if (updateFields.description !== undefined) {
                            body.Description = updateFields.description;
                        }
                        if (updateFields.activityDate !== undefined) {
                            body.ActivityDate = updateFields.activityDate;
                        }
                        if (updateFields.isReminderSet !== undefined) {
                            body.IsReminderSet = updateFields.isReminderSet;
                        }
                        if (updateFields.recurrenceType !== undefined) {
                            body.RecurrenceType = updateFields.recurrenceType;
                        }
                        if (updateFields.callDisposition !== undefined) {
                            body.CallDisposition = updateFields.callDisposition;
                        }
                        if (updateFields.reminderDateTime !== undefined) {
                            body.ReminderDateTime = updateFields.reminderDateTime;
                        }
                        if (updateFields.recurrenceInstance !== undefined) {
                            body.RecurrenceInstance = updateFields.recurrenceInstance;
                        }
                        if (updateFields.recurrenceInterval !== undefined) {
                            body.RecurrenceInterval = updateFields.recurrenceInterval;
                        }
                        if (updateFields.recurrenceDayOfMonth !== undefined) {
                            body.RecurrenceDayOfMonth = updateFields.recurrenceDayOfMonth;
                        }
                        if (updateFields.callDurationInSeconds !== undefined) {
                            body.CallDurationInSeconds = updateFields.callDurationInSeconds;
                        }
                        if (updateFields.recurrenceEndDateOnly !== undefined) {
                            body.RecurrenceEndDateOnly = updateFields.recurrenceEndDateOnly;
                        }
                        if (updateFields.recurrenceMonthOfYear !== undefined) {
                            body.RecurrenceMonthOfYear = updateFields.recurrenceMonthOfYear;
                        }
                        if (updateFields.recurrenceDayOfWeekMask !== undefined) {
                            body.RecurrenceDayOfWeekMask = updateFields.recurrenceDayOfWeekMask;
                        }
                        if (updateFields.recurrenceStartDateOnly !== undefined) {
                            body.RecurrenceStartDateOnly = updateFields.recurrenceStartDateOnly;
                        }
                        if (updateFields.recurrenceTimeZoneSidKey !== undefined) {
                            body.RecurrenceTimeZoneSidKey = updateFields.recurrenceTimeZoneSidKey;
                        }
                        if (updateFields.recurrenceRegeneratedType !== undefined) {
                            body.RecurrenceRegeneratedType = updateFields.recurrenceRegeneratedType;
                        }
                        if (updateFields.customFieldsUi) {
                            const customFields = updateFields.customFieldsUi
                                .customFieldsValues;
                            if (customFields) {
                                for (const customField of customFields) {
                                    //@ts-ignore
                                    body[customField.fieldId] = customField.value;
                                }
                            }
                        }
                        responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/task/${taskId}`, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Task/get-task-id
                    if (operation === 'get') {
                        const taskId = this.getNodeParameter('taskId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/task/${taskId}`);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, 'Task', returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, 'Task', returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Task/delete-task-id
                    if (operation === 'delete') {
                        const taskId = this.getNodeParameter('taskId', i);
                        try {
                            responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/task/${taskId}`);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Task/get-task
                    if (operation === 'getSummary') {
                        responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/task');
                    }
                }
                if (resource === 'attachment') {
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/post-attachment
                    if (operation === 'create') {
                        const name = this.getNodeParameter('name', i);
                        const parentId = this.getNodeParameter('parentId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                        const body = {
                            Name: name,
                            ParentId: parentId,
                        };
                        if (items[i].binary?.[binaryPropertyName]) {
                            body.Body = items[i].binary[binaryPropertyName].data;
                            body.ContentType = items[i].binary[binaryPropertyName].mimeType;
                        }
                        else {
                            throw new NodeOperationError(this.getNode(), `The property ${binaryPropertyName} does not exist`, { itemIndex: i });
                        }
                        if (additionalFields.description !== undefined) {
                            body.Description = additionalFields.description;
                        }
                        {
                            const owner = getResourceLocatorValue(additionalFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (additionalFields.isPrivate !== undefined) {
                            body.IsPrivate = additionalFields.isPrivate;
                        }
                        responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/attachment', body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/patch-attachment-id
                    if (operation === 'update') {
                        const attachmentId = this.getNodeParameter('attachmentId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.binaryPropertyName !== undefined) {
                            const binaryPropertyName = updateFields.binaryPropertyName;
                            if (items[i].binary?.[binaryPropertyName]) {
                                body.Body = items[i].binary[binaryPropertyName].data;
                                body.ContentType = items[i].binary[binaryPropertyName].mimeType;
                            }
                            else {
                                throw new NodeOperationError(this.getNode(), `The property ${binaryPropertyName} does not exist`, { itemIndex: i });
                            }
                        }
                        if (updateFields.name !== undefined) {
                            body.Name = updateFields.name;
                        }
                        if (updateFields.description !== undefined) {
                            body.Description = updateFields.description;
                        }
                        {
                            const owner = getResourceLocatorValue(updateFields.owner);
                            if (owner !== undefined) {
                                body.OwnerId = owner;
                            }
                        }
                        if (updateFields.isPrivate !== undefined) {
                            body.IsPrivate = updateFields.isPrivate;
                        }
                        responseData = await salesforceApiRequest.call(this, 'PATCH', `/sobjects/attachment/${attachmentId}`, body);
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/get-attachment-id
                    if (operation === 'get') {
                        const attachmentId = this.getNodeParameter('attachmentId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/attachment/${attachmentId}`);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, 'Attachment', returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, 'Attachment', returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/delete-attachment-id
                    if (operation === 'delete') {
                        const attachmentId = this.getNodeParameter('attachmentId', i);
                        try {
                            responseData = await salesforceApiRequest.call(this, 'DELETE', `/sobjects/attachment/${attachmentId}`);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/get-attachment-id
                    if (operation === 'getSummary') {
                        responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/attachment');
                    }
                }
                if (resource === 'user') {
                    //https://developer.salesforce.com/docs/api-explorer/sobject/User/get-user-id
                    if (operation === 'get') {
                        const userId = this.getNodeParameter('userId', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/user/${userId}`);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        try {
                            if (returnAll) {
                                qs.q = getQuery(options, 'User', returnAll, 0, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                            else {
                                const limit = this.getNodeParameter('limit', i);
                                qs.q = getQuery(options, 'User', returnAll, limit, nodeVersion);
                                responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                            }
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                }
                if (resource === 'flow') {
                    //https://developer.salesforce.com/docs/atlas.en-us.api_action.meta/api_action/actions_obj_flow.htm
                    if (operation === 'invoke') {
                        const apiName = this.getNodeParameter('apiName', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        let variables = {};
                        if (jsonParameters) {
                            variables = this.getNodeParameter('variablesJson', i);
                        }
                        else {
                            // Input variables are defined in UI
                            const setInputVariable = this.getNodeParameter('variablesUi', i, {});
                            if (setInputVariable.variablesValues !== undefined) {
                                for (const inputVariableData of setInputVariable.variablesValues) {
                                    // @ts-ignore
                                    variables[inputVariableData.name] = inputVariableData.value;
                                }
                            }
                        }
                        const body = {
                            inputs: [variables],
                        };
                        responseData = await salesforceApiRequest.call(this, 'POST', `/actions/custom/flow/${apiName}`, body);
                    }
                    //https://developer.salesforce.com/docs/atlas.en-us.api_action.meta/api_action/actions_obj_flow.htm
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        responseData = await salesforceApiRequest.call(this, 'GET', '/actions/custom/flow');
                        responseData = responseData.actions;
                        if (!returnAll) {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = responseData.splice(0, limit);
                        }
                    }
                }
                if (resource === 'search') {
                    //https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                    if (operation === 'query') {
                        qs.q = this.getNodeParameter('query', i);
                        responseData = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
                    }
                }
                if (!Array.isArray(responseData) &&
                    (responseData === undefined || responseData === '' || responseData === null)) {
                    // Make sure that always valid JSON gets returned which also matches the
                    // Salesforce default response
                    responseData = {
                        errors: [],
                        success: true,
                    };
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push.apply(returnData, executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const errorItem = {
                        json: {
                            error: error.message,
                            description: error.description ?? null,
                            httpCode: error.httpCode ?? null,
                            errorCode: error.context?.errorCode ?? null,
                            fields: error.context?.fields ?? null,
                        },
                        pairedItem: { item: i },
                    };
                    if (this.getNode().onError === 'continueErrorOutput') {
                        errorItem.error = error;
                    }
                    returnData.push(errorItem);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Salesforce.node.js.map