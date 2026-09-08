export const orderOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['order'],
            },
        },
        options: [
            {
                name: 'Get',
                value: 'get',
                description: 'Get an order',
                action: 'Get an order',
            },
        ],
        default: 'get',
    },
];
export const orderFields = [
    /* -------------------------------------------------------------------------- */
    /*                                 order:get                         */
    /* -------------------------------------------------------------------------- */
    {
        displayName: 'Checkout ID',
        name: 'checkoutId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: ['order'],
                operation: ['get'],
            },
        },
        description: 'The identifier of the buyer’s checkout',
    },
];
//# sourceMappingURL=OrderDescription.js.map