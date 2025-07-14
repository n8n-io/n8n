import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const oldVersionNotice: INodeProperties = {
	displayName:
		'<strong>New node version available:</strong> get the latest version with added features from the nodes panel.',
	name: 'oldVersionNotice',
	type: 'notice',
	default: '',
};

export const returnAllOrLimit: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];

export const looseTypeValidationProperty: INodeProperties = {
	displayName: 'Convert types where required',
	description:
		'If the type of an expression doesn\'t match the type of the comparison, n8n will try to cast the expression to the required type. E.g. for booleans <code>"false"</code> or <code>0</code> will be cast to <code>false</code>',
	name: 'looseTypeValidation',
	type: 'boolean',
	default: true,
};

export const appendAttributionOption: INodeProperties = {
	displayName: 'Append n8n Attribution',
	name: 'appendAttribution',
	type: 'boolean',
	default: true,
};

export const encodeDecodeOptions: INodePropertyOptions[] = [
	{
		name: 'armscii8',
		value: 'armscii8',
	},
	{
		name: 'ascii',
		value: 'ascii',
	},
	{
		name: 'base64',
		value: 'base64',
	},
	{
		name: 'big5hkscs',
		value: 'big5hkscs',
	},
	{
		name: 'binary',
		value: 'binary',
	},
	{
		name: 'cesu8',
		value: 'cesu8',
	},
	{
		name: 'cp1046',
		value: 'cp1046',
	},
	{
		name: 'cp1124',
		value: 'cp1124',
	},
	{
		name: 'cp1125',
		value: 'cp1125',
	},
	{
		name: 'cp1129',
		value: 'cp1129',
	},
	{
		name: 'cp1133',
		value: 'cp1133',
	},
	{
		name: 'cp1161',
		value: 'cp1161',
	},
	{
		name: 'cp1162',
		value: 'cp1162',
	},
	{
		name: 'cp1163',
		value: 'cp1163',
	},
	{
		name: 'cp437',
		value: 'cp437',
	},
	{
		name: 'cp720',
		value: 'cp720',
	},
	{
		name: 'cp737',
		value: 'cp737',
	},
	{
		name: 'cp775',
		value: 'cp775',
	},
	{
		name: 'cp808',
		value: 'cp808',
	},
	{
		name: 'cp850',
		value: 'cp850',
	},
	{
		name: 'cp852',
		value: 'cp852',
	},
	{
		name: 'cp855',
		value: 'cp855',
	},
	{
		name: 'cp856',
		value: 'cp856',
	},
	{
		name: 'cp857',
		value: 'cp857',
	},
	{
		name: 'cp858',
		value: 'cp858',
	},
	{
		name: 'cp860',
		value: 'cp860',
	},
	{
		name: 'cp861',
		value: 'cp861',
	},
	{
		name: 'cp862',
		value: 'cp862',
	},
	{
		name: 'cp863',
		value: 'cp863',
	},
	{
		name: 'cp864',
		value: 'cp864',
	},
	{
		name: 'cp865',
		value: 'cp865',
	},
	{
		name: 'cp866',
		value: 'cp866',
	},
	{
		name: 'cp869',
		value: 'cp869',
	},
	{
		name: 'cp922',
		value: 'cp922',
	},
	{
		name: 'cp936',
		value: 'cp936',
	},
	{
		name: 'cp949',
		value: 'cp949',
	},
	{
		name: 'cp950',
		value: 'cp950',
	},
	{
		name: 'eucjp',
		value: 'eucjp',
	},
	{
		name: 'gb18030',
		value: 'gb18030',
	},
	{
		name: 'gbk',
		value: 'gbk',
	},
	{
		name: 'georgianacademy',
		value: 'georgianacademy',
	},
	{
		name: 'georgianps',
		value: 'georgianps',
	},
	{
		name: 'hex',
		value: 'hex',
	},
	{
		name: 'hproman8',
		value: 'hproman8',
	},
	{
		name: 'iso646cn',
		value: 'iso646cn',
	},
	{
		name: 'iso646jp',
		value: 'iso646jp',
	},
	{
		name: 'iso88591',
		value: 'iso88591',
	},
	{
		name: 'iso885910',
		value: 'iso885910',
	},
	{
		name: 'iso885911',
		value: 'iso885911',
	},
	{
		name: 'iso885913',
		value: 'iso885913',
	},
	{
		name: 'iso885914',
		value: 'iso885914',
	},
	{
		name: 'iso885915',
		value: 'iso885915',
	},
	{
		name: 'iso885916',
		value: 'iso885916',
	},
	{
		name: 'iso88592',
		value: 'iso88592',
	},
	{
		name: 'iso88593',
		value: 'iso88593',
	},
	{
		name: 'iso88594',
		value: 'iso88594',
	},
	{
		name: 'iso88595',
		value: 'iso88595',
	},
	{
		name: 'iso88596',
		value: 'iso88596',
	},
	{
		name: 'iso88597',
		value: 'iso88597',
	},
	{
		name: 'iso88598',
		value: 'iso88598',
	},
	{
		name: 'iso88599',
		value: 'iso88599',
	},
	{
		name: 'koi8r',
		value: 'koi8r',
	},
	{
		name: 'koi8ru',
		value: 'koi8ru',
	},
	{
		name: 'koi8t',
		value: 'koi8t',
	},
	{
		name: 'koi8u',
		value: 'koi8u',
	},
	{
		name: 'maccenteuro',
		value: 'maccenteuro',
	},
	{
		name: 'maccroatian',
		value: 'maccroatian',
	},
	{
		name: 'maccyrillic',
		value: 'maccyrillic',
	},
	{
		name: 'macgreek',
		value: 'macgreek',
	},
	{
		name: 'maciceland',
		value: 'maciceland',
	},
	{
		name: 'macintosh',
		value: 'macintosh',
	},
	{
		name: 'macroman',
		value: 'macroman',
	},
	{
		name: 'macromania',
		value: 'macromania',
	},
	{
		name: 'macthai',
		value: 'macthai',
	},
	{
		name: 'macturkish',
		value: 'macturkish',
	},
	{
		name: 'macukraine',
		value: 'macukraine',
	},
	{
		name: 'mik',
		value: 'mik',
	},
	{
		name: 'pt154',
		value: 'pt154',
	},
	{
		name: 'rk1048',
		value: 'rk1048',
	},
	{
		name: 'shiftjis',
		value: 'shiftjis',
	},
	{
		name: 'tcvn',
		value: 'tcvn',
	},
	{
		name: 'tis620',
		value: 'tis620',
	},
	{
		name: 'ucs2',
		value: 'ucs2',
	},
	{
		name: 'utf16',
		value: 'utf16',
	},
	{
		name: 'utf16be',
		value: 'utf16be',
	},
	{
		name: 'utf32',
		value: 'utf32',
	},
	{
		name: 'utf32be',
		value: 'utf32be',
	},
	{
		name: 'utf32le',
		value: 'utf32le',
	},
	{
		name: 'utf7',
		value: 'utf7',
	},
	{
		name: 'utf7imap',
		value: 'utf7imap',
	},
	{
		name: 'utf8',
		value: 'utf8',
	},
	{
		name: 'viscii',
		value: 'viscii',
	},
	{
		name: 'windows1250',
		value: 'windows1250',
	},
	{
		name: 'windows1251',
		value: 'windows1251',
	},
	{
		name: 'windows1252',
		value: 'windows1252',
	},
	{
		name: 'windows1253',
		value: 'windows1253',
	},
	{
		name: 'windows1254',
		value: 'windows1254',
	},
	{
		name: 'windows1255',
		value: 'windows1255',
	},
	{
		name: 'windows1256',
		value: 'windows1256',
	},
	{
		name: 'windows1257',
		value: 'windows1257',
	},
	{
		name: 'windows1258',
		value: 'windows1258',
	},
	{
		name: 'windows874',
		value: 'windows874',
	},
];
