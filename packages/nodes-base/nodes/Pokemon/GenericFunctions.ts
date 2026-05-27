import type { IDataObject, IExecuteFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

// ─── API Response Interfaces ──────────────────────────────────────────────────

export interface IPokemonListItem {
	name: string;
	url: string;
}

export interface IPokemonListResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: IPokemonListItem[];
}

export interface IPokemonType {
	slot: number;
	type: { name: string; url: string };
}

export interface IPokemonAbility {
	ability: { name: string; url: string };
	is_hidden: boolean;
	slot: number;
}

export interface IPokemonStat {
	base_stat: number;
	effort: number;
	stat: { name: string; url: string };
}

export interface IPokemonMove {
	move: { name: string; url: string };
}

export interface IPokemonDetailResponse {
	id: number;
	name: string;
	height: number;
	weight: number;
	base_experience: number;
	types: IPokemonType[];
	abilities: IPokemonAbility[];
	stats: IPokemonStat[];
	sprites: { front_default: string | null };
	species: { name: string; url: string };
	moves: IPokemonMove[];
}

export interface IPokemonSimplified {
	id: number;
	name: string;
	height: number;
	weight: number;
	base_experience: number;
	types: string[];
	abilities: string[];
	stats: Record<string, number>;
	sprite: string | null;
	species: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const NAME_OR_ID_PATTERN = /^[a-zA-Z0-9-]+$/;
const PAGINATION_CIRCUIT_BREAKER_LIMIT = 50;

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate and normalize a Pokemon name or ID.
 * Returns the lowercased value — PokeAPI requires lowercase names.
 */
export function validateNameOrId(
	context: IExecuteFunctions,
	nameOrId: string,
	itemIndex: number,
): string {
	const trimmed = nameOrId?.trim() ?? '';
	if (trimmed.length === 0) {
		throw new NodeOperationError(context.getNode(), 'Pokemon name or ID cannot be empty.', {
			itemIndex,
		});
	}
	if (!NAME_OR_ID_PATTERN.test(trimmed)) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid Pokemon name or ID: "${trimmed}". Only letters, numbers, and hyphens are allowed.`,
			{ itemIndex },
		);
	}
	return trimmed.toLowerCase();
}

// ─── Limit Clamping ──────────────────────────────────────────────────────────

/**
 * Clamp a limit value to 1..100. Expression inputs bypass typeOptions min/max,
 * so this runtime guard is required (ADR D12).
 */
export function clampLimit(limit: number): number {
	return Math.min(Math.max(1, limit), 100);
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

export async function pokemonApiRequest<T = unknown>(
	this: IExecuteFunctions,
	url: string,
	resourceName?: string,
): Promise<T> {
	try {
		return await this.helpers.httpRequest({
			method: 'GET',
			url,
			headers: {
				Accept: 'application/json',
			},
			disableFollowRedirect: true,
		});
	} catch (error) {
		const statusCode =
			(error as { statusCode?: number }).statusCode ??
			(error as { response?: { status?: number } }).response?.status;
		if (statusCode === 404) {
			const name = resourceName ?? url.split('/pokemon/')[1]?.split('?')[0] ?? 'unknown';
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: `Pokémon '${name}' not found. Check the spelling — valid names use the PokéAPI format (e.g. 'bulbasaur', 'mr-mime').`,
				httpCode: '404',
			});
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export async function pokemonApiRequestAllPages(
	this: IExecuteFunctions,
): Promise<IPokemonListItem[]> {
	let url: string | null = `${POKEAPI_BASE_URL}/pokemon?limit=100&offset=0`;
	const allResults: IPokemonListItem[] = [];
	let pageCount = 0;

	while (url !== null) {
		if (pageCount >= PAGINATION_CIRCUIT_BREAKER_LIMIT) {
			throw new NodeOperationError(
				this.getNode(),
				`Pagination exceeded ${PAGINATION_CIRCUIT_BREAKER_LIMIT} pages. This may indicate an API issue.`,
			);
		}
		const response = await (pokemonApiRequest<IPokemonListResponse>).call(this, url);
		allResults.push(...response.results);
		url = response.next;
		pageCount++;
	}

	return allResults;
}

// ─── Data Transformation ──────────────────────────────────────────────────────

export function toDataObject(data: IPokemonSimplified): IDataObject {
	return { ...data } as IDataObject;
}

export function simplifyPokemonData(data: IPokemonDetailResponse): IPokemonSimplified {
	return {
		id: data.id,
		name: data.name,
		height: data.height,
		weight: data.weight,
		base_experience: data.base_experience,
		types: data.types.map((t) => t.type.name),
		abilities: data.abilities.map((a) => a.ability.name),
		stats: data.stats.reduce<Record<string, number>>((acc, s) => {
			acc[s.stat.name] = s.base_stat;
			return acc;
		}, {}),
		sprite: data.sprites.front_default,
		species: data.species.name,
	};
}
