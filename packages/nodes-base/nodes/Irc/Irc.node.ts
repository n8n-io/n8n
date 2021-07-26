import net = require('net');
import tls = require('tls');

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	LoggerProxy as Logger,
	NodeOperationError,
} from 'n8n-workflow';

import {
	IrcClient,
} from './IrcClient';

import {
	EnsureIrcParam,
} from './IrcParser';

class IrcError extends Error {
	ircDetails: object;

	constructor(message: string, details: object) {
		super(message);
		this.name = 'IrcError';
		this.ircDetails = details;
	}
}

export class Irc implements INodeType {
	description: INodeTypeDescription = {
		displayName: ' Internet Relay Chat (IRC)',
		name: 'irc',
		icon: 'file:irc.svg',
		group: ['output'],
		version: 1,
		description: 'Sends data to an IRC channel',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'IRC',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'irc',
				required: true,
			},
		],
		properties: [

			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},

			//
			// message
			//
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Send a message to a channel.',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			//
			// message:create
			//
			{
				displayName: 'Channel Name',
				name: 'channelName',
				type: 'string',
				required: true,
				default: '',
				description: 'The channel to send the message to.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				placeholder: 'Hello from n8n!',
				description: 'The text to send.',
			},
			{
				displayName: 'Join Channel',
				name: 'joinChannel',
				type: 'boolean',
				default: true,
				description: 'Whether or not to join the channel.',
			},
			{
				displayName: 'Channel Key',
				name: 'channelKey',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						'joinChannel': [
							true,
						],
					},
				},
				description: 'The key used to join this channel (optional).',
			},
			{
				displayName: 'Message Type',
				name: 'messageType',
				type: 'options',
				options: [
					{
						name: 'Emote',
						value: 'action',
						description: 'Perform an action (/me).',
					},
					{
						name: 'Notice',
						value: 'notice',
						description: 'Send a notice.',
					},
					{
						name: 'Privmsg',
						value: 'privmsg',
						description: 'Send a privmsg.',
					},
				],
				default: 'privmsg',
				description: 'The type of message to send.',
			},
			{
				displayName: 'Output Raw Logs',
				name: 'outputRawLogs',
				type: 'boolean',
				default: false,
				description: 'Output log of raw IRC traffic.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const outputInfo: any = {}; // tslint:disable-line:no-any
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = this.getCredentials('irc') as IDataObject;

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		if (resource === 'message') {
			if (operation === 'create') {
				// get credential details
				const desiredNick = credentials.nickname as string;
				const ident = credentials.ident as string;
				const realname = credentials.realname as string;
				const serverPassword = credentials.serverPassword as string;

				// assemble irc client
				const outputRawLogs = this.getNodeParameter('outputRawLogs', 0) as boolean;
				const client = new IrcClient(desiredNick, ident, realname, outputRawLogs);

				// setup sasl
				if (credentials.saslType as string === 'plain') {
					const saslUsername = credentials.saslAccountName as string;
					const saslPassword = credentials.saslAccountPassword as string;
					const saslRequired = credentials.saslRequired as boolean;
					client.setupSaslPlain(saslUsername, saslPassword, saslRequired);
				}

				// get details
				const messageType = this.getNodeParameter('messageType', 0) as string;
				const channelName = EnsureIrcParam(this.getNodeParameter('channelName', 0) as string);
				const joinChannel = this.getNodeParameter('joinChannel', 0) as boolean;
				let channelKey = this.getNodeParameter('channelKey', 0) as string;
				if (joinChannel && channelKey) {
					channelKey = EnsureIrcParam(channelKey);
				}

				// this will be output at the end
				const sentLines: string[] = [];

				// connect
				Logger.verbose('IRC connecting.');
				if (credentials.tls as boolean) {
					const tlsConnectionOptions = {
						port: credentials.tlsPort as number,
						host: credentials.host as string,
						rejectUnauthorized: credentials.tlsValidation as boolean,
					} as tls.ConnectionOptions;
					if (tlsConnectionOptions.rejectUnauthorized) {
						// enable SNI
						tlsConnectionOptions.servername = tlsConnectionOptions.host;
					}
					client.connect(undefined, tlsConnectionOptions, serverPassword);
				} else {
					const netConnectionOptions = {
						port: credentials.plainPort as number,
						host: credentials.host as string,
					} as net.NetConnectOpts;
					client.connect(netConnectionOptions, undefined, serverPassword);
				}

				client.on('connected', () => {
					Logger.verbose('IRC connection established, now sending messages.');
					if (joinChannel) {
						client.send('JOIN', channelName, channelKey);
					}
					let verb = 'PRIVMSG';
					if (messageType === 'notice') {
						verb = 'NOTICE';
					}
					for (let i = 0; i < items.length; i++) {
						const text = this.getNodeParameter('text', i) as string;
						text.split('\n').forEach(line => {
							const subLines = [];
							while (line.length > 410) {
								subLines.push(line.slice(0, 410));
								line = line.slice(410);
							}
							subLines.push(line);

							subLines.forEach(subLine => {
								sentLines.push(subLine);
								if (messageType === 'action') {
									subLine = `\x01ACTION ${subLine}\x01`;
								}
								client.send(verb, channelName, subLine);
							});
						});
					}
					client.send('QUIT');
				});

				// return when we're disconnected
				Logger.verbose('Waiting until IRC connection closes.');
				await client.runUntilClosed();

				const statusInfo = client.statusInfo();
				Logger.verbose(`IRC connection closed, returned error message is [${statusInfo.error}].`);
				if (statusInfo.error) {
					if (this.continueOnFail()) {
						outputInfo.error = statusInfo.error;
					} else {
						throw new IrcError(statusInfo.error, statusInfo);
					}
				}

				outputInfo.account = client.account;
				outputInfo.nick = client.nick;
				outputInfo.sentLines = sentLines;
				outputInfo.timesNickWasInUse = client.timesNickWasInUse;
				if (outputRawLogs) {
					outputInfo.log = statusInfo.log;
				}
			}
		}

		return [this.helpers.returnJsonArray(outputInfo)];
	}
}