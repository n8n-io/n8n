import { NodeConnectionTypes } from 'n8n-workflow';
import { humanticAiApiRequest } from './GenericFunctions';
import { profileFields, profileOperations } from './ProfileDescription';
export class HumanticAi {
    description = {
        displayName: 'Humantic AI',
        name: 'humanticAi',
        icon: 'file:humanticai.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Humantic AI API',
        defaults: {
            name: 'Humantic AI',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'humanticAiApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Profile',
                        value: 'profile',
                    },
                ],
                default: 'profile',
            },
            // PROFILE
            ...profileOperations,
            ...profileFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            if (resource === 'profile') {
                if (operation === 'create') {
                    const userId = this.getNodeParameter('userId', i);
                    const sendResume = this.getNodeParameter('sendResume', i);
                    qs.userid = userId;
                    if (sendResume) {
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                        responseData = await humanticAiApiRequest.call(this, 'POST', '/user-profile/create', {}, qs, {
                            formData: {
                                resume: {
                                    value: binaryDataBuffer,
                                    options: {
                                        filename: binaryData.fileName,
                                    },
                                },
                            },
                        });
                    }
                    else {
                        responseData = await humanticAiApiRequest.call(this, 'GET', '/user-profile/create', {}, qs);
                    }
                    if (responseData.data !== undefined) {
                        responseData = responseData.data;
                    }
                    else {
                        delete responseData.usage_stats;
                    }
                }
                if (operation === 'get') {
                    const userId = this.getNodeParameter('userId', i);
                    const options = this.getNodeParameter('options', i);
                    qs.userid = userId;
                    if (options.persona) {
                        qs.persona = options.persona.join(',');
                    }
                    responseData = await humanticAiApiRequest.call(this, 'GET', '/user-profile', {}, qs);
                    responseData = responseData.results;
                }
                if (operation === 'update') {
                    const userId = this.getNodeParameter('userId', i);
                    const sendResume = this.getNodeParameter('sendResume', i);
                    qs.userid = userId;
                    if (sendResume) {
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                        const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                        responseData = await humanticAiApiRequest.call(this, 'POST', '/user-profile/create', {}, qs, {
                            formData: {
                                resume: {
                                    value: binaryDataBuffer,
                                    options: {
                                        filename: binaryData.fileName,
                                    },
                                },
                            },
                        });
                        responseData = responseData.data;
                    }
                    else {
                        const text = this.getNodeParameter('text', i);
                        const body = {
                            text,
                        };
                        qs.userid = userId;
                        responseData = await humanticAiApiRequest.call(this, 'POST', '/user-profile/create', body, qs);
                        responseData = responseData.data;
                    }
                }
            }
            if (Array.isArray(responseData)) {
                returnData.push.apply(returnData, responseData);
            }
            else {
                returnData.push(responseData);
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=HumanticAi.node.js.map