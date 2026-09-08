export const contactDeleteDescription = [
    {
        displayName: 'Contact ID',
        name: 'contactId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['contact'],
                operation: ['delete'],
            },
        },
        default: '',
        description: 'Delete a specific contact by ID',
    },
];
//# sourceMappingURL=description.js.map