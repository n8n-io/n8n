export const companyOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['company'],
            },
        },
        options: [
            {
                name: 'Enrich',
                value: 'enrich',
                action: 'Enrich a company',
            },
        ],
        default: 'enrich',
    },
];
export const companyFields = [
    /* -------------------------------------------------------------------------- */
    /*                                 company:enrich                             */
    /* -------------------------------------------------------------------------- */
    {
        displayName: 'Company',
        name: 'company',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: ['company'],
                operation: ['enrich'],
            },
        },
        description: 'The name of the company (e.g – amazon)',
    },
    {
        displayName: 'Domain',
        name: 'domain',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: ['company'],
                operation: ['enrich'],
            },
        },
        description: 'The domain name (e.g – amazon.com)',
    },
];
//# sourceMappingURL=CompanyDesciption.js.map