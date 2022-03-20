import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodePropertyOptions,
	IWebhookFunctions,
} from 'n8n-workflow';

import * as _ from 'lodash';

export async function koBoToolboxApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('koBoToolboxApi') as IDataObject;

	// Set up pagination / scrolling
	const returnAll = !!option.returnAll;
	if (returnAll) {
		// Override manual pagination options
		_.set(option, 'qs.limit', 3000);
		// Don't pass this custom param to helpers.httpRequest
		delete option.returnAll;
	}

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

	let results = null;
	let keepLooking = true;
	while (keepLooking) {
		const response = await this.helpers.httpRequest(options);
		// Append or set results
		results = response.results ? _.concat(results || [], response.results) : response;
		if (returnAll && response.next) {
			options.url = response.next;
			continue;
		}
		else {
			keepLooking = false;
		}
	}

	return results;
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
	return _.split(_.toString(value), /[\s,]+/);
}

const matchWildcard = (value: string, pattern: string): boolean => {
	const regex = new RegExp(`^${_.escapeRegExp(pattern).replace('\\*', '.*')}$`);
	return regex.test(value);
};

const formatValue = (value: any, format: string): any => { //tslint:disable-line:no-any
	if (_.isString(value)) {
		// Sanitize value
		value = _.toString(value);

		// Parse geoPoints
		const geoPoint = parseGeoPoint(value);
		if (geoPoint) {
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
			if (coordinates.length === points.length) {
				return {
					type: _.first(points) === _.last(points) ? 'Polygon' : 'LineString',  // check if shape is closed or open
					coordinates,
				};
			}
		}

		// Parse numbers
		if ('number' === format) {
			return _.toNumber(value);
		}

		// Split multi-select
		if ('multiSelect' === format) {
			return _.split(_.toString(value), ' ');
		}
	}

	return value;
};

export function formatSubmission(submission: IDataObject, selectMasks: string[] = [], numberMasks: string[] = []): IDataObject {
	// Create a shallow copy of the submission
	const response = {} as IDataObject;

	for (const key of Object.keys(submission)) {
		let value = _.clone(submission[key]);
		// Sanitize key names: split by group, trim _
		const sanitizedKey = key.split('/').map(k => _.trim(k, ' _')).join('.');
		const leafKey = sanitizedKey.split('.').pop() || '';
		let format = 'string';
		if (_.some(numberMasks, mask => matchWildcard(leafKey, mask))) {
			format = 'number';
		}
		if (_.some(selectMasks, mask => matchWildcard(leafKey, mask))) {
			format = 'multiSelect';
		}

		value = formatValue(value, format);

		_.set(response, sanitizedKey, value);
	}

	// Reformat _geolocation
	if (_.isArray(response.geolocation) && response.geolocation.length === 2 && response.geolocation[0] && response.geolocation[1]) {
		response.geolocation = {
			type: 'Point',
			coordinates: [response.geolocation[1], response.geolocation[0]],
		};
	}

	return response;
}

export async function downloadAttachments(this: IExecuteFunctions | IWebhookFunctions, submission: IDataObject, options: IDataObject): Promise<INodeExecutionData> {
	// Initialize return object with the original submission JSON content
	const binaryItem: INodeExecutionData = {
		json: {
			...submission,
		},
		binary: {},
	};

	const credentials = await this.getCredentials('koBoToolboxApi') as IDataObject;

	// Look for attachment links - there can be more than one
	const attachmentList = (submission['_attachments'] || submission['attachments']) as any[];  // tslint:disable-line:no-any
	if (attachmentList && attachmentList.length) {
		for (const [index, attachment] of attachmentList.entries()) {
			// look for the question name linked to this attachment
			const filename = attachment.filename;
			Object.keys(submission).forEach(question => {
				if (filename.endsWith('/' + _.toString(submission[question]).replace(/\s/g, '_'))) {
				}
			});

			// Download attachment
			// NOTE: this needs to follow redirects (possibly across domains), while keeping Authorization headers
			// The Axios client will not propagate the Authorization header on redirects (see https://github.com/axios/axios/issues/3607), so we need to follow ourselves...
			let response = null;
			const attachmentUrl = attachment[options.version as string] || attachment.download_url as string;
			let final = false, redir = 0;

			const axiosOptions: IHttpRequestOptions = {
				url: attachmentUrl,
				method: 'GET',
				headers: {
					'Authorization': `Token ${credentials.token}`,
				},
				ignoreHttpStatusErrors: true,
				returnFullResponse: true,
				disableFollowRedirect: true,
				encoding: 'arraybuffer',
			};

			while (!final && redir < 5) {
				response = await this.helpers.httpRequest(axiosOptions);

				if (response && response.headers.location) {
					// Follow redirect
					axiosOptions.url = response.headers.location;
					redir++;
				} else {
					final = true;
				}
			}

			const dataPropertyAttachmentsPrefixName = options.dataPropertyAttachmentsPrefixName || 'attachment_';
			const fileName = filename.split('/').pop();

			if (response && response.body) {
				binaryItem.binary![`${dataPropertyAttachmentsPrefixName}${index}`] = await this.helpers.prepareBinaryData(response.body, fileName);
			}
		}
	} else {
		delete binaryItem.binary;
	}

	// Add item to final output - even if there's no attachment retrieved
	return binaryItem;
}

export async function loadForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const responseData = await koBoToolboxApiRequest.call(this, {
		url: '/api/v2/assets/',
		qs: {
			q: 'asset_type:survey',
			ordering: 'name',
		},
		scroll: true,
	});

	return responseData?.map((survey: any) => ({ name: survey.name, value: survey.uid })) || [];  // tslint:disable-line:no-any
}
