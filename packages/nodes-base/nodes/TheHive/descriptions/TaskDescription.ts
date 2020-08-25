import { INodeProperties } from "n8n-workflow";

export const taskOperations = [
    {
        default:'list',
        displayName:'Operation',
        name:'operation',
        type:'options',
        required:true,
        displayOptions:{
            show:{
                resource:['task']
            }
        },
        typeOptions:{
            loadOptionsDependsOn:['operation'],
            loadOptionsMethod:'loadTaskOptions'
        }
    },
] as INodeProperties[];

export const taskFields = [
    {
        name:'id',
        displayName:'Task Id',
        type:'string',
        required:true,
        default:'',
        displayOptions:{
            show:{
                resource:['task'], operation:['update','execute_responder','fetch']
            }
        },
    },
    {
        name:'caseId',
        displayName:'Case Id',
        type:'string',
        required:true,
        default:'',
        displayOptions:{
            show:{
                resource:['task'], operation:['create','list']
            }
        },
    },
    {
        name:'title',
        displayName:'Title',
        type:'string',
        required:true,
        default:'',
        displayOptions:{
            show:{
                resource:['task'], operation:['create']
            }
        },
    },
    {
        name:'status',
        displayName:'status',
        type:'options',
        default:'Waiting',
        options:[
            {name:'Waiting',value:'Waiting'},
            {name:'InProgress',value:'InProgress'},
            {name:'Completed',value:'Completed'},
            {name:'Cancel',value:'Cancel'},
        ],
        required:true,
        displayOptions:{
            show:{
                resource:['task'], operation:['create']
            }
        },
    },
    {
        name:'flag',
        displayName:'Flag',
        type:'boolean',
        required:true,
        default:false,
        displayOptions:{
            show:{
                resource:['task'], operation:['create']
            }
        },
    },
    // required for responder execution
    {
        name:'responder',
        displayName:'Responder',
        type:'multiOptions',
        default:[],
        required:true,
        typeOptions:{
            loadOptionsDependsOn:['id'],
            loadOptionsMethod:'loadResponders'
        },
        displayOptions:{show:{resource:['task'],operation:['execute_responder']},hide:{id:['']}}
    },
    // optional attributes (Create operations)
    {
        type:'collection',
        displayName:'Optional attributes',
        name:'optionals',
        default:'',
        required:false,
        displayOptions: { show: { resource: ['task'], operation: ['create'] } },
        options:[
            {   
                name:'owner',default:'',
                displayName:'Owner',
                type:'string',
                required:false,
            },
            {
                name:'description',
                default:'',
                displayName:'Description',
                type:'string',
                required:false,
            },
            {
                name:'startDate',
                default:'',
                displayName:'Start Date',
                type:'dateTime',
                required:false,
            },
            {
                name:'endDate',
                default:'',
                displayName:'End Date',
                type:'dateTime',
                required:false,
            },
        ],
        
    },
    // optional attributes (Update operation)

    {
        type:'collection',
        displayName:'Optional attributes',
        name:'optionals',
        default:'',
        required:false,
        displayOptions: { show: { resource: ['task'], operation: ['update'] } },
        options:[
            {   
                name:'owner',default:'',
                displayName:'Owner',
                type:'string',
                required:false,
            },
            {
                name:'description',
                default:'',
                displayName:'Description',
                type:'string',
                required:false,
            },
            {
                name:'startDate',
                default:'',
                displayName:'Start Date',
                type:'dateTime',
                required:false,
            },
            {
                name:'endDate',
                default:'',
                displayName:'End Date',
                type:'dateTime',
                required:false,
            },
            {
                name:'title',
                displayName:'Title',
                type:'string',
                required:false,
                default:'',
            },
            {
                name:'status',
                displayName:'status',
                type:'options',
                default:'Waiting',
                options:[
                    {name:'Waiting',value:'Waiting'},
                    {name:'InProgress',value:'InProgress'},
                    {name:'Completed',value:'Completed'},
                    {name:'Cancel',value:'Cancel'},
                ],
                required:false,
            },
            {
                name:'flag',
                displayName:'Flag',
                type:'boolean',
                required:false,
                default:false,
            },
        ],
        
    },
    // query attributes
    
    {
        displayName:'Query Attributes',
        name:'query',
        required:false,
        default:{},
        type:'collection',
        displayOptions:{show:{resource:['task'],operation:['search','count']}},
        options:[
            {   
                name:'owner',default:'',
                displayName:'Owner',
                type:'string',
                required:false,
            },
            {
                name:'description',
                default:'',
                displayName:'Description',
                type:'string',
                required:false,
            },
            {
                name:'startDate',
                default:'',
                displayName:'Start Date',
                type:'dateTime',
                required:false,
            },
            {
                name:'endDate',
                default:'',
                displayName:'End Date',
                type:'dateTime',
                required:false,
            },
            {
                name:'title',
                displayName:'Title',
                type:'string',
                required:false,
                default:'',
            },
            {
                name:'status',
                displayName:'Status',
                type:'options',
                default:'Waiting',
                options:[
                    {name:'Waiting',value:'Waiting'},
                    {name:'InProgress',value:'InProgress'},
                    {name:'Completed',value:'Completed'},
                    {name:'Cancel',value:'Cancel'},
                ],
                required:false,
            },
            {
                name:'flag',
                displayName:'Flag',
                type:'boolean',
                required:false,
                default:false,
            },
        ],
    }
] as INodeProperties[];
