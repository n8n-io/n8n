import { NodeConnectionTypes } from 'n8n-workflow';
import { companyFields, companyOperations } from './CompanyDesciption';
import { upleadApiRequest } from './GenericFunctions';
import { personFields, personOperations } from './PersonDescription';
export class Uplead {
    description = {
        displayName: 'Uplead',
        name: 'uplead',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:uplead.png',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
        description: 'Consume Uplead API',
        defaults: {
            name: 'Uplead',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'upleadApi',
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
                        name: 'Company',
                        value: 'company',
                        description: 'Company API lets you lookup company data via a domain name or company name',
                    },
                    {
                        name: 'Person',
                        value: 'person',
                        description: 'Person API lets you lookup a person based on an email address OR based on a domain name + first name + last name',
                    },
                ],
                default: 'company',
            },
            ...companyOperations,
            ...companyFields,
            ...personOperations,
            ...personFields,
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
            try {
                if (resource === 'person') {
                    if (operation === 'enrich') {
                        const email = this.getNodeParameter('email', i);
                        const firstname = this.getNodeParameter('firstname', i);
                        const lastname = this.getNodeParameter('lastname', i);
                        const domain = this.getNodeParameter('domain', i);
                        if (email) {
                            qs.email = email;
                        }
                        if (firstname) {
                            qs.first_name = firstname;
                        }
                        if (lastname) {
                            qs.last_name = lastname;
                        }
                        if (domain) {
                            qs.domain = domain;
                        }
                        responseData = await upleadApiRequest.call(this, 'GET', '/person-search', {}, qs);
                    }
                }
                if (resource === 'company') {
                    if (operation === 'enrich') {
                        const domain = this.getNodeParameter('domain', i);
                        const company = this.getNodeParameter('company', i);
                        if (domain) {
                            qs.domain = domain;
                        }
                        if (company) {
                            qs.company = company;
                        }
                        responseData = await upleadApiRequest.call(this, 'GET', '/company-search', {}, qs);
                    }
                }
                if (Array.isArray(responseData.data)) {
                    returnData.push.apply(returnData, responseData.data);
                }
                else {
                    if (responseData.data !== null) {
                        returnData.push(responseData.data);
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
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=Uplead.node.js.map