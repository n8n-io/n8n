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

function parseGeoPoint(geoPoint: string): null | number[] {
	// Check if it looks like a "lat lon z precision" flat string e.g. "-1.931161 30.079811 0 0" (lat, lon, elevation, precision)
	const coordinates = _.split(geoPoint, ' ');
	if (coordinates.length >= 2 && _.every(coordinates, coord => coord && /^-?\d+(?:\.\d+)?$/.test(_.toString(coord)))) {
		// NOTE: GeoJSON uses lon, lat, while most common systems use lat, lon order!
		return _.concat([
			_.toNumber(coordinates[1]),
			_.toNumber(coordinates[0]),
		], _.toNumber(coordinates[2]) ? _.toNumber(coordinates[2]) : []);
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
			return {
				type: 'Point',
				coordinates: geoPoint,
			};
		}

		// Check if it's a closed polygon geo-shape: -1.954117 30.085159 0 0;-1.955005 30.084622 0 0;-1.956057 30.08506 0 0;-1.956393 30.086229 0 0;-1.955853 30.087143 0 0;-1.954609 30.08725 0 0;-1.953966 30.086735 0 0;-1.953805 30.085897 0 0;-1.954117 30.085159 0 0
		const points = value.split(';');
		if (points.length >= 2 && /^[-\d\.\s;]+$/.test(value)) {
			// Using the GeoJSON format as per https://geojson.org/
			const coordinates = _.compact(points.map(parseGeoPoint));
			// Only return if all values are properly parsed
			if(coordinates.length === points.length) {
				return {
					type: _.first(points) === _.last(points) ? 'Polygon' : 'LineString',  // check if shape is closed or open
					coordinates,
				};
			}
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
			type: 'Point',
			coordinates: [response.geolocation[1], response.geolocation[0]],
		};
	}

	// console.dir(response);
	return response;
}
