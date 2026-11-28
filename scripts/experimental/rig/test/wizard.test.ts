import { mkdirSync, rmSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseTopology, saveTopology } from '../src/config/env-yaml';
import { envsDir } from '../src/config/paths';
import { envPaths } from '../src/environment';
import { preferredSlot, slotChoices, wizard } from '../src/commands/wizard';
import { type Choice, select } from '../src/ui/prompt';

// Each prompt answers with its default, or with its first choice.
vi.mock('../src/ui/prompt', () => ({
	select: vi.fn(
		async (_message: string, choices: Array<Choice<unknown>>, initialValue?: unknown) =>
			initialValue ?? choices[0].value,
	),
	ask: vi.fn(async (_message: string, options: { defaultValue?: string }) => options.defaultValue),
	confirm: vi.fn(async () => true),
	multiselect: vi.fn(),
	intro: vi.fn(),
	note: vi.fn(),
	outro: vi.fn(),
}));

afterEach(() => {
	rmSync(envsDir(), { recursive: true, force: true });
	vi.clearAllMocks();
});

function saveEnv(name: string, slot: number) {
	const paths = envPaths(name);
	mkdirSync(paths.root, { recursive: true });
	saveTopology(paths.envYaml, parseTopology({ name, slot }));
}

function portsPrompt() {
	return vi.mocked(select).mock.calls.find(([message]) => message === 'Ports');
}

describe('wizard ports', () => {
	it('should prefer the lowest free slot that is not slot 0', () => {
		expect(preferredSlot(new Map())).toBe(1);
		expect(preferredSlot(new Map([[0, ['a']]]))).toBe(1);
		expect(
			preferredSlot(
				new Map([
					[1, ['a']],
					[2, ['b']],
				]),
			),
		).toBe(3);
	});

	it('should use slot 0 when no other slot is free', () => {
		const used = new Map(Array.from({ length: 9 }, (_, i) => [i + 1, [`e${i + 1}`]]));
		expect(preferredSlot(used)).toBe(0);
		used.set(0, ['e0']);
		expect(preferredSlot(used)).toBe(0);
	});

	it('should offer the default ports and the own ports of the first free slot', () => {
		expect(slotChoices(new Map())).toEqual([
			{ value: 0, label: 'Default ports (slot 0)', hint: 'editor on port 5678' },
			{
				value: 1,
				label: 'Own ports (slot 1)',
				hint: 'runs next to other environments, editor on port 6678',
			},
		]);
	});

	it('should name the environments that use the default ports', () => {
		const choices = slotChoices(
			new Map([
				[0, ['a', 'b']],
				[1, ['c']],
			]),
		);
		expect(choices.map((c) => c.value)).toEqual([0, 2]);
		expect(choices[0].hint).toBe(
			'editor on port 5678, same as a, b: they cannot run at the same time',
		);
		expect(choices[1].label).toBe('Own ports (slot 2)');
	});

	it('should offer only the default ports when no other slot is free', () => {
		const used = new Map(Array.from({ length: 9 }, (_, i) => [i + 1, [`e${i + 1}`]]));
		expect(slotChoices(used).map((c) => c.value)).toEqual([0]);
	});

	it('should ask for the ports when no environment exists, and select own ports', async () => {
		const input = await wizard('new');

		expect(portsPrompt()).toEqual(['Ports', slotChoices(new Map()), 1]);
		expect(input).toMatchObject({ name: 'new', slot: 1 });
	});

	it('should select the first free slot above the slots of other environments', async () => {
		saveEnv('a', 0);
		saveEnv('b', 1);

		const input = await wizard('new');

		expect(portsPrompt()?.[1].map((choice) => choice.value)).toEqual([0, 2]);
		expect(input?.slot).toBe(2);
	});
});
