export const eventOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['event'],
            },
        },
        options: [
            {
                name: 'Get',
                value: 'get',
                description: 'Get single event by ID',
                action: 'Get an event by ID',
            },
        ],
        default: 'get',
    },
];
export const eventFields = [
    /* -------------------------------------------------------------------------- */
    /*                                 event:get                                  */
    /* -------------------------------------------------------------------------- */
    {
        displayName: 'Room ID',
        name: 'roomId',
        type: 'string',
        default: '',
        placeholder: '!123abc:matrix.org',
        displayOptions: {
            show: {
                operation: ['get'],
                resource: ['event'],
            },
        },
        required: true,
        description: 'The room related to the event',
    },
    {
        displayName: 'Event ID',
        name: 'eventId',
        type: 'string',
        default: '',
        placeholder: '$1234abcd:matrix.org',
        displayOptions: {
            show: {
                operation: ['get'],
                resource: ['event'],
            },
        },
        required: true,
        description: 'The room related to the event',
    },
];
//# sourceMappingURL=EventDescription.js.map