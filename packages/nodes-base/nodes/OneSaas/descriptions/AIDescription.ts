import { INodeProperties } from 'n8n-workflow';
import { languages } from '../ressources/languages';

export const aiOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['ai'],
			},
		},
		options: [
			{
				name: 'Enitity Detection',
				value: 'entityDetection',
				description: 'Detects entities in a text with natural language processing AI.',
			},
			{
				name: 'Language Detection',
				value: 'languageDetection',
			},
			{
				name: 'Mood Detection',
				value: 'moodDetection',
				description: 'Detect the mood from text.',
			},
			{
				name: 'Picture Text Recognition',
				value: 'pictureTextRecognition',
				description: 'Detects the text in a picture using Optical Character Recognition AI.',
			},
			{
				name: 'Picture Object Recognition',
				value: 'pictureObjectRecognition',
				description: 'Detects content and objects on a picture.',
			},
			{
				name: 'Translation',
				value: 'translate',
				description: 'Translate text',
			},
		],
		default: 'entityDetection',
	},
] as INodeProperties[];

export const aiFields = [
	// ai: entityDetection
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['entityDetection'],
				resource: ['ai'],
			},
		},
		default: '',
		description: 'Text you want to analyse.',
	},
	// ai: languageValidation
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['languageDetection'],
				resource: ['ai'],
			},
		},
		default: '',
		description: 'Text to detect language of.',
	},
	// ai: moodDetection
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['moodDetection'],
				resource: ['ai'],
			},
		},
		default: '',
		description: 'Text you want to analyse.',
	},
	// ai: pictureTextRecognition
	// ai: pictureobjectrecognition
	{
		displayName: 'URL',
		name: 'imageUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['pictureTextRecognition', 'pictureObjectRecognition'],
				resource: ['ai'],
			},
		},
		default: '',
		description: 'URL of the image you want to analyse.',
	},
	// ai: translate
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['translate'],
				resource: ['ai'],
			},
		},
		default: '',
		description: 'The text you want to translate.',
	},
	{
		displayName: 'Result Language',
		name: 'resultLang',
		type: 'options',
		options: languages,
		required: true,
		displayOptions: {
			show: {
				operation: ['translate'],
				resource: ['ai'],
			},
		},
		default: '',
		description: 'The langauge to translate to.',
	},
] as INodeProperties[];
