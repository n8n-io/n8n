export const alertsOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['alerts'],
            },
        },
        options: [
            {
                name: 'Get',
                value: 'get',
                description: 'Get specific alert',
                routing: {
                    request: {
                        method: 'GET',
                        url: '={{"/api/alert/" + $parameter.alertId}}',
                    },
                },
                action: 'Get an alert',
            },
            {
                name: 'Get Many',
                value: 'getAll',
                description: 'Get many alerts',
                routing: {
                    request: {
                        method: 'GET',
                        url: '/api/alert/',
                    },
                },
                action: 'Get many alerts',
            },
        ],
        default: 'getAll',
    },
];
export const alertsFields = [
    {
        displayName: 'Alert ID',
        name: 'alertId',
        type: 'string',
        required: true,
        placeholder: '0',
        displayOptions: {
            show: {
                resource: ['alerts'],
                operation: ['get'],
            },
        },
        default: '',
    },
];
//# sourceMappingURL=AlertsDescription.js.map