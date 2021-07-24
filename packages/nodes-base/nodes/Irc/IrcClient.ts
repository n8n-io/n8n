import { once, EventEmitter } from 'events';
import net = require('net');
import tls = require('tls');

import {
    EnsureIrcNick,
    EnsureIrcFinalParam,
    EnsureIrcParam,
} from './IrcParser';

export class IrcClient extends EventEmitter {
    private socket?: net.Socket | tls.TLSSocket;
    private usingTLS: boolean = false;
    private serverPassword?: string;
    private bufferedData: string = '';
    private rawLog: string = '';

    constructor(
        public nick: string,
        public ident: string,
        public realname: string,
    ) {
        super();
        this.nick = EnsureIrcNick(this.nick);
        this.ident = EnsureIrcParam(this.ident);
        this.realname = EnsureIrcFinalParam(this.realname);
    }

    connect(netConnectionOptions?: net.NetConnectOpts, tlsConnectionOptions?: tls.ConnectionOptions, serverPassword?: string): void {
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
    }

    private socketConnected(): void {
        if (this.serverPassword) {
            this.sendLine(`PASS :${this.serverPassword}`);
        }
        this.sendLine(`NICK ${this.nick}`);
        this.sendLine(`USER ${this.ident} 0 * :${this.realname}`);
        this.emit('connected');
        this.sendLine('QUIT');
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
            // const message = ParseIrcMessage(msgString);
            console.log(msgString);
            this.rawLog += `<-  ${msgString}\n`;
        });
    }

    private socketClosed(hadError: boolean): void {
        this.emit('closed');
    }

    public sendLine(input: string): void {
        if (this.socket == undefined) {
            return
        }
        console.log(input);
        this.socket.write(`${input}\r\n`);
        this.rawLog += ` -> ${input}\n`;
    }

    public statusInfo() {
        return {
            'log': this.rawLog,
        };
    }

    public async runUntilClosed() {
        if (!this.socket || this.socket.destroyed) {
            return;
        }
        await once(this, 'closed');
    }
}
