export const customerDeleteDescription = [
    {
        displayName: 'Customer ID',
        name: 'customerId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['customer'],
                operation: ['delete'],
            },
        },
        default: '',
        description: 'Delete a specific customer by ID',
    },
];
//# sourceMappingURL=description.js.map