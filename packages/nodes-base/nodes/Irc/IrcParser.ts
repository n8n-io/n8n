// ensure that the given nickname doesn't contain any protocol-breaking characters
export function EnsureIrcNick(nick: string): string {
    nick = EnsureIrcParam(nick);
    if (nick.includes(',') || nick.includes('*') || nick.includes('?') ||
        nick.includes('.') || nick.includes('!') || nick.includes('@')) {
        throw new Error(`Nickname [${nick}] can't include [,*?.!@]`);
    }

    return nick;
}

// ensure that the given input is a valid irc param
export function EnsureIrcParam(input: string): string {
    input = input.trim();
    if (input.startsWith(':') || input.includes(' ') ||
        input.includes('\r') || input.includes('\n')) {
        throw new Error(`Property [${input}] can't start with a colon (:) or contain spaces/newlines`);
    }

    return input;
}

// ensure that the given input is a valid final irc param
export function EnsureIrcFinalParam(input: string): string {
    input = input.trim();
    if (input.includes('\r') || input.includes('\n')) {
        throw new Error(`Property [${input}] can't contain newlines`);
    }

    return input;
}
