import ntlm from 'httpntlm/ntlm';

const ntlmAuthProcessor = async (ctx: any) => {
    let cfg = ctx.auth.credentials.options || {};

    let authMessage = ntlm.createType1Message({
        domain: cfg.domain || '',
        workstation: cfg.workstation || ''
    });

    let cmd;

    cmd = await ctx.sendCommand('AUTH ' + authMessage);
    if (cmd.status !== 334) {
        throw new Error('Invalid login sequence while waiting for server challenge string');
    }

    let challengeString = cmd.text;
    if (!/^NTLM/i.test(challengeString)) {
        challengeString = 'NTLM ' + challengeString;
    }

    let type2Message = ntlm.parseType2Message(challengeString, (err: any) => {
        // parseType2Message handles callback synchronously to return an error response
        throw err;
    });

    let type3Message = ntlm.createType3Message(type2Message, {
        domain: cfg.domain || '',
        workstation: cfg.workstation || '',
        username: ctx.auth.credentials.user,
        password: ctx.auth.credentials.pass
    });

    type3Message = type3Message.substring(5); // remove the "NTLM " prefix

    cmd = await ctx.sendCommand(type3Message);
    if (cmd.status !== 235) {
        throw new Error('Invalid login sequence while waiting for "235"');
    }

    // authenticated!
    return true;
};

export default ntlmAuthProcessor;