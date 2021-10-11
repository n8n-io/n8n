import {
	INodeProperties,
} from 'n8n-workflow';

export const GroupsDescription = [
				// ----------------------------------
				//         Operation: group
				// ----------------------------------
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
						show: {
							resource: ['group'],
							api: ['rest']
						}
					},
					options: [
						{
							name: 'Create',
							value: 'create',
							description: 'Create an entry.'
						},
						{
							name: 'Show',
							value: 'show',
							description: 'Get data of an entry.'
						},
						{
							name: 'List',
							value: 'list',
							description: 'Get data of all entries.'
						},
						{
							name: 'Update',
							value: 'update',
							description: 'Update an entry.'
						},
						{
							name: 'Delete',
							value: 'delete',
							description: 'Delete an entry.'
						},
					],
					default: 'create',
					description: 'The operation to perform.'
				},
				// ----------------------------------
				//         Fields: group
				// ----------------------------------
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					required: true,
					displayOptions: {
						show: {
							operation: ['create', 'update'],
							resource: ['group'],
							api: ['rest'],
						}
					},
					description: 'The name of the group.'
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					default: '',
					required: true,
					displayOptions: {
						show: {
							operation: ['update', 'show', 'delete'],
							resource: ['group'],
							api: ['rest'],
						}
					},
					description: 'The ID of the group.'
				},
				{
					displayName: 'Additional Fields',
					name: 'optionalFields',
					type: 'collection',
					displayOptions: {
						show: {
							operation: ['create', 'update'],
							resource: ['group'],
							api: ['rest'],
						}
					},
					default: {},
					description: 'Additional optional fields of the group.',
					placeholder: 'Add Field',
					options: [
						{
							displayName: 'Signature ID',
							name: 'signature_id',
							type: 'number',
							default: 0,
							description: "The groups gignature ID."
						},
						{
							displayName: 'Email Address ID',
							name: 'email_address_id',
							type: 'number',
							default: 0,
							description: "The groups email address ID."
						},
						{
							displayName: 'Assignment Timeour',
							name: 'assignment_timeout',
							type: 'number',
							default: 0,
							description: "The groups Assignment Timeout."
						},
						{
							displayName: 'Followup Possible?',
							name: 'follow_up_possible',
							type: 'string',
							default: 'yes',
							description: "If follow up is possible with this group. Is string value as required by API."
						},
						{
							displayName: 'Followup Assignment?',
							name: 'follow_up_assignment',
							type: 'boolean',
							default: false,
							description: "If follow ups should be assigned."
						},
						{
							displayName: 'Active?',
							name: 'active',
							type: 'boolean',
							default: false,
							description: 'If the group is active.'
						},
						{
							displayName: 'Note',
							name: 'note',
							type: 'string',
							default: '',
							description: "The note of the group."
						},
					]
				},

] as INodeProperties[];
