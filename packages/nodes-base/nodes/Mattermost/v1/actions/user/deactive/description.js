export const userDeactiveDescription = [
    {
        displayName: 'User ID',
        name: 'userId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['user'],
                operation: ['deactive'],
            },
        },
        default: '',
        description: 'User GUID',
    },
];
//# sourceMappingURL=description.js.map