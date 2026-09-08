import { NodeConnectionTypes } from 'n8n-workflow';
import { secureScoreControlProfileFields, secureScoreControlProfileOperations, secureScoreFields, secureScoreOperations, } from './descriptions';
import { msGraphSecurityApiRequest, throwOnEmptyUpdate, tolerateDoubleQuotes, } from './GenericFunctions';
export class MicrosoftGraphSecurity {
    description = {
        displayName: 'Microsoft Graph Security',
        name: 'microsoftGraphSecurity',
        icon: 'file:microsoftGraph.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume the Microsoft Graph Security API',
        defaults: {
            name: 'Microsoft Graph Security',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'microsoftGraphSecurityOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['microsoftGraphSecurityOAuth2Api'],
                    },
                },
            },
            {
                name: 'microsoftOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['microsoftOAuth2Api'],
                    },
                },
            },
        ],
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Graph Security OAuth2',
                        value: 'microsoftGraphSecurityOAuth2Api',
                    },
                    {
                        name: 'Microsoft OAuth2 (Graph)',
                        value: 'microsoftOAuth2Api',
                        description: 'Generic Microsoft Graph credential. It must have the SecurityEvents.ReadWrite.All offline_access scope with Entra admin consent.',
                    },
                ],
                default: 'microsoftGraphSecurityOAuth2Api',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Secure Score',
                        value: 'secureScore',
                    },
                    {
                        name: 'Secure Score Control Profile',
                        value: 'secureScoreControlProfile',
                    },
                ],
                default: 'secureScore',
            },
            ...secureScoreOperations,
            ...secureScoreFields,
            ...secureScoreControlProfileOperations,
            ...secureScoreControlProfileFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let responseData;
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'secureScore') {
                    // **********************************************************************
                    //                              secureScore
                    // **********************************************************************
                    if (operation === 'get') {
                        // ----------------------------------------
                        //             secureScore: get
                        // ----------------------------------------
                        // https://docs.microsoft.com/en-us/graph/api/securescore-get
                        const secureScoreId = this.getNodeParameter('secureScoreId', i);
                        responseData = await msGraphSecurityApiRequest.call(this, 'GET', `/secureScores/${secureScoreId}`);
                        delete responseData['@odata.context'];
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------------
                        //           secureScore: getAll
                        // ----------------------------------------
                        // https://docs.microsoft.com/en-us/graph/api/security-list-securescores
                        const qs = {};
                        const { filter, includeControlScores } = this.getNodeParameter('filters', i);
                        if (filter) {
                            qs.$filter = tolerateDoubleQuotes(filter);
                        }
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        if (!returnAll) {
                            qs.$count = true;
                            qs.$top = this.getNodeParameter('limit', 0);
                        }
                        responseData = (await msGraphSecurityApiRequest
                            .call(this, 'GET', '/secureScores', {}, qs)
                            .then((response) => response.value));
                        if (!includeControlScores) {
                            responseData = responseData.map(({ controlScores: _controlScores, ...rest }) => rest);
                        }
                    }
                }
                else if (resource === 'secureScoreControlProfile') {
                    // **********************************************************************
                    //                       secureScoreControlProfile
                    // **********************************************************************
                    if (operation === 'get') {
                        // ----------------------------------------
                        //      secureScoreControlProfile: get
                        // ----------------------------------------
                        // https://docs.microsoft.com/en-us/graph/api/securescorecontrolprofile-get
                        const secureScoreControlProfileId = this.getNodeParameter('secureScoreControlProfileId', i);
                        const endpoint = `/secureScoreControlProfiles/${secureScoreControlProfileId}`;
                        responseData = await msGraphSecurityApiRequest.call(this, 'GET', endpoint);
                        delete responseData['@odata.context'];
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------------
                        //    secureScoreControlProfile: getAll
                        // ----------------------------------------
                        // https://docs.microsoft.com/en-us/graph/api/security-list-securescorecontrolprofiles
                        const qs = {};
                        const { filter } = this.getNodeParameter('filters', i);
                        if (filter) {
                            qs.$filter = tolerateDoubleQuotes(filter);
                        }
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        if (!returnAll) {
                            qs.$count = true;
                            qs.$top = this.getNodeParameter('limit', 0);
                        }
                        responseData = await msGraphSecurityApiRequest
                            .call(this, 'GET', '/secureScoreControlProfiles', {}, qs)
                            .then((response) => response.value);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------------
                        //    secureScoreControlProfile: update
                        // ----------------------------------------
                        // https://docs.microsoft.com/en-us/graph/api/securescorecontrolprofile-update
                        const body = {
                            vendorInformation: {
                                provider: this.getNodeParameter('provider', i),
                                vendor: this.getNodeParameter('vendor', i),
                            },
                        };
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (!Object.keys(updateFields).length) {
                            throwOnEmptyUpdate.call(this);
                        }
                        if (Object.keys(updateFields).length) {
                            Object.assign(body, updateFields);
                        }
                        const id = this.getNodeParameter('secureScoreControlProfileId', i);
                        const endpoint = `/secureScoreControlProfiles/${id}`;
                        const headers = { Prefer: 'return=representation' };
                        responseData = await msGraphSecurityApiRequest.call(this, 'PATCH', endpoint, body, {}, headers);
                        delete responseData['@odata.context'];
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });
                    continue;
                }
                throw error;
            }
            Array.isArray(responseData)
                ? returnData.push(...responseData)
                : returnData.push(responseData);
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=MicrosoftGraphSecurity.node.js.map