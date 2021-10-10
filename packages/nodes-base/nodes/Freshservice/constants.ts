// https://support.freshservice.com/support/solutions/articles/232303-list-of-languages-supported-in-freshservice

const RAW_LANGUAGES: { [key: string]: string } = {
	en: 'English',
	ar: 'Arabic',
	ca: 'Catalan',
	cs: 'Czech',
	'cy-GB': 'Welsh',
	da: 'Danish',
	de: 'German',
	es: 'Spanish',
	'es-LA': 'Spanish (Latin America)',
	et: 'Estonian',
	fi: 'Finnish',
	fr: 'French',
	he: 'Hebrew',
	hu: 'Hungarian',
	id: 'Indonesian',
	it: 'Italian',
	'ja-JP': 'Japanese',
	ko: 'Korean',
	LV: 'Latvian',
	'nb-NO': 'Norwegian',
	nl: 'Dutch',
	pl: 'Polish',
	pt: 'Portuguese',
	'pt-BR': 'Portuguese (Brazil)',
	'pt-PT': 'Portuguese (Portugal)',
	'ru-RU': 'Russian',
	sk: 'Slovak',
	'sk-SK': 'Slovak',
	sl: 'Slovenian',
	'sv-SE': 'Swedish',
	th: 'Thai',
	tr: 'Turkish',
	UK: 'Ukrainian',
	vi: 'Vietnamese',
	'zh-CN': 'Chinese (Simplified)',
	'zh-TW': 'Chinese (Traditional)',
};

export const LANGUAGES = Object.keys(RAW_LANGUAGES).map((key) => {
	return ({ value: key, name: RAW_LANGUAGES[key] });
});
