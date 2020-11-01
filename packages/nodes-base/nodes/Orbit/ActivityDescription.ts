import {
	INodeProperties,
} from 'n8n-workflow';

export const activityOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                resource: [
                    'activity',
                ],
            },
        },
        options: [
            {
                name: 'Create',
                value: 'create',
                description: 'Create an activity for a member',
            },
            {
                name: 'Get',
                value: 'get',
                description: 'List activities for a member',
            },
            {
                name: 'Get All',
                value: 'getAll',
                description: 'List activities for a workspace',
            },
        ],
        default: 'create',
        description: 'The operation to perform.',
    },
] as INodeProperties[];

export const activityFields = [

/* -------------------------------------------------------------------------- */
/*                                activity:create                             */
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
                    'activity',
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
                    'activity',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'Member ID',
    },
    {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'activity',
                ],
                operation: [
                    'create',
                ],
            },
        },
        description: 'Title',
    },
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        displayOptions: {
            show: {
                resource: [
                    'activity',
                ],
                operation: [
                    'create',
                ],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                description: 'A description of the activity; displayed in the timeline',
            },
            {
                displayName: 'Link',
                name: 'link',
                type: 'string',
                default: '',
                description: 'A URL for the activity; displayed in the timeline',
            },
            {
                displayName: 'Link Text',
                name: 'linkText',
                type: 'string',
                default: '',
                description: 'The text for the timeline link',
            },
            {
                displayName: 'Score',
                name: 'score',
                type: 'number',
                default: '',
                description: 'The number of points this activity counts for',
            },
            {
                displayName: 'Activity Type',
                name: 'activityType',
                type: 'string',
                default: '',
                description: 'A user-defined way to group activities of the same nature',
            },
            {
                displayName: 'Key',
                name: 'key',
                type: 'string',
                default: '',
                description: 'Supply a key that must be unique or leave blank to have one generated',
            },
            {
                displayName: 'Occurred At',
                name: 'occurredAt',
                type: 'dateTime',
                default: '',
                description: 'The date and time the activity occurred; defaults to now',
            },
        ],
    },

/* -------------------------------------------------------------------------- */
/*                                activity:get                                */
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
                    'activity',
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
                    'activity',
                ],
                operation: [
                    'get',
                ],
            },
        },
        description: 'Member ID',
    },

/* -------------------------------------------------------------------------- */
/*                                activity:getAll                             */
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
                    'activity',
                ],
                operation: [
                    'getAll',
                ],
            },
        },
        description: 'The workspace',
    },
] as INodeProperties[];
