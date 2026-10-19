import type { INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { optionsCollection } from '../../v2/actions/common.descriptions';
import { versionDescription } from '../../v2/actions/versionDescription';

/** The Query Parameters options that the editor shows for Execute Query at a given version */
const visibleQueryParameterOptions = (typeVersion: number) =>
	(optionsCollection.options as INodeProperties[]).filter(
		(option) =>
			option.name === 'queryReplacement' &&
			NodeHelpers.displayParameter({}, option, { typeVersion }, versionDescription, {
				operation: 'executeQuery',
			}),
	);

describe('PostgresV2, Query Parameters option', () => {
	it.each(versionDescription.version as number[])(
		'should show exactly one Query Parameters option at v%s',
		(typeVersion) => {
			expect(visibleQueryParameterOptions(typeVersion)).toHaveLength(1);
		},
	);

	it.each([
		{ typeVersion: 2.7, mentionsOneValue: false },
		{ typeVersion: 2.8, mentionsOneValue: true },
	])(
		'should tell that an expression gives one value only from v2.8 (v$typeVersion)',
		({ typeVersion, mentionsOneValue }) => {
			const [option] = visibleQueryParameterOptions(typeVersion);

			expect(option.hint?.includes('An expression always gives one value')).toBe(mentionsOneValue);
		},
	);
});
