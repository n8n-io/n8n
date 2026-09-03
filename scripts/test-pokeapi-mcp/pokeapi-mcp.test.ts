/**
 * Full test suite for the PokeAPI MCP server at http://localhost:5678/mcp/pokeapi.
 *
 * Sections:
 *   1. Contract   – tools list shape + response schemas (Zod)
 *   2. List       – pagination, generation filters
 *   3. Get        – name/id lookup, generation, evolution chain
 *   4. Search     – individual filters, combined filters, limit
 *   5. Edge cases – boundaries, unknown Pokémon, bad filters
 *   6. Latency    – single-call budget, concurrent burst
 *   7. LLM evals  – model picks the right tool for natural-language prompts
 *                   (skipped when ANTHROPIC_API_KEY is not set)
 *   8. Regression – Vitest snapshots of known-good full records
 *
 * Run: pnpm install && pnpm test
 * LLM evals: ANTHROPIC_API_KEY=sk-ant-... pnpm test
 */

import Anthropic from '@anthropic-ai/sdk';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { callTool, initSession, listTools, type McpTool } from './mcp-client.js';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const statsSchema = z.object({
	hp: z.number().int().nonnegative(),
	attack: z.number().int().nonnegative(),
	defense: z.number().int().nonnegative(),
	'special-attack': z.number().int().nonnegative(),
	'special-defense': z.number().int().nonnegative(),
	speed: z.number().int().nonnegative(),
});

const evolutionSchema = z.object({
	stage: z.number().int().min(1).max(3),
	stage_label: z.enum(['basic', 'middle', 'final']),
	is_fully_evolved: z.boolean(),
	evolves_from: z.string().nullable(),
	is_legendary: z.boolean(),
	is_mythical: z.boolean(),
});

const generationSchema = z.object({
	number: z.number().int().min(1).max(9),
	name: z.string().min(1),
	region: z.string().min(1),
});

const getPokemonFoundSchema = z.object({
	operation: z.literal('getPokemon'),
	found: z.literal(true),
	id: z.number().int().positive(),
	name: z.string().min(1),
	types: z.array(z.string().min(1)).min(1),
	abilities: z.array(z.string().min(1)).min(1),
	height: z.number().nonnegative(),
	weight: z.number().nonnegative(),
	stats: statsSchema,
	sprite: z.string().url(),
	generation: generationSchema,
	evolution: evolutionSchema,
});

const listResultSchema = z.object({
	operation: z.literal('listPokemon'),
	count: z.number().int().positive(),
	next: z.string().nullable(),
	previous: z.string().nullable(),
	results: z.array(
		z.object({
			id: z.number().int().positive(),
			name: z.string().min(1),
			url: z.string(),
		}),
	),
});

const searchResultSchema = z.object({
	operation: z.literal('searchPokemon'),
	count: z.number().int().nonnegative(),
	filters: z.object({
		name: z.string().nullable(),
		type: z.string().nullable(),
		ability: z.string().nullable(),
		evolutionStatus: z.string().nullable(),
	}),
	results: z.array(
		z.object({
			id: z.number().int().positive(),
			name: z.string().min(1),
			types: z.array(z.string()),
			abilities: z.array(z.string()),
			stats: statsSchema,
			evolution: evolutionSchema,
		}),
	),
});

// ── Typed helpers ─────────────────────────────────────────────────────────────

type GetResult = z.infer<typeof getPokemonFoundSchema>;
type ListResult = z.infer<typeof listResultSchema>;
type SearchResult = z.infer<typeof searchResultSchema>;

const list = (args: Record<string, unknown>) =>
	callTool('List_Pokemon', args).then((r) => r[0] as ListResult);

const get = (nameOrId: string) => callTool('Get_Pokemon', { nameOrId }).then((r) => r[0]);

const search = (args: Record<string, unknown>) =>
	callTool('Search_Pokemon', args).then((r) => r[0] as SearchResult);

// ── Session ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
	await initSession();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. Contract / schema
// ═════════════════════════════════════════════════════════════════════════════

