import { DEFAULT_USER_PASSWORD } from './constants';

export interface UserCredentials {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}

// Simple name generators
const FIRST_NAMES = [
	'Alex',
	'Jordan',
	'Taylor',
	'Morgan',
	'Casey',
	'Riley',
	'Avery',
	'Quinn',
	'Sam',
	'Drew',
	'Blake',
	'Sage',
	'River',
	'Rowan',
	'Skylar',
	'Emery',
];

const LAST_NAMES = [
	'Smith',
	'Johnson',
	'Williams',
	'Brown',
	'Jones',
	'Garcia',
	'Miller',
	'Davis',
	'Rodriguez',
	'Martinez',
	'Hernandez',
	'Lopez',
	'Gonzalez',
	'Wilson',
	'Anderson',
	'Thomas',
];

const getRandomName = (names: string[]): string => {
	return names[Math.floor(Math.random() * names.length)];
};

const randFirstName = (): string => getRandomName(FIRST_NAMES);
const randLastName = (): string => getRandomName(LAST_NAMES);

export const INSTANCE_OWNER_CREDENTIALS: UserCredentials = {
	email: 'nathan@n8n.io',
	password: DEFAULT_USER_PASSWORD,
	firstName: randFirstName(),
	lastName: randLastName(),
};

export const INSTANCE_ADMIN_CREDENTIALS: UserCredentials = {
	email: 'admin@n8n.io',
	password: DEFAULT_USER_PASSWORD,
	firstName: randFirstName(),
	lastName: randLastName(),
};

export const INSTANCE_MEMBER_CREDENTIALS: UserCredentials[] = [
	{
		email: 'member@n8n.io',
		password: DEFAULT_USER_PASSWORD,
		firstName: randFirstName(),
		lastName: randLastName(),
	},
];
