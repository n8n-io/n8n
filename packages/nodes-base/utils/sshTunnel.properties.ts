import type { INodeProperties } from 'n8n-workflow';

export const sshTunnelProperties: INodeProperties[] = [
	{
		displayName: 'SSH Tunnel',
		name: 'sshTunnel',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'SSH Authenticate with',
		name: 'sshAuthenticateWith',
		type: 'options',
		default: 'password',
		options: [
			{
				name: 'Password',
				value: 'password',
			},
			{
				name: 'Private Key',
				value: 'privateKey',
			},
		],
		displayOptions: {
			show: {
				sshTunnel: [true],
			},
		},
	},
	{
		displayName: 'SSH Host',
		name: 'sshHost',
		type: 'string',
		default: 'localhost',
		displayOptions: {
			show: {
				sshTunnel: [true],
			},
		},
	},
	{
		displayName: 'SSH Port',
		name: 'sshPort',
		type: 'number',
		default: 22,
		displayOptions: {
			show: {
				sshTunnel: [true],
			},
		},
	},
	{
		displayName: 'SSH User',
		name: 'sshUser',
		type: 'string',
		default: 'root',
		displayOptions: {
			show: {
				sshTunnel: [true],
			},
		},
	},
	{
		displayName: 'SSH Password',
		name: 'sshPassword',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				sshTunnel: [true],
				sshAuthenticateWith: ['password'],
			},
		},
	},
	{
		displayName: 'Private Key',
		name: 'privateKey', // TODO: Rename to sshPrivateKey
		type: 'string',
		typeOptions: {
			rows: 4,
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				sshTunnel: [true],
				sshAuthenticateWith: ['privateKey'],
			},
		},
	},
	{
		displayName: 'Passphrase',
		name: 'passphrase', // TODO: Rename to sshPassphrase
		type: 'string',
		default: '',
		description: 'Passphrase used to create the key, if no passphrase was used leave empty',
		displayOptions: {
			show: {
				sshTunnel: [true],
				sshAuthenticateWith: ['privateKey'],
			},
		},
	},
];
