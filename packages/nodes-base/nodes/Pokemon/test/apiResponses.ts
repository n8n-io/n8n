import type { IPokemonDetailResponse, IPokemonListResponse } from '../GenericFunctions';

export const PIKACHU_DETAIL: IPokemonDetailResponse = {
	id: 25,
	name: 'pikachu',
	height: 4,
	weight: 60,
	base_experience: 112,
	types: [{ slot: 1, type: { name: 'electric', url: 'https://pokeapi.co/api/v2/type/13/' } }],
	abilities: [
		{
			ability: { name: 'static', url: 'https://pokeapi.co/api/v2/ability/9/' },
			is_hidden: false,
			slot: 1,
		},
		{
			ability: { name: 'lightning-rod', url: 'https://pokeapi.co/api/v2/ability/31/' },
			is_hidden: true,
			slot: 3,
		},
	],
	stats: [
		{ base_stat: 35, effort: 0, stat: { name: 'hp', url: '' } },
		{ base_stat: 55, effort: 0, stat: { name: 'attack', url: '' } },
		{ base_stat: 40, effort: 0, stat: { name: 'defense', url: '' } },
		{ base_stat: 50, effort: 0, stat: { name: 'special-attack', url: '' } },
		{ base_stat: 50, effort: 0, stat: { name: 'special-defense', url: '' } },
		{ base_stat: 90, effort: 3, stat: { name: 'speed', url: '' } },
	],
	sprites: {
		front_default:
			'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
	},
	species: { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
	moves: [],
};

export const PIKACHU_DETAIL_NULL_SPRITE: IPokemonDetailResponse = {
	...PIKACHU_DETAIL,
	sprites: { front_default: null },
};

export const BULBASAUR_DETAIL: IPokemonDetailResponse = {
	id: 1,
	name: 'bulbasaur',
	height: 7,
	weight: 69,
	base_experience: 64,
	types: [
		{ slot: 1, type: { name: 'grass', url: 'https://pokeapi.co/api/v2/type/12/' } },
		{ slot: 2, type: { name: 'poison', url: 'https://pokeapi.co/api/v2/type/4/' } },
	],
	abilities: [
		{ ability: { name: 'overgrow', url: '' }, is_hidden: false, slot: 1 },
		{ ability: { name: 'chlorophyll', url: '' }, is_hidden: true, slot: 3 },
	],
	stats: [
		{ base_stat: 45, effort: 0, stat: { name: 'hp', url: '' } },
		{ base_stat: 49, effort: 0, stat: { name: 'attack', url: '' } },
		{ base_stat: 49, effort: 0, stat: { name: 'defense', url: '' } },
		{ base_stat: 65, effort: 1, stat: { name: 'special-attack', url: '' } },
		{ base_stat: 65, effort: 0, stat: { name: 'special-defense', url: '' } },
		{ base_stat: 45, effort: 0, stat: { name: 'speed', url: '' } },
	],
	sprites: {
		front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
	},
	species: { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
	moves: [],
};

export const LIST_PAGE_1: IPokemonListResponse = {
	count: 3,
	next: 'https://pokeapi.co/api/v2/pokemon?offset=2&limit=2',
	previous: null,
	results: [
		{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
		{ name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
	],
};

export const LIST_PAGE_2: IPokemonListResponse = {
	count: 3,
	next: null,
	previous: 'https://pokeapi.co/api/v2/pokemon?offset=0&limit=2',
	results: [{ name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' }],
};

export const LIST_LIMIT_20: IPokemonListResponse = {
	count: 1302,
	next: 'https://pokeapi.co/api/v2/pokemon?offset=20&limit=20',
	previous: null,
	results: Array.from({ length: 20 }, (_, i) => ({
		name: `pokemon-${i + 1}`,
		url: `https://pokeapi.co/api/v2/pokemon/${i + 1}/`,
	})),
};
