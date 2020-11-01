import {
	INodeProperties,
} from 'n8n-workflow';

export const postOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
            },
        },
        options: [
            {
                name: 'Create',
                value: 'create',
                description: 'Create a post',
            },
            {
                name: 'Get',
                value: 'get',
                description: 'Get posts for a member',
            },
            {
                name: 'Get All',
                value: 'getAll',
                description: 'Get all posts in a workspace',
            },
            {
                name: 'Delete',
                value: 'delete',
                description: 'Delete a post',
            },
        ],
        default: 'create',
        description: 'The operation to perform.',
    },
] as INodeProperties[];

export const postFields = [

/* -------------------------------------------------------------------------- */
/*                                post:create                                 */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Workspace',
        name: 'workspaceId',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getWorkspaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'The workspace',
    },
    {
        displayName: 'Member ID',
        name: 'memberId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'Member ID',
    },
    {
        displayName: 'Post URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'Post',
    },
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'create',
                ],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Published At',
                name: 'publishedAt',
                type: 'dateTime',
                default: '',
                description: '',
            },
        ]
    },

/* -------------------------------------------------------------------------- */
/*                                post:get                                    */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Workspace',
        name: 'workspaceId',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getWorkspaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'get',
                ],
            },
        },
        description: 'The workspace',
    },
    {
        displayName: 'Member ID',
        name: 'memberId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'get',
                ],
            },
        },
        description: 'Member ID',
    },

/* -------------------------------------------------------------------------- */
/*                                post:getAll                                 */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Workspace',
        name: 'workspaceId',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getWorkspaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'getAll',
                ],
            },
        },
        description: 'The workspace',
    },

/* -------------------------------------------------------------------------- */
/*                                post:delete                                 */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Workspace',
        name: 'workspaceId',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getWorkspaces',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'delete',
                ],
            },
        },
        description: 'The workspace',
    },
    {
        displayName: 'Member ID',
        name: 'memberId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'post',
                ],
                operation: [
                    'delete',
                ],
            },
        },
        description: 'Member ID',
    },
    {
        displayName: 'Post ID',
        name: 'postId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: [
                    'delete',
                ],
                resource: [
                    'post',
                ],
            },
        },
        description: 'Post ID',
    },
] as INodeProperties[];
