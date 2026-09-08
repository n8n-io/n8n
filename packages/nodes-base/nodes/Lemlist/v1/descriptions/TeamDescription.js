export const teamOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        default: 'get',
        options: [
            {
                name: 'Get',
                value: 'get',
                action: 'Get a team',
            },
        ],
        displayOptions: {
            show: {
                resource: ['team'],
            },
        },
    },
];
export const teamFields = [
// ----------------------------------
//        team: get
// ----------------------------------
];
//# sourceMappingURL=TeamDescription.js.map