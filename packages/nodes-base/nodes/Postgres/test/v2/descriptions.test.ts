import type { INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { optionsCollection } from '../../v2/actions/common.descriptions';
import { versionDescription } from '../../v2/actions/versionDescription';

const isLegacyQuotedParameterOptionVisible = (typeVersion: number) => {
	const option = (optionsCollection.options as INodeProperties[]).find(
		({ name }) => name === 'treatQueryParametersInSingleQuotesAsText',
	);
	if (!option) return false;

	return NodeHelpers.displayParameter(
		{ queryReplacement: 'value' },
		option,
		{ typeVersion },
		versionDescription,
	);
};

describe('PostgresV2, Query Parameters option', () => {
	it('should hide the legacy quoted parameter option from v2.9', () => {
		expect(isLegacyQuotedParameterOptionVisible(2.6)).toBe(true);
		expect(isLegacyQuotedParameterOptionVisible(2.9)).toBe(false);
	});
});
