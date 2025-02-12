import type { INodeProperties } from 'n8n-workflow';

// TODO: This needs to be a list of users on the instance
export const toEmailProperty: INodeProperties = {
	displayName: 'To Email',
	name: 'toEmail',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'info@example.com',
	description:
		'Email address of the recipient. You can also specify a name: Nathan Doe &lt;nate@n8n.io&gt;.',
};
