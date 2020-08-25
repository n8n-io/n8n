import { INodeProperties } from 'n8n-workflow';
import {TLP} from '../interfaces/AlertInterface';

export const alertOperations = [
    {
        default: 'list',
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        required: true,
        displayOptions: {
            show: {
                resource: ['alert']
            }
        },
        typeOptions:{
            loadOptionsDependsOn:['resource'],
            loadOptionsMethod:'loadAlertOptions'
        }
    },
] as INodeProperties[]

export const alertFields = [
    // required attributs
    {
        name: 'id',
        displayName: 'Alert Id',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['alert'], operation: ['promote','merge','update','execute_responder','fetch'] } }
    },
    {
        name: 'caseId',
        displayName: 'Case Id',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['alert'], operation: ['merge'] } }
    },
    {
        name: 'title',
        displayName: 'Title',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'description',
        displayName: 'Description',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'severity',
        displayName: 'Severity',
        type: 'options',
        options:[{name:'Low',value:1},{name:'Medium',value:2},{name:'High',value:3},],
        required: true,
        default: 2,
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'date',
        displayName: 'Date',
        type: 'dateTime',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'tags',
        displayName: 'Alert Tags',
        type: 'string',
        required: true,
        default: '',
        placeholder:'tag,tag2,tag3...',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'tlp',
        displayName: 'TLP',
        type: 'options',
        required: true,
        default: 2,
        options: [
            {
                name:'White',
                value:TLP.white
            },
            {
                name:'Green',
                value:TLP.green
            },
            {
                name:'Amber',
                value:TLP.amber
            },{
                name:'Red',
                value:TLP.red
            }

        ],
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'status',
        displayName: 'Status',
        type: 'options',
        required: true,
        options:[
            {name:'New',value:'New'},
            {name:'Updated',value:'Updated'},
            {name:'Ignored',value:'Ignored'},
            {name:'Imported',value:'Imported'},
        ],
        default: 'New',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    }, 
    {
        name: 'type',
        displayName: 'Type',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'source',
        displayName: 'Source',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'sourceRef',
        displayName: 'SourceRef',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'artifacts',
        displayName: 'Artifacts',
        type: 'json',
        required: true,
        placeholder:' [ { "dataType": "file", "data": "logo.svg;image/svg+xml;PD94bWwgdmVyc2lvbj0...", "message": "placeholder" },...]',
        default: '[]',
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
    },
    {
        name: 'follow',
        displayName: 'Follow',
        type: 'boolean',
        required: true,
        default: true,
        displayOptions: { show: { resource: ['alert'], operation: ['create'] } }
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
        displayOptions:{show:{resource:['alert'],operation:['execute_responder']},hide:{id:['']}}
    },
    // optional attributs (Create, Promote operations)
    {
        name:'optionals',
        displayName: 'Add Optional attribute',
        type:'collection',
        required:false,
        default:'',
        displayOptions: { show: { resource: ['alert'], operation: ['create','promote'] } },
        options:[
            {
                name:'caseTemplate',
                displayName:'Case Template',
                type:'string',
                required:false,
                default:'',
            },
        ]
    },
    // optional attributs (Update operation)
    {
        name:'optionals',
        displayName: 'Add Optional attribute',
        type:'collection',
        required:false,
        default:'',
        displayOptions: { show: { resource: ['alert'], operation: ['update'] } },
        options:[
            {
                name:'caseTemplate',
                displayName:'Case Template',
                type:'string',
                required:false,
                default:'',
            },
            {
                name: 'title',
                displayName: 'Title',
                type: 'string',
                required: false,
                default: '',
            },
            {
                name: 'description',
                displayName: 'Description',
                type: 'string',
                required: false,
                default: '',
            },
            {
                name: 'severity',
                displayName: 'Severity',
                type: 'options',
                options:[{name:'Low',value:1},{name:'Medium',value:2},{name:'High',value:3},],
                required: false,
                default: 2,
            },{
                name: 'tags',
                displayName: 'Alert Tags',
                type: 'string',
                required: false,
                default: '',
                placeholder:'tag,tag2,tag3...',
            },
            {
                name: 'tlp',
                displayName: 'TLP',
                type: 'options',
                required: false,
                default: 2,
                options: [
                    {
                        name:'White',
                        value:TLP.white
                    },
                    {
                        name:'Green',
                        value:TLP.green
                    },
                    {
                        name:'Amber',
                        value:TLP.amber
                    },{
                        name:'Red',
                        value:TLP.red
                    }
        
                ],
            },
            {
                name: 'status',
                displayName: 'Status',
                type: 'options',
                required: false,
                options:[
                    {name:'New',value:'New'},
                    {name:'Updated',value:'Updated'},
                    {name:'Ignored',value:'Ignored'},
                    {name:'Imported',value:'Imported'},
                ],
                default: 'New',
            },
            {
                name: 'artifacts',
                displayName: 'Artifacts',
                type: 'json',
                placeholder:' [ { "dataType": "file", "data": "logo.svg;image/svg+xml;PD94bWwgdmVyc2lvbj0...", "message": "placeholder" },...]',
                required: false,
                default: '[]',
            },
            {
                name: 'follow',
                displayName: 'Follow',
                type: 'boolean',
                required: false,
                default: true,
            },
        ]
    },
    // Query attributs (Search operation)
    {
        displayName:'Query Attributes',
        name:'query',
        required:false,
        default:{},
        type:'collection',
        displayOptions:{show:{resource:['alert'],operation:['search','count']}},
        options:[

            {
                name: 'title',
                displayName: 'Title',
                type: 'string',
                required: false,
                default: '',
            },
            {
                name: 'description',
                displayName: 'Description',
                type: 'string',
                required: false,
                default: '',
            },
            {
                name: 'severity',
                displayName: 'Severity',
                type: 'options',
                options:[{name:'Low',value:1},{name:'Medium',value:2},{name:'High',value:3},],
                required: false,
                default: 2,
            },{
                name: 'tags',
                displayName: 'Alert Tags',
                type: 'string',
                required: false,
                default: '',
                placeholder:'tag,tag2,tag3...',
            },
            {
                name: 'tlp',
                displayName: 'TLP',
                type: 'options',
                required: false,
                default: 2,
                options: [
                    {
                        name:'White',
                        value:TLP.white
                    },
                    {
                        name:'Green',
                        value:TLP.green
                    },
                    {
                        name:'Amber',
                        value:TLP.amber
                    },{
                        name:'Red',
                        value:TLP.red
                    }
        
                ],
            },
            {
                name: 'follow',
                displayName: 'Follow',
                type: 'boolean',
                required: false,
                default: true,
            },
        ]
    }
]  as INodeProperties[];