import { NodeConnectionTypes, } from 'n8n-workflow';
import { commentFields, commentOperations } from './CommentDescription';
import { linearApiRequest, linearApiRequestAllItems, sort, validateCredentials, } from './GenericFunctions';
import { issueFields, issueOperations } from './IssueDescription';
import { query } from './Queries';
export class Linear {
    description = {
        displayName: 'Linear',
        name: 'linear',
        icon: 'file:linear.svg',
        group: ['output'],
        version: [1, 1.1],
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Linear API',
        defaults: {
            name: 'Linear',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'linearApi',
                required: true,
                testedBy: 'linearApiTest',
                displayOptions: {
                    show: {
                        authentication: ['apiToken'],
                    },
                },
            },
            {
                name: 'linearOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['oAuth2'],
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
                        name: 'API Token',
                        value: 'apiToken',
                    },
                    {
                        name: 'OAuth2',
                        value: 'oAuth2',
                    },
                ],
                default: 'apiToken',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Comment',
                        value: 'comment',
                    },
                    {
                        name: 'Issue',
                        value: 'issue',
                    },
                ],
                default: 'issue',
            },
            ...commentOperations,
            ...commentFields,
            ...issueOperations,
            ...issueFields,
        ],
    };
    methods = {
        credentialTest: {
            async linearApiTest(credential) {
                try {
                    await validateCredentials.call(this, credential.data);
                }
                catch (error) {
                    const { error: err } = error;
                    const errors = err.errors;
                    const authenticationError = Boolean(errors.filter((e) => e.extensions.code === 'AUTHENTICATION_ERROR').length);
                    if (authenticationError) {
                        return {
                            status: 'Error',
                            message: 'The security token included in the request is invalid',
                        };
                    }
                }
                return {
                    status: 'OK',
                    message: 'Connection successful!',
                };
            },
        },
        loadOptions: {
            async getTeams() {
                const returnData = [];
                const body = {
                    query: query.getTeams(),
                    variables: {
                        $first: 10,
                    },
                };
                const teams = await linearApiRequestAllItems.call(this, 'data.teams', body);
                for (const team of teams) {
                    returnData.push({
                        name: team.name,
                        value: team.id,
                    });
                }
                return returnData;
            },
            async getUsers() {
                const returnData = [];
                const body = {
                    query: query.getUsers(),
                    variables: {
                        $first: 10,
                    },
                };
                const users = await linearApiRequestAllItems.call(this, 'data.users', body);
                for (const user of users) {
                    returnData.push({
                        name: user.name,
                        value: user.id,
                    });
                }
                return returnData;
            },
            async getStates() {
                let teamId = this.getNodeParameter('teamId', null);
                // Handle Updates
                if (!teamId) {
                    const updateFields = this.getNodeParameter('updateFields', null);
                    // If not updating the team look up the current team
                    if (!updateFields.teamId) {
                        const issueId = this.getNodeParameter('issueId');
                        const body = {
                            query: query.getIssueTeam(),
                            variables: {
                                issueId,
                            },
                        };
                        const responseData = await linearApiRequest.call(this, body);
                        teamId = responseData?.data?.issue?.team?.id;
                    }
                    else {
                        teamId = updateFields.teamId;
                    }
                }
                const returnData = [];
                const body = {
                    query: query.getStates(),
                    variables: {
                        $first: 10,
                        filter: {
                            team: {
                                id: {
                                    eq: teamId,
                                },
                            },
                        },
                    },
                };
                const states = await linearApiRequestAllItems.call(this, 'data.workflowStates', body);
                for (const state of states) {
                    returnData.push({
                        name: state.name,
                        value: state.id,
                    });
                }
                return returnData.sort(sort);
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'issue') {
                    if (operation === 'create') {
                        const teamId = this.getNodeParameter('teamId', i);
                        const title = this.getNodeParameter('title', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            query: query.createIssue(),
                            variables: {
                                teamId,
                                title,
                                ...additionalFields,
                            },
                        };
                        responseData = await linearApiRequest.call(this, body);
                        responseData = responseData.data.issueCreate?.issue;
                    }
                    if (operation === 'delete') {
                        const issueId = this.getNodeParameter('issueId', i);
                        const body = {
                            query: query.deleteIssue(),
                            variables: {
                                issueId,
                            },
                        };
                        responseData = await linearApiRequest.call(this, body);
                        responseData = responseData?.data?.issueDelete;
                    }
                    if (operation === 'get') {
                        const issueId = this.getNodeParameter('issueId', i);
                        const body = {
                            query: query.getIssue(),
                            variables: {
                                issueId,
                            },
                        };
                        responseData = await linearApiRequest.call(this, body);
                        responseData = responseData.data.issue;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const body = {
                            query: query.getIssues(),
                            variables: {
                                first: 50,
                            },
                        };
                        if (returnAll) {
                            responseData = await linearApiRequestAllItems.call(this, 'data.issues', body);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', 0);
                            responseData = await linearApiRequestAllItems.call(this, 'data.issues', body, limit);
                        }
                    }
                    if (operation === 'update') {
                        const issueId = this.getNodeParameter('issueId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {
                            query: query.updateIssue(),
                            variables: {
                                issueId,
                                ...updateFields,
                            },
                        };
                        responseData = await linearApiRequest.call(this, body);
                        responseData = responseData?.data?.issueUpdate?.issue;
                    }
                    if (operation === 'addLink') {
                        const issueId = this.getNodeParameter('issueId', i);
                        const body = {
                            query: query.addIssueLink(),
                            variables: {
                                issueId,
                                url: this.getNodeParameter('link', i),
                            },
                        };
                        responseData = await linearApiRequest.call(this, body);
                        responseData = responseData?.data?.attachmentLinkURL;
                    }
                }
                else if (resource === 'comment') {
                    if (operation === 'addComment') {
                        const issueId = this.getNodeParameter('issueId', i);
                        const body = this.getNodeParameter('comment', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const requestBody = {
                            query: query.addComment(),
                            variables: {
                                issueId,
                                body,
                            },
                        };
                        if (additionalFields.parentId && additionalFields.parentId.trim() !== '') {
                            requestBody.variables.parentId = additionalFields.parentId;
                        }
                        responseData = await linearApiRequest.call(this, requestBody);
                        responseData = responseData?.data?.commentCreate;
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Linear.node.js.map