describe('1. contract', () => {
	let tools: McpTool[];

	beforeAll(async () => {
		tools = await listTools();
	});

	it('exposes exactly 3 tools', () => {
		expect(tools).toHaveLength(3);
	});

	it.each(['List_Pokemon', 'Get_Pokemon', 'Search_Pokemon'])('tool %s is present', (name) => {
		expect(tools.find((t) => t.name === name)).toBeDefined();
	});

	it.each(['List_Pokemon', 'Get_Pokemon', 'Search_Pokemon'])(
		'tool %s declares a valid JSON Schema inputSchema',
		(name) => {
			const tool = tools.find((t) => t.name === name)!;
			expect(tool.inputSchema).toMatchObject({
				type: 'object',
				properties: expect.any(Object),
			});
		},
	);

	it('Get_Pokemon response passes Zod schema', async () => {
		const raw = await get('bulbasaur');
		getPokemonFoundSchema.parse(raw);
	});

	it('List_Pokemon response passes Zod schema', async () => {
		const raw = await list({ limit: 5, offset: 0, generation: '' });
		listResultSchema.parse(raw);
	});

	it('Search_Pokemon response passes Zod schema', async () => {
		const raw = await search({ name: 'char', type: 'fire', ability: '', evolutionStatus: '', limit: 5 });
		searchResultSchema.parse(raw);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. List_Pokemon
// ═════════════════════════════════════════════════════════════════════════════

describe('2. List_Pokemon', () => {
	it('returns total count and first page', async () => {
		const r = await list({ limit: 3, offset: 0, generation: '' });
		expect(r.count).toBe(1351);
		expect(r.results).toHaveLength(3);
		expect(r.results[0].name).toBe('bulbasaur');
	});

	it('paginates with offset', async () => {
		const r = await list({ limit: 3, offset: 3, generation: '' });
		expect(r.results[0].name).toBe('charmander');
	});

	it('sets next/previous links correctly on first page', async () => {
		const r = await list({ limit: 3, offset: 0, generation: '' });
		expect(r.next).toBeTruthy();
		expect(r.previous).toBeNull();
	});

	it('filters by generation number ("1")', async () => {
		const r = await list({ limit: 5, offset: 0, generation: '1' });
		expect(r.count).toBe(151);
		expect(r.results[0].name).toBe('bulbasaur');
	});

	it('filters by region alias (kanto = gen 1)', async () => {
		const r = await list({ limit: 5, offset: 0, generation: 'kanto' });
		expect(r.count).toBe(151);
	});

	it('filters by generation name (generation-iv = 107)', async () => {
		const r = await list({ limit: 5, offset: 0, generation: 'generation-iv' });
		expect(r.count).toBe(107);
	});

	it('filters by region alias (paldea = gen 9, 120)', async () => {
		const r = await list({ limit: 5, offset: 0, generation: 'paldea' });
		expect(r.count).toBe(120);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Get_Pokemon
// ═════════════════════════════════════════════════════════════════════════════

describe('3. Get_Pokemon', () => {
	it('looks up by name', async () => {
		const r = (await get('pikachu')) as GetResult;
		expect(r.found).toBe(true);
		expect(r.id).toBe(25);
		expect(r.types).toContain('electric');
	});

	it('looks up by numeric id', async () => {
		const r = (await get('1')) as GetResult;
		expect(r.name).toBe('bulbasaur');
	});

	it('returns generation info', async () => {
		const r = (await get('pikachu')) as GetResult;
		expect(r.generation.number).toBe(1);
		expect(r.generation.region).toBe('kanto');
	});

	it('basic evolution: stage 1, no evolves_from', async () => {
		const r = (await get('charmander')) as GetResult;
		expect(r.evolution.stage_label).toBe('basic');
		expect(r.evolution.is_fully_evolved).toBe(false);
		expect(r.evolution.evolves_from).toBeNull();
	});

	it('middle evolution: evolves_from and evolves_to populated', async () => {
		const r = (await get('charmeleon')) as GetResult & { evolution: { evolves_to?: string[] } };
		expect(r.evolution.stage_label).toBe('middle');
		expect(r.evolution.evolves_from).toBe('charmander');
		expect(r.evolution.evolves_to).toContain('charizard');
	});

	it('final evolution: is_fully_evolved=true', async () => {
		const r = (await get('charizard')) as GetResult;
		expect(r.evolution.stage_label).toBe('final');
		expect(r.evolution.is_fully_evolved).toBe(true);
	});

	it('flags legendary Pokémon', async () => {
		const r = (await get('mewtwo')) as GetResult;
		expect(r.evolution.is_legendary).toBe(true);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Search_Pokemon
// ═════════════════════════════════════════════════════════════════════════════

describe('4. Search_Pokemon', () => {
	it('searches by name substring', async () => {
		const r = await search({ name: 'pikachu', type: '', ability: '', evolutionStatus: '', limit: 10 });
		expect(r.results.some((p) => p.name === 'pikachu')).toBe(true);
	});

	it('all results match the requested type', async () => {
		const r = await search({ name: '', type: 'fire', ability: '', evolutionStatus: '', limit: 10 });
		expect(r.results.every((p) => p.types.includes('fire'))).toBe(true);
	});

	it('all results have the requested ability', async () => {
		const r = await search({ name: '', type: '', ability: 'blaze', evolutionStatus: '', limit: 10 });
		expect(r.results.every((p) => p.abilities.includes('blaze'))).toBe(true);
	});

	it('evolutionStatus=basic: all basic', async () => {
		const r = await search({ name: '', type: '', ability: '', evolutionStatus: 'basic', limit: 10 });
		expect(r.results.every((p) => p.evolution.stage_label === 'basic')).toBe(true);
	});

	it('evolutionStatus=fully_evolved: all fully evolved', async () => {
		const r = await search({ name: '', type: '', ability: '', evolutionStatus: 'fully_evolved', limit: 10 });
		expect(r.results.every((p) => p.evolution.is_fully_evolved)).toBe(true);
	});

	it('evolutionStatus=not_fully_evolved: none fully evolved', async () => {
		const r = await search({ name: '', type: '', ability: '', evolutionStatus: 'not_fully_evolved', limit: 10 });
		expect(r.results.every((p) => !p.evolution.is_fully_evolved)).toBe(true);
	});

	it('combined name + type filter', async () => {
		const r = await search({ name: 'char', type: 'fire', ability: '', evolutionStatus: '', limit: 10 });
		expect(r.count).toBe(5);
	});

	it('limit is respected', async () => {
		const r = await search({ name: '', type: '', ability: '', evolutionStatus: '', limit: 3 });
		expect(r.results).toHaveLength(3);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Edge cases
// ═════════════════════════════════════════════════════════════════════════════

describe('5. edge cases', () => {
	it('Get_Pokemon: non-existent name → found=false', async () => {
		const r = (await get('does-not-exist-xyz')) as { found: boolean };
		expect(r.found).toBe(false);
	});

	it('Get_Pokemon: ID beyond Pokédex → found=false', async () => {
		const r = (await get('99999')) as { found: boolean };
		expect(r.found).toBe(false);
	});

	it('List_Pokemon: limit=1 returns exactly 1 result', async () => {
		const r = await list({ limit: 1, offset: 0, generation: '' });
		expect(r.results).toHaveLength(1);
	});

	it('List_Pokemon: max limit (100) is honoured', async () => {
		const r = await list({ limit: 100, offset: 0, generation: '' });
		expect(r.results.length).toBeGreaterThan(0);
		expect(r.results.length).toBeLessThanOrEqual(100);
	});

	it('List_Pokemon: offset past end returns empty results', async () => {
		const r = await list({ limit: 10, offset: 99999, generation: '' });
		expect(r.results).toHaveLength(0);
	});

	it('Search_Pokemon: no filters returns results without error', async () => {
		const r = await search({ name: '', type: '', ability: '', evolutionStatus: '', limit: 5 });
		expect(r.count).toBeGreaterThan(0);
		expect(r.results).toHaveLength(5);
	});

	it('Search_Pokemon: unknown type returns empty results', async () => {
		const r = await search({ name: '', type: 'notarealtype', ability: '', evolutionStatus: '', limit: 10 });
		expect(r.count).toBe(0);
		expect(r.results).toHaveLength(0);
	});

	it('Search_Pokemon: unknown ability returns empty results', async () => {
		const r = await search({ name: '', type: '', ability: 'notarealability', evolutionStatus: '', limit: 10 });
		expect(r.count).toBe(0);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. Latency / concurrency
// ═════════════════════════════════════════════════════════════════════════════

describe('6. latency', () => {
	it('single Get_Pokemon call completes within 10 s', async () => {
		const t0 = Date.now();
		await get('pikachu');
		expect(Date.now() - t0).toBeLessThan(10_000);
	});

	it('3 concurrent Get_Pokemon calls all succeed', async () => {
		const results = await Promise.all([get('bulbasaur'), get('charmander'), get('squirtle')]);
		expect(results.every((r: any) => r.found === true)).toBe(true);
	});

	it('burst of 5 List calls completes without errors', async () => {
		const calls = Array.from({ length: 5 }, (_, i) =>
			list({ limit: 3, offset: i * 3, generation: '' }),
		);
		const results = await Promise.all(calls);
		expect(results.every((r) => r.count > 0)).toBe(true);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. LLM-driven evals  (requires ANTHROPIC_API_KEY)
// ═════════════════════════════════════════════════════════════════════════════

const API_KEY = process.env.ANTHROPIC_API_KEY;

describe.skipIf(!API_KEY)('7. LLM evals', () => {
	let anthropic: Anthropic;
	let tools: McpTool[];

	beforeAll(async () => {
		anthropic = new Anthropic({ apiKey: API_KEY });
		tools = await listTools();
	});

	async function evalPrompt(userMessage: string): Promise<{ tool: string; input: Record<string, unknown> }> {
		const response = await anthropic.messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 256,
			// Force the model to use one of the tools rather than answering in prose.
			tool_choice: { type: 'any' },
			tools: tools.map((t) => ({
				name: t.name,
				description: t.description,
				input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
			})),
			messages: [{ role: 'user', content: userMessage }],
		});

		const toolUse = response.content.find((c) => c.type === 'tool_use');
		if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool_use block in response');
		return { tool: toolUse.name, input: toolUse.input as Record<string, unknown> };
	}

	it('"What are Pikachu\'s base stats?" → Get_Pokemon(pikachu)', async () => {
		const { tool, input } = await evalPrompt("What are Pikachu's base stats?");
		expect(tool).toBe('Get_Pokemon');
		expect(String(input.nameOrId).toLowerCase()).toBe('pikachu');
	});

	it('"Find all fire type Pokémon" → Search_Pokemon(type=fire)', async () => {
		const { tool, input } = await evalPrompt('Find all fire type Pokémon');
		expect(tool).toBe('Search_Pokemon');
		expect(String(input.type).toLowerCase()).toBe('fire');
	});

	it('"List Pokémon introduced in generation 1" → List_Pokemon(generation=1)', async () => {
		const { tool, input } = await evalPrompt('List Pokémon introduced in generation 1');
		expect(tool).toBe('List_Pokemon');
		expect(String(input.generation)).toMatch(/^(1|generation-i|kanto)$/i);
	});

	it('"Which fully evolved Pokémon have the blaze ability?" → Search_Pokemon(ability+evolutionStatus)', async () => {
		const { tool, input } = await evalPrompt('Which fully evolved Pokémon have the blaze ability?');
		expect(tool).toBe('Search_Pokemon');
		expect(String(input.ability).toLowerCase()).toBe('blaze');
		expect(String(input.evolutionStatus).toLowerCase()).toBe('fully_evolved');
	});

	it('"Look up Pokémon number 6" → Get_Pokemon(6)', async () => {
		const { tool, input } = await evalPrompt('Look up Pokémon number 6');
		expect(tool).toBe('Get_Pokemon');
		expect(String(input.nameOrId)).toMatch(/^(6|charizard)$/i);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. Regression snapshots
// ═════════════════════════════════════════════════════════════════════════════

describe('8. regression', () => {
	it('bulbasaur full record', async () => {
		expect(await get('bulbasaur')).toMatchSnapshot();
	});

	it('pikachu full record', async () => {
		expect(await get('pikachu')).toMatchSnapshot();
	});

	it('charmeleon full record (mid-evo with chain)', async () => {
		expect(await get('charmeleon')).toMatchSnapshot();
	});

	it('generation 1 list (first 10)', async () => {
		expect(await list({ limit: 10, offset: 0, generation: '1' })).toMatchSnapshot();
	});
});
