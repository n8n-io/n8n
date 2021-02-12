import {
	INodeTypeBase,
	INodeTypeBaseDescription,
} from 'n8n-workflow';

export class HttpRequestBase implements INodeTypeBase {
		description: INodeTypeBaseDescription = {
		displayName: 'HTTP Request V1',
		name: 'httpRequest',
		icon: 'fa:at',
		group: ['input'],
		subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["url"]}}',
		description: 'Makes a HTTP request and returns the received data',
	};   
}