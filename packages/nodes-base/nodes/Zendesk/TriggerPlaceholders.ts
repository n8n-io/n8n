import {
	INodePropertyOptions,
} from 'n8n-workflow';

export const triggerPlaceholders = [
	{
		name: 'Title',
		value: 'ticket.title',
		description: `Ticket's subject`,
	},
	{
		name: 'Description',
		value: 'ticket.description',
		description: `Ticket's description`,
	},
	{
		name: 'URL',
		value: 'ticket.url',
		description: `Ticket's URL`,
	},
	{
		name: 'ID',
		value: 'ticket.id',
		description: `Ticket's ID`,
	},
	{
		name: 'External ID',
		value: 'ticket.external_id',
		description: `Ticket's external ID`,
	},
	{
		name: 'Via',
		value: 'ticket.via',
		description: `Ticket's source`,
	},
	{
		name: 'Status',
		value: 'ticket.status',
		description: `Ticket's status`,
	},
	{
		name: 'Priority',
		value: 'ticket.priority',
		description: `Ticket's priority`,
	},
	{
		name: 'Type',
		value: 'ticket.ticket_type',
		description: `Ticket's type`,
	},
	{
		name: 'Group Name',
		value: 'ticket.group.name',
		description: `Ticket's assigned group`,
	},
	{
		name: 'Brand Name',
		value: 'ticket.brand.name',
		description: `Ticket's brand`,
	},
	{
		name: 'Due Date',
		value: 'ticket.due_date',
		description: `Ticket's due date (relevant for tickets of type Task)`,
	},
	{
		name: 'Account',
		value: 'ticket.account',
		description: `This Zendesk Support's account name`,
	},
	{
		name: 'Assignee Email',
		value: 'ticket.assignee.email',
		description: `Ticket assignee email (if any)`,
	},
	{
		name: 'Assignee Name',
		value: 'ticket.assignee.name',
		description: `Assignee's full name`,
	},
	{
		name: 'Assignee First Name',
		value: 'ticket.assignee.first_name',
		description: `Assignee's first name`,
	},
	{
		name: 'Assignee Last Name',
		value: 'ticket.assignee.last_name',
		description: `Assignee's last name`,
	},
	{
		name: 'Requester Full Name',
		value: 'ticket.requester.name',
		description: `Requester's full name`,
	},
	{
		name: 'Requester First Name',
		value: 'ticket.requester.first_name',
		description: `Requester's first name`,
	},
	{
		name: 'Requester Last Name',
		value: 'ticket.requester.last_name',
		description: `Requester's last name`,
	},
	{
		name: 'Requester Email',
		value: 'ticket.requester.email',
		description: `Requester's email`,
	},
	{
		name: 'Requester Language',
		value: 'ticket.requester.language',
		description: `Requester's language`,
	},
	{
		name: 'Requester Phone',
		value: 'ticket.requester.phone',
		description: `Requester's phone number`,
	},
	{
		name: 'Requester External ID',
		value: 'ticket.requester.external_id',
		description: `Requester's external ID`,
	},
	{
		name: 'Requester Field',
		value: 'ticket.requester.requester_field',
		description: `Name or email`,
	},
	{
		name: 'Requester Details',
		value: 'ticket.requester.details',
		description: `Detailed information about the ticket's requester`,
	},
	{
		name: 'Requester Organization',
		value: 'ticket.organization.name',
		description: `Requester's organization`,
	},
	{
		name: `Ticket's Organization External ID`,
		value: 'ticket.organization.external_id',
		description: `Ticket's organization external ID`,
	},
	{
		name: `Organization details`,
		value: 'ticket.organization.details',
		description: `The details about the organization of the ticket's requester`,
	},
	{
		name: `Organization Note`,
		value: 'ticket.organization.notes',
		description: `The notes about the organization of the ticket's requester`,
	},
	{
		name: `Ticket's CCs`,
		value: 'ticket.ccs',
		description: `Ticket's CCs`,
	},
	{
		name: `Ticket's CCs names`,
		value: 'ticket.cc_names',
		description: `Ticket's CCs names`,
	},
	{
		name: `Ticket's tags`,
		value: 'ticket.tags',
		description: `Ticket's tags`,
	},
	{
		name: `Current Holiday Name`,
		value: 'ticket.current_holiday_name',
		description: `Displays the name of the current holiday on the ticket's schedule`,
	},
	{
		name: `Current User Name `,
		value: 'current_user.name',
		description: `Your full name`,
	},
	{
		name: `Current User First Name `,
		value: 'current_user.first_name',
		description: 'Your first name',
	},
	{
		name: `Current User Email `,
		value: 'current_user.email',
		description: 'Your primary email',
	},
	{
		name: `Current User Organization Name `,
		value: 'current_user.organization.name',
		description: 'Your default organization',
	},
	{
		name: `Current User Organization Details `,
		value: 'current_user.organization.details',
		description: `Your default organization's details`,
	},
	{
		name: `Current User Organization Notes `,
		value: 'current_user.organization.notes',
		description: `Your default organization's note`,
	},
	{
		name: `Current User Language `,
		value: 'current_user.language',
		description: `Your chosen language`,
	},
	{
		name: `Current User External ID `,
		value: 'current_user.external_id',
		description: 'Your external ID',
	},
	{
		name: `Current User Notes `,
		value: 'current_user.notes',
		description: 'Your notes, stored in your profile',
	},
	{
		name: `Satisfation Current Rating `,
		value: 'satisfaction.current_rating',
		description: 'The text of the current satisfaction rating',
	},
	{
		name: `Satisfation Current Comment `,
		value: 'satisfaction.current_comment',
		description: 'The text of the current satisfaction rating comment',
	},
] as INodePropertyOptions[];
