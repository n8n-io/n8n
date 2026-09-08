export const rmmGetDescription = [
    {
        displayName: 'RMM Alert ID',
        name: 'alertId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['rmm'],
                operation: ['get'],
            },
        },
        default: '',
        description: 'Get specific RMM alert by ID',
    },
];
//# sourceMappingURL=description.js.map