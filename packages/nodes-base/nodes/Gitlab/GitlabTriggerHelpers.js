import { randomBytes } from 'crypto';
import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';
const WEBHOOK_TOKEN_HEADER = 'x-gitlab-token';
export function generateWebhookSecret() {
    return randomBytes(32).toString('hex');
}
export function verifySignature() {
    const headerData = this.getHeaderData();
    const webhookData = this.getWorkflowStaticData('node');
    const expectedSecret = webhookData.webhookSecret;
    return verifySignatureGeneric({
        getExpectedSignature: () => (typeof expectedSecret === 'string' ? expectedSecret : null),
        skipIfNoExpectedSignature: true,
        getActualSignature: () => {
            const actualSecret = headerData[WEBHOOK_TOKEN_HEADER];
            return typeof actualSecret === 'string' ? actualSecret : null;
        },
    });
}
//# sourceMappingURL=GitlabTriggerHelpers.js.map