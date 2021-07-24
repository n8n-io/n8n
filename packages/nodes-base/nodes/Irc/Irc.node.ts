import net = require('net');
import tls = require('tls');

import {
    IExecuteFunctions,
} from 'n8n-core';

import {
    NodeOperationError,
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import {
    IrcClient,
} from './IrcClient';

import {
    EnsureIrcParam,
} from './IrcParser';

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
                name: 'ircNetwork',
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
                        description: 'Send a message to a channel',
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
                displayName: 'Replace newlines with spaces',
                name: 'textSendSingleLines',
                type: 'boolean',
                default: true,
                description: "Don't send multiline messages.",
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
                            true
                        ],
                    }
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
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        let responseData;
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
        const credentials = this.getCredentials('ircNetwork') as IDataObject;

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
                const client = new IrcClient(desiredNick, ident, realname);

                // get details
                const messageType = this.getNodeParameter('messageType', 0) as string;
                const channelName = EnsureIrcParam(this.getNodeParameter('channelName', 0) as string);
                const joinChannel = this.getNodeParameter('joinChannel', 0) as boolean;
                let channelKey = '';
                if (joinChannel) {
                    channelKey = EnsureIrcParam(this.getNodeParameter('channelKey', 0) as string);
                }
                let text = this.getNodeParameter('text', 0) as string;
                let textSendSingleLines = this.getNodeParameter('textSendSingleLines', 0) as boolean;
                if (textSendSingleLines) {
                    text = text.replace(/\n/g, ' ');
                }

                // connect
                if (credentials.tls as boolean) {
                    const tlsConnectionOptions = <tls.ConnectionOptions>{
                        port: credentials.tlsPort as number,
                        host: credentials.host as string,
                        rejectUnauthorized: credentials.tlsValidation as boolean,
                    };
                    if (tlsConnectionOptions.rejectUnauthorized) {
                        // enable SNI
                        tlsConnectionOptions.servername = tlsConnectionOptions.host
                    }
                    client.connect(undefined, tlsConnectionOptions, serverPassword);
                } else {
                    const netConnectionOptions = <net.NetConnectOpts>{
                        port: credentials.plainPort as number,
                        host: credentials.host as string,
                    };
                    client.connect(netConnectionOptions, undefined, serverPassword);
                }

                client.on('connected', () => {
                    if (joinChannel) {
                        client.sendLine(`JOIN ${channelName} ${channelKey}`);
                    }
                    let verb = 'PRIVMSG';
                    if (messageType == 'notice') {
                        verb = 'NOTICE';
                    }
                    text.split('\n').forEach(line => {
                        let subLines = [];
                        while (line.length > 410) {
                            subLines.push(line.slice(0, 410));
                            line = line.slice(410);
                        }
                        subLines.push(line);

                        subLines.forEach(subLine => {
                            if (messageType == 'action') {
                                subLine = `\x01ACTION ${subLine}\x01`;
                            }
                            client.sendLine(`${verb} ${channelName} :${subLine}`);
                        });
                    });
                });

                // return when we're disconnected
                await client.runUntilClosed();

                return [this.helpers.returnJsonArray(client.statusInfo())];
            }
        }

        return [];
    }
}