import {
	INodeProperties,
} from 'n8n-workflow';

export const noteOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                resource: [
                    'note',
                ],
            },
        },
        options: [
            {
                name: 'Create',
                value: 'create',
                description: 'Create a note',
            },
            {
                name: 'Get',
                value: 'get',
                description: 'Get notes for a member',
            },
            {
                name: 'Update',
                value: 'update',
                description: 'Update a note',
            },
        ],
        default: 'create',
        description: 'The operation to perform.',
    },
] as INodeProperties[];

export const noteFields = [

/* -------------------------------------------------------------------------- */
/*                                note:create                                 */
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
                    'note',
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
                    'note',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'Member ID',
    },
    {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'note',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'Note',
    },

/* -------------------------------------------------------------------------- */
/*                                note:get                                    */
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
                    'note',
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
                    'note',
                ],
                operation: [
                    'get',
                ],
            },
        },
        description: 'Member ID',
    },

/* -------------------------------------------------------------------------- */
/*                                note:update                                 */
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
                    'note',
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
                    'note',
                ],
                operation: [
                    'update',
                ],
            },
        },
        description: 'Member ID',
    },
    {
        displayName: 'Note ID',
        name: 'noteId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'note',
                ],
                operation: [
                    'update',
                ],
            },
        },
        description: 'Note ID',
    },
    {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'note',
                ],
                operation: [
                    'update',
                ],
            },
        },
        description: 'Note',
    },
] as INodeProperties[];
