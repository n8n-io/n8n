export const ticketDeleteDescription = [
    {
        displayName: 'Ticket ID',
        name: 'ticketId',
        required: true,
        type: 'string',
        displayOptions: {
            show: {
                resource: ['ticket'],
                operation: ['delete'],
            },
        },
        default: '',
        description: 'Delete a specific customer by ID',
    },
];
//# sourceMappingURL=description.js.map