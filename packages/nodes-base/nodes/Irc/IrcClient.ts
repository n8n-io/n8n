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
        this.socket.on('data', this.socketData);
        this.socket.on('close', this.socketClosed);
    }

    private socketConnected(): void {
        if (this.serverPassword) {
            this.sendLine(`PASS :${this.serverPassword}`);
        }
        this.sendLine(`NICK ${this.nick}`);
        this.sendLine(`USER ${this.ident} 0 * :${this.realname}`);
        this.sendLine('QUIT');
    }

    private socketData(input: Buffer|string): void {
        if (input instanceof Buffer) {
            //TODO: hm? what happened here?
            input = Buffer.toString();
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
        // process socket closing
        console.log('emiting closed event');
        this.emit('closed');
        console.log('emiting closed event 2');
    }

    private sendLine(input: string): void {
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
        console.log('running until closed');
        await once(this, 'closed');
        console.log(' and now we are closed qq');
        // return waitForEvent(this, 'close');
        // return new Promise<void>(resolve => this.once('closed', resolve));
    }
}
