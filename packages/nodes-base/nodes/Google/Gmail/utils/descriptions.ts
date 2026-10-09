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

/**
 * Tells the builder what each `simple` setting returns. The two settings use
 * different field names for the sender, so code that reads the wrong one
 * silently gets an empty value.
 */
export const simplifyOutputShapeHint =
	'Keep true by default. True returns one flat item for each message. The sender is the string `$json.From`, for example "Sara Chen <sara@example.com>". The item also has `To`, `Cc`, `Bcc`, `Subject`, `snippet`, `labels`, `id` and `threadId`. It has no message body. False returns the parsed email. The sender is the object `$json.from`: read the address with `$json.from.value[0].address`, or use the string `$json.headers.from`. The body is in `$json.text`, `$json.html` and `$json.textAsHtml`. With false, `$json.From` is undefined. With either setting, `$json.from` is not a string. To filter or route by sender, keep true. Set false only when the workflow needs the message body, for example for AI classification or summarization. False uses much more memory and often causes out-of-memory crashes.';
