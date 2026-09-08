export const exchangeOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
            {
                name: 'Get',
                value: 'get',
                action: 'Get an exchange',
            },
        ],
        default: 'get',
        displayOptions: {
            show: {
                resource: ['exchange'],
            },
        },
    },
];
export const exchangeFields = [
    {
        displayName: 'Exchange',
        name: 'exchange',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['exchange'],
                operation: ['get'],
            },
        },
        default: '',
        description: 'Stock exchange to retrieve, specified by <a href="https://en.wikipedia.org/wiki/Market_Identifier_Code">Market Identifier Code</a>, e.g. <code>XNAS</code>',
    },
];
//# sourceMappingURL=ExchangeDescription.js.map