import * as executeQuery from './executeQuery.operation';
export { executeQuery };
export const description = [
    {
        displayName: 'Operation',
        name: 'operation',
        noDataExpression: true,
        type: 'options',
        required: true,
        default: 'executeQuery',
        options: [
            {
                name: 'Execute Query',
                value: 'executeQuery',
                action: 'Execute a query',
            },
        ],
        displayOptions: {
            show: {
                resource: ['query'],
            },
        },
    },
    ...executeQuery.description,
];
//# sourceMappingURL=index.js.map