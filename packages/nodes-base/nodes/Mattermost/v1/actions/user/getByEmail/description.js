export const userGetByEmailDescription = [
    {
        displayName: 'Email',
        name: 'email',
        type: 'string',
        placeholder: 'name@email.com',
        required: true,
        displayOptions: {
            show: {
                resource: ['user'],
                operation: ['getByEmail'],
            },
        },
        default: '',
        description: "User's email",
    },
];
//# sourceMappingURL=description.js.map