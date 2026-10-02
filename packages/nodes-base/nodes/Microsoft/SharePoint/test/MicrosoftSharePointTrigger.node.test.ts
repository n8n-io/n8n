import { readFileSync } from 'fs';
import type { IPollFunctions } from 'n8n-workflow';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { MicrosoftSharePointTrigger } from '../MicrosoftSharePointTrigger.node';

describe('Microsoft SharePoint Trigger', () => {
	const { description } = new MicrosoftSharePointTrigger();

	it.each([
		['displayName', 'Microsoft SharePoint Trigger'],
		// Saved workflows resolve by type name, so this one can never change.
		['name', 'microsoftSharePointTrigger'],
		['version', 1],
	] as const)('declares %s as %s', (key, expected) => {
		expect(description[key]).toBe(expected);
	});

	it('is a polling trigger with no input', () => {
		expect(description.group).toEqual(['trigger']);
		expect(description.polling).toBe(true);
		expect(description.inputs).toEqual([]);
		expect(description.outputs).toEqual(['main']);
	});

	it('stays out of the node picker until the trigger is finished', () => {
		expect(description.hidden).toBe(true);
	});

	it('carries no credential or parameter yet', () => {
		expect(description.credentials).toBeUndefined();
		expect(description.properties).toEqual([]);
	});

	it('emits nothing until the poll is implemented', async () => {
		expect(await new MicrosoftSharePointTrigger().poll.call(mock<IPollFunctions>())).toBeNull();
	});

	it('ships a codex whose filename the loader can derive', () => {
		// directory-loader appends "on" to the compiled .js path, so the codex has
		// to match the node filename exactly. The action node's does not, and its
		// codex is silently absent on a case-sensitive filesystem.
		const codex = JSON.parse(
			readFileSync(join(__dirname, '..', 'MicrosoftSharePointTrigger.node.json'), 'utf8'),
		) as { node: string };

		expect(codex.node).toBe('n8n-nodes-base.microsoftSharePointTrigger');
	});
});
