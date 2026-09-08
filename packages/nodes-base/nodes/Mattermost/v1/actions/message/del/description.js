export const messageDeleteDescription = [
    {
        displayName: 'Post ID',
        name: 'postId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['message'],
                operation: ['delete'],
            },
        },
        default: '',
        description: 'ID of the post to delete',
    },
];
//# sourceMappingURL=description.js.map