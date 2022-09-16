import { INodeProperties } from 'n8n-workflow';

export const tagsOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['tags'],
      },
    },
    options: [
      {
        name: 'Add Tags',
        value: 'add_tags',
        description: 'Add Tags to Record',
        action: 'Add tags to record',
      },
			{
        name: 'Remove Tags',
        value: 'remove_tags',
        description: 'Remove Tags from Record',
        action: 'Remove tags from record',
      },
    ],
    default: 'add_tags',
  },
];

export const tagsFields: INodeProperties[] = [
  // ----------------------------------------
  //            tags: add_to_records
  // ----------------------------------------
  {
    displayName: 'Module',
    name: 'module',
    type: 'options',
    options: [
			{name: 'Accounts', value: 'accounts'},
			{name: 'Calls', value: 'calls'},
			{name: 'Campaigns', value: 'campaigns'},
			{name: 'Cases', value: 'cases'},
			{name: 'Contacts', value: 'contacts'},
			{name: 'Custom', value: 'custom'},
			{name: 'Deals', value: 'deals'},
			{name: 'Events', value: 'events'},
			{name: 'Invoices', value: 'invoices'},
			{name: 'Leads', value: 'leads'},
			{name: 'Price Books', value: 'pricebooks'},
			{name: 'Products', value: 'products'},
			{name: 'Purchase Orders', value: 'purchaseorders'},
			{name: 'Quotes', value: 'quotes'},
			{name: 'Sales Orders', value: 'salesorders'},
			{name: 'Solutions', value: 'solutions'},
			{name: 'Tasks', value: 'tasks'},
			{name: 'Vendors', value: 'vendors'},
    ],
    default: 'leads', // Initially selected options
    description: 'The module to use',
    displayOptions: { // the resources and operations to display this element with
      show: {
        resource: ['tags'],
				operation: ['add_tags', 'remove_tags'],
      }
    },
  },
  {
    displayName: 'Record ID',
    name: 'recordId',
    type: 'string',
    required: true,
    default: '',
		description: 'The record to use',
    displayOptions: {
      show: {
        resource: ['tags'],
				operation: ['add_tags', 'remove_tags'],
      },
    },
  },
  {
    displayName: 'Tags as Text',
    name: 'tagsAsText',
    type: 'boolean',
    required: true,
    default: false,
		description: 'Whether tags are defined as a string delimited by commas',
    displayOptions: {
      show: {
        resource: ['tags'],
				operation: ['add_tags', 'remove_tags'],
      },
    },
  },
  {
    displayName: 'Tags',
    name: 'textTags',
    type: 'string',
    required: true,
    default: '',
		description: 'Tags separated by ,',
    displayOptions: {
      show: {
        resource: ['tags'],
				operation: ['add_tags', 'remove_tags'],
        tagsAsText: [true],
      },
    },
  },
  {
    displayName: 'Tags',
    name: 'tags',
    placeholder: 'Add a Tag',
    type: 'fixedCollection',
    required: true,
    default: {},
    typeOptions: {
      multipleValues: true,
    },
    options: [
      {
        name: 'tagsValues',
        displayName: 'Tags',
        values: [
          {
            displayName: 'Name',
            name: 'name',
            type: 'string',
						description: 'The tag name',
            default: '',
            placeholder: 'The tag name',
          },
        ],
      },
    ],
    displayOptions: { // the resources and operations to display this element with
      show: {
        resource: ['tags'],
        operation: ['add_tags', 'remove_tags'],
        tagsAsText: [false],
      }
    },
  },
];
