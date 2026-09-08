export const templateOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['template'],
            },
        },
        options: [
            {
                name: 'Create',
                value: 'create',
                description: 'Create a template',
                action: 'Create a template',
            },
        ],
        default: 'create',
    },
];
export const templateFields = [
    /* -------------------------------------------------------------------------- */
    /*                                template:create                             */
    /* -------------------------------------------------------------------------- */
    {
        displayName: 'Template',
        name: 'template',
        type: 'string',
        displayOptions: {
            show: {
                resource: ['template'],
                operation: ['create'],
            },
        },
        required: true,
        default: '',
        description: 'Render a Home Assistant template. <a href="https://www.home-assistant.io/docs/configuration/templating/">See template docs for more information.</a>.',
    },
];
//# sourceMappingURL=TemplateDescription.js.map