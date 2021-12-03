import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IHttpRequestOptions,
	IWebhookFunctions,
} from 'n8n-workflow';

import * as _ from 'lodash';

export async function koboToolboxApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	// console.log('koboToolboxApiRequest');
	const credentials = await this.getCredentials('koboToolboxApi') as IDataObject;

	const options: IHttpRequestOptions = {
		url: '',
		headers: {
			'Accept': 'application/json',
			'Authorization': `Token ${credentials.token}`,
		},
		json: true,
	};
	if (Object.keys(option)) {
		Object.assign(options, option);
	}
	if (options.url && !/^http(s)?:/.test(options.url)) {
		options.url = credentials.URL + options.url;
	}
	// console.dir(options);

	const response = await this.helpers.httpRequest(options);
	// console.dir(response);
	return response;
}

function parseGeoPoint(geoPoint: string): null | {lat: number, lon: number} {
	// Check if it looks like a "lat lon z precision" flat string e.g. "-1.931161 30.079811 0 0"
	const coordinates = _.split(geoPoint, ' ');
	if (coordinates.length >= 2 && _.every(coordinates, coord => coord && /^-?\d+(?:\.\d+)?$/.test(_.toString(coord)))) {
		return {
			lat: _.toNumber(coordinates[0]),
			lon: _.toNumber(coordinates[1]),
		};
	}
	return null;
}

export function parseStringList(value: string): string[] {
	return _.split(_.toString(value),/[\s,]+/);
}

const matchWildcard = (value: string, pattern: string): boolean => {
	const regex = new RegExp(`^${_.escapeRegExp(pattern).replace('\\*','.*')}$`);
	return regex.test(value);
};

const formatValue = (value: any, format: string): any => { //tslint:disable-line:no-any
	if (_.isString(value)) {
		// Sanitize value
		value = _.toString(value);

		// Parse geoPoints
		const geoPoint = parseGeoPoint(value);
		if(geoPoint) {
			return geoPoint;
		}

		// Check if it's a closed polygon geo-shape: -1.954117 30.085159 0 0;-1.955005 30.084622 0 0;-1.956057 30.08506 0 0;-1.956393 30.086229 0 0;-1.955853 30.087143 0 0;-1.954609 30.08725 0 0;-1.953966 30.086735 0 0;-1.953805 30.085897 0 0;-1.954117 30.085159 0 0
		const points = value.split(';');
		if (points.length >= 2 && _.every(points, point => /^-?\d+(?:\.\d+)?$/.test(_.toString(point))) && _.first(points) === _.last(points)) {
			// Convert to GeoJSON
			// Using the GeoJSON format as per https://www.elastic.co/guide/en/elasticsearch/reference/7.5/geo-shape.html#geo-polygon
			const parsedPoints = points.map(parseGeoPoint);
			return {
				type: 'polygon',
				coordinates: [parsedPoints],
			};
		}

		// Parse numbers
		if('number' === format) {
			return _.toNumber(value);
		}

		// Split multi-select
		if('multiSelect' === format) {
			return _.split(_.toString(value), ' ');
		}
	}

	return value;
};

export function formatSubmission(submission: IDataObject, selectMasks: string[] = [], numberMasks: string[] = []): IDataObject {
	// Create a shallow copy of the submission
	const response = {} as IDataObject;
	// console.log('formatSubmission');
	// console.dir(response);

	for (const key of Object.keys(submission)) {
		let value = _.clone(submission[key]);
		// console.log(`Formatting ${key} : ${value}`);
		// Sanitize key names: split by group, trim _
		const sanitizedKey = key.split('/').map(k => _.trim(k,' _')).join('.');
		const leafKey = sanitizedKey.split('.').pop() || '';
		let format = 'string';
		if(_.some(numberMasks, mask => matchWildcard(leafKey, mask))) {
			format = 'number';
		}
		if(_.some(selectMasks, mask => matchWildcard(leafKey, mask))) {
			format = 'multiSelect';
		}

		value = formatValue(value, format);

		// console.log(`Reformatting to ${sanitizedKey} : ${value}`);
		_.set(response, sanitizedKey, value);
	}

	// Reformat _geolocation
	if(_.isArray(response.geolocation) && response.geolocation.length === 2 && response.geolocation[0] && response.geolocation[1]) {
		response.geolocation = {
			lat: response.geolocation[1],
			lon: response.geolocation[0],
		};
	}

	// console.dir(response);
	return response;
}
