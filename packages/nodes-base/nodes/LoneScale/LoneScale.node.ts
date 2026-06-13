import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { lonescaleApiRequest } from './GenericFunctions';

export class LoneScale implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LoneScale',
		name: 'loneScale',
		group: ['transform'],
		icon: { light: 'file:loneScale.svg', dark: 'file:loneScale.dark.svg' },
		version: 1,
		description: 'Enrich and source contacts, search companies, and manage lists',
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		defaults: {
			name: 'LoneScale',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'loneScaleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Company',
						value: 'company',
						description: 'Search for a company',
					},
					{
						name: 'Contact',
						value: 'contact',
						description: 'Enrich or source contacts',
					},
					{
						name: 'Item',
						value: 'item',
						description: 'Manipulate item',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Manipulate list',
					},
				],
				default: 'list',
				noDataExpression: true,
				required: true,
				description: 'Create a new list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['list'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a list',
						action: 'Create a list',
					},
				],
				default: 'create',
				noDataExpression: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'add',
						description: 'Create an item',
						action: 'Create a item',
					},
				],
				default: 'add',
				noDataExpression: true,
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				options: [
					{
						name: 'Company',
						value: 'COMPANY',
						description: 'List of company',
					},
					{
						name: 'Contact',
						value: 'PEOPLE',
						description: 'List of contact',
					},
				],
				default: 'PEOPLE',
				description: 'Type of your list',
				noDataExpression: true,
			},
			{
				displayName: 'List Name or ID',
				name: 'list',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getLists',
					loadOptionsDependsOn: ['type'],
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				required: true,
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['PEOPLE'],
					},
				},
				default: '',
				description: 'Contact first name',
				required: true,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['PEOPLE'],
					},
				},
				default: '',
				description: 'Contact last name',
				required: true,
			},

			{
				displayName: 'Company Name',
				name: 'company_name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['COMPANY'],
					},
				},
				default: '',
				description: 'Contact company name',
			},

			{
				displayName: 'Additional Fields',
				name: 'peopleAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['PEOPLE'],
					},
				},
				options: [
					{
						displayName: 'Full Name',
						name: 'full_name',
						type: 'string',
						default: '',
						description: 'Contact full name',
					},
					{
						displayName: 'Contact Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{
						displayName: 'Company Name',
						name: 'company_name',
						type: 'string',
						default: '',
						description: 'Contact company name',
					},
					{
						displayName: 'Current Position',
						name: 'current_position',
						type: 'string',
						default: '',
						description: 'Contact current position',
					},
					{
						displayName: 'Company Domain',
						name: 'domain',
						type: 'string',
						default: '',
						description: 'Contact company domain',
					},
					{
						displayName: 'Linkedin Url',
						name: 'linkedin_url',
						type: 'string',
						default: '',
						description: 'Contact Linkedin URL',
					},
					{
						displayName: 'Contact Location',
						name: 'location',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Contact ID',
						name: 'contact_id',
						type: 'string',
						default: '',
						description: 'Contact ID from your source',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'companyAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['COMPANY'],
					},
				},
				options: [
					{
						displayName: 'Linkedin Url',
						name: 'linkedin_url',
						type: 'string',
						default: '',
						description: 'Company Linkedin URL',
					},
					{
						displayName: 'Company Domain',
						name: 'domain',
						type: 'string',
						default: '',
						description: 'Company company domain',
					},
					{
						displayName: 'Contact Location',
						name: 'location',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Contact ID',
						name: 'contact_id',
						type: 'string',
						default: '',
						description: 'Contact ID from your source',
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['list'],
					},
				},
				default: '',
				placeholder: 'list name',
				description: 'Name of your list',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['list'],
					},
				},
				options: [
					{
						name: 'Company',
						value: 'COMPANY',
						description: 'Create a list of companies',
						action: 'Create a list of companies',
					},
					{
						name: 'Contact',
						value: 'PEOPLE',
						description: 'Create a list of contacts',
						action: 'Create a list of contacts',
					},
				],
				default: 'COMPANY',
				description: 'Type of your list',
				noDataExpression: true,
			},

			/* -------------------------------------------------------------------------- */
			/*                                contact                                      */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['contact'],
					},
				},
				options: [
					{
						name: 'Enrich',
						value: 'enrich',
						description: 'Enrich a contact with email, phone and/or profile data',
						action: 'Enrich a contact',
					},
					{
						name: 'Source',
						value: 'source',
						description: 'Source contacts from a company matching personas',
						action: 'Source contacts from a company',
					},
				],
				default: 'enrich',
				noDataExpression: true,
			},
			{
				displayName: 'Enrichment Type',
				name: 'enrichmentType',
				type: 'multiOptions',
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Phone',
						value: 'phone',
					},
					{
						name: 'Profile',
						value: 'profile',
					},
				],
				default: ['email'],
				description: 'Types of enrichment to perform',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				default: '',
				description: 'Contact first name',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				default: '',
				description: 'Contact last name',
			},
			{
				displayName: 'Company Name',
				name: 'enrichCompanyName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				default: '',
				description: 'Contact company name, improves matching accuracy',
			},
			{
				displayName: 'Company Domain',
				name: 'enrichCompanyDomain',
				type: 'string',
				placeholder: 'acme.com',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				default: '',
				description: 'Contact company domain, improves matching accuracy',
			},
			{
				displayName: 'Detect Job Change',
				name: 'detectJobChange',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				default: false,
				description:
					'Whether to flag if the contact changed company since the input data. Only effective when Enrichment Type includes Profile.',
			},
			{
				displayName: 'Additional Fields',
				name: 'enrichAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['enrich'],
					},
				},
				options: [
					{
						displayName: 'Contact Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'Known contact email to improve matching',
					},
					{
						displayName: 'Contact ID',
						name: 'contactId',
						type: 'string',
						default: '',
						description: 'Your CRM record ID, echoed back in the response',
					},
					{
						displayName: 'Job Title',
						name: 'jobTitle',
						type: 'string',
						default: '',
						description: 'Contact job title',
					},
					{
						displayName: 'Linkedin URL',
						name: 'linkedinUrl',
						type: 'string',
						default: '',
						description: 'Contact Linkedin URL',
					},
				],
			},
			{
				displayName: 'Company Domain',
				name: 'sourceCompanyDomain',
				type: 'string',
				placeholder: 'acme.com',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['source'],
					},
				},
				default: '',
				description:
					'Company domain to source contacts from. Provide at least one of domain, name or Linkedin URL.',
			},
			{
				displayName: 'Company Name',
				name: 'sourceCompanyName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['source'],
					},
				},
				default: '',
				description: 'Company name to source contacts from',
			},
			{
				displayName: 'Company Linkedin URL',
				name: 'sourceCompanyLinkedinUrl',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['source'],
					},
				},
				default: '',
				description: 'Company Linkedin URL, increases coverage and accuracy by 25%',
			},
			{
				displayName: 'Personas',
				name: 'personas',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['source'],
					},
				},
				default: {},
				placeholder: 'Add Persona',
				options: [
					{
						name: 'persona',
						displayName: 'Persona',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'A label for this persona',
								required: true,
							},
							{
								displayName: 'Job Titles',
								name: 'jobTitles',
								type: 'string',
								default: '',
								placeholder: 'CEO, Head of Sales, VP Marketing',
								description: 'Comma-separated job titles to match',
								required: true,
							},
							{
								displayName: 'Exclude Job Titles',
								name: 'excludeJobTitles',
								type: 'string',
								default: '',
								placeholder: 'Assistant, Intern',
								description: 'Comma-separated job titles to exclude',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'sourceAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: ['source'],
					},
				},
				options: [
					{
						displayName: 'Disable Company Info',
						name: 'disableCompanyInfo',
						type: 'boolean',
						default: false,
						description:
							'Whether to skip enrichment of company information (industry, size, etc.) for each contact',
					},
					{
						displayName: 'Included Locations',
						name: 'includedLocations',
						type: 'string',
						default: '',
						placeholder: 'US, FR, GB',
						description: 'Comma-separated ISO 3166-1 alpha-2 country codes to include',
					},
					{
						displayName: 'Max Results',
						name: 'maxResults',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 10,
						},
						default: 10,
						description: 'Maximum number of contacts to retrieve (capped at 10)',
					},
					{
						displayName: 'Seniority Levels',
						name: 'seniorityLevels',
						type: 'multiOptions',
						options: [
							{
								name: 'C-Suite',
								value: 'c-suite',
							},
							{
								name: 'Director',
								value: 'director',
							},
							{
								name: 'Entry',
								value: 'entry',
							},
							{
								name: 'Founder',
								value: 'founder',
							},
							{
								name: 'Head',
								value: 'head',
							},
							{
								name: 'Intern',
								value: 'intern',
							},
							{
								name: 'Manager',
								value: 'manager',
							},
							{
								name: 'Owner',
								value: 'owner',
							},
							{
								name: 'Partner',
								value: 'partner',
							},
							{
								name: 'Senior',
								value: 'senior',
							},
							{
								name: 'VP',
								value: 'vp',
							},
						],
						default: [],
						description: 'Filter contacts by seniority level',
					},
				],
			},

			/* -------------------------------------------------------------------------- */
			/*                                company                                      */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['company'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Look up a company by domain, Linkedin or name',
						action: 'Search a company',
					},
				],
				default: 'search',
				noDataExpression: true,
			},
			{
				displayName: 'Company Domain',
				name: 'searchDomain',
				type: 'string',
				placeholder: 'stripe.com',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['search'],
					},
				},
				default: '',
				description:
					'Company domain to look up. Provide at least one of domain, Linkedin ID, slug or name.',
			},
			{
				displayName: 'Linkedin ID',
				name: 'searchLinkedinId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['search'],
					},
				},
				default: '',
				description: 'Numeric Linkedin company ID (the digits in the linkedin.com/company/ URL)',
			},
			{
				displayName: 'Slug',
				name: 'searchSlug',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['search'],
					},
				},
				default: '',
				description: 'Linkedin universal name / slug (the trailing segment of the company URL)',
			},
			{
				displayName: 'Company Name',
				name: 'searchName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['search'],
					},
				},
				default: '',
				description:
					'Company name. Best-effort match — prefer domain, Linkedin ID or slug for a deterministic result.',
			},
			{
				displayName: 'Enrich',
				name: 'searchEnrich',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['company'],
						operation: ['search'],
					},
				},
				default: false,
				description:
					'Whether to fall back to on-demand enrichment when no cached match is found, and attach a headcount breakdown when possible',
			},
		],
	};

	methods = {
		loadOptions: {
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const type = this.getNodeParameter('type') as string;
				const data = await lonescaleApiRequest.call(this, 'GET', '/lists', {}, { entity: type });
				return (data as { list: Array<{ name: string; id: string; entity: string }> })?.list
					?.filter((l) => l.entity === type)
					.map((d) => ({
						name: d.name,
						value: d.id,
					}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'list') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const entity = this.getNodeParameter('type', i) as string;
						const body: IDataObject = {
							name,
							entity,
						};

						responseData = await lonescaleApiRequest.call(this, 'POST', '/lists', body);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
				if (resource === 'item') {
					if (operation === 'add') {
						let firstName = '';
						let lastName = '';
						let currentPosition = '';
						let fullName = '';
						let email = '';
						let linkedinUrl = '';
						let companyName = '';
						let domain = '';
						let location = '';
						let contactId = '';

						const entity = this.getNodeParameter('type', i) as string;
						const listId = this.getNodeParameter('list', i) as string;
						if (entity === 'PEOPLE') {
							const peopleAdditionalFields = this.getNodeParameter('peopleAdditionalFields', i) as {
								email: string;
								full_name: string;
								current_position: string;
								linkedin_url: string;
								company_name: string;
								domain: string;
								location: string;
								contact_id: string;
							};
							firstName = this.getNodeParameter('first_name', i) as string;
							lastName = this.getNodeParameter('last_name', i) as string;
							fullName = peopleAdditionalFields?.full_name;
							currentPosition = peopleAdditionalFields?.current_position;
							email = peopleAdditionalFields?.email;
							linkedinUrl = peopleAdditionalFields?.linkedin_url;
							companyName = peopleAdditionalFields?.company_name;
							domain = peopleAdditionalFields?.domain;
							location = peopleAdditionalFields?.location;
							contactId = peopleAdditionalFields?.contact_id;
						}
						if (entity === 'COMPANY') {
							const companyAdditionalFields = this.getNodeParameter(
								'companyAdditionalFields',
								i,
							) as {
								linkedin_url: string;
								domain: string;
								location: string;
								contact_id: string;
							};
							companyName = this.getNodeParameter('company_name', i) as string;
							linkedinUrl = companyAdditionalFields?.linkedin_url;
							domain = companyAdditionalFields?.domain;
							location = companyAdditionalFields?.location;
							contactId = companyAdditionalFields?.contact_id;
						}

						const body: IDataObject = {
							...(firstName && { first_name: firstName }),
							...(lastName && { last_name: lastName }),
							...(fullName && { full_name: fullName }),
							...(linkedinUrl && { linkedin_url: linkedinUrl }),
							...(companyName && { company_name: companyName }),
							...(currentPosition && { current_position: currentPosition }),
							...(domain && { domain }),
							...(location && { location }),
							...(email && { email }),
							...(contactId && { contact_id: contactId }),
						};

						responseData = await lonescaleApiRequest.call(
							this,
							'POST',
							`/lists/${listId}/item`,
							body,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
				if (resource === 'contact') {
					if (operation === 'enrich') {
						const enrichmentType = this.getNodeParameter('enrichmentType', i) as string[];
						const firstName = this.getNodeParameter('firstName', i) as string;
						const lastName = this.getNodeParameter('lastName', i) as string;
						const companyName = this.getNodeParameter('enrichCompanyName', i) as string;
						const companyDomain = this.getNodeParameter('enrichCompanyDomain', i) as string;
						const detectJobChange = this.getNodeParameter('detectJobChange', i) as boolean;
						const additionalFields = this.getNodeParameter('enrichAdditionalFields', i) as {
							email?: string;
							jobTitle?: string;
							linkedinUrl?: string;
							contactId?: string;
						};

						const contact: IDataObject = {
							firstname: firstName,
							lastname: lastName,
							...(companyName && { company_name: companyName }),
							...(companyDomain && { domain: companyDomain }),
							...(additionalFields.email && { email: additionalFields.email }),
							...(additionalFields.jobTitle && { job_title: additionalFields.jobTitle }),
							...(additionalFields.linkedinUrl && { linkedin_url: additionalFields.linkedinUrl }),
							...(additionalFields.contactId && {
								custom: { contact_id: additionalFields.contactId },
							}),
						};

						const body: IDataObject = {
							enrichment_type: enrichmentType,
							contacts: [contact],
							...(detectJobChange && { detect_job_change: true }),
						};

						responseData = await lonescaleApiRequest.call(
							this,
							'POST',
							'/trigger/enrich/sync',
							body,
						);
						const contacts = (responseData as { contacts?: IDataObject[] })?.contacts ?? [];
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(contacts),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
					if (operation === 'source') {
						const companyDomain = this.getNodeParameter('sourceCompanyDomain', i) as string;
						const companyName = this.getNodeParameter('sourceCompanyName', i) as string;
						const companyLinkedinUrl = this.getNodeParameter(
							'sourceCompanyLinkedinUrl',
							i,
						) as string;
						const additionalFields = this.getNodeParameter('sourceAdditionalFields', i) as {
							disableCompanyInfo?: boolean;
							includedLocations?: string;
							maxResults?: number;
							seniorityLevels?: string[];
						};

						const rawPersonas =
							((this.getNodeParameter('personas', i, {}) as IDataObject)
								.persona as IDataObject[]) ?? [];

						const toList = (value: string) =>
							(value || '')
								.split(',')
								.map((v) => v.trim())
								.filter((v) => v.length > 0);

						const personas = rawPersonas.map((p) => ({
							name: p.name as string,
							job_titles: toList(p.jobTitles as string),
							...(toList(p.excludeJobTitles as string).length && {
								exclude_job_titles: toList(p.excludeJobTitles as string),
							}),
						}));

						const includedLocations = toList(additionalFields.includedLocations ?? '');

						const body: IDataObject = {
							...(companyDomain && { company_domain: companyDomain }),
							...(companyName && { company_name: companyName }),
							...(companyLinkedinUrl && { company_linkedin_url: companyLinkedinUrl }),
							personas,
							...(additionalFields.maxResults && { limit: additionalFields.maxResults }),
							...(includedLocations.length && { included_locations: includedLocations }),
							...(additionalFields.seniorityLevels?.length && {
								seniority_levels: additionalFields.seniorityLevels,
							}),
							...(additionalFields.disableCompanyInfo && { disable_company_info: true }),
						};

						responseData = await lonescaleApiRequest.call(
							this,
							'POST',
							'/trigger/contact-sourcing/sync',
							body,
						);
						const contacts =
							(responseData as { contacts?: IDataObject[] })?.contacts ?? [];
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(contacts),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
				if (resource === 'company') {
					if (operation === 'search') {
						const domain = this.getNodeParameter('searchDomain', i) as string;
						const linkedinId = this.getNodeParameter('searchLinkedinId', i) as string;
						const slug = this.getNodeParameter('searchSlug', i) as string;
						const name = this.getNodeParameter('searchName', i) as string;
						const enrich = this.getNodeParameter('searchEnrich', i) as boolean;

						const qs: IDataObject = {
							...(domain && { domain }),
							...(linkedinId && { linkedin_id: linkedinId }),
							...(slug && { slug }),
							...(name && { name }),
							...(enrich && { enrich: true }),
						};

						responseData = await lonescaleApiRequest.call(
							this,
							'GET',
							'/companies/search',
							{},
							qs,
						);
						const results = (responseData as { results?: IDataObject[] })?.results ?? [];
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
