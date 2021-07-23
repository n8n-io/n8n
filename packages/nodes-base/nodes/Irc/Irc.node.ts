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

                // setup connected messages
                // // get details
                // const channelName = EnsureIrcParam(this.getNodeParameter('channelName', 0) as string);
                // let text = this.getNodeParameter('text', 0) as string;
                // let textSendSingleLines = this.getNodeParameter('textSendSingleLines', 0) as boolean;
                // if (textSendSingleLines) {
                //     text = text.replace(/\n/g, ' ');
                // }

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

                // return when we're disconnected
                console.log(' AAAAAAAA 2')
                await client.runUntilClosed();
                console.log(' BBBBBBBB 3')
                return [this.helpers.returnJsonArray(client.statusInfo())];
            }
        }

        // Map data to n8n data
        return [this.helpers.returnJsonArray({'name': 'hi', 'features': {'blah': true, 'ack': 'asd'}})];
    }
}