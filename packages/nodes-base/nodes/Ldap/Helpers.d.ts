import { Client } from 'ldapts';
import type { Entry } from 'ldapts';
import type { ICredentialDataDecryptedObject, Logger } from 'n8n-workflow';
export declare const BINARY_AD_ATTRIBUTES: string[];
export declare const resolveBinaryAttributes: (entries: Entry[]) => void;
export declare function createLdapClient(context: {
    logger: Logger;
}, credentials: ICredentialDataDecryptedObject, nodeDebug?: boolean, nodeType?: string, nodeName?: string): Promise<Client>;
export declare function escapeValue(value: string): string;
/**
 * Resolves the expressions in a raw, expression-capable filter field and escapes
 * only what each expression evaluated to.
 *
 * The literal text around the expressions is filter syntax the user wrote on
 * purpose, so it has to reach the server untouched — escaping the whole
 * resolved string would turn every hand-written `*`, `(` and `)` into a literal
 * character and break the field.
 */
export declare function escapeResolvables(rawValue: string, evaluateExpression: (resolvable: string) => unknown): string;
//# sourceMappingURL=Helpers.d.ts.map