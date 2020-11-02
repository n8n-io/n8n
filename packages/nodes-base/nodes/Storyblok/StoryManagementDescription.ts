import {
	INodeProperties,
} from 'n8n-workflow';

export const storyManagementOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
            },
        },
        options: [
            {
                name: 'Create',
                value: 'create',
                description: 'Create a story',
            },
            {
                name: 'Delete',
                value: 'delete',
                description: 'Delete a story',
            },
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
            {
                name: 'Publish',
                value: 'publish',
                description: 'Publish a story',
            },
            {
                name: 'Unpublish',
                value: 'unpublish',
                description: 'Unpublish a story',
            },
        ],
        default: 'create',
        description: 'The operation to perform.',
    },
] as INodeProperties[];

export const storyManagementFields = [

/* -------------------------------------------------------------------------- */
/*                                story:create                                */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Space',
        name: 'space',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getSpaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'The name of the space',
    },
    {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'The name you give this story',
    },
    {
        displayName: 'Slug',
        name: 'slug',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'The slug/path you give this story',
    },
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'create',
                ],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Content',
                name: 'content',
                type: 'string',
                default: '',
                description: 'Your defined custom content object',
            },
            {
                displayName: 'Parent ID',
                name: 'parentId',
                type: 'string',
                default: '',
                description: 'Parent story/folder numeric id',
            },
            {
                displayName: 'Path',
                name: 'path',
                type: 'string',
                default: '',
                description: 'Given real path, used in the preview editor',
            },
            {
                displayName: 'Is Startpage',
                name: 'isStartpage',
                type: 'boolean',
                default: false,
                description: 'Is startpage of current folder',
            },
            {
                displayName: 'First Published At',
                name: 'firstPublishedAt',
                type: 'dateTime',
                default: '',
                description: 'First publishing date',
            },
        ],
    },

/* -------------------------------------------------------------------------- */
/*                                story:delete                                */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Space',
        name: 'space',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getSpaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'delete',
                ],
            },
        },
        description: 'The name of the space',
    },
    {
        displayName: 'Story ID',
        name: 'storyId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'delete',
                ],
            },
        },
        description: 'Numeric ID of the story',
    },

/* -------------------------------------------------------------------------- */
/*                                story:get                                   */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Space',
        name: 'space',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getSpaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'get',
                ],
            },
        },
        description: 'The name of the space',
    },
    {
        displayName: 'Story ID',
        name: 'storyId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'get',
                ],
            },
        },
        description: 'Numeric ID of the story',
    },

/* -------------------------------------------------------------------------- */
/*                                story:getAll                                */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Space',
        name: 'space',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getSpaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'getAll',
                ],
            },
        },
        description: 'The name of the space',
    },

/* -------------------------------------------------------------------------- */
/*                                story:publish                               */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Space',
        name: 'space',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getSpaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'publish',
                ],
            },
        },
        description: 'The name of the space',
    },
    {
        displayName: 'Story ID',
        name: 'storyId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'publish',
                ],
            },
        },
        description: 'Numeric ID of the story',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'publish',
                ],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Release ID',
                name: 'releaseId',
                type: 'string',
                default: '',
                description: 'Numeric ID of release',
            },
            {
                displayName: 'Language',
                name: 'language',
                type: 'string',
                default: '',
                description: 'Language code to publish the story individually (must be enabled in the space settings)',
            },
        ],
    },

/* -------------------------------------------------------------------------- */
/*                                story:unpublish                             */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Space',
        name: 'space',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getSpaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'unpublish',
                ],
            },
        },
        description: 'The name of the space',
    },
    {
        displayName: 'Story ID',
        name: 'storyId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                source: [
                    'managementApi',
                ],
                resource: [
                    'story',
                ],
                operation: [
                    'unpublish',
                ],
            },
        },
        description: 'Numeric ID of the story',
    },
] as INodeProperties[];
