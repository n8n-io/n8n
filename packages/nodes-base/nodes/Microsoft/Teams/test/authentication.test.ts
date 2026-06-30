import type { INodeCredentialDescription, INodeProperties } from 'n8n-workflow';

import { MicrosoftTeamsTrigger } from '../MicrosoftTeamsTrigger.node';
import { versionDescription } from '../v2/actions/versionDescription';

/**
 * These tests pin the backward-compatibility contract introduced alongside the
 * generic `microsoftOAuth2Api` credential option: the `authentication` selector
 * must default to the value that gates the existing `microsoftTeamsOAuth2Api`
 * credential, so workflows saved before the selector existed keep authenticating
 * against the Teams credential after the default is backfilled.
 */
const cases: Array<{
	name: string;
	properties: INodeProperties[];
	credentials: INodeCredentialDescription[];
}> = [
	{
		name: 'Microsoft Teams action (v2)',
		properties: versionDescription.properties,
		credentials: versionDescription.credentials ?? [],
	},
	{
		name: 'Microsoft Teams Trigger',
		properties: new MicrosoftTeamsTrigger().description.properties,
		credentials: new MicrosoftTeamsTrigger().description.credentials ?? [],
	},
];

describe.each(cases)('$name authentication selector', ({ properties, credentials }) => {
	const authProperty = properties.find((property) => property.name === 'authentication');

	it('should expose an authentication options selector', () => {
		expect(authProperty).toBeDefined();
		expect(authProperty?.type).toBe('options');
		expect(authProperty?.noDataExpression).toBe(true);
	});

	it('should offer both the Teams and the generic Microsoft credential', () => {
		const values = (authProperty?.options ?? []).map((option) =>
			'value' in option ? option.value : undefined,
		);
		expect(values).toContain('microsoftTeamsOAuth2Api');
		expect(values).toContain('microsoftOAuth2Api');
	});

	it('should default to the Teams credential (backward compatibility)', () => {
		expect(authProperty?.default).toBe('microsoftTeamsOAuth2Api');
	});

	it('should gate each credential behind its matching authentication value', () => {
		const teamsCredential = credentials.find(
			(credential) => credential.name === 'microsoftTeamsOAuth2Api',
		);
		const genericCredential = credentials.find(
			(credential) => credential.name === 'microsoftOAuth2Api',
		);

		expect(teamsCredential?.displayOptions?.show?.authentication).toEqual([
			'microsoftTeamsOAuth2Api',
		]);
		expect(genericCredential?.displayOptions?.show?.authentication).toEqual(['microsoftOAuth2Api']);
		expect(teamsCredential?.required).toBe(true);
		expect(genericCredential?.required).toBe(true);
	});

	it('should keep the default aligned with the Teams credential gate value', () => {
		const credentialGatedByDefault = credentials.find((credential) =>
			credential.displayOptions?.show?.authentication?.includes(authProperty?.default as string),
		);

		expect(credentialGatedByDefault?.name).toBe('microsoftTeamsOAuth2Api');
	});
});
