import { CREDENTIAL_ONLY_NODE_PREFIX } from './constants';

/**
 * A credential-only node is HTTP Request with one credential type attached, such as the
 * VirusTotal or Sysdig node. The editor generates it from a credential type that declares
 * `httpRequestNode`, so no package registers it and the backend never sees its name: it is
 * stored as `n8n-nodes-base.httpRequest` with `extendsCredential` set to the credential type.
 *
 * Its generated name is `n8n-creds-base.<credentialType>`.
 */
export function isCredentialOnlyNodeType(nodeTypeName: string): boolean {
	return nodeTypeName.startsWith(`${CREDENTIAL_ONLY_NODE_PREFIX}.`);
}

export function getCredentialOnlyNodeTypeName(credentialTypeName: string): string {
	return `${CREDENTIAL_ONLY_NODE_PREFIX}.${credentialTypeName}`;
}

/** The credential type a credential-only node wraps, e.g. `virusTotalApi` for `n8n-creds-base.virusTotalApi`. */
export function getCredentialOnlyNodeCredentialType(nodeTypeName: string): string {
	return nodeTypeName.slice(CREDENTIAL_ONLY_NODE_PREFIX.length + 1);
}
