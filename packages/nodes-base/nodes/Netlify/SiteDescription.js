export const siteOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['site'],
            },
        },
        options: [
            {
                name: 'Delete',
                value: 'delete',
                description: 'Delete a site',
                action: 'Delete a site',
            },
            {
                name: 'Get',
                value: 'get',
                description: 'Get a site',
                action: 'Get a site',
            },
            {
                name: 'Get Many',
                value: 'getAll',
                description: 'Returns many sites',
                action: 'Get many sites',
            },
        ],
        default: 'delete',
    },
];
export const siteFields = [
    {
        displayName: 'Site ID',
        name: 'siteId',
        required: true,
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: ['site'],
                operation: ['get', 'delete'],
            },
        },
    },
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
            show: {
                operation: ['getAll'],
                resource: ['site'],
            },
        },
        default: false,
        description: 'Whether to return all results or only up to a given limit',
    },
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
            show: {
                operation: ['getAll'],
                resource: ['site'],
                returnAll: [false],
            },
        },
        typeOptions: {
            minValue: 1,
            maxValue: 200,
        },
        default: 50,
        description: 'Max number of results to return',
    },
];
//# sourceMappingURL=SiteDescription.js.map