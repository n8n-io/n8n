import {
	INodeProperties,
} from 'n8n-workflow';

export const storyContentOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                source: [
                    'contentApi',
                ],
                resource: [
                    'story',
                ],
            },
        },
        options: [
            {
                name: 'Get',
                value: 'get',
                description: 'Get a story',
            },
            {
                name: 'Get All',
                value: 'getAll',
                description: 'Get all stories',
            },
        ],
        default: 'get',
        description: 'The operation to perform.',
    },
] as INodeProperties[];

export const storyContentFields = [

/* -------------------------------------------------------------------------- */
/*                                story:get                                   */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Slug',
        name: 'slug',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'contentApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'get',
                ],
            },
        },
        description: 'The slug of the story',
    },

/* -------------------------------------------------------------------------- */
/*                                story:getAll                                */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Starts With',
        name: 'startsWith',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'contentApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'getAll',
                ],
            },
        },
        description: 'Filter by slug',
    },
] as INodeProperties[];
