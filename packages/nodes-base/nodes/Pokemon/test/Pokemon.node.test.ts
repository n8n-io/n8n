import type { IExecuteFunctions } from 'n8n-workflow';
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
	LIST_LIMIT_20,
	LIST_LIMIT_5,
} from './apiResponses';

describe('Pokemon Node — node description metadata', () => {
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

describe('Pokemon Node — typed interface shapes', () => {
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

// ─── Shared mock factory ─────────────────────────────────────────────────────

type MockContextParams = {
	httpRequest?: jest.Mock;
	nodeParams?: Record<string, unknown>;
	inputData?: Array<{ json: Record<string, unknown> }>;
	continueOnFail?: boolean;
};

function createMockContext(params: MockContextParams = {}): IExecuteFunctions {
	const {
		httpRequest = jest.fn(),
		nodeParams = {},
		inputData = [{ json: {} }],
		continueOnFail = false,
	} = params;
	return {
		getInputData: () => inputData,
		getNodeParameter: (name: string, _index: number, fallback?: unknown) =>
			name in nodeParams ? nodeParams[name] : fallback,
		getNode: () => ({
			name: 'Pokemon',
			type: 'n8n-nodes-base.pokemon',
			typeVersion: 1,
			id: '1',
			position: [0, 0] as [number, number],
		}),
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequest,
			constructExecutionMetaData: (data: unknown[], opts: { itemData: { item: number } }) =>
				data.map((d) => ({ ...((d as Record<string, unknown>) ?? {}), pairedItem: opts.itemData })),
			returnJsonArray: (data: unknown[]) => data.map((d) => ({ json: d })),
		},
	} as unknown as IExecuteFunctions;
}

// ─── pokemonApiRequest calls correct URL ──────────────────────────────────────

describe('Pokemon Node — pokemonApiRequest URL and options', () => {
	it('should call httpRequest with the exact URL and disableFollowRedirect: true', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL);
		const ctx = createMockContext({ httpRequest: mockHttpRequest });

		await pokemonApiRequest.call(ctx, 'https://pokeapi.co/api/v2/pokemon/pikachu');

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: 'https://pokeapi.co/api/v2/pokemon/pikachu',
				disableFollowRedirect: true,
			}),
		);
	});

	it('should NOT use uri property (must use url)', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL);
		const ctx = createMockContext({ httpRequest: mockHttpRequest });

		await pokemonApiRequest.call(ctx, 'https://pokeapi.co/api/v2/pokemon/pikachu');

		const callArgs = mockHttpRequest.mock.calls[0][0] as Record<string, unknown>;
		expect(callArgs).not.toHaveProperty('uri');
		expect(callArgs).toHaveProperty('url');
	});
});

// ─── pokemonApiRequest error handling ────────────────────────────────────────

describe('Pokemon Node — pokemonApiRequest error handling', () => {
	it('should throw NodeApiError when httpRequest throws', async () => {
		const networkError = new Error('Network error');
		const mockHttpRequest = jest.fn().mockRejectedValue(networkError);
		const ctx = createMockContext({ httpRequest: mockHttpRequest });

		await expect(
			pokemonApiRequest.call(ctx, 'https://pokeapi.co/api/v2/pokemon/pikachu'),
		).rejects.toThrow(NodeApiError);
	});
});

// ─── validateNameOrId ─────────────────────────────────────────────────────────

