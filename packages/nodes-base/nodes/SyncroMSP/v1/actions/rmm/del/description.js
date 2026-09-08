export const rmmDeleteDescription = [
    {
        displayName: 'RMM Alert ID',
        name: 'alertId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['rmm'],
                operation: ['delete'],
            },
        },
        default: '',
        description: 'Delete the RMM alert by ID',
    },
];
//# sourceMappingURL=description.js.map