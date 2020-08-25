import { INodeProperties } from "n8n-workflow";
import { TLP } from '../interfaces/AlertInterface';

export const caseOperations = [
    {
        default: 'list',
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        required: true,
        displayOptions: {
            show: {
                resource: ['case']
            }
        },
        typeOptions:{
            loadOptionsDependsOn:['resource'],
            loadOptionsMethod:'loadCaseOptions'
        }
    },
] as INodeProperties[];

export const caseFields = [
    
    // Required fields
    {
        displayName: 'Case Id',
        name: 'id',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: { resource: ['case'], operation: ['update','execute_responder','fetch'] }
        }
    },
    {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        }
    },
    {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        }
    },
    {
        displayName: 'Severity',
        name: 'severity',
        type: 'options',
        options: [{ name: 'Low', value: 1 }, { name: 'Medium', value: 2 }, { name: 'High', value: 3 },],
        required: true,
        default: 2,
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        }
    },
    {
        displayName: 'Start Date',
        name: 'startDate',
        type: 'dateTime',
        required: true,
        default:'',
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        }
    },
    {
        displayName: 'Owner',
        name: 'owner',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        }
    },
    {
        displayName: 'Flag',
        name: 'flag',
        type: 'boolean',
        required: true,
        default:false,
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        }
    },
    {
        displayName: 'TLP',
        name: 'tlp',
        type: 'options',
        default: 2,
        required: true,
        options: [
            {
                name: 'White',
                value: TLP.white
            },
            {
                name: 'Green',
                value: TLP.green
            },
            {
                name: 'Amber',
                value: TLP.amber
            }, {
                name: 'Red',
                value: TLP.red
            }

        ],
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        }

    },
    {
        displayName: 'Case Tags',
        name: 'tags',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        }
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
        displayOptions:{show:{resource:['case'],operation:['execute_responder']},hide:{id:['']}}
    },
    // Optional fields (Create operation)
    {
        type:'collection',
        displayName:'Optional attributs',
        name:'optionals',
        displayOptions: {
            show: { resource: ['case'], operation: ['create'] }
        },
        default:'',
        required:false,
        options:[
            { 
                displayName: 'Resolution Status',
                name: 'resolutionStatus',
                type: 'options',
                required: false,
                default:'',
                options:[
                    {value:'Indeterminate',name:'Indeterminate'},
                    {value:'FalsePositive',name:'FalsePositive'},
                    {value:'TruePositive',name:'TruePositive'},
                    {value:'Other',name:'Other'},
                    {value:'Duplicated',name:'Duplicated'},
                ],
                   
            },
            { 
                displayName: 'Impact Status',
                name: 'impactStatus',
                type: 'options',
                required:false,
                default:'',
                options:[
                    {name:'NoImpact',value:'NoImpact'},
                    {name:'WithImpact',value:'WithImpact'},
                    {name:'NotApplicable',value:'NotApplicable'},
                ],
                    
            },
            { 
                displayName: 'Summary',
                name: 'summary',
                type: 'string',
                default:'',
                required:false,
                  
            },
            { 
                displayName: 'End Date',
                name: 'endDate',
                default:'',
                type: 'dateTime',
                required:false,
                 
            },
            { 
                displayName: 'Metrics',
                name: 'metrics',
                default:'[]',
                type: 'json',
                required:false,
                 
            },
        ]
    },
    // Optional fields (Update operations)
    {
        type:'collection',
        displayName:'Optional attributs',
        name:'optionals',
        displayOptions: {
            show: { resource: ['case'], operation: ['update'] }
        },
        default:'',
        required:false,
        options:[
            {
                displayName: 'Title',
                name: 'title',
                type: 'string',
                default: '',
                required: false,
            },
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                required: false,
            },
            {
                displayName: 'Severity',
                name: 'severity',
                type: 'options',
                options: [{ name: 'Low', value: 1 }, { name: 'Medium', value: 2 }, { name: 'High', value: 3 },],
                required: false,
                default: 2,
            },
            {
                displayName: 'Status',
                name: 'status',
                type: 'options',
                options: [{ name: 'Open', value: 'Open' }, { name: 'Resolved', value: 'Resolved' }, { name: 'Deleted', value: 'Deleted' },],
                required: false,
                default: 'Open',
            },
            {
                displayName: 'Start Date',
                name: 'startDate',
                type: 'dateTime',
                required: false,
                default:''
            },
            {
                displayName: 'Owner',
                name: 'owner',
                type: 'string',
                default: '',
                required: false,
            },
            {
                displayName: 'Flag',
                name: 'flag',
                type: 'boolean',
                required: false,
                default:false,
            },
            {
                displayName: 'TLP',
                name: 'tlp',
                type: 'options',
                default: 2,
                required: false,
                options: [
                    {
                        name: 'White',
                        value: TLP.white
                    },
                    {
                        name: 'Green',
                        value: TLP.green
                    },
                    {
                        name: 'Amber',
                        value: TLP.amber
                    }, {
                        name: 'Red',
                        value: TLP.red
                    }
        
                ],
        
            },
            {
                displayName: 'Case Tags',
                name: 'tags',
                type: 'string',
                default: '',
                required: false,
            },
            { 
                displayName: 'Resolution Status',
                name: 'resolutionStatus',
                type: 'options',
                required: false,
                default:'',
                options:[
                    {value:'Indeterminate',name:'Indeterminate'},
                    {value:'FalsePositive',name:'FalsePositive'},
                    {value:'TruePositive',name:'TruePositive'},
                    {value:'Other',name:'Other'},
                    {value:'Duplicated',name:'Duplicated'},
                ],
                   
            },
            { 
                displayName: 'Impact Status',
                name: 'impactStatus',
                type: 'options',
                required:false,
                default:'',
                options:[
                    {name:'NoImpact',value:'NoImpact'},
                    {name:'WithImpact',value:'WithImpact'},
                    {name:'NotApplicable',value:'NotApplicable'},
                ],
                    
            },
            { 
                displayName: 'Summary',
                name: 'summary',
                type: 'string',
                default:'',
                required:false,
                  
            },
            { 
                displayName: 'End Date',
                name: 'endDate',
                default:'',
                type: 'dateTime',
                required:false,
                 
            },
            { 
                displayName: 'Metrics',
                name: 'metrics',
                default:'[]',
                type: 'json',
                required:false,
                 
            }
        ]
    },
    // Query fields
    {
        displayName:'Query Attributes',
        name:'query',
        required:false,
        default:{},
        type:'collection',
        displayOptions:{show:{resource:['case'],operation:['search','count']}},
        options:[
            
            { 
                displayName: 'Summary',
                name: 'summary',
                type: 'string',
                default:'',
                required:false,
                  
            },
            {
                displayName: 'Title',
                name: 'title',
                type: 'string',
                default: '',
                required: false,
            },
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                required: false,
            },
            {
                displayName: 'Owner',
                name: 'owner',
                type: 'string',
                default: '',
                required: false,
            },
            {
                displayName: 'Severity',
                name: 'severity',
                type: 'options',
                options: [{ name: 'Low', value: 1 }, { name: 'Medium', value: 2 }, { name: 'High', value: 3 },],
                required: false,
                default: 2,
            },
            {
                displayName: 'Status',
                name: 'status',
                type: 'options',
                options: [{ name: 'Open', value: 'Open' }, { name: 'Resolved', value: 'Resolved' }, { name: 'Deleted', value: 'Deleted' },],
                required: false,
                default: 'Open',
            },
            {
                displayName: 'TLP',
                name: 'tlp',
                type: 'options',
                default: 2,
                required: false,
                options: [
                    {
                        name: 'White',
                        value: TLP.white
                    },
                    {
                        name: 'Green',
                        value: TLP.green
                    },
                    {
                        name: 'Amber',
                        value: TLP.amber
                    }, {
                        name: 'Red',
                        value: TLP.red
                    }
        
                ],
        
            },
            {
                displayName: 'Start Date',
                name: 'startDate',
                type: 'dateTime',
                required: false,
                default:''
            },
            { 
                displayName: 'End Date',
                name: 'endDate',
                default:'',
                type: 'dateTime',
                required:false,
                 
            },
            {
                displayName: 'Flag',
                name: 'flag',
                type: 'boolean',
                required: false,
                default:false,
            },
            
            {
                displayName: 'Case Tags',
                name: 'tags',
                type: 'string',
                default: '',
                required: false,
            },
            { 
                displayName: 'Resolution Status',
                name: 'resolutionStatus',
                type: 'options',
                required: false,
                default:'',
                options:[
                    {value:'Indeterminate',name:'Indeterminate'},
                    {value:'FalsePositive',name:'FalsePositive'},
                    {value:'TruePositive',name:'TruePositive'},
                    {value:'Other',name:'Other'},
                    {value:'Duplicated',name:'Duplicated'},
                ],
                   
            },
            { 
                displayName: 'Impact Status',
                name: 'impactStatus',
                type: 'options',
                required:false,
                default:'',
                options:[
                    {name:'NoImpact',value:'NoImpact'},
                    {name:'WithImpact',value:'WithImpact'},
                    {name:'NotApplicable',value:'NotApplicable'},
                ],
                    
            },
        ]
    }
] as INodeProperties[];