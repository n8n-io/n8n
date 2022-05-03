import { INodeProperties } from 'n8n-workflow';
import { crytoMethods } from '../ressources/cryptoMethods';
import { currencies } from '../ressources/currencies';
import { hashMethods } from '../ressources/hashMethods';
import { languages } from '../ressources/languages';

export const cryptoOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['crypto'],
			},
		},
		options: [
			{
				name: 'Encrypt a message',
				value: 'encrypt',
				description: 'Encrypts a message with a selected method.',
			},
			{
				name: 'Decrypt a Ciphertext',
				value: 'decrypt',
				description: 'Decrypts a ciphertext with a selected method.',
			},
			{
				name: 'Hash a text',
				value: 'hash',
				description: 'Hashes a text with selected methods.',
			},
		],
		default: 'encrypt',
	},
] as INodeProperties[];

export const cryptoFields = [
	// convert: encrypt
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['encrypt'],
				resource: ['crypto'],
			},
		},
		default: '',
		description: 'Message you want to encrypt.',
	},
	{
		displayName: 'Secret Key',
		name: 'secretKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['encrypt'],
				resource: ['crypto'],
			},
		},
		default: '',
	},
	{
		displayName: 'Crypto Type',
		name: 'cryptoType',
		type: 'options',
		options: crytoMethods,
		required: true,
		displayOptions: {
			show: {
				operation: ['encrypt'],
				resource: ['crypto'],
			},
		},
		default: '',
	},
	// convert: decrypt
	{
		displayName: 'Ciphertext',
		name: 'ciphertext',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['decrypt'],
				resource: ['crypto'],
			},
		},
		default: '',
		description: 'Cyphertext you want to decrypt.',
	},
	{
		displayName: 'Secret Key',
		name: 'secretKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['decrypt'],
				resource: ['crypto'],
			},
		},
		default: '',
	},
	{
		displayName: 'Crypto Type',
		name: 'cryptoType',
		type: 'options',
		options: crytoMethods,
		required: true,
		displayOptions: {
			show: {
				operation: ['decrypt'],
				resource: ['crypto'],
			},
		},
		default: '',
	},
	// convert: hash
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['hash'],
				resource: ['crypto'],
			},
		},
		default: '',
		description: 'Message you want to hash.',
	},
	{
		displayName: 'Secret Key',
		name: 'secretKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['hash'],
				resource: ['crypto'],
			},
		},
		default: '',
	},
	{
		displayName: 'Hash Type',
		name: 'hashType',
		type: 'options',
		options: hashMethods,
		required: true,
		displayOptions: {
			show: {
				operation: ['hash'],
				resource: ['crypto'],
			},
		},
		default: '',
	},
] as INodeProperties[];