describe('Pokemon Node — validateNameOrId', () => {
	const makeContext = () => createMockContext();

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

// ─── simplifyPokemonData output shape ────────────────────────────────────────

describe('Pokemon Node — simplifyPokemonData output shape', () => {
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

// ─── simplifyPokemonData null sprite ─────────────────────────────────────────

describe('Pokemon Node — simplifyPokemonData null sprite', () => {
	it('should return sprite as null when sprites.front_default is null', () => {
		const result = simplifyPokemonData(PIKACHU_DETAIL_NULL_SPRITE);
		expect(result.sprite).toBeNull();
	});

	it('should not throw when sprite is null', () => {
		expect(() => simplifyPokemonData(PIKACHU_DETAIL_NULL_SPRITE)).not.toThrow();
	});
});

// ─── simplifyPokemonData multi-type Pokemon ───────────────────────────────────

describe('Pokemon Node — simplifyPokemonData multi-type', () => {
	it('should return multiple types for Bulbasaur', () => {
		const result = simplifyPokemonData(BULBASAUR_DETAIL);
		expect(result.types).toEqual(['grass', 'poison']);
	});

	it('should return multiple abilities for Bulbasaur', () => {
		const result = simplifyPokemonData(BULBASAUR_DETAIL);
		expect(result.abilities).toEqual(['overgrow', 'chlorophyll']);
	});
});

// ─── pokemonApiRequestAllPages pagination ─────────────────────────────────────

describe('Pokemon Node — pokemonApiRequestAllPages pagination', () => {
	const makeContext = (mockHttpRequest: jest.Mock) =>
		createMockContext({ httpRequest: mockHttpRequest });

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

// ─── Pagination circuit breaker ───────────────────────────────────────────────

describe('Pokemon Node — pagination circuit breaker', () => {
	const infinitePage = {
		count: 9999,
		next: 'https://pokeapi.co/api/v2/pokemon?offset=100&limit=100',
		previous: null,
		results: [{ name: 'pokemon-x', url: 'https://pokeapi.co/api/v2/pokemon/1/' }],
	};

	it('should throw NodeOperationError when more than 50 pages are fetched', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(infinitePage);
		const ctx = createMockContext({ httpRequest: mockHttpRequest });

		await expect(pokemonApiRequestAllPages.call(ctx)).rejects.toThrow(NodeOperationError);
	});

	it('should call httpRequest no more than 50 times before circuit breaker triggers', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(infinitePage);
		const ctx = createMockContext({ httpRequest: mockHttpRequest });

		await expect(pokemonApiRequestAllPages.call(ctx)).rejects.toThrow();
		expect(mockHttpRequest.mock.calls.length).toBeLessThanOrEqual(50);
	});
});

// ─── execute() get with simplify=true ────────────────────────────────────────

describe('Pokemon Node — execute get simplified', () => {
	it('should return simplified pikachu data when simplify=true', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'pikachu', simplify: true },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);

		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(1);
		const item = result[0][0].json as Record<string, unknown>;
		expect(item.id).toBe(25);
		expect(item.name).toBe('pikachu');
		expect(item.types).toEqual(['electric']);
		expect((item.stats as Record<string, number>).speed).toBe(90);
		expect(item.sprite).toBeTruthy();
		expect(item).not.toHaveProperty('moves');
	});

	it('should call GET /pokemon/pikachu', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'pikachu', simplify: true },
		});
		const node = new Pokemon();

		await node.execute.call(ctx);

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'https://pokeapi.co/api/v2/pokemon/pikachu' }),
		);
	});
});

// ─── execute() getAll with default limit ─────────────────────────────────────

describe('Pokemon Node — execute getAll default limit', () => {
	it('should return 20 items when limit is 20', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(LIST_LIMIT_20);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'getAll', returnAll: false, limit: 20 },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);

		expect(result[0]).toHaveLength(20);
	});

	it('should call httpRequest with limit=20 in query', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(LIST_LIMIT_20);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'getAll', returnAll: false, limit: 20 },
		});
		const node = new Pokemon();

		await node.execute.call(ctx);

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url: expect.stringContaining('limit=20') }),
		);
	});

	it('should return items with name and url properties', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(LIST_LIMIT_20);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'getAll', returnAll: false, limit: 20 },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const items = result[0] as Array<{ json: Record<string, unknown> }>;

		expect(items[0].json).toHaveProperty('name');
		expect(items[0].json).toHaveProperty('url');
	});

	it('should NOT include count, next, or previous fields in output', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(LIST_LIMIT_20);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'getAll', returnAll: false, limit: 20 },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const items = result[0] as Array<{ json: Record<string, unknown> }>;

		expect(items[0].json).not.toHaveProperty('count');
		expect(items[0].json).not.toHaveProperty('next');
		expect(items[0].json).not.toHaveProperty('previous');
	});
});

// ─── execute() getAll with custom limit ──────────────────────────────────────

describe('Pokemon Node — execute getAll custom limit', () => {
	it('should return 5 items when limit is 5', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(LIST_LIMIT_5);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'getAll', returnAll: false, limit: 5 },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);

		expect(result[0]).toHaveLength(5);
	});

	it('should call httpRequest with limit=5 in query', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(LIST_LIMIT_5);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'getAll', returnAll: false, limit: 5 },
		});
		const node = new Pokemon();

		await node.execute.call(ctx);

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url: expect.stringContaining('limit=5') }),
		);
	});
});

// ─── execute() getAll envelope unwrapping ────────────────────────────────────

describe('Pokemon Node — execute getAll envelope unwrapping', () => {
	it('should extract only results array, not count/next/previous', async () => {
		const envelopeResponse = {
			count: 1302,
			next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
			previous: null,
			results: [
				{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
				{ name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
			],
		};
		const mockHttpRequest = jest.fn().mockResolvedValue(envelopeResponse);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'getAll', returnAll: false, limit: 20 },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const items = result[0] as Array<{ json: Record<string, unknown> }>;

		expect(items).toHaveLength(2);
		expect(items[0].json.name).toBe('bulbasaur');
		expect(items[0].json).not.toHaveProperty('count');
		expect(items[0].json).not.toHaveProperty('next');
		expect(items[0].json).not.toHaveProperty('previous');
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

// ─── validateNameOrId lowercase normalization ─────────────────────────────────

describe('Pokemon Node — validateNameOrId lowercase normalization', () => {
	const makeContext = () => createMockContext();

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

// ─── execute() get with simplify=false ───────────────────────────────────────

describe('Pokemon Node — execute get full output', () => {
	const PIKACHU_WITH_MOVES = {
		...PIKACHU_DETAIL,
		moves: [{ move: { name: 'tackle', url: '' } }],
		sprites: {
			front_default:
				'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
			front_shiny:
				'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png',
		},
	};

	it('should return full response including moves when simplify=false', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_WITH_MOVES);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'pikachu', simplify: false },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const item = result[0][0].json as Record<string, unknown>;

		expect(item).toHaveProperty('moves');
		expect(Array.isArray(item.moves)).toBe(true);
	});

	it('should include all sprite variants when simplify=false', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_WITH_MOVES);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'pikachu', simplify: false },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const item = result[0][0].json as Record<string, unknown>;
		const sprites = item.sprites as Record<string, unknown>;

		expect(sprites).toHaveProperty('front_default');
		expect(sprites).toHaveProperty('front_shiny');
	});
});

// ─── execute() get by numeric ID ─────────────────────────────────────────────

describe('Pokemon Node — execute get by numeric ID', () => {
	it('should resolve pikachu when nameOrId is "25"', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: '25', simplify: true },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const item = result[0][0].json as Record<string, unknown>;

		expect(item.name).toBe('pikachu');
	});

	it('should request /pokemon/25 when nameOrId is "25"', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: '25', simplify: true },
		});
		const node = new Pokemon();

		await node.execute.call(ctx);

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'https://pokeapi.co/api/v2/pokemon/25' }),
		);
	});
});

// ─── execute() get with hyphenated name ──────────────────────────────────────

describe('Pokemon Node — execute get hyphenated name', () => {
	const MR_MIME_DETAIL = {
		...PIKACHU_DETAIL,
		id: 122,
		name: 'mr-mime',
	};

	it('should request /pokemon/mr-mime when nameOrId is "mr-mime"', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(MR_MIME_DETAIL);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'mr-mime', simplify: true },
		});
		const node = new Pokemon();

		await node.execute.call(ctx);

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'https://pokeapi.co/api/v2/pokemon/mr-mime' }),
		);
	});

	it('should return name mr-mime in output', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(MR_MIME_DETAIL);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'mr-mime', simplify: true },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const item = result[0][0].json as Record<string, unknown>;

		expect(item.name).toBe('mr-mime');
	});
});

// ─── execute() get multi-type Pokemon ────────────────────────────────────────

describe('Pokemon Node — execute get multi-type', () => {
	it('should return types ["grass","poison"] for bulbasaur', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(BULBASAUR_DETAIL);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'bulbasaur', simplify: true },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const item = result[0][0].json as Record<string, unknown>;

		expect(item.types).toEqual(['grass', 'poison']);
	});
});

// ─── execute() get null sprite ───────────────────────────────────────────────

describe('Pokemon Node — execute get null sprite', () => {
	it('should return sprite as null without throwing when front_default is null', async () => {
		const mockHttpRequest = jest.fn().mockResolvedValue(PIKACHU_DETAIL_NULL_SPRITE);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'pikachu', simplify: true },
		});
		const node = new Pokemon();

		const result = await node.execute.call(ctx);
		const item = result[0][0].json as Record<string, unknown>;

		expect(item.sprite).toBeNull();
	});
});

// ─── execute() get 404 not found ─────────────────────────────────────────────

describe('Pokemon Node — execute get 404 not found', () => {
	it('should throw NodeApiError when API returns 404', async () => {
		const apiError = Object.assign(new Error('Not Found'), {
			statusCode: 404,
			response: { statusCode: 404 },
		});
		const mockHttpRequest = jest.fn().mockRejectedValue(apiError);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'notapokemon', simplify: true },
		});
		const node = new Pokemon();

		await expect(node.execute.call(ctx)).rejects.toThrow(/notapokemon/);
	});
});

// ─── execute() continueOnFail ─────────────────────────────────────────────────

describe('Pokemon Node — execute continueOnFail', () => {
	it('should return error item with pairedItem when continueOnFail is enabled', async () => {
		const apiError = Object.assign(new Error('Not Found'), {
			statusCode: 404,
		});
		const mockHttpRequest = jest.fn().mockRejectedValue(apiError);
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: 'notapokemon', simplify: true },
			continueOnFail: true,
		});

		const node = new Pokemon();
		const result = await node.execute.call(ctx);

		expect(result[0]).toHaveLength(1);
		const errorItem = result[0][0];
		expect(errorItem.json).toHaveProperty('error');
		expect(errorItem.pairedItem).toEqual({ item: 0 });
	});
});

// ─── execute() empty string input ────────────────────────────────────────────

describe('Pokemon Node — execute empty string input', () => {
	it('should throw NodeOperationError for empty nameOrId without making HTTP request', async () => {
		const mockHttpRequest = jest.fn();
		const ctx = createMockContext({
			httpRequest: mockHttpRequest,
			nodeParams: { operation: 'get', nameOrId: '', simplify: true },
		});
		const node = new Pokemon();

		await expect(node.execute.call(ctx)).rejects.toThrow(NodeOperationError);
		expect(mockHttpRequest).not.toHaveBeenCalled();
	});
});
