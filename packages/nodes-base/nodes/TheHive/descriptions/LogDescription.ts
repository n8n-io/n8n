import { INodeProperties } from "n8n-workflow";

export const logOperations = [
    {
        default: 'list',
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        required: true,
        displayOptions: {
            show: {
                resource: ['log']
            }
        },
        options: [
            { name: 'List', value: 'list', description: 'List task logs' },
            { name: 'Fetch One', value: 'fetch', description: 'Get a single log' },
            { name: 'Create', value: 'create', description: 'Create task log' },
            { name: 'Execute a responder', value: 'execute_responder', description: 'Execute a responder on a selected log' },
            
        ]
    },
] as INodeProperties[];

export const logFields = [
    // required attributs
    {
        name:'id',
        displayName:'Log Id',
        type:'string',
        required:true,
        displayOptions: { show: { resource: ['log'], operation: ['execute_responder','fetch'] } },

    },
    {
        name: 'taskId',
        displayName: 'Task Id',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['log'], operation: ['create','list'] } },
    },
    {
        name: 'message',
        displayName: 'Message',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['log'], operation: ['create'] } },
    },
    {
        name: 'startDate',
        displayName: 'Start Date',
        type: 'dateTime',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['log'], operation: ['create'] } },
    },
    {
        name: 'status',
        displayName: 'Status',
        type: 'options',
        options: [
            { name: 'Ok', value: 'Ok' },
            { name: 'Deleted', value: 'Deleted' },
        ],
        default: '',
        required: true,
        displayOptions: { show: { resource: ['log'], operation: ['create'] } },
    },
    // required for responder execution
    {
        name:'responder',
        displayName:'Responder',
        type:'multiOptions',
        required:true,
        default:'',
        typeOptions:{
            loadOptionsDependsOn:['id'],
            loadOptionsMethod:'loadResponders'
        },
        displayOptions:{show:{resource:['log'],operation:['execute_responder']},hide:{id:['']}}
    },
    // Optional attributs
    {
        displayName: 'Optional Attribut',
        name: 'optionals',
        type: 'fixedCollection',
        displayOptions: { show: { resource: ['log'], operation: ['create'] } },
        default: {},
        description: 'adding attachment is optional',
        placeholder: 'Add attachement',
        options: [
            {
                name: 'attachement',
                displayName: 'Attachement',
                values: [
                    {
                        name: 'attachmentType',
                        default: 'path',
                        displayName: 'Attachment Type',
                        type: 'options',
                        required: false,
                        options: [{ name: 'Path', value: 'path' }, { name: 'Binary', value: 'binary' }],

                    },
                    {
                        name: 'value',
                        default: '',
                        displayName: 'Attachment Value',
                        type: 'string',
                        required: false,
                        displayOptions: { show: { attachmentType: ['path'] } },
                        description: 'Attachment’s file path',

                    },

                    {
                        displayName: 'File Name',
                        name: 'fileName',
                        type: 'string',
                        default: '',
                        description: 'Attachment’s file name',
                        displayOptions: { show: { attachmentType: ['binary'] } }
                    },
                    {
                        displayName: 'Mime Type',
                        name: 'mimeType',
                        type: 'string',
                        default: '',
                        description: 'Attachment’s mime type',
                        displayOptions: { show: { attachmentType: ['binary'] } }
                    },
                    {
                        displayName: 'Data',
                        name: 'data',
                        type: 'string',
                        default: '',
                        placeholder: 'ZXhhbXBsZSBmaWxl',
                        description: 'Base64-encoded stream of data.',
                        displayOptions: { show: { attachmentType: ['binary'] } }
                    },

                ]
            },
        ],
    }

] as INodeProperties[];;