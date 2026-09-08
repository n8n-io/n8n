import { NodeApiError } from 'n8n-workflow';
import { createUtmCampaignLink } from '../../utils/utilities';
export const WHATSAPP_BASE_URL = 'https://graph.facebook.com/v13.0/';
async function appAccessTokenRead() {
    const credentials = await this.getCredentials('whatsAppTriggerApi');
    const options = {
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        body: {
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            grant_type: 'client_credentials',
        },
        url: 'https://graph.facebook.com/v19.0/oauth/access_token',
        json: true,
    };
    try {
        return await this.helpers.httpRequest.call(this, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
async function whatsappApiRequest(method, resource, body, qs = {}) {
    const tokenResponse = await appAccessTokenRead.call(this);
    const appAccessToken = tokenResponse.access_token;
    const options = {
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${appAccessToken}`,
        },
        method,
        qs,
        body: body?.payload,
        url: `https://graph.facebook.com/v19.0${resource}`,
        json: true,
    };
    try {
        return await this.helpers.httpRequest.call(this, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function appWebhookSubscriptionList(appId) {
    const response = (await whatsappApiRequest.call(this, 'GET', `/${appId}/subscriptions`));
    return response.data;
}
export async function appWebhookSubscriptionCreate(appId, subscription) {
    return await whatsappApiRequest.call(this, 'POST', `/${appId}/subscriptions`, {
        type: 'form',
        payload: { ...subscription },
    });
}
export async function appWebhookSubscriptionDelete(appId, object) {
    return await whatsappApiRequest.call(this, 'DELETE', `/${appId}/subscriptions`, {
        type: 'form',
        payload: { object },
    });
}
export const createMessage = (sendAndWaitConfig, phoneNumberId, recipientPhoneNumber, instanceId) => {
    const buttons = sendAndWaitConfig.options.map((option) => {
        return `*${option.label}:*\n_${option.url}_\n\n`;
    });
    let n8nAttribution = '';
    if (sendAndWaitConfig.appendAttribution) {
        const attributionText = 'This message was sent automatically with ';
        const link = createUtmCampaignLink('n8n-nodes-base.whatsapp', instanceId);
        n8nAttribution = `\n\n${attributionText}${link}`;
    }
    return {
        baseURL: WHATSAPP_BASE_URL,
        method: 'POST',
        url: `${phoneNumberId}/messages`,
        body: {
            messaging_product: 'whatsapp',
            text: {
                body: `${sendAndWaitConfig.message}\n\n${buttons.join('')}${n8nAttribution}`,
            },
            type: 'text',
            to: recipientPhoneNumber,
        },
    };
};
//# sourceMappingURL=GenericFunctions.js.map