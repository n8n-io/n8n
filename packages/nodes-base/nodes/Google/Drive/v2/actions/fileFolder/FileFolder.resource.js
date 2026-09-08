import * as search from './search.operation';
export { search };
export const description = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['fileFolder'],
            },
        },
        options: [
            {
                name: 'Search',
                value: 'search',
                description: 'Search or list files and folders',
                action: 'Search files and folders',
            },
        ],
        default: 'search',
    },
    ...search.description,
];
//# sourceMappingURL=FileFolder.resource.js.map