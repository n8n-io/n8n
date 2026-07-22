import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

export const simplifyMemoryNotice = ({
	displayOptions,
}: { displayOptions?: IDisplayOptions } = {}): INodeProperties => ({
	displayName:
		'Simplify already returns the key fields most workflows need. The full response is much larger and can cause out-of-memory errors. Only turn Simplify off if you need the raw email body, attachments or other fields not available in the simplified response.',
	name: 'simplifyMemoryNotice',
	type: 'notice',
	default: '',
	displayOptions,
});
