export const userOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['user'],
            },
        },
        options: [
            {
                name: 'Get',
                value: 'get',
                description: 'Get a user',
                action: 'Get a user',
            },
        ],
        default: 'get',
    },
];
export const userFields = [
    /* -------------------------------------------------------------------------- */
    /*                                 user:get                                   */
    /* -------------------------------------------------------------------------- */
    {
        displayName: 'User ID',
        name: 'userId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
            show: {
                resource: ['user'],
                operation: ['get'],
            },
        },
        description: 'Unique identifier for the user',
    },
];
//# sourceMappingURL=UserDescription.js.map