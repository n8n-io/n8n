import {
	INodeProperties,
 } from 'n8n-workflow';

export const aiOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'ai',
				],
			},
		},
		options: [
			{
				name: 'Email Validation',
				value: 'emailValidation',
				description: 'Validate an email address',
			},
			{
				name: 'Entity Detection',
				value: 'entityDetection',
				description: 'Entities from text detection',
			},
			{
				name: 'Language Validation',
				value: 'languageValidation',
				description: 'Language Validation / Detection',
			},
			{
				name: 'Mood Detection',
				value: 'moodDetection',
				description: 'Mood from text detection',
			},
			{
				name: 'OCR',
				value: 'ocr',
				description: 'OCR from pictures',
			},
			{
				name: 'Picture Recognition',
				value: 'pictureRecognition',
				description: 'Picture content detection',
			},
			{
				name: 'Translation',
				value: 'translation',
				description: 'Translate text',
			},
		],
		default: 'emailValidation',
	},
] as INodeProperties[];

export const aiFields = [
	// ai: emailValidation
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'emailValidation',
				],
				resource: [
					'ai',
				],
			},
		},
		default: '',
		description: 'The email you want to fix',
	},
	// ai: entityDetection
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'entityDetection',
				],
				resource: [
					'ai',
				],
			},
		},
		default: '',
		description: 'Text you want to analyse',
	},
	// ai: languageValidation
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'languageValidation',
				],
				resource: [
					'ai',
				],
			},
		},
		default: '',
		description: 'Text to detect language of',
	},
	// ai: moodDetection
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'moodDetection',
				],
				resource: [
					'ai',
				],
			},
		},
		default: '',
		description: 'Text you want to analyse',
	},
	// ai: ocr
	{
		displayName: 'URL',
		name: 'imageUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'ocr',
				],
				resource: [
					'ai',
				],
			},
		},
		default: '',
		description: 'URL of the image you want to analyse',
	},
	// ai: pictureRecognition
	{
		displayName: 'URL',
		name: 'imageUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'pictureRecognition',
				],
				resource: [
					'ai',
				],
			},
		},
		default: '',
		description: 'URL of the image you want to analyse',
	},
	// ai: translation
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'translation',
				],
				resource: [
					'ai',
				],
			},
		},
		default: '',
		description: 'The text you want to translate',
	},
	{
		displayName: 'Result Language',
		name: 'resultLang',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'translation',
				],
				resource: [
					'ai',
				],
			},
		},
		default: '',
		description: 'The langauge to translate to',
	},
] as INodeProperties[];
