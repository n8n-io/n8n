export const tickerOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
            {
                name: 'Get',
                value: 'get',
                action: 'Get a ticker',
            },
        ],
        default: 'get',
        displayOptions: {
            show: {
                resource: ['ticker'],
            },
        },
    },
];
export const tickerFields = [
    {
        displayName: 'Ticker',
        name: 'symbol',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['ticker'],
                operation: ['get'],
            },
        },
        default: '',
        description: 'Stock symbol (ticker) to retrieve, e.g. <code>AAPL</code>',
    },
];
//# sourceMappingURL=TickerDescription.js.map