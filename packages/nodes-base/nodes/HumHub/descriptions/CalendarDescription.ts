import {
	INodeProperties,
} from 'n8n-workflow';

import {
    getPagingParameters
} from '../GenericFunctions';

export const calendarOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all calendars entries',
			},
			{
				name: 'Get All By Container',
				value: 'getAllByContainer',
				description: 'Find all calendar entries by container',
			},
			{
				name: 'Delete All By Container',
				value: 'deleteAllByContainer',
				description: 'Delete all calendar entries by container',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create new calendar entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get calendar entry by id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update calendar entry by id',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete the calendar entry by id',
			},
			{
				name: 'Attach Files',
				value: 'attachFiles',
				description: 'Attach files to calendar entry',
			},
			{
				name: 'Remove File',
				value: 'removeFile',
				description: 'Remove file from calendar entry',
			},
			{
				name: 'Change Participant',
				value: 'changeParticipant',
				description: 'Change the user participant',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  calendarFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 calendar:getAll                            */
	/* -------------------------------------------------------------------------- */

    ...getPagingParameters('calendar'),

	/* -------------------------------------------------------------------------- */
	/*                                 calendar:getAllByContainer                 */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'getAllByContainer',
				],
			},
		},
		default: '',
		description: 'ID of the content container.',
	},

    ...getPagingParameters('calendar', 'getAllByContainer'),

    /* -------------------------------------------------------------------------- */
	/*                                 calendar:deleteAllByContainer              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'deleteAllByContainer',
				],
			},
		},
		default: '',
		description: 'ID of the content container.',
	},

    /* -------------------------------------------------------------------------- */
	/*                                 calendar:create                            */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'ID of the content container.',
	},
	{
		displayName: 'Calendar Entry Title',
		name: 'calendarEntryTitle',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Title of the calendar entry.',
	},
    {
		displayName: 'Calendar Entry Additional Fields',
		name: 'calendarEntryAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'calendar',
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
				description: 'Description of the calendar entry.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'string',
				default: '',
				description: 'Color of the calendar entry.',
			},
			{
				displayName: 'All Day',
				name: 'all_day',
				type: 'boolean',
				default: false,
				description: 'If the calendar entry continues all day.',
			},
			{
				displayName: 'Participation Mode',
				name: 'participation_mode',
				type: 'number',
				default: '',
				description: 'Mode of participating.', // todo: make it type options
			},
			{
				displayName: 'Max Participants',
				name: 'max_participants',
				type: 'number',
				default: '',
				description: 'Maximum number of participants.',
			},
			{
				displayName: 'Allow Decline',
				name: 'allow_decline',
				type: 'boolean',
				default: true,
				description: 'Allow the participant to decline.',
			},
			{
				displayName: 'Allow Maybe',
				name: 'allow_maybe',
				type: 'boolean',
				default: true,
				description: 'Allow the participant to respond with maybe.',
			},
			{
				displayName: 'Participant Info',
				name: 'participant_info',
				type: 'string',
				default: '',
				description: 'Info for the participant.',
			},
		],
	},
	{
		displayName: 'Start Date',
		name: 'calendarEntryFormStartDate',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Start date of the calendar entry. NOTE (2021.12.03): humhub returns error for wrong date format.',
	}, // todo: humhub returns error
	{
		displayName: 'End Date',
		name: 'calendarEntryFormEndDate',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'End date of the calendar entry. NOTE (2021.12.03): humhub returns error for wrong date format.',
	}, // todo: humhub returns error
    {
		displayName: 'Calendar Entry Form Additional Fields',
		name: 'calendarEntryFormAdditionalFields',
		type: 'collection',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Is Public',
				name: 'is_public',
				type: 'boolean',
				default: true,
				description: 'If the calendar entry is public.',
			},
			{
				displayName: 'Start Time',
				name: 'start_time',
				type: 'string',
				default: '',
				description: 'The start time if the calendar entry.',
			},
			{
				displayName: 'End Time',
				name: 'end_time',
				type: 'string',
				default: '',
				description: 'The end time of the calendar entry.',
			},
			{
				displayName: 'Time Zone',
				name: 'timeZone',
				type: 'string',
				default: '',
				description: 'The time zone of the calendar entry.',
			},
			{
				displayName: 'Force Join',
				name: 'forceJoin',
				type: 'boolean',
				default: false,
				description: 'If joining is mandatory.',
			},
			{
				displayName: 'Topics',
				name: 'topics',
				type: 'string',
				default: '',
				description: 'Comma separated list of topics to filter. Example: Music,Dancing.',
			},
		],
	},

    /* -------------------------------------------------------------------------- */
	/*                                 calendar:get                               */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The id of the calendar entry.',
	},

    /* -------------------------------------------------------------------------- */
	/*                                 calendar:update                            */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The id of the calendar entry.',
	},
    {
		displayName: 'Calendar Entry',
		name: 'calendarEntry',
		type: 'collection',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the calendar entry.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the calendar entry.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'string',
				default: '',
				description: 'Color of the calendar entry.',
			},
			{
				displayName: 'All Day',
				name: 'all_day',
				type: 'boolean',
				default: false,
				description: 'If the calendar entry continues all day.',
			},
			{
				displayName: 'Participation Mode',
				name: 'participation_mode',
				type: 'number',
				default: '',
				description: 'Mode of participating.', // todo: make it type options
			},
			{
				displayName: 'Max Participants',
				name: 'max_participants',
				type: 'number',
				default: '',
				description: 'Maximum number of participants.',
			},
			{
				displayName: 'Allow Decline',
				name: 'allow_decline',
				type: 'boolean',
				default: true,
				description: 'Allow the participant to decline.',
			},
			{
				displayName: 'Allow Maybe',
				name: 'allow_maybe',
				type: 'boolean',
				default: true,
				description: 'Allow the participant to respond with maybe.',
			},
			{
				displayName: 'Participant Info',
				name: 'participant_info',
				type: 'string',
				default: '',
				description: 'Info for the participant.',
			},
		],
	},
    {
		displayName: 'Calendar Entry Form',
		name: 'calendarEntryForm',
		type: 'collection',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Is Public',
				name: 'is_public',
				type: 'boolean',
				default: true,
				description: 'If the calendar entry is public.',
			},
			{
				displayName: 'Start Date',
				name: 'start_date',
				type: 'string',
				default: '',
				description: 'Start date of the calendar entry.',
			},
			{
				displayName: 'Start Time',
				name: 'start_time',
				type: 'string',
				default: '',
				description: 'Start time of the calendar entry.',
			},
			{
				displayName: 'End Date',
				name: 'end_date',
				type: 'string',
				default: '',
				description: 'End date of the calendar entry.',
			},
			{
				displayName: 'End Time',
				name: 'end_time',
				type: 'string',
				default: '',
				description: 'End time of the calendar entry.',
			},
			{
				displayName: 'Time Zone',
				name: 'timeZone',
				type: 'string',
				default: '',
				description: 'Time zone of the calendar entry.',
			},
			{
				displayName: 'Force Join',
				name: 'forceJoin',
				type: 'boolean',
				default: false,
				description: 'If the calendar entry is mandatory.',
			},
			{
				displayName: 'Topics',
				name: 'topics',
				type: 'string',
				default: '',
				description: 'Comma separated list of topics to filter. Example: Music,Dancing.',
			},
		],
	},

    /* -------------------------------------------------------------------------- */
	/*                                 calendar:delete                            */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The id of the calendar entry.',
	},

    /* -------------------------------------------------------------------------- */
	/*                                 calendar:attachFiles                       */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'attachFiles',
				],
			},
		},
		default: '',
		description: 'The id of the calendar entry.',
	},
	{
		displayName: 'Files',
		name: 'files',
		placeholder: 'Add File',
		type: 'fixedCollection',
		default: '',
		description: 'Which files to send.',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'attachFiles',
				],
			},
		},
		options: [
			{
				displayName: 'File',
				name: 'file',
				values: [
					{
						displayName: 'Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Name of the binary property which contains the data for the file to be sent.',
					},
				],
			},
		],
	},

    /* -------------------------------------------------------------------------- */
	/*                                 calendar:removeFile                        */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'removeFile',
				],
			},
		},
		default: '',
		description: 'The id of the calendar entry.',
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'removeFile',
				],
			},
		},
		default: '',
		description: 'The id of file to remove.',
	},

    /* -------------------------------------------------------------------------- */
	/*                                 calendar:changeParticipant                 */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'changeParticipant',
				],
			},
		},
		default: '',
		description: 'The id of the calendar entry.',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'calendar',
				],
				operation: [
					'changeParticipant',
				],
			},
		},
        options: [
			{
				name: '1 - decline',
				value: 1,
			},
			{
				name: '2 - maybe',
				value: 1,
			},
			{
				name: '3 - accept',
				value: 1,
			},
			{
				name: '0 - remove from participants',
				value: 1,
			},
        ],
		default: '',
		description: 'The change type.',
	},

] as INodeProperties[];
