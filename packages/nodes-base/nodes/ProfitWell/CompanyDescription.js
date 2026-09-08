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
                name: 'Get Settings',
                value: 'getSetting',
                description: "Get your company's ProfitWell account settings",
                action: 'Get settings for your company',
            },
        ],
        default: 'getSetting',
    },
];
//# sourceMappingURL=CompanyDescription.js.map