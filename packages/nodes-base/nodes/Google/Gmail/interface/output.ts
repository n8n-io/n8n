import type { INodeTypeDataInterface } from 'n8n-workflow';

export const gmailOutputInterface: INodeTypeDataInterface = {
	id: "={{ generate('uuid') }}",
	threadId: "={{ generate('uuid') }}",
	snippet: "={{ generate('paragraph') }}",
	payload: {
		mimeType: 'multipart/alternative',
	},
	sizeEstimate: "={{ generate('number') }}",
	historyId: "={{ generate('uuid') }}",
	internalDate: "={{ generate('number') }}",
	labels: [
		{
			id: 'INBOX',
			name: 'INBOX',
		},
		{
			id: 'IMPORTANT',
			name: 'IMPORTANT',
		},
		{
			id: 'CATEGORY_UPDATES',
			name: 'CATEGORY_UPDATES',
		},
	],
	From: "={{ generate('name') }} <{{ generate('email') }}>",
	To: "={{ generate('name') }} <{{ generate('email') }}>",
	Subject: "={{ generate('title') }}",
};
