import { googleApiRequest, getLabels } from '../GenericFunctions';
export async function getThreadMessages() {
    const returnData = [];
    const id = this.getNodeParameter('threadId', 0);
    const { messages } = await googleApiRequest.call(this, 'GET', `/gmail/v1/users/me/threads/${id}`, {}, { format: 'minimal' });
    for (const message of messages || []) {
        returnData.push({
            name: message.snippet,
            value: message.id,
        });
    }
    return returnData;
}
export async function getGmailAliases() {
    const returnData = [];
    const { sendAs } = await googleApiRequest.call(this, 'GET', '/gmail/v1/users/me/settings/sendAs');
    for (const alias of sendAs || []) {
        const displayName = alias.isDefault ? `${alias.sendAsEmail} (Default)` : alias.sendAsEmail;
        returnData.push({
            name: displayName,
            value: alias.sendAsEmail,
        });
    }
    return returnData;
}
export { getLabels };
//# sourceMappingURL=loadOptions.js.map