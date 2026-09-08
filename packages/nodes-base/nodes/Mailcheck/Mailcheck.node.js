import { NodeConnectionTypes } from 'n8n-workflow';
import { mailCheckApiRequest } from './GenericFunctions';
export class Mailcheck {
    description = {
        displayName: 'Mailcheck',
        name: 'mailcheck',
        icon: 'file:mailcheck.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Mailcheck API',
        defaults: {
            name: 'Mailcheck',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'mailcheckApi',
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
                        name: 'Email',
                        value: 'email',
                    },
                ],
                default: 'email',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['email'],
                    },
                },
                options: [
                    {
                        name: 'Check',
                        value: 'check',
                        action: 'Check an email',
                    },
                ],
                default: 'check',
            },
            {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                placeholder: 'name@email.com',
                displayOptions: {
                    show: {
                        resource: ['email'],
                        operation: ['check'],
                    },
                },
                default: '',
                description: 'Email address to check',
            },
        ],
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
                if (resource === 'email') {
                    if (operation === 'check') {
                        const email = this.getNodeParameter('email', i);
                        responseData = await mailCheckApiRequest.call(this, 'POST', '/singleEmail:check', {
                            email,
                        });
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
//# sourceMappingURL=Mailcheck.node.js.map