import type { INodePropertyOptions } from 'n8n-workflow';

import { MicrosoftToDo } from '../MicrosoftToDo.node';

describe('MicrosoftToDo authentication descriptor', () => {
	const node = new MicrosoftToDo();
	const { properties, credentials } = node.description;

	const authentication = properties.find((property) => property.name === 'authentication');
	const toDoCredential = credentials?.find((cred) => cred.name === 'microsoftToDoOAuth2Api');
	const genericCredential = credentials?.find((cred) => cred.name === 'microsoftOAuth2Api');

	it('exposes an authentication selector offering both credentials', () => {
		expect(authentication).toBeDefined();
		expect(authentication?.type).toBe('options');
		expect(authentication?.noDataExpression).toBe(true);

		const optionValues = (authentication?.options as INodePropertyOptions[]).map(
			(option) => option.value,
		);
		expect(optionValues).toEqual([
			'microsoftToDoOAuth2Api',
			'microsoftOAuth2Api',
			'microsoftEntraServicePrincipalApi',
		]);
	});

	it('defaults to the To Do credential and gates it on that value (backward compatibility)', () => {
		// A node saved before the selector existed has no `authentication` parameter; it keeps
		// working only because the backfilled default equals the value gating the To Do credential.
		expect(authentication?.default).toBe('microsoftToDoOAuth2Api');
		expect(toDoCredential?.required).toBe(true);
		expect(toDoCredential?.displayOptions?.show?.authentication).toEqual([
			'microsoftToDoOAuth2Api',
		]);
	});

	it('gates the generic credential behind the generic option', () => {
		expect(genericCredential?.required).toBe(true);
		expect(genericCredential?.displayOptions?.show?.authentication).toEqual(['microsoftOAuth2Api']);
	});

	it('gates the Service Principal credential and its user target behind the SP option', () => {
		const spCredential = credentials?.find(
			(cred) => cred.name === 'microsoftEntraServicePrincipalApi',
		);
		expect(spCredential?.required).toBe(true);
		expect(spCredential?.displayOptions?.show?.authentication).toEqual([
			'microsoftEntraServicePrincipalApi',
		]);

		const userTarget = properties.find((property) => property.name === 'userTarget');
		expect(userTarget?.displayOptions?.show?.authentication).toEqual([
			'microsoftEntraServicePrincipalApi',
		]);
		// Node-level target: no per-item expression, so item-0 resolution can't misroute.
		expect(userTarget?.noDataExpression).toBe(true);
		// To Do is user-only: no "Access As" selector and no drive/site targets.
		expect(properties.find((property) => property.name === 'resourceTarget')).toBeUndefined();
	});
});
