import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class {{pascalCase creds}} implements ICredentialType {
	name = '{{camelCase creds}}';
	displayName = '{{creds}}';
	documentationUrl = null,
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
