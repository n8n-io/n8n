import type { IWebhookFunctions } from 'n8n-workflow';
/**
 * Verifies the GitHub webhook signature using HMAC-SHA256.
 *
 * GitHub sends a signature in the `X-Hub-Signature-256` header in the format:
 * `sha256=<HMAC hex digest>`
 *
 * This function computes the expected signature using the stored webhook secret
 * and compares it with the provided signature using a constant-time comparison.
 *
 * @returns true only if the stored secret is present and the signature matches
 */
export declare function verifySignature(this: IWebhookFunctions): boolean;
//# sourceMappingURL=GithubTriggerHelpers.d.ts.map