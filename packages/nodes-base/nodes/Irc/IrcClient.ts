import { once, EventEmitter } from 'events';
import net = require('net');
import tls = require('tls');

import {
    EnsureIrcNick,
    EnsureIrcFinalParam,
    EnsureIrcParam,
    IrcMessage,
    ParseIrcMessage,
} from './IrcParser';

export class IrcClient extends EventEmitter {
    private socket?: net.Socket | tls.TLSSocket;
    private usingTLS: boolean = false;
    private serverPassword?: string;
    private bufferedData: string = '';
    private rawLog: string = '';
    private errorMessage: string = '';
    public connectionRegComplete: boolean = false;

    constructor(
        public nick: string,
        public ident: string,
        public realname: string,
        public saveRawLogs?: boolean,
    ) {
        super();

        // throw errors for these values early
        this.nick = EnsureIrcNick(this.nick);
        this.ident = EnsureIrcParam(this.ident);
        this.realname = EnsureIrcFinalParam(this.realname);

        // setup default event handlers
        // e.g. PING, ENDOFMOTD/NOMOTD setting connectionRegComplete, SASL, BOT, etc.
        this.on('irc ping', this.handlePing);
        this.on('irc 001', this.handleWelcome);
        this.on('irc 005', this.handleIsupport);
        this.on('irc 376', this.handleRegComplete);
        this.on('irc 422', this.handleRegComplete);
    }

    private handlePing(message: IrcMessage) {
        this.send('', 'PONG', ...message.params);
    }

    private handleWelcome(message: IrcMessage) {
        // fix our nickname if it was truncated
        this.nick = message.params[0];
    }

    private handleIsupport(message: IrcMessage) {
        if (this.connectionRegComplete) {
            return;
        }
        // set BOT mode on ourselves
        message.params.forEach((param, i) => {
            if (i < message.params.length-1) {
                const split = param.split('=')
                if (split.length == 2 && split[0].toLowerCase() == 'bot') {
                    this.send('', 'MODE', this.nick, `+${split[1]}`);
                }
            }
        });
    }

    private handleRegComplete(message: IrcMessage) {
        if (!this.connectionRegComplete) {
            this.connectionRegComplete = true;
            this.emit('connected');
        }
    }

    public connect(netConnectionOptions?: net.NetConnectOpts, tlsConnectionOptions?: tls.ConnectionOptions, serverPassword?: string): void {
        this.serverPassword = serverPassword;

        if (netConnectionOptions && tlsConnectionOptions) {
            throw new Error("You can only send either netConnectionOptions or tlsConnectionOptions, not both");
        } else if (tlsConnectionOptions) {
            this.socket = tls.connect(tlsConnectionOptions, () => {
                this.socketConnected();
            });
            this.usingTLS = true;
        } else if (netConnectionOptions) {
            this.socket = net.connect(netConnectionOptions, () => {
                this.socketConnected();
            });
        } else {
            throw new Error("You must send either netConnectionOptions or tlsConnectionOptions");
        }
        this.socket.setEncoding('utf8');
        this.socket.on('data', this.socketData.bind(this));
        this.socket.on('close', this.socketClosed.bind(this));
        this.socket.on('error', this.socketError.bind(this));
    }

    private socketConnected(): void {
        if (this.serverPassword) {
            this.sendLine(`PASS :${this.serverPassword}`);
        }
        this.send('', 'NICK', this.nick);
        this.send('', 'USER', this.ident, '0', '*', this.realname);
    }

    private socketData(input: Buffer|string): void {
        if (input instanceof Buffer) {
            // sometimes we can get an early empty buffer if we don't
            //  set the encoding in time
            input = input.toString();
        }
        this.bufferedData += input;

        // empty the buffer
        let messages = this.bufferedData.split('\n');

        this.bufferedData = messages.pop()!;

        messages.forEach(msgString => {
            msgString = msgString.replace(/\r/g, '');
            if (this.saveRawLogs) {
                this.rawLog += `<-  ${msgString}\n`;
            }
            // const message = ParseIrcMessage(msgString);
            console.log(msgString);
            const message = ParseIrcMessage(msgString);
            this.emit(`irc ${message.verb.toLowerCase()}`, message);
        });
    }

    private socketClosed(hadError: boolean): void {
        this.emit('closed', hadError);
    }

    private socketError(err: Error): void {
        this.errorMessage = `socket error: ${err.message}`;
    }

    public send(prefix: string, verb: string, ...params: string[]): void {
        this.sendLine(new IrcMessage(prefix, verb, params).toString());
    }

    private sendLine(input: string): void {
        if (this.socket == undefined) {
            return
        }
        console.log(input);
        this.socket.write(`${input}\r\n`);
        if (this.saveRawLogs) {
            this.rawLog += ` -> ${input}\n`;
        }
    }

    public statusInfo() {
        return {
            'log': this.rawLog,
            'error': this.errorMessage,
        };
    }

    public async runUntilClosed() {
        if (!this.socket || this.socket.destroyed) {
            return;
        }
        await once(this, 'closed');
    }
}
