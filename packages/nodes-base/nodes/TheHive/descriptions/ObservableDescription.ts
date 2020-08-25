import { INodeProperties } from "n8n-workflow";
import {TLP} from '../interfaces/AlertInterface';

export const observableOperations = [
    {
        default:'list',
        displayName:'Operation',
        name:'operation',
        type:'options',
        required:true,
        displayOptions:{
            show:{
                resource:['observable']
            }
        },
        typeOptions:{
            loadOptionsDependsOn:['resource'],
            loadOptionsMethod:'loadObservableOptions'
        },
        
    },
] as INodeProperties[];

export const observableFields = [
    // required attributs
    {
        name:'id',
        displayName:'Observable Id',
        required:true,
        type:'string',
        default:'',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['update','execute_responder','execute_analyzer','fetch']
            }
        },
    },
    {
        name:'caseid',
        displayName:'Case Id',
        required:true,
        type:'string',
        default:'',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create','list']
            }
        },
    },
    {
        name:'dataType',
        displayName:'Data Type',
        required:true,
        type:'options',
        default:'',
        options:[
            {name:'domain',value:'domain'},
            {name:'file',value:'file'},
            {name:'filename',value:'filename'},
            {name:'fqdn',value:'fqdn'},
            {name:'hash',value:'hash'},
            {name:'ip',value:'ip'},
            {name:'mail',value:'mail'},
            {name:'mail_subject',value:'mail_subject'},
            {name:'other',value:'other'},
            {name:'regexp',value:'regexp'},
            {name:'registry',value:'registry'},
            {name:'uri_path',value:'uri_path'},
            {name:'url',value:'url'},
            {name:'user-agent',value:'user-agent'}
        ],
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create','execute_analyzer']
            }
        }
    },
    {
        name:'data',
        displayName:'Data',
        required:true,
        type:'string',
        default:'',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create'],
            },
            hide:{dataType:['file'],}
        }
    },
    {
        name:'attachmentType',
        displayName:'Attachment type',
        required:true,
        type:'options',
        default:'path',
        options:[{name:'Path',value:'path'},{name:'Binary',value:'binary'}],
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create'],
                dataType:['file']
            },
        }
    },
    {
        name:'attachment',
        displayName:'Attachment Path',
        required:true,
        default:'',
        type:'string',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create'],
                dataType:['file'],
                attachmentType:['path']
            }
        }
    }, 
    {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        required:true,
        default: '',
        description: 'Attachment’s file name',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create'],
                dataType:['file'],
                attachmentType:['binary']
            }
        }
    },
    {
        displayName: 'Mime Type',
        name: 'mimeType',
        type: 'string',
        default: '',
        description: 'Attachment’s mime type',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create'],
                dataType:['file'],
                attachmentType:['binary']
            }
        }
    },
    {
        displayName: 'Data',
        name: 'data',
        type: 'string',
        required:true,
        default: '',
        placeholder: 'ZXhhbXBsZSBmaWxl',
        description: 'Base64-encoded stream of data.',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create'],
                dataType:['file'],
                attachmentType:['binary']
            }
        }
    },


    {
        name:'message',
        displayName:'Message',
        required:true,
        type:'string',
        default:'',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create']
            }
        }
        
    },
    {
        name:'startDate',
        displayName:'Start Date',
        required:true,
        type:'dateTime',
        default:'',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create']
            }
        }
    },
    {
        name:'tlp',
        displayName:'TLP',
        required:true,
        type:'options',
        default: 2,
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create']
            }
        },
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
        name:'ioc',
        displayName:'IOC',
        description:'Indicator of compromise',
        required:true,
        type:'boolean',
        default:false,
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create']
            }
        }
    },
    {
        name:'sighted',
        displayName:'Sighted',
        description:'sighted previously',
        required:true,
        type:'boolean',
        default:false,
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create']
            }
        }
    },
    {
        name:'status',
        displayName:'Status',
        required:true,
        type:'options',
        default:'',
        options:[
            {name:'Ok',value:'Ok'},
            {name:'Deleted',value:'Deleted'},
        ],
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create',]
            }
        }
    },
    // required for analyzer execution
    {
        name:'analyzer',
        displayName:'Analyzer',
        type:'multiOptions',
        required:true,
        typeOptions:{
            loadOptionsDependsOn:['id','dataType'],
            loadOptionsMethod:'loadAnalyzers',
        },
        default:[],
        displayOptions:{show:{resource:['observable'],operation:['execute_analyzer']},hide:{id:['']}}
    },
    
    // required for responder execution
    {
        name:'responder',
        displayName:'Responder',
        type:'multiOptions',
        required:true,
        default:[],
        typeOptions:{
            loadOptionsDependsOn:['id'],
            loadOptionsMethod:'loadResponders'
        },
        displayOptions:{show:{resource:['observable'],operation:['execute_responder']},hide:{id:['']}}
    },
    // Optional attributes (Create operation)
    {
        displayName:'Optional attribute',
        name:'optionals',
        type:'collection',
        required:false,
        default:'',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['create']
            }
        },
        options:[
            {
                displayName:'Observable Tags',
                name:'tags',
                type:'string',
                placeholder:'tag1,tag2',
                default:'',
                required:false,
              
            }
        ]
    },
    // Optional attributes (Update operation)
    {
        displayName:'Optional attribute',
        name:'optionals',
        type:'collection',
        required:false,
        default:'',
        displayOptions:{
            show:{
                resource:['observable'],
                operation:['update']
            }
        },
        options:[
            {
                name:'message',
                displayName:'Message',
                required:false,
                type:'string',
                default:''
            },
            {
                displayName:'Observable Tags',
                name:'tags',
                type:'string',
                placeholder:'tag1,tag2',
                default:'',
                required:false,
              
            },
            {
                name:'tlp',
                displayName:'TLP',
                required:false,
                type:'options',
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
                name:'ioc',
                displayName:'IOC',
                description:'Indicator of compromise',
                required:false,
                type:'boolean',
                default:false
            },
            {
                name:'sighted',
                displayName:'Sighted',
                description:'sighted previously',
                required:false,
                type:'boolean',
                default:false,
            },
            {
                name:'status',
                displayName:'Status',
                required:false,
                type:'options',
                default:'',
                options:[
                    {name:'Ok',value:'Ok'},
                    {name:'Deleted',value:'Deleted'},
                ],
            },
        ]
    },
    // query attributes
    {
        displayName:'Query Attributes',
        name:'query',
        required:false,
        default:'',
        type:'collection',
        displayOptions:{show:{resource:['observable'],operation:['search','count']}},
        options:[
            {
                displayName:'Keyword',
                name:'keyword',
                type:'string',
                placeholder:'exp,freetext',
                default:'',
                required:false,
            },
            {
                displayName:'Description',
                name:'description',
                type:'string',
                placeholder:'exp,freetext',
                default:'',
                required:false,
            },
            {
                name:'status',
                displayName:'Status',
                required:false,
                type:'options',
                default:'',
                options:[
                    {name:'Ok',value:'Ok'},
                    {name:'Deleted',value:'Deleted'},
                ],
            },
            {
                displayName:'Observable Tags',
                name:'tags',
                type:'string',
                placeholder:'tag1,tag2',
                default:'',
                required:false,
            },
            {
                name:'tlp',
                displayName:'TLP',
                required:false,
                type:'options',
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
                name:'ioc',
                displayName:'IOC',
                description:'Indicator of compromise',
                required:false,
                type:'boolean',
                default:false,

            },
            {
                name:'sighted',
                displayName:'Sighted',
                required:false,
                type:'boolean',
                default:false

            },
            {
                name:'data',
                displayName:'Value',
                required:false,
                placeholder:'example.com; 8.8.8.8',
                type:'string',
                default:'',

            },
            {
                name:'dataType',
                displayName:'Data Type',
                required:false,
                type:'multiOptions',
                default:'',
                options:[
                    {name:'domain',value:'domain'},
                    {name:'file',value:'file'},
                    {name:'filename',value:'filename'},
                    {name:'fqdn',value:'fqdn'},
                    {name:'hash',value:'hash'},
                    {name:'ip',value:'ip'},
                    {name:'mail',value:'mail'},
                    {name:'mail_subject',value:'mail_subject'},
                    {name:'other',value:'other'},
                    {name:'regexp',value:'regexp'},
                    {name:'registry',value:'registry'},
                    {name:'uri_path',value:'uri_path'},
                    {name:'url',value:'url'},
                    {name:'user-agent',value:'user-agent'}
                ],
            },
            {
                name:'message',
                displayName:'Message',
                required:false,
                type:'string',
                default:''
            },
            {
                displayName:'Date range',
                type:'fixedCollection',
                name:'range',
                default:{},
                options:[
                    {
                        displayName:'Add date range inputs',
                        name:'dateRange',
                        values:[
                            {
                                displayName:'From date',
                                name:'fromDate',
                                type:'dateTime',
                                default:'',
                                required:false,
                            },
                            {
                                displayName:'To date',
                                name:'toDate',
                                type:'dateTime',
                                default:'',
                                required:false,
                            }
                        ]
                    }
                ]
            }
        ]
    }
] as INodeProperties[];