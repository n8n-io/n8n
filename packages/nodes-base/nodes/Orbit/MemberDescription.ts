import {
	INodeProperties,
} from 'n8n-workflow';

export const memberOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                resource: [
                    'member',
                ],
            },
        },
        options: [
            {
                name: 'Delete',
                value: 'delete',
                description: 'Delete a member',
            },
            {
                name: 'Get',
                value: 'get',
                description: 'Get a member',
            },
            {
                name: 'Get All',
                value: 'getAll',
                description: 'Get all members in a workspace',
            },
            {
                name: 'Lookup',
                value: 'lookup',
                description: 'Lookup a member or identity by GitHub username',
            },
            {
                name: 'Update',
                value: 'update',
                description: 'Update a member',
            },
        ],
        default: 'get',
        description: 'The operation to perform.',
    },
] as INodeProperties[];

export const memberFields = [

/* -------------------------------------------------------------------------- */
/*                                member:delete                               */
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
                    'member',
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
                    'member',
                ],
                operation: [
                    'delete',
                ],
            },
        },
        description: 'Member ID',
    },


/* -------------------------------------------------------------------------- */
/*                                member:get                                  */
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
                    'member',
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
                    'member',
                ],
                operation: [
                    'get',
                ],
            },
        },
        description: 'Member ID',
    },

/* -------------------------------------------------------------------------- */
/*                                member:getAll                               */
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
                    'member',
                ],
                operation: [
                    'getAll',
                ],
            },
        },
        description: 'The workspace',
    },

/* -------------------------------------------------------------------------- */
/*                                member:lookup                               */
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
                    'member',
                ],
                operation: [
                    'lookup',
                ],
            },
        },
        description: 'The workspace',
    },
    {
        displayName: 'GitHub Username',
        name: 'githubUsername',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'member',
                ],
                operation: [
                    'lookup',
                ],
            },
        },
        description: 'GitHub username',
    },


/* -------------------------------------------------------------------------- */
/*                                member:update                               */
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
                    'member',
                ],
                operation: [
                    'update',
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
                    'member',
                ],
                operation: [
                    'update',
                ],
            },
        },
        description: 'Member ID',
    },
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        displayOptions: {
            show: {
                resource: [
                    'member',
                ],
                operation: [
                    'update',
                ],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Bio',
                name: 'bio',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Birthday',
                name: 'birthday',
                type: 'dateTime',
                default: '',
                description: '',
            },
            {
                displayName: 'Company',
                name: 'company',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Dev.to',
                name: 'devTo',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'LinkedIn',
                name: 'linkedin',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Location',
                name: 'location',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Orbit Level',
                name: 'orbitLevel',
                type: 'number',
                default: '',
                description: '',
            },
            {
                displayName: 'Pronouns',
                name: 'pronouns',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Shipping Address',
                name: 'shippingAddress',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Slug',
                name: 'slug',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Tags to Add',
                name: 'tagsToAdd',
                type: 'string',
                default: '',
                description: 'Adds tags to member; comma-separated string or array',
            },
            {
                displayName: 'Tag List',
                name: 'tagList',
                type: 'string',
                default: '',
                description: 'Replaces all tags for the member; comma-separated string or array',
            },
            {
                displayName: 'T-Shirt',
                name: 'tShirt',
                type: 'string',
                default: '',
                description: '',
            },
            {
                displayName: 'Teammate',
                name: 'teammate',
                type: 'boolean',
                default: false,
                description: '',
            },
            {
                displayName: 'URL',
                name: 'url',
                type: 'string',
                default: '',
                description: '',
            },
        ],
    },
] as INodeProperties[];
