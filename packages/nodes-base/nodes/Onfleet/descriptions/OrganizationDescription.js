export const organizationOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['organization'],
            },
        },
        options: [
            {
                name: 'Get My Organization',
                value: 'get',
                description: "Retrieve your own organization's details",
                action: 'Get my organization',
            },
            {
                name: 'Get Delegatee Details',
                value: 'getDelegatee',
                description: 'Retrieve the details of an organization with which you are connected',
                action: "Get a delegatee's details",
            },
        ],
        default: 'get',
    },
];
export const organizationFields = [
    {
        displayName: 'Organization ID',
        name: 'id',
        type: 'string',
        displayOptions: {
            show: {
                resource: ['organization'],
                operation: ['getDelegatee'],
            },
        },
        default: '',
        required: true,
        description: 'The ID of the delegatees for lookup',
    },
];
//# sourceMappingURL=OrganizationDescription.js.map