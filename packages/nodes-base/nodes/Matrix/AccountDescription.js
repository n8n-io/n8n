export const accountOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['account'],
            },
        },
        options: [
            {
                name: 'Me',
                value: 'me',
                description: "Get current user's account information",
                action: "Get the current user's account information",
            },
        ],
        default: 'me',
    },
];
//# sourceMappingURL=AccountDescription.js.map