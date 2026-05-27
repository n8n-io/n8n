import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { Pokemon } from '../Pokemon.node';
import {
	clampLimit,
	pokemonApiRequest,
	pokemonApiRequestAllPages,
	simplifyPokemonData,
	validateNameOrId,
} from '../GenericFunctions';
import {
	PIKACHU_DETAIL,
	PIKACHU_DETAIL_NULL_SPRITE,
	BULBASAUR_DETAIL,
	LIST_PAGE_1,
	LIST_PAGE_2,
} from './apiResponses';

describe('Pokemon Node — Cycle 1: description', () => {
	let node: Pokemon;

	beforeEach(() => {
		node = new Pokemon();
	});

	it('should have correct displayName', () => {
		expect(node.description.displayName).toBe('Pokemon');
	});

	it('should have correct name', () => {
		expect(node.description.name).toBe('pokemon');
	});

	it('should have correct icon', () => {
		expect(node.description.icon).toBe('file:pokemon.svg');
	});

	it('should have group set to input', () => {
		expect(node.description.group).toEqual(['input']);
	});

	it('should have version 1', () => {
		expect(node.description.version).toBe(1);
	});

	it('should have usableAsTool true', () => {
		expect(node.description.usableAsTool).toBe(true);
	});

	it('should have correct subtitle', () => {
		expect(node.description.subtitle).toBe('={{$parameter["operation"] + ": Pokemon"}}');
	});

	it('should have a description mentioning both operations', () => {
		expect(node.description.description).toContain('Get');
		expect(node.description.description).toContain('Get Many');
	});

	it('should have Main input and output', () => {
		expect(node.description.inputs).toEqual([NodeConnectionTypes.Main]);
		expect(node.description.outputs).toEqual([NodeConnectionTypes.Main]);
	});

	it('should have operation property with get and getAll options', () => {
		const operationProp = node.description.properties.find((p) => p.name === 'operation');
		expect(operationProp).toBeDefined();
		expect(operationProp?.type).toBe('options');
		const options = operationProp?.options as Array<{
			value: string;
			name: string;
			action: string;
		}>;
		const values = options.map((o) => o.value);
		expect(values).toContain('get');
		expect(values).toContain('getAll');
	});

	it('should have action strings on operations', () => {
		const operationProp = node.description.properties.find((p) => p.name === 'operation');
		const options = operationProp?.options as Array<{
			value: string;
			name: string;
			action: string;
		}>;
		const get = options.find((o) => o.value === 'get');
		const getAll = options.find((o) => o.value === 'getAll');
		expect(get?.action).toBeTruthy();
		expect(getAll?.action).toBeTruthy();
	});

	it('should have nameOrId field shown only for get operation', () => {
		const nameOrId = node.description.properties.find((p) => p.name === 'nameOrId');
		expect(nameOrId).toBeDefined();
		expect(nameOrId?.displayOptions?.show?.operation).toContain('get');
	});

	it('should have returnAll field shown only for getAll operation', () => {
		const returnAll = node.description.properties.find((p) => p.name === 'returnAll');
		expect(returnAll).toBeDefined();
		expect(returnAll?.displayOptions?.show?.operation).toContain('getAll');
	});

	it('should have limit field shown only for getAll when returnAll is false', () => {
		const limit = node.description.properties.find((p) => p.name === 'limit');
		expect(limit).toBeDefined();
		expect(limit?.displayOptions?.show?.operation).toContain('getAll');
		expect(limit?.displayOptions?.show?.returnAll).toContain(false);
	});

	it('should have simplify field shown only for get operation', () => {
		const simplify = node.description.properties.find((p) => p.name === 'simplify');
		expect(simplify).toBeDefined();
		expect(simplify?.displayOptions?.show?.operation).toContain('get');
		const showOps = simplify?.displayOptions?.show?.operation as string[];
		expect(showOps).not.toContain('getAll');
	});
});

describe('Pokemon Node — Cycle 2: typed interfaces', () => {
	it('should export IPokemonListResponse interface (compiles with correct shape)', () => {
		// Import the type to ensure it exists and compiles
		// This test verifies the TypeScript interface exists and has the expected shape
		const mockResponse: import('../GenericFunctions').IPokemonListResponse = {
			count: 1302,
			next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
			previous: null,
			results: [{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }],
		};
		expect(mockResponse.count).toBe(1302);
		expect(mockResponse.results).toHaveLength(1);
		expect(mockResponse.results[0].name).toBe('bulbasaur');
	});

	it('should export IPokemonDetailResponse interface', () => {
		const mockDetail: import('../GenericFunctions').IPokemonDetailResponse = {
			id: 25,
			name: 'pikachu',
			height: 4,
			weight: 60,
			base_experience: 112,
			types: [{ slot: 1, type: { name: 'electric', url: '' } }],
			abilities: [{ ability: { name: 'static', url: '' }, is_hidden: false, slot: 1 }],
			stats: [{ base_stat: 35, effort: 0, stat: { name: 'hp', url: '' } }],
			sprites: { front_default: 'https://example.com/25.png' },
			species: { name: 'pikachu', url: '' },
			moves: [],
		};
		expect(mockDetail.id).toBe(25);
		expect(mockDetail.types[0].type.name).toBe('electric');
	});

	it('should export IPokemonSimplified interface', () => {
		const mockSimplified: import('../GenericFunctions').IPokemonSimplified = {
			id: 25,
			name: 'pikachu',
			height: 4,
			weight: 60,
			base_experience: 112,
			types: ['electric'],
			abilities: ['static', 'lightning-rod'],
			stats: { hp: 35, speed: 90 },
			sprite: 'https://example.com/25.png',
			species: 'pikachu',
		};
		expect(mockSimplified.types).toEqual(['electric']);
		expect(mockSimplified.stats['hp']).toBe(35);
	});
});

// ─── Cycle 3: pokemonApiRequest calls correct URL ─────────────────────────────

describe('Pokemon Node — Cycle 3: pokemonApiRequest URL and options', () => {
	it('should call httpRequest with the exact URL and maxRedirects: 0', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL);
		const mockContext = {
			helpers: { httpRequest: mockHttpRequest },
			getNode: () => ({ name: 'Pokemon', type: 'pokemon' }),
		} as unknown as Parameters<typeof pokemonApiRequest>[0];

		await pokemonApiRequest.call(mockContext, 'https://pokeapi.co/api/v2/pokemon/pikachu');

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: 'https://pokeapi.co/api/v2/pokemon/pikachu',
				maxRedirects: 0,
			}),
		);
	});

	it('should NOT use uri property (must use url)', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL);
		const mockContext = {
			helpers: { httpRequest: mockHttpRequest },
			getNode: () => ({ name: 'Pokemon', type: 'pokemon' }),
		} as unknown as Parameters<typeof pokemonApiRequest>[0];

		await pokemonApiRequest.call(mockContext, 'https://pokeapi.co/api/v2/pokemon/pikachu');

		const callArgs = mockHttpRequest.mock.calls[0][0] as Record<string, unknown>;
		expect(callArgs).not.toHaveProperty('uri');
		expect(callArgs).toHaveProperty('url');
	});
});

// ─── Cycle 4 (part of cycle 3 commit): pokemonApiRequest wraps errors ─────────

describe('Pokemon Node — Cycle 4: pokemonApiRequest wraps errors', () => {
	it('should throw NodeApiError when httpRequest throws', async () => {
		const networkError = new Error('Network error');
		const mockHttpRequest = jest.fn().mockRejectedValue(networkError);
		const mockContext = {
			helpers: { httpRequest: mockHttpRequest },
			getNode: () => ({
				name: 'Pokemon',
				type: 'pokemon',
				typeVersion: 1,
				id: '1',
				position: [0, 0] as [number, number],
			}),
		} as unknown as Parameters<typeof pokemonApiRequest>[0];

		await expect(
			pokemonApiRequest.call(mockContext, 'https://pokeapi.co/api/v2/pokemon/pikachu'),
		).rejects.toThrow(NodeApiError);
	});
});

// ─── Cycle 5: Input validation ────────────────────────────────────────────────

describe('Pokemon Node — Cycle 5: validateNameOrId', () => {
	const makeContext = () =>
		({
			getNode: () => ({
				name: 'Pokemon',
				type: 'n8n-nodes-base.pokemon',
				typeVersion: 1,
				id: '1',
				position: [0, 0] as [number, number],
			}),
		}) as unknown as Parameters<typeof validateNameOrId>[0];

	it('should throw NodeOperationError for path traversal input', () => {
		expect(() => validateNameOrId(makeContext(), '../../admin', 0)).toThrow(NodeOperationError);
	});

	it('should throw NodeOperationError for query injection input', () => {
		expect(() => validateNameOrId(makeContext(), 'pikachu?callback=evil', 0)).toThrow(
			NodeOperationError,
		);
	});

	it('should throw NodeOperationError for empty string', () => {
		expect(() => validateNameOrId(makeContext(), '', 0)).toThrow(NodeOperationError);
	});

	it('should NOT throw for valid hyphenated name mr-mime', () => {
		expect(() => validateNameOrId(makeContext(), 'mr-mime', 0)).not.toThrow();
	});

	it('should NOT throw for numeric ID', () => {
		expect(() => validateNameOrId(makeContext(), '25', 0)).not.toThrow();
	});

	it('should NOT throw for simple name pikachu', () => {
		expect(() => validateNameOrId(makeContext(), 'pikachu', 0)).not.toThrow();
	});
});

// ─── Cycle 6: simplifyPokemonData extracts correct fields ────────────────────

describe('Pokemon Node — Cycle 6: simplifyPokemonData output shape', () => {
	it('should return all IPokemonSimplified fields from full mock response', () => {
		const result = simplifyPokemonData(PIKACHU_DETAIL);

		expect(result.id).toBe(25);
		expect(result.name).toBe('pikachu');
		expect(result.height).toBe(4);
		expect(result.weight).toBe(60);
		expect(result.base_experience).toBe(112);
		expect(result.types).toEqual(['electric']);
		expect(result.abilities).toEqual(['static', 'lightning-rod']);
		expect(result.stats).toEqual({
			hp: 35,
			attack: 55,
			defense: 40,
			'special-attack': 50,
			'special-defense': 50,
			speed: 90,
		});
		expect(result.sprite).toBe(
			'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
		);
		expect(result.species).toBe('pikachu');
	});

	it('should have exactly the IPokemonSimplified keys and no extras', () => {
		const result = simplifyPokemonData(PIKACHU_DETAIL);
		const expectedKeys = [
			'id',
			'name',
			'height',
			'weight',
			'base_experience',
			'types',
			'abilities',
			'stats',
			'sprite',
			'species',
		];
		expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());
	});
});

// ─── Cycle 7: simplifyPokemonData null sprite ─────────────────────────────────

describe('Pokemon Node — Cycle 7: simplifyPokemonData null sprite', () => {
	it('should return sprite as null when sprites.front_default is null', () => {
		const result = simplifyPokemonData(PIKACHU_DETAIL_NULL_SPRITE);
		expect(result.sprite).toBeNull();
	});

	it('should not throw when sprite is null', () => {
		expect(() => simplifyPokemonData(PIKACHU_DETAIL_NULL_SPRITE)).not.toThrow();
	});
});

// ─── Cycle 8: simplifyPokemonData multi-type ──────────────────────────────────

describe('Pokemon Node — Cycle 8: simplifyPokemonData multi-type', () => {
	it('should return multiple types for Bulbasaur', () => {
		const result = simplifyPokemonData(BULBASAUR_DETAIL);
		expect(result.types).toEqual(['grass', 'poison']);
	});

	it('should return multiple abilities for Bulbasaur', () => {
		const result = simplifyPokemonData(BULBASAUR_DETAIL);
		expect(result.abilities).toEqual(['overgrow', 'chlorophyll']);
	});
});

// ─── Cycle 9: pokemonApiRequestAllPages paginates ────────────────────────────

describe('Pokemon Node — Cycle 9: pokemonApiRequestAllPages pagination', () => {
	const makeContext = (mockHttpRequest: jest.Mock) =>
		({
			helpers: { httpRequest: mockHttpRequest },
			getNode: () => ({
				name: 'Pokemon',
				type: 'n8n-nodes-base.pokemon',
				typeVersion: 1,
				id: '1',
				position: [0, 0] as [number, number],
			}),
		}) as unknown as Parameters<typeof pokemonApiRequestAllPages>[0];

	it('should combine results from two pages', async () => {
		const mockHttpRequest = jest
			.fn()
			.mockResolvedValueOnce(LIST_PAGE_1)
			.mockResolvedValueOnce(LIST_PAGE_2);
		const ctx = makeContext(mockHttpRequest);

		const results = await pokemonApiRequestAllPages.call(ctx);

		expect(results).toHaveLength(3);
		expect(results[0].name).toBe('bulbasaur');
		expect(results[1].name).toBe('ivysaur');
		expect(results[2].name).toBe('venusaur');
	});

	it('should make exactly 2 API calls for a 2-page response', async () => {
		const mockHttpRequest = jest
			.fn()
			.mockResolvedValueOnce(LIST_PAGE_1)
			.mockResolvedValueOnce(LIST_PAGE_2);
		const ctx = makeContext(mockHttpRequest);

		await pokemonApiRequestAllPages.call(ctx);

		expect(mockHttpRequest).toHaveBeenCalledTimes(2);
	});

	it('should stop when next is null (single page)', async () => {
		const singlePage = { ...LIST_PAGE_2, next: null };
		const mockHttpRequest = jest.fn().mockResolvedValueOnce(singlePage);
		const ctx = makeContext(mockHttpRequest);

		const results = await pokemonApiRequestAllPages.call(ctx);

		expect(results).toHaveLength(1);
		expect(mockHttpRequest).toHaveBeenCalledTimes(1);
	});
});

// ─── Cycle 10: Pagination circuit breaker ────────────────────────────────────

describe('Pokemon Node — Cycle 10: pagination circuit breaker', () => {
	it('should throw NodeOperationError when more than 50 pages are fetched', async () => {
		// Create a mock that always returns next page (infinite loop)
		const infinitePage = {
			count: 9999,
			next: 'https://pokeapi.co/api/v2/pokemon?offset=100&limit=100',
			previous: null,
			results: [{ name: 'pokemon-x', url: 'https://pokeapi.co/api/v2/pokemon/1/' }],
		};
		const mockHttpRequest = jest.fn().mockResolvedValue(infinitePage);
		const mockContext = {
			helpers: { httpRequest: mockHttpRequest },
			getNode: () => ({
				name: 'Pokemon',
				type: 'n8n-nodes-base.pokemon',
				typeVersion: 1,
				id: '1',
				position: [0, 0] as [number, number],
			}),
		} as unknown as Parameters<typeof pokemonApiRequestAllPages>[0];

		await expect(pokemonApiRequestAllPages.call(mockContext)).rejects.toThrow(NodeOperationError);
	});

	it('should call httpRequest no more than 50 times before circuit breaker triggers', async () => {
		const infinitePage = {
			count: 9999,
			next: 'https://pokeapi.co/api/v2/pokemon?offset=100&limit=100',
			previous: null,
			results: [{ name: 'pokemon-x', url: 'https://pokeapi.co/api/v2/pokemon/1/' }],
		};
		const mockHttpRequest = jest.fn().mockResolvedValue(infinitePage);
		const mockContext = {
			helpers: { httpRequest: mockHttpRequest },
			getNode: () => ({
				name: 'Pokemon',
				type: 'n8n-nodes-base.pokemon',
				typeVersion: 1,
				id: '1',
				position: [0, 0] as [number, number],
			}),
		} as unknown as Parameters<typeof pokemonApiRequestAllPages>[0];

		await expect(pokemonApiRequestAllPages.call(mockContext)).rejects.toThrow();
		// Should not exceed circuit breaker limit (50 pages)
		expect(mockHttpRequest.mock.calls.length).toBeLessThanOrEqual(50);
	});
});

// ─── Review fix: execute() throws ─────────────────────────────────────────────

describe('Pokemon Node — execute stub throws', () => {
	it('should throw NodeOperationError with "Not yet implemented"', async () => {
		const node = new Pokemon();
		const mockContext = {
			getNode: () => ({
				name: 'Pokemon',
				type: 'n8n-nodes-base.pokemon',
				typeVersion: 1,
				id: '1',
				position: [0, 0] as [number, number],
			}),
		} as unknown as Parameters<typeof node.execute>[0];

		await expect(node.execute.call(mockContext)).rejects.toThrow(NodeOperationError);
		await expect(node.execute.call(mockContext)).rejects.toThrow('Not yet implemented');
	});
});

// ─── Review fix: clampLimit runtime clamping ─────────────────────────────────

describe('Pokemon Node — clampLimit', () => {
	it('should return value unchanged when within 1..100', () => {
		expect(clampLimit(20)).toBe(20);
		expect(clampLimit(1)).toBe(1);
		expect(clampLimit(100)).toBe(100);
	});

	it('should clamp values below 1 to 1', () => {
		expect(clampLimit(0)).toBe(1);
		expect(clampLimit(-5)).toBe(1);
	});

	it('should clamp values above 100 to 100', () => {
		expect(clampLimit(101)).toBe(100);
		expect(clampLimit(999)).toBe(100);
	});
});

// ─── Review fix: validateNameOrId lowercases input ────────────────────────────

describe('Pokemon Node — validateNameOrId lowercase normalization', () => {
	const makeContext = () =>
		({
			getNode: () => ({
				name: 'Pokemon',
				type: 'n8n-nodes-base.pokemon',
				typeVersion: 1,
				id: '1',
				position: [0, 0] as [number, number],
			}),
		}) as unknown as Parameters<typeof validateNameOrId>[0];

	it('should return lowercased name for mixed-case input', () => {
		expect(validateNameOrId(makeContext(), 'Pikachu', 0)).toBe('pikachu');
	});

	it('should return lowercased name for uppercase input', () => {
		expect(validateNameOrId(makeContext(), 'CHARIZARD', 0)).toBe('charizard');
	});

	it('should preserve already-lowercase input', () => {
		expect(validateNameOrId(makeContext(), 'bulbasaur', 0)).toBe('bulbasaur');
	});

	it('should lowercase hyphenated names', () => {
		expect(validateNameOrId(makeContext(), 'Mr-Mime', 0)).toBe('mr-mime');
	});

	it('should return numeric IDs unchanged', () => {
		expect(validateNameOrId(makeContext(), '25', 0)).toBe('25');
	});
});
