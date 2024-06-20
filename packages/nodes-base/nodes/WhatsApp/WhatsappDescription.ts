import type { INodeProperties } from 'n8n-workflow';

export const whatsappTriggerDescription: INodeProperties[] = [
	{
		displayName: 'Trigger On',
		name: 'updates',
		type: 'multiOptions',
		required: true,
		default: [],
		options: [
			{
				name: 'Account Review Update',
				value: 'account_review_update',
			},
			{
				name: 'Account Update',
				value: 'account_update',
			},
			{
				name: 'Business Capability Update',
				value: 'business_capability_update',
			},
			{
				name: 'Message Template Quality Update',
				value: 'message_template_quality_update',
			},
			{
				name: 'Message Template Status Update',
				value: 'message_template_status_update',
			},
			{
				name: 'Messages',
				value: 'messages',
			},
			{
				name: 'Phone Number Name Update',
				value: 'phone_number_name_update',
			},
			{
				name: 'Phone Number Quality Update',
				value: 'phone_number_quality_update',
			},
			{
				name: 'Security',
				value: 'security',
			},
			{
				name: 'Template Category Update',
				value: 'template_category_update',
			},
		],
	},
];
