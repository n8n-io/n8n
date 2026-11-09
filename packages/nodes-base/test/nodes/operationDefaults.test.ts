import type { INodeProperties } from 'n8n-workflow';

import { eventOperations } from '../../nodes/Bitwarden/descriptions/EventDescription';
import { companyContactOperations } from '../../nodes/Mautic/CompanyContactDescription';
import { folderMessageOperations } from '../../nodes/Microsoft/Outlook/v1/FolderMessageDecription';
import { auditOperations } from '../../nodes/N8n/AuditDescription';
import { Spotify } from '../../nodes/Spotify/Spotify.node';

/**
 * Asserts that for every `type: 'options'` parameter that declares a static
 * list of options and a non-empty string default, the default is one of the
 * option values. Parameters with dynamically loaded options (no static
 * `options` array) are skipped.
 */
function expectOptionDefaultsToBeValid(properties: INodeProperties[]) {
	for (const property of properties) {
		if (property.type !== 'options') continue;
		if (!Array.isArray(property.options) || property.options.length === 0) continue;
		if (typeof property.default !== 'string' || property.default === '') continue;

		const validValues = property.options
			.map((option) => ('value' in option ? option.value : undefined))
			.filter((value): value is string | number => value !== undefined);

		expect(validValues).toContain(property.default);
	}
}

describe('operation parameter defaults', () => {
	it('Bitwarden Event operation default is a valid option', () => {
		expectOptionDefaultsToBeValid(eventOperations);
	});

	it('Mautic Company Contact operation default is a valid option', () => {
		expectOptionDefaultsToBeValid(companyContactOperations);
	});

	it('Microsoft Outlook v1 Folder Message operation default is a valid option', () => {
		expectOptionDefaultsToBeValid(folderMessageOperations);
	});

	it('n8n Audit operation default is a valid option', () => {
		expectOptionDefaultsToBeValid(auditOperations);
	});

	it('Spotify operation defaults are valid options', () => {
		expectOptionDefaultsToBeValid(new Spotify().description.properties);
	});
});
