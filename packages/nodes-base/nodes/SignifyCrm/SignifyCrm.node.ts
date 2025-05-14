import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import {
    contactFields,
	contactOperations,
    accountOperations,
    accountFields,
    leadFields,
    leadOperations,
    opportunityOperations,
    opportunityFields,
    casesOperations,
    casesFields,
    taskOperations,
    taskFields,
} from './descriptions';
import {
    signifyCrmApiRequest,
    signifyCrmGetUserId,
    getPicklistOptions,
} from './GenericFunctions';
import type {
	CamelCaseResource,
} from './types';

export class SignifyCrm implements INodeType {
	description: INodeTypeDescription = {
		// Basic node details will go here
        displayName: 'SignifyCRM',
        name: 'SignifyCrm',
        icon: 'file:signifycrm.svg',
        group: ['transform'],
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        version: 1,
        description: 'Consume SignifyCRM API',
        defaults: {
            name: 'SignifyCRM',
        },
        usableAsTool: true,
        inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'signifyCrmApi',
                required: true,
            },
        ],

        // Define the resources and operations
		properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
						name: 'Accounts',
						value: 'account',
					},
                    {
						name: 'Contacts',
						value: 'contact',
					},
                    {
						name: 'Leads',
						value: 'lead',
					},
                    {
						name: 'Opportunities',
						value: 'opportunity',
					},
                    {
						name: 'Cases',
						value: 'case',
					},
                    {
						name: 'Task',
						value: 'task',
					},
				],
                default: 'contact',
            },
            ...contactOperations,
			...contactFields,
            ...accountOperations,
			...accountFields,
            ...leadOperations,
			...leadFields,
            ...opportunityOperations,
			...opportunityFields,
            ...casesOperations,
			...casesFields,
            ...taskOperations,
			...taskFields,
		]
	};

    methods = {
		loadOptions: {
            // ----------------------------------------
			//        resource picklist options
			// ----------------------------------------

			async getUserList(this: ILoadOptionsFunctions) {
				return await getPicklistOptions.call(this, 'contact', 'assigned_user_id');
			},

            async getCampaignList(this: ILoadOptionsFunctions) {
				return await getPicklistOptions.call(this, 'lead', 'campaign_id');
			},

            async getAccountList(this: ILoadOptionsFunctions) {
				return await getPicklistOptions.call(this, 'opportunity', 'account_id');
			},

            async getCurrencyList(this: ILoadOptionsFunctions) {
				return await getPicklistOptions.call(this, 'currency', 'currency_id');
			},

            async getContactList(this: ILoadOptionsFunctions) {
				return await getPicklistOptions.call(this, 'case', 'contact_id');
			},
			
            async getOpportunityList(this: ILoadOptionsFunctions) {
				return await getPicklistOptions.call(this, 'case_opportunity', 'contact_id');
			},

            async getRelatedModuleIds(this: ILoadOptionsFunctions) {
				return await getPicklistOptions.call(this, 'task', 'parent_id');
			},

		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as CamelCaseResource;
        const operation = this.getNodeParameter('operation', 0);

		let responseData;

		for (let i = 0; i < items.length; i++) {

			try {

                if (resource === 'account') {
                    // **********************************************************************
                    //                                account
                    // **********************************************************************

                    if (operation === 'create') {
                        // ----------------------------------------
                        //             account: create
                        // ----------------------------------------

                        const currentUserId = await signifyCrmGetUserId.call(this);

                        // Required Fields
                        const name          = this.getNodeParameter('name',          i) as string;
                        const accountType   = this.getNodeParameter('account_type',  i) as string;
                        const industry      = this.getNodeParameter('industry',      i) as string;
                        const status        = this.getNodeParameter('status',        i) as string;
                        const assignedUser  = this.getNodeParameter('assigned_user_id', i, '') as string;

                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const nameValueList: Array<{ name: string; value: string }> = [
                            { name: 'assigned_user_id', value: assignedUser || currentUserId },
                            { name: 'name',             value: name         },
                            { name: 'account_type',     value: accountType  },
                            { name: 'industry',         value: industry     },
                            { name: 'status',           value: status       },
                        ];

                        for (const [fieldName, fieldValue] of Object.entries(additionalFields)) {
                            if (fieldValue !== undefined && fieldValue !== '') {
                                nameValueList.push({
                                    name: fieldName,
                                    value: String(fieldValue),
                                });
                            }
                        }

                        const body: IDataObject = {
                            module_name:     'Accounts',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'delete') {
                        // ----------------------------------------
                        //             account: delete
                        // ----------------------------------------

                        const accountId = this.getNodeParameter('accountId', i);

                        const nameValueList = [
                            { name: 'id',      value: accountId },
                            { name: 'deleted', value: '1'         },
                        ];

                        const body: IDataObject = {
                            module_name:      'Accounts',
                            name_value_list:  nameValueList,
                            track_view:       '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'get') {
                        // ----------------------------------------
                        //               account: get
                        // ----------------------------------------

                        const accountId = this.getNodeParameter('accountId', i);

                        // Build a minimal payload: no select_fields, no links, no track_view
                        const body: IDataObject = {
                            module_name: 'Accounts',
                            id: accountId,
                            select_fields: [
                                "id",
                                "name",
                                "account_type",
                                "last_name",
                                "email1",
                                "title",
                                "phone_mobile",
                                "phone_work",
                                "department",
                                "birthdate",
                                "description",
                                "assigned_user_id", 
                            ],
                            link_name_to_fields: [], 
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry', body);
                    } else if (operation === 'getAll') {
                        // ----------------------------------------
                        //             account: getAll
                        // ----------------------------------------

                        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                        const limit = this.getNodeParameter('limit', i, 5) as number;

                        let targetCount: number;

                        if (returnAll) {
                            // Ask the CRM how many Accounts exist (non-deleted)
                            const countRes = await signifyCrmApiRequest.call(
                                this,
                                'POST',
                                '/get_entries_count',
                                {
                                    module_name: 'Accounts',
                                    query:       "accounts.deleted = 0",
                                },
                            );

                            // result_count is a string → convert to number
                            targetCount = Number(countRes.data.result_count ?? 0);
                        } else {
                            targetCount = limit;
                        }

                        const body: IDataObject = {
                            module_name: 'Accounts',
                            str_query: "", 
                            str_order_by: "", // or set ordering if needed
                            offset: 0,
                            select_fields: [
                                "id",
                                "name",
                                "account_type",
                                "last_name",
                                "email1",
                                "title",
                                "phone_mobile",
                                "phone_work",
                                "department",
                                "birthdate",
                                "description",
                                "assigned_user_id", 
                            ],
                            link_name_to_fields: [],
                            max_results: targetCount,
                            deleted: '',
                            favorites: '',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry_list', body);
                    } else if (operation === 'update') {
                        
                        // ----------------------------------------
                        //             account: update
                        // ----------------------------------------

                        const currentUserId = await signifyCrmGetUserId.call(this);
                        const accountId = this.getNodeParameter('accountId', i) as string;

                        // Required Fields
                        const name          = this.getNodeParameter('name',          i) as string;
                        const accountType   = this.getNodeParameter('account_type',  i) as string;
                        const industry      = this.getNodeParameter('industry',      i) as string;
                        const status        = this.getNodeParameter('status',        i) as string;
                        const assignedUser  = this.getNodeParameter('assigned_user_id', i, '') as string;

                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const nameValueList: Array<{ name: string; value: string }> = [
                            { name: 'id',               value: accountId },
                        ];

                        const pushIf = (name: string, val: unknown) => {
                            if (val !== undefined && val !== '') {
                                nameValueList.push({ name, value: String(val) });
                            }
                        };

                        pushIf('assigned_user_id', assignedUser || currentUserId);
                        pushIf('name',             name);
                        pushIf('account_type',     accountType);
                        pushIf('industry',         industry);
                        pushIf('status',           status);

                        for (const [key, val] of Object.entries(additionalFields)) {
                            pushIf(key, val);
                        }

                        const body: IDataObject = {
                            module_name: 'Accounts',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    }
                } else if (resource === 'contact') {
                    // **********************************************************************
                    //                                contact
                    // **********************************************************************

                    if (operation === 'create') {
                        // ----------------------------------------
                        //             contact: create
                        // ----------------------------------------

                        // required top-level for every set_entry call
                        const userId = await signifyCrmGetUserId.call(this);
                        const module_name = 'Contacts';
                        const track_view = '1';
                        const salutation = this.getNodeParameter('salutation', i) as string;
                        const firstName   = this.getNodeParameter('first_name', i) as string;
                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'assigned_user_id', value: userId },
                            { name: 'salutation', value: salutation },
                            { name: 'first_name', value: firstName },
                        ];

                        for (const [fieldName, fieldValue] of Object.entries(additionalFields)) {
                            if (fieldValue !== undefined && fieldValue !== '') {
                                nameValueList.push({
                                    name: fieldName,
                                    value: String(fieldValue),
                                });
                            }
                        }

                        const body: IDataObject = {
                            module_name,
                            name_value_list: nameValueList,
                            track_view,
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'delete') {
                        // ----------------------------------------
                        //             contact: delete
                        // ----------------------------------------

                        const contactId = this.getNodeParameter('contactId', i);

                        const nameValueList = [
                            { name: 'id',      value: contactId },
                            { name: 'deleted', value: '1'       },
                        ];

                        const body: IDataObject = {
                            module_name:      'Contacts',
                            name_value_list:  nameValueList,
                            track_view:       '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'get') {
                        // ----------------------------------------
                        //               contact: get
                        // ----------------------------------------

                        const contactId = this.getNodeParameter('contactId', i);

                        // Build a minimal payload: no select_fields, no links, no track_view
                        const body: IDataObject = {
                            module_name: 'Contacts',
                            id: contactId,
                            select_fields: [
                                "id",
                                "salutation",
                                "first_name",
                                "last_name",
                                "email1",
                                "title",
                                "phone_mobile",
                                "phone_work",
                                "department",
                                "birthdate",
                                "description",
                                "assigned_user_id", 
                            ],
                            link_name_to_fields: [], 
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry', body);
                    } else if (operation === 'getAll') {
                        // ----------------------------------------
                        //             contact: getAll
                        // ----------------------------------------

                        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                        const limit = this.getNodeParameter('limit', i, 5) as number;

                        let targetCount: number;

                        if (returnAll) {
                            // Ask the CRM how many Accounts exist (non-deleted)
                            const countRes = await signifyCrmApiRequest.call(
                                this,
                                'POST',
                                '/get_entries_count',
                                {
                                    module_name: 'Accounts',
                                    query:       "accounts.deleted = 0",
                                },
                            );

                            // result_count is a string → convert to number
                            targetCount = Number(countRes.data.result_count ?? 0);
                        } else {
                            targetCount = limit;
                        }

                        const body: IDataObject = {
                            module_name: 'Contacts',
                            str_query: "",  // optionally build query here
                            str_order_by: "", // or set ordering if needesd
                            offset: 0,
                            select_fields: [
                                "salutation",
                                "first_name",
                                "last_name",
                                "email1",
                                "title",
                                "phone_mobile",
                                "phone_work",
                                "department",
                                "birthdate",
                                "description",
                                "assigned_user_id", 
                            ],
                            link_name_to_fields: [],
                            max_results: targetCount,
                            deleted: '',
                            favorites: '',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry_list', body);
                    } else if (operation === 'update') {
                        // ----------------------------------------
                        //             contact: update
                        // ----------------------------------------
                        
                        const contactId = this.getNodeParameter('contactId', i) as string;

                        const module_name = 'Contacts';
                        const track_view = '1';

                        const salutation = this.getNodeParameter('salutation', i, '') as string;
                        const firstName = this.getNodeParameter('first_name', i, '') as string;
                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'id', value: contactId },
                        ];

                        const pushIf = (name: string, val: unknown) => {
                            if (val !== undefined && val !== '') {
                                nameValueList.push({ name, value: String(val) });
                            }
                        };

                        pushIf('salutation',       salutation);
	                    pushIf('first_name',       firstName);

                        const skip = new Set(['assigned_user_id']);
                        for (const [key, val] of Object.entries(additionalFields)) {
                            if (skip.has(key)) continue;
                            pushIf(key, val);
                        }

                        const body: IDataObject = {
                            module_name,
                            name_value_list: nameValueList,
                            track_view,
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    }
                } else if (resource === 'lead') {
                    // **********************************************************************
                    //                                lead
                    // **********************************************************************

                    if (operation === 'create') {
                        // ----------------------------------------
                        //             lead: create
                        // ----------------------------------------

                        const userId = await signifyCrmGetUserId.call(this);

                        const salutation   = this.getNodeParameter('salutation',    i, '') as string;
                        const firstName    = this.getNodeParameter('first_name',    i)    as string;
                        const status       = this.getNodeParameter('status',        i)    as string;

                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const assignedUser = additionalFields.assigned_user_id as string | undefined;

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'assigned_user_id', value: assignedUser || userId },
                            { name: 'salutation', value: salutation },
                            { name: 'first_name', value: firstName },
                            { name: 'status', value: status },
                        ];

                        for (const [fieldName, fieldValue] of Object.entries(additionalFields)) {
                            if (fieldValue !== undefined && fieldValue !== '' && fieldValue !== 'assigned_user_id') {
                                nameValueList.push({
                                    name: fieldName,
                                    value: String(fieldValue),
                                });
                            }
                        }

                        const body: IDataObject = {
                            module_name: 'Leads',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'delete') {
                        // ----------------------------------------
                        //             lead: delete
                        // ----------------------------------------

                        const leadId = this.getNodeParameter('leadId', i);

                        const nameValueList = [
                            { name: 'id',      value: leadId },
                            { name: 'deleted', value: '1'       },
                        ];

                        const body: IDataObject = {
                            module_name:      'Leads',
                            name_value_list:  nameValueList,
                            track_view:       '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'get') {
                        // ----------------------------------------
                        //               lead: get
                        // ----------------------------------------

                        const leadId = this.getNodeParameter('leadId', i);

                        // Build a minimal payload: no select_fields, no links, no track_view
                        const body: IDataObject = {
                            module_name: 'Leads',
                            id: leadId,
                            select_fields: [
                                "id",
                                "salutation",
                                "first_name",
                                "last_name",
                                "status",
                                "account_name",
                                "email1",
                                "title",
                                "phone_work",
                                "phone_mobile",
                                "department",
                                "description", 
                                "lead_source",
                                "assigned_user_id", 
                                "campaign_id",
                            ],
                            link_name_to_fields: [], 
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry', body);
                    } else if (operation === 'getAll') {
                        // ----------------------------------------
                        //             lead: getAll
                        // ----------------------------------------

                        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                        const limit = this.getNodeParameter('limit', i, 5) as number;

                        let targetCount: number;

                        if (returnAll) {
             
                            const countRes = await signifyCrmApiRequest.call(
                                this,
                                'POST',
                                '/get_entries_count',
                                {
                                    module_name: 'Leads',
                                    query:       "leads.deleted = 0",
                                },
                            );

                            // result_count is a string → convert to number
                            targetCount = Number(countRes.data.result_count ?? 0);
                        } else {
                            targetCount = limit;
                        }

                        const body: IDataObject = {
                            module_name: 'Leads',
                            str_query: "",  // optionally build query here
                            str_order_by: "", // or set ordering if needesd
                            offset: 0,
                            select_fields: [
                                "id",
                                "salutation",
                                "first_name",
                                "last_name",
                                "status",
                                "account_name",
                                "email1",
                                "title",
                                "phone_work",
                                "phone_mobile",
                                "department",
                                "description", 
                                "lead_source",
                                "assigned_user_id", 
                                "campaign_id",
                            ],
                            link_name_to_fields: [],
                            max_results: targetCount,
                            deleted: '',
                            favorites: '',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry_list', body);
                    } else if (operation === 'update') {
                        // ----------------------------------------
                        //             targetCount: update
                        // ----------------------------------------

                        const userId = await signifyCrmGetUserId.call(this);
                        const leadId = this.getNodeParameter('leadId', i) as string;
                        
                        const salutation   = this.getNodeParameter('salutation',    i, '') as string;
                        const firstName    = this.getNodeParameter('first_name',    i)    as string;
                        const status       = this.getNodeParameter('status',        i)    as string;

                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const assignedUser = additionalFields.assigned_user_id as string | undefined;

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'id', value: leadId },
                        ];

                        const pushIf = (name: string, val: unknown) => {
                            if (val !== undefined && val !== '') {
                                nameValueList.push({ name, value: String(val) });
                            }
                        };

                        pushIf('assigned_user_id', assignedUser || userId);
                        pushIf('salutation',       salutation);
                        pushIf('first_name',       firstName);
                        pushIf('status',           status);
                        
                       const skip = new Set(['assigned_user_id']);
                        for (const [key, val] of Object.entries(additionalFields)) {
                            if (skip.has(key)) continue;
                            pushIf(key, val);
                        }

                        const body: IDataObject = {
                            module_name: 'Leads',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    }
                } else if (resource === 'opportunity') {
                    // **********************************************************************
                    //                                opportunity
                    // **********************************************************************

                    if (operation === 'create') {
                        // ----------------------------------------
                        //             opportunity: create
                        // ----------------------------------------

                        const userId = await signifyCrmGetUserId.call(this);

                        const name            = this.getNodeParameter('name',           i) as string;
                        const accountId       = this.getNodeParameter('account_id',     i) as string;
                        const amount          = this.getNodeParameter('amount',         i) as string;
                        const salesStage      = this.getNodeParameter('sales_stage',    i) as string;
                        const closeDate       = this.getNodeParameter('date_closed',    i) as string;
                        const oppType         = this.getNodeParameter('opportunity_type', i, '') as string;
                        const leadSource      = this.getNodeParameter('lead_source',    i, '') as string;
                        const currencyId      = this.getNodeParameter('currency_id',    i) as string;
             
                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const assignedUser = additionalFields.assigned_user_id as string | undefined;

                        const stageMap: Record<string, string> = {
                            'Prospecting': '10',
                            'Qualification': '20',
                            'Proposal/Price Quote': '65',
                            'Negotiation/Review': '80',
                            'Closed Won': '100',
                            'Closed Lost': '0',
                            'Postponed': '0',
                            'Cancelled': '0',
                        };

                        if (!additionalFields.probability || additionalFields.probability === '') {
                            additionalFields.probability = stageMap[salesStage] ?? '';
                        }

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'assigned_user_id', value: assignedUser || userId },
                            { name: 'name',             value: name },
                            { name: 'account_id',       value: accountId },
                            { name: 'amount',           value: amount },
                            { name: 'sales_stage',      value: salesStage },
                            { name: 'date_closed',      value: closeDate },
                            { name: 'opportunity_type', value: oppType },
                            { name: 'lead_source',      value: leadSource },
                            { name: 'currency_id',      value: currencyId },
                        ];

                        for (const [fieldName, fieldValue] of Object.entries(additionalFields)) {
                            if (fieldValue !== undefined && fieldValue !== '' && fieldValue !== 'assigned_user_id') {
                                nameValueList.push({
                                    name: fieldName,
                                    value: String(fieldValue),
                                });
                            }
                        }

                        const body: IDataObject = {
                            module_name: 'Opportunities',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'delete') {
                        // ----------------------------------------
                        //             opportunity: delete
                        // ----------------------------------------

                        const opportunityId = this.getNodeParameter('opportunityId', i);

                        const nameValueList = [
                            { name: 'id',      value: opportunityId },
                            { name: 'deleted', value: '1'       },
                        ];

                        const body: IDataObject = {
                            module_name:      'Opportunities',
                            name_value_list:  nameValueList,
                            track_view:       '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'get') {
                        // ----------------------------------------
                        //               opportunity: get
                        // ----------------------------------------

                        const opportunityId = this.getNodeParameter('opportunityId', i);

                        // Build a minimal payload: no select_fields, no links, no track_view
                        const body: IDataObject = {
                            module_name: 'Opportunities',
                            id: opportunityId,
                            select_fields: [
                                "id",
                                "name",
                                "account_id",
                                "opportunity_type",
                                "lead_source",
                                "sales_stage",
                                "currency_id",
                                "amount",
                                "date_closed",
                                "probability",
                                "next_step",
                                "description",
                                "assigned_user_id", 
                                "campaign_id",
                            ],
                            link_name_to_fields: [], 
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry', body);
                    } else if (operation === 'getAll') {
                        // ----------------------------------------
                        //             opportunity: getAll
                        // ----------------------------------------

                        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                        const limit = this.getNodeParameter('limit', i, 5) as number;

                        let targetCount: number;

                        if (returnAll) {
             
                            const countRes = await signifyCrmApiRequest.call(
                                this,
                                'POST',
                                '/get_entries_count',
                                {
                                    module_name: 'Opportunities',
                                    query:       "opportunities.deleted = 0",
                                },
                            );

                            // result_count is a string → convert to number
                            targetCount = Number(countRes.data.result_count ?? 0);
                        } else {
                            targetCount = limit;
                        }

                        const body: IDataObject = {
                            module_name: 'Opportunities',
                            str_query: "",  // optionally build query here
                            str_order_by: "", // or set ordering if needesd
                            offset: 0,
                            select_fields: [
                                "id",
                                "name",
                                "account_id",
                                "opportunity_type",
                                "lead_source",
                                "sales_stage",
                                "currency_id",
                                "amount",
                                "date_closed",
                                "probability",
                                "next_step",
                                "description",
                                "assigned_user_id", 
                                "campaign_id",
                            ],
                            link_name_to_fields: [],
                            max_results: targetCount,
                            deleted: '',
                            favorites: '',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry_list', body);
                    } else if (operation === 'update') {
                        // ----------------------------------------
                        //             opportunity: update
                        // ----------------------------------------

                        const userId = await signifyCrmGetUserId.call(this);
                        const opportunityId = this.getNodeParameter('opportunityId', i) as string;
                        
                        const name            = this.getNodeParameter('name',           i) as string;
                        const accountId       = this.getNodeParameter('account_id',     i) as string;
                        const amount          = this.getNodeParameter('amount',         i) as string;
                        const salesStage      = this.getNodeParameter('sales_stage',    i) as string;
                        const closeDate       = this.getNodeParameter('date_closed',    i) as string;
                        const oppType         = this.getNodeParameter('opportunity_type', i, '') as string;
                        const leadSource      = this.getNodeParameter('lead_source',    i, '') as string;
                        const currencyId      = this.getNodeParameter('currency_id',    i) as string;
             
                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const assignedUser = additionalFields.assigned_user_id as string | undefined;

                        const stageMap: Record<string, string> = {
                            'Prospecting': '10',
                            'Qualification': '20',
                            'Proposal/Price Quote': '65',
                            'Negotiation/Review': '80',
                            'Closed Won': '100',
                            'Closed Lost': '0',
                            'Postponed': '0',
                            'Cancelled': '0',
                        };

                        if (!additionalFields.probability || additionalFields.probability === '') {
                            additionalFields.probability = stageMap[salesStage] ?? '';
                        }

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'id', value: opportunityId },
                        ];

                        const pushIf = (name: string, value: unknown) => {
                            if (value !== undefined && value !== '') {
                                nameValueList.push({ name, value: String(value) });
                            }
                        };                    

                        pushIf('assigned_user_id', assignedUser || userId);
                        pushIf('name',             name);
                        pushIf('account_id',       accountId);
                        pushIf('amount',           amount);
                        pushIf('sales_stage',      salesStage);
                        pushIf('date_closed',      closeDate);
                        pushIf('opportunity_type', oppType);
                        pushIf('lead_source',      leadSource);
                        pushIf('currency_id',      currencyId);

                        const skip = new Set(['assigned_user_id']);
                        for (const [key, val] of Object.entries(additionalFields)) {
                            if (skip.has(key)) continue;
                            pushIf(key, val);
                        }

                        const body: IDataObject = {
                            module_name: 'Opportunities',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    }
                } else if (resource === 'case') {
                    // **********************************************************************
                    //                                case
                    // **********************************************************************

                    if (operation === 'create') {
                        // ----------------------------------------
                        //             case: create
                        // ----------------------------------------

                        const userId = await signifyCrmGetUserId.call(this);

                        const subject       = this.getNodeParameter('subject',        i) as string;
                        const accountId     = this.getNodeParameter('account_id',     i) as string;
                        const status        = this.getNodeParameter('status',         i) as string;
                        const caseType      = this.getNodeParameter('type',           i) as string;
                        const reqDate       = this.getNodeParameter('request_date',   i) as string;
                        const dueDate       = this.getNodeParameter('due_date',       i) as string;

                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const assignedUser = additionalFields.assigned_user_id as string | undefined;

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'assigned_user_id', value: assignedUser || userId },
                            { name: 'subject',          value: subject      },
                            { name: 'account_id',       value: accountId    },
                            { name: 'status',           value: status       },
                            { name: 'type',             value: caseType     },
                            { name: 'request_date',     value: reqDate      },
                            { name: 'due_date',         value: dueDate      },
                        ];

                        for (const [fieldName, fieldValue] of Object.entries(additionalFields)) {
                            if (fieldValue !== undefined && fieldValue !== '' && fieldValue !== 'assigned_user_id') {
                                nameValueList.push({
                                    name: fieldName,
                                    value: String(fieldValue),
                                });
                            }
                        }

                        const body: IDataObject = {
                            module_name: 'Cases',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'delete') {
                        // ----------------------------------------
                        //             case: delete
                        // ----------------------------------------

                        const caseId = this.getNodeParameter('caseId', i);

                        const nameValueList = [
                            { name: 'id',      value: caseId },
                            { name: 'deleted', value: '1'       },
                        ];

                        const body: IDataObject = {
                            module_name:      'Cases',
                            name_value_list:  nameValueList,
                            track_view:       '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'get') {
                        // ----------------------------------------
                        //               case: get
                        // ----------------------------------------

                        const caseId = this.getNodeParameter('caseId', i);

                        // Build a minimal payload: no select_fields, no links, no track_view
                        const body: IDataObject = {
                            module_name: 'Cases',
                            id: caseId,
                            select_fields: [
                                "id",
                                "subject",
                                "account_id",
                                "status",
                                "type",
                                "request_date",
                                "due_date",
                                "description",
                                "contact_id",
                                "opportunity_id",
                                "assigned_user_id",
                            ],
                            link_name_to_fields: [], 
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry', body);
                    } else if (operation === 'getAll') {
                        // ----------------------------------------
                        //             case: getAll
                        // ----------------------------------------

                        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                        const limit = this.getNodeParameter('limit', i, 5) as number;

                        let targetCount: number;

                        if (returnAll) {
             
                            const countRes = await signifyCrmApiRequest.call(
                                this,
                                'POST',
                                '/get_entries_count',
                                {
                                    module_name: 'Cases',
                                    query:       "cases.deleted = 0",
                                },
                            );

                            // result_count is a string → convert to number
                            targetCount = Number(countRes.data.result_count ?? 0);
                        } else {
                            targetCount = limit;
                        }

                        const body: IDataObject = {
                            module_name: 'Cases',
                            str_query: "",  // optionally build query here
                            str_order_by: "", // or set ordering if needesd
                            offset: 0,
                            select_fields: [
                                "id",
                                "name",
                                "account_id",
                                "opportunity_type",
                                "lead_source",
                                "sales_stage",
                                "currency_id",
                                "amount",
                                "date_closed",
                                "probability",
                                "next_step",
                                "description",
                                "assigned_user_id", 
                                "campaign_id",
                            ],
                            link_name_to_fields: [],
                            max_results: targetCount,
                            deleted: '',
                            favorites: '',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry_list', body);
                    } else if (operation === 'update') {
                        // ----------------------------------------
                        //             case: update
                        // ----------------------------------------

                        const userId = await signifyCrmGetUserId.call(this);
                        const caseId = this.getNodeParameter('caseId', i) as string;

                        const subject     = this.getNodeParameter('subject',        i, '') as string;
                        const accountId   = this.getNodeParameter('account_id',     i, '') as string;
                        const status      = this.getNodeParameter('status',         i, '') as string;
                        const caseType    = this.getNodeParameter('type',           i, '') as string;
                        const reqDate     = this.getNodeParameter('request_date',   i, '') as string;
                        const dueDate     = this.getNodeParameter('due_date',       i, '') as string;
                                        
                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const assignedUser = additionalFields.assigned_user_id as string | undefined;

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'id',               value: caseId },    
                        ];

                        const pushIf = (name: string, value: unknown) => {
                            if (value !== undefined && value !== '') {
                                nameValueList.push({ name, value: String(value) });
                            }
                        };

                        pushIf('assigned_user_id', assignedUser || userId);
	                    pushIf('name',             subject);
                        pushIf('account_id',       accountId);
                        pushIf('status',           status);
                        pushIf('type',             caseType);
                        pushIf('request_date',     reqDate);
                        pushIf('due_date',         dueDate);

                        const skip = new Set(['assigned_user_id']);
                        for (const [key, val] of Object.entries(additionalFields)) {
                            if (skip.has(key)) continue;
                            pushIf(key, val);
                        }

                        const body: IDataObject = {
                            module_name: 'Cases',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    }
                } else if (resource === 'task') {
                    // **********************************************************************
                    //                                task
                    // **********************************************************************

                    if (operation === 'create') {
                        // ----------------------------------------
                        //             task: create
                        // ----------------------------------------

                        const userId = await signifyCrmGetUserId.call(this);

                        const subject    = this.getNodeParameter('name',        i) as string;
                        const status     = this.getNodeParameter('status',      i) as string;
                        const priority   = this.getNodeParameter('priority',    i) as string;
                        const startDate  = this.getNodeParameter('date_start',  i) as string;
                        const dueDate    = this.getNodeParameter('date_due',    i) as string;

                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const assignedUser = additionalFields.assigned_user_id as string | undefined;

                        const rel = (additionalFields.relatedToFields as
                            | { relatedToPair?: { parent_type?: string; parent_id?: string } }
                            | undefined
                        )?.relatedToPair;

                        const parentType = rel?.parent_type as string | undefined;
                        const parentId   = rel?.parent_id   as string | undefined;

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'assigned_user_id', value: assignedUser || userId },
                            { name: 'name',             value: subject  },
                            { name: 'status',           value: status   },
                            { name: 'priority',         value: priority },
                            { name: 'date_start',       value: startDate },
                            { name: 'date_due',         value: dueDate   },
                  
                        ];

                        for (const [fieldName, fieldValue] of Object.entries(additionalFields)) {
                            if (fieldValue !== undefined && fieldValue !== '' && fieldValue !== 'assigned_user_id' && fieldValue !== 'relatedToFields') {
                                nameValueList.push({
                                    name: fieldName,
                                    value: String(fieldValue),
                                });
                            }
                        }

                        if (parentType) nameValueList.push({ name: 'parent_type', value: parentType });
	                    if (parentId)   nameValueList.push({ name: 'parent_id',   value: parentId   });

                        const body: IDataObject = {
                            module_name: 'Tasks',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'delete') {
                        // ----------------------------------------
                        //             task: delete
                        // ----------------------------------------

                        const taskId = this.getNodeParameter('taskId', i);

                        const nameValueList = [
                            { name: 'id',      value: taskId },
                            { name: 'deleted', value: '1'       },
                        ];

                        const body: IDataObject = {
                            module_name:      'Tasks',
                            name_value_list:  nameValueList,
                            track_view:       '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    } else if (operation === 'get') {
                        // ----------------------------------------
                        //               task: get
                        // ----------------------------------------

                        const taskId = this.getNodeParameter('taskId', i);

                        // Build a minimal payload: no select_fields, no links, no track_view
                        const body: IDataObject = {
                            module_name: 'Tasks',
                            id: taskId,
                            select_fields: [
                                "id",
                                "name",
                                "status",
                                "date_start",
                                "date_due",
                                "priority",
                                "assigned_user_id",
                                "parent_type",
                                "parent_id",
                            ],
                            link_name_to_fields: [], 
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry', body);
                    } else if (operation === 'getAll') {
                        // ----------------------------------------
                        //             task: getAll
                        // ----------------------------------------

                        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                        const limit = this.getNodeParameter('limit', i, 5) as number;

                        let targetCount: number;

                        if (returnAll) {
             
                            const countRes = await signifyCrmApiRequest.call(
                                this,
                                'POST',
                                '/get_entries_count',
                                {
                                    module_name: 'Tasks',
                                    query:       "task.deleted = 0",
                                },
                            );

                            // result_count is a string → convert to number
                            targetCount = Number(countRes.data.result_count ?? 0);
                        } else {
                            targetCount = limit;
                        }

                        const body: IDataObject = {
                            module_name: 'Tasks',
                            str_query: "",  // optionally build query here
                            str_order_by: "", // or set ordering if needesd
                            offset: 0,
                            select_fields: [
                                "id",
                                "name",
                                "status",
                                "date_start",
                                "date_due",
                                "priority",
                                "assigned_user_id",
                                "parent_type",
                                "parent_id",
                            ],
                            link_name_to_fields: [],
                            max_results: targetCount,
                            deleted: '',
                            favorites: '',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/get_entry_list', body);
                    } else if (operation === 'update') {
                        // ----------------------------------------
                        //             task: update
                        // ----------------------------------------

                        const userId = await signifyCrmGetUserId.call(this);
                        const taskId = this.getNodeParameter('taskId', i) as string;

                        const subject    = this.getNodeParameter('name',        i) as string;
                        const status     = this.getNodeParameter('status',      i) as string;
                        const priority   = this.getNodeParameter('priority',    i) as string;
                        const startDate  = this.getNodeParameter('date_start',  i) as string;
                        const dueDate    = this.getNodeParameter('date_due',    i) as string;

                        const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, any>;

                        const assignedUser = additionalFields.assigned_user_id as string | undefined;

                        const rel = (additionalFields.relatedToFields as
                            | { relatedToPair?: { parent_type?: string; parent_id?: string } }
                            | undefined
                        )?.relatedToPair;

                        const parentType = rel?.parent_type as string | undefined;
                        const parentId   = rel?.parent_id   as string | undefined;

                        const nameValueList: Array<{ name: string; value: string; }> = [
                            { name: 'id',               value: taskId },
                        ];

                        const pushIf = (name: string, value: unknown) => {
                            if (value !== undefined && value !== '') {
                                nameValueList.push({ name, value: String(value) });
                            }
                        };

                        pushIf('assigned_user_id', assignedUser || userId);
                        pushIf('name',             subject);
                        pushIf('status',           status);
                        pushIf('priority',         priority);
                        pushIf('date_start',       startDate);
                        pushIf('date_due',         dueDate);
                        pushIf('parent_type',      parentType);
                        pushIf('parent_id',        parentId);

                        const skip = new Set(['assigned_user_id', 'relatedToFields']);
                        for (const [fieldName, fieldValue] of Object.entries(additionalFields)) {
                            if (skip.has(fieldName)) continue;   // skip by KEY
                            pushIf(fieldName, fieldValue);
                        }

                        const body: IDataObject = {
                            module_name: 'Tasks',
                            name_value_list: nameValueList,
                            track_view: '1',
                        };

                        responseData = await signifyCrmApiRequest.call(this, 'POST', '/set_entry', body);
                    }
                }
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {} });
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: i } },
			);
            
			returnData.push(...executionData);
		}

		return [returnData];
	}
}