import cloneDeep from 'lodash/cloneDeep';
import type { CredentialLoadingDetails, ICredentialType, INodeTypeDescription } from './Interfaces';
import { isNodeOfVersion } from './NodeHelpers';

const HTTP_NODE_VARIANT_VERSION = 4.1;

export function generateCredentialOnlyNodes({
	node,
	credentialTypes,
	knownCredentials,
}: {
	node: INodeTypeDescription;
	credentialTypes: ICredentialType[];
	knownCredentials: Record<string, CredentialLoadingDetails>;
}): INodeTypeDescription[] {
	if (
		node.name === 'n8n-nodes-base.httpRequest' &&
		isNodeOfVersion(node, HTTP_NODE_VARIANT_VERSION)
	) {
		return Object.values(credentialTypes)
			.filter((credential) => credential.httpRequestNodeVariant)
			.map((credential) => {
				const hasSupportedNodes =
					(knownCredentials[credential.name]?.supportedNodes?.length ?? 0) > 0;
				const variantNode = cloneDeep(node);
				const httpIcon = variantNode.iconUrl;
				const {
					docsUrl,
					apiBaseUrl,
					apiBaseUrlPlaceholder,
					name: nodeName,
				} = credential.httpRequestNodeVariant!;

				if (hasSupportedNodes) {
					variantNode.hidden = true;
				}
				variantNode.name = `n8n-creds-base:${credential.name}`;
				variantNode.credentials = [{ name: credential.name, required: true }];
				variantNode.displayName = nodeName ?? credential.displayName;

				variantNode.defaults.name = `${nodeName} HTTP Request`;
				variantNode.description = 'HTTP request';
				variantNode.codex = {};

				if (credential.icon ?? credential.iconUrl) {
					variantNode.icon = credential.icon;
					variantNode.iconUrl = credential.iconUrl;
					variantNode.badgeIconUrl = httpIcon;
				} else {
					variantNode.iconUrl = httpIcon;
				}

				variantNode.properties = variantNode.properties.map((prop) => {
					switch (prop.name) {
						case 'authentication':
							return { ...prop, type: 'hidden', default: 'predefinedCredentialType' };
						case 'nodeCredentialType':
							return { ...prop, type: 'hidden', default: credential.name };
						case 'url':
							return {
								...prop,
								default: apiBaseUrl,
								placeholder:
									apiBaseUrlPlaceholder ?? (apiBaseUrl ? `e.g. ${apiBaseUrl}` : prop.placeholder),
							};
						default:
							return prop;
					}
				});

				variantNode.properties.splice(1, 0, {
					type: 'notice',
					displayName: `Use the <a target="_blank" href="${docsUrl}">${nodeName} docs</a> to construct your request. We'll take care of the authentication part if you add a ${nodeName} credential below.`,
					name: 'httpVariantWarning',
					default: '',
				});

				variantNode.properties.splice(4, 0, {
					type: 'credentials',
					displayName: '',
					name: '',
					default: '',
				});
				return variantNode;
			});
	}

	return [];
}
