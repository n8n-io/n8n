import { NodeConnectionTypes, } from 'n8n-workflow';
export class N8nTrainingCustomerMessenger {
    description = {
        displayName: 'Customer Messenger (n8n training)',
        name: 'n8nTrainingCustomerMessenger',
        icon: {
            light: 'file:n8nTrainingCustomerMessenger.svg',
            dark: 'file:n8nTrainingCustomerMessenger.dark.svg',
        },
        group: ['transform'],
        version: 1,
        description: 'Dummy node used for n8n training',
        defaults: {
            name: 'Customer Messenger (n8n training)',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        properties: [
            {
                displayName: 'Customer ID',
                name: 'customerId',
                type: 'string',
                required: true,
                default: '',
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'string',
                required: true,
                typeOptions: {
                    rows: 4,
                },
                default: '',
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        for (let i = 0; i < length; i++) {
            const customerId = this.getNodeParameter('customerId', i);
            const message = this.getNodeParameter('message', i);
            responseData = { output: `Sent message to customer ${customerId}:  ${message}` };
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=N8nTrainingCustomerMessenger.node.js.map