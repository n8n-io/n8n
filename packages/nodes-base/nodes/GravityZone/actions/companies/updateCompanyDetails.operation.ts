import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-126238-updatecompanydetails.html" target="_blank" rel="noopener noreferrer">Update Company Details</a>',
		name: 'updateCompanyDetailsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'The address of the company',
			},
			{
				displayName: 'Contact Person (JSON)',
				name: 'contactPersonJson',
				type: 'json',
				default: '{}',
				description: 'A contact person object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description:
					"The country of operation of the company. The value must be in ISO 3166 format (e.g. 'RO').",
			},
			{
				displayName: 'Enforce 2FA',
				name: 'enforce2FA',
				type: 'boolean',
				default: true,
				description:
					'Whether Two Factor Authentication (2FA) is enforced for all GravityZone user accounts in the company',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'options',
				default: 0,
				description: 'The industry the company operates in',
				options: [
					{ name: 'UNDEFINED', value: 0 },
					{ name: 'AEROSPACE', value: 1 },
					{ name: 'AEROSPACE_MANUFACTURING', value: 101 },
					{ name: 'AEROSPACE_TECHNOLOGY_RESEARCH', value: 102 },
					{ name: 'AGRICULTURE', value: 2 },
					{ name: 'AGRICULTURE_CHEMICALS_FERTILIZERS', value: 201 },
					{ name: 'AGRICULTURE_CROP_AND_ANIMAL_PRODUCTION', value: 202 },
					{ name: 'AGRICULTURE_FARM_MACHINERY', value: 203 },
					{ name: 'AGRICULTURE_FARMING', value: 204 },
					{ name: 'AGRICULTURE_FISHING', value: 205 },
					{ name: 'AGRICULTURE_FORESTRY', value: 206 },
					{ name: 'AGRICULTURE_HUNTING', value: 207 },
					{ name: 'AGRICULTURE_PRODUCTS', value: 208 },
					{ name: 'ARTS_ENTERTAINMENT', value: 3 },
					{ name: 'ARTS_ENTERTAINMENT_CULTURAL_ACTIVITIES', value: 301 },
					{ name: 'ARTS_ENTERTAINMENT_GAMBLING', value: 302 },
					{ name: 'AUTOMOTIVE', value: 4 },
					{ name: 'AUTOMOTIVE_AUTO_TRUCK_MOTORCYCLE_PARTS', value: 401 },
					{ name: 'AUTOMOTIVE_MACHINERY', value: 402 },
					{ name: 'AUTOMOTIVE_MANUFACTURERS', value: 403 },
					{ name: 'AUTOMOTIVE_MARKETING', value: 404 },
					{ name: 'BUSINESS_ASSOCIATIONS', value: 5 },
					{ name: 'CHEMICALS', value: 6 },
					{ name: 'COMMERCIAL_SERVICES', value: 7 },
					{ name: 'COMMERCIAL_SERVICES_VETERINARY', value: 701 },
					{ name: 'CONGLOMERATE', value: 8 },
					{ name: 'CONSTRUCTION', value: 9 },
					{ name: 'CONSTRUCTION_CIVIL_ENGINEERING', value: 901 },
					{ name: 'CONSTRUCTION_CONSTRUCTION_OF_BUILDINGS', value: 902 },
					{ name: 'CONSTRUCTION_CONTRACTORS', value: 903 },
					{ name: 'CONSTRUCTION_ENGINEERING', value: 904 },
					{ name: 'CONSTRUCTION_MATERIALS', value: 905 },
					{ name: 'CONSTRUCTION_SPECIALISED', value: 906 },
					{ name: 'CONSTRUCTION_UTILITY_SYSTEMS', value: 907 },
					{ name: 'CONSULTING', value: 10 },
					{ name: 'CONTAINERS_PACKAGING', value: 11 },
					{ name: 'DEFENSE', value: 12 },
					{ name: 'DEFENSE_SHIPBUILDING_AIRCRAFT', value: 1201 },
					{ name: 'DEFENSE_SPACE', value: 1202 },
					{ name: 'EDUCATION_RESEARCH', value: 13 },
					{ name: 'EDUCATION_RESEARCH_SCIENTIFIC_RESEARCH_AND_DEVELOPMENT', value: 1301 },
					{ name: 'ENERGY', value: 14 },
					{ name: 'ENERGY_EQUIPMENT_TECHNOLOGIES', value: 1401 },
					{ name: 'ENERGY_INFRASTRUCTURE', value: 1402 },
					{ name: 'ENERGY_OIL_GAS_CONSUMABLE_FUELS', value: 1403 },
					{ name: 'ENERGY_RENEWABLE_ENERGY', value: 1404 },
					{ name: 'ENGINEERING', value: 15 },
					{ name: 'FINANCIAL_SERVICES', value: 16 },
					{ name: 'FINANCIAL_SERVICES_BANKS', value: 1601 },
					{ name: 'FINANCIAL_SERVICES_DIVERSIFIED', value: 1602 },
					{ name: 'FINANCIAL_SERVICES_INSURANCE', value: 1603 },
					{ name: 'FINANCIAL_SERVICES_INVESTMENT', value: 1604 },
					{ name: 'FINANCIAL_SERVICES_REAL_ESTATE', value: 1605 },
					{ name: 'FOOD_BEVERAGES', value: 17 },
					{ name: 'GOVERNMENT', value: 18 },
					{ name: 'GOVERNMENT_LOCAL', value: 1801 },
					{ name: 'GOVERNMENT_NATIONAL', value: 1802 },
					{ name: 'GOVERNMENT_PRIVATE_CONTRACTORS', value: 1803 },
					{ name: 'GOVERNMENT_PUBLIC_ADMINISTRATION_AND_DEFENSE', value: 1804 },
					{ name: 'GOVERNMENT_PUBLIC_SERVICES', value: 1805 },
					{ name: 'GOVERNMENT_REGIONAL', value: 1806 },
					{ name: 'HEALTHCARE', value: 19 },
					{ name: 'HEALTHCARE_EQUIPMENT_SERVICES', value: 1901 },
					{
						name: 'HEALTHCARE_PHARMACEUTICALS_BIOTECHNOLOGY_LIFE_SCIENCES',
						value: 1902,
					},
					{ name: 'HEALTHCARE_RESEARCH', value: 1903 },
					{ name: 'HOSPITALITY_LEISURE', value: 20 },
					{ name: 'HOSPITALITY_LEISURE_HOTEL_MOTELS_CRUISE_LINES', value: 2001 },
					{ name: 'HOSPITALITY_LEISURE_LEISURE_RECREATION', value: 2002 },
					{ name: 'HOSPITALITY_LEISURE_RESTAURANT_BARS', value: 2003 },
					{ name: 'MANUFACTURING', value: 21 },
					{ name: 'MANUFACTURING_BASIC_METALS', value: 2101 },
					{ name: 'MANUFACTURING_BEVERAGES', value: 2102 },
					{ name: 'MANUFACTURING_CHEMICALS_PRODUCTS', value: 2103 },
					{ name: 'MANUFACTURING_ELECTRICAL_EQUIPMENT', value: 2104 },
					{ name: 'MANUFACTURING_ELECTRONICS', value: 2105 },
					{ name: 'MANUFACTURING_FABRICATED_METAL_PRODUCTS', value: 2106 },
					{ name: 'MANUFACTURING_FOOD_PRODUCTS', value: 2107 },
					{ name: 'MANUFACTURING_FURNITURE', value: 2108 },
					{ name: 'MANUFACTURING_MACHINERY_EQUIPMENT', value: 2109 },
					{ name: 'MANUFACTURING_MOTOR_VEHICLES', value: 2110 },
					{ name: 'MANUFACTURING_NON_METALLIC_MINERAL_PRODUCTS', value: 2111 },
					{ name: 'MANUFACTURING_PAPER_PRODUCTS', value: 2112 },
					{ name: 'MANUFACTURING_PETROLEUM_PRODUCTS', value: 2113 },
					{ name: 'MANUFACTURING_PHARMACEUTICAL_PRODUCTS', value: 2114 },
					{ name: 'MANUFACTURING_TEXTILES', value: 2115 },
					{ name: 'MANUFACTURING_TOBACCO', value: 2116 },
					{ name: 'MANUFACTURING_TRANSPORT', value: 2117 },
					{ name: 'MANUFACTURING_WEARING_APPAREL', value: 2118 },
					{ name: 'MANUFACTURING_WOOD', value: 2119 },
					{ name: 'MARINE', value: 22 },
					{ name: 'MEDIA', value: 23 },
					{ name: 'MEDIA_ADVERTISING_MARKETING', value: 2301 },
					{ name: 'MEDIA_BROADCASTING', value: 2302 },
					{ name: 'MEDIA_ENTERTAINMENT', value: 2303 },
					{ name: 'MEDIA_PUBLISHING', value: 2304 },
					{ name: 'MINING', value: 24 },
					{ name: 'MINING_COAL_AND_LIGNITE', value: 2401 },
					{ name: 'MINING_METAL_ORES', value: 2402 },
					{ name: 'MINING_PETROLEUM_AND_NATURAL_GAS', value: 2403 },
					{ name: 'MINING_PRECIOUS_METALS', value: 2404 },
					{ name: 'MINING_QUARRYING', value: 2405 },
					{ name: 'MINING_SERVICES', value: 2406 },
					{ name: 'NON_PROFIT', value: 25 },
					{ name: 'OFFICES_OF_LAWYERS', value: 26 },
					{ name: 'PAPER_FOREST_PRODUCTS', value: 27 },
					{ name: 'RETAIL', value: 28 },
					{ name: 'RETAIL_BEVERAGES', value: 2801 },
					{ name: 'RETAIL_BOOKS_AND_NEWS', value: 2802 },
					{ name: 'RETAIL_BUILDING_MATERIALS', value: 2803 },
					{ name: 'RETAIL_CLOTHING_STORES', value: 2804 },
					{ name: 'RETAIL_DISTRIBUTORS', value: 2805 },
					{ name: 'RETAIL_ELECTRONIC_SHOPPING', value: 2806 },
					{ name: 'RETAIL_ELECTRONICS', value: 2807 },
					{ name: 'RETAIL_GASOLINE_STATIONS', value: 2808 },
					{ name: 'RETAIL_HOME_FURNISHING', value: 2809 },
					{ name: 'RETAIL_LUXURY_STORES', value: 2810 },
					{ name: 'RETAIL_MULTILINE_RETAIL', value: 2811 },
					{ name: 'RETAIL_PERSONAL_CARE_STORES', value: 2812 },
					{ name: 'RETAIL_SUPERMARKETS', value: 2814 },
					{ name: 'RETAIL_SUPPLIES_STORES', value: 2815 },
					{ name: 'RETAIL_VEHICLES', value: 2816 },
					{ name: 'SUPPORT_SERVICE_ACTIVITIES', value: 29 },
					{ name: 'SUPPORT_SERVICE_ACTIVITIES_BUSINESS_SUPPORT', value: 2901 },
					{ name: 'SUPPORT_SERVICE_ACTIVITIES_EMPLOYMENT', value: 2902 },
					{ name: 'SUPPORT_SERVICE_ACTIVITIES_MAINTENANCE_SERVICES', value: 2903 },
					{ name: 'SUPPORT_SERVICE_ACTIVITIES_RENTAL_AND_LEASING', value: 2904 },
					{
						name: 'SUPPORT_SERVICE_ACTIVITIES_SECURITY_AND_INVESTIGATION',
						value: 2905,
					},
					{ name: 'SUPPORT_SERVICE_ACTIVITIES_SOCIAL_ASSISTANCE', value: 2906 },
					{ name: 'SUPPORT_SERVICE_ACTIVITIES_TRAVEL_AGENCY', value: 2907 },
					{ name: 'TECHNOLOGY', value: 30 },
					{ name: 'TECHNOLOGY_ARTIFICIAL_INTELLIGENCE', value: 3001 },
					{ name: 'TECHNOLOGY_ELECTRONIC_EQUIPMENT_COMPONENTS', value: 3002 },
					{ name: 'TECHNOLOGY_HARDWARE', value: 3003 },
					{ name: 'TECHNOLOGY_IT_SERVICES', value: 3004 },
					{ name: 'TECHNOLOGY_SECURITY', value: 3005 },
					{
						name: 'TECHNOLOGY_SEMICONDUCTORS_SEMICONDUCTOR_EQUIPMENT',
						value: 3006,
					},
					{ name: 'TECHNOLOGY_SOFTWARE', value: 3007 },
					{ name: 'TELECOMMUNICATIONS_SERVICES', value: 31 },
					{
						name: 'TELECOMMUNICATIONS_SERVICES_COMMUNICATIONS_INFRASTRUCTURE',
						value: 3101,
					},
					{
						name: 'TELECOMMUNICATIONS_SERVICES_INTEGRATED_TELECOMMUNICATIONS',
						value: 3102,
					},
					{
						name: 'TELECOMMUNICATIONS_SERVICES_WIRELESS_TELECOMMUNICATIONS',
						value: 3103,
					},
					{ name: 'TRANSPORTATION', value: 32 },
					{ name: 'TRANSPORTATION_AIR_TRANSPORTATION', value: 3201 },
					{
						name: 'TRANSPORTATION_DEEP_SEA_COASTAL_AND_GREAT_LAKES_WATER_TRANSPORTATION',
						value: 3202,
					},
					{ name: 'TRANSPORTATION_GENERAL_FREIGHT_TRUCKING', value: 3203 },
					{ name: 'TRANSPORTATION_INFRASTRUCTURE', value: 3204 },
					{ name: 'TRANSPORTATION_INLAND_WATER_TRANSPORTATION', value: 3205 },
					{ name: 'TRANSPORTATION_PIPELINE_TRANSPORTATION', value: 3206 },
					{ name: 'TRANSPORTATION_POSTAL_AND_COURIER', value: 3207 },
					{ name: 'TRANSPORTATION_RAIL_TRANSPORTATION', value: 3208 },
					{ name: 'TRANSPORTATION_ROAD_TRANSPORTATION', value: 3209 },
					{ name: 'TRANSPORTATION_SIGHTSEEING', value: 3210 },
					{ name: 'TRANSPORTATION_URBAN_TRANSIT_SYSTEMS', value: 3211 },
					{ name: 'TRANSPORTATION_WATER_TRANSPORTATION', value: 3212 },
					{ name: 'UTILITIES', value: 33 },
					{ name: 'UTILITIES_ELECTRICITY_GAS', value: 3301 },
					{ name: 'UTILITIES_WATER_SUPPLY', value: 3302 },
					{ name: 'WHOLESALE', value: 34 },
					{ name: 'WHOLESALE_APPAREL', value: 3401 },
					{ name: 'WHOLESALE_BEVERAGES', value: 3402 },
					{ name: 'WHOLESALE_BUILDING_MATERIALS', value: 3403 },
					{ name: 'WHOLESALE_CHEMICALS', value: 3404 },
					{ name: 'WHOLESALE_DRUGS', value: 3405 },
					{ name: 'WHOLESALE_ELECTRONIC_MARKETS', value: 3406 },
					{ name: 'WHOLESALE_ELECTRONICS', value: 3407 },
					{ name: 'WHOLESALE_FARM_PRODUCTS', value: 3408 },
					{ name: 'WHOLESALE_GROCERY', value: 3409 },
					{ name: 'WHOLESALE_HOME_FURNISHING', value: 3410 },
					{ name: 'WHOLESALE_METAL_AND_MINERAL', value: 3411 },
					{ name: 'WHOLESALE_NONDURABLE_GOODS', value: 3412 },
					{ name: 'WHOLESALE_PETROLEUM', value: 3413 },
					{ name: 'WHOLESALE_SUPPLIES', value: 3414 },
					{ name: 'WHOLESALE_VEHICLES', value: 3415 },
				],
			},
			{
				displayName: 'MDR Contact Information (JSON)',
				name: 'mdrContactInformationJson',
				type: 'json',
				default: '{}',
				description: 'An MDR contact information object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The unique name of the company',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the company',
			},
			{
				displayName: 'Skip 2FA Period',
				name: 'skip2FAPeriod',
				type: 'options',
				default: 0,
				description:
					'The period in days for which users can have their devices exempted from providing a two-factor code at authentication',
				options: [
					{ name: '0 Days', value: 0 },
					{ name: '1 Day', value: 1 },
					{ name: '3 Days', value: 3 },
					{ name: '7 Days', value: 7 },
					{ name: '14 Days', value: 14 },
					{ name: '30 Days', value: 30 },
					{ name: '90 Days', value: 90 },
				],
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description:
					'The country state of operation of the company. The value must be in ISO 3166 format (e.g. "NY").',
			},
		],
	},
];

const displayOptions = { show: { category: ['companies'], action: ['updateCompanyDetails'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.name !== undefined) params.name = options.name;
	if (options.address !== undefined) params.address = options.address;
	if (options.phone !== undefined) params.phone = options.phone;
	if (options.industry !== undefined) params.industry = options.industry;
	if (options.country !== undefined) params.country = options.country;
	if (options.state !== undefined) params.state = options.state;
	if (options.enforce2FA !== undefined) params.enforce2FA = options.enforce2FA;
	if (options.skip2FAPeriod !== undefined) params.skip2FAPeriod = options.skip2FAPeriod;
	if (options.contactPersonJson !== undefined) {
		const contactPerson = processJsonInput(
			options.contactPersonJson,
			'Contact Person',
		) as IDataObject;
		if (Object.keys(contactPerson).length > 0) params.contactPerson = contactPerson;
	}
	if (options.mdrContactInformationJson !== undefined) {
		const mdrContactInformation = processJsonInput(
			options.mdrContactInformationJson,
			'MDR Contact Information',
		) as IDataObject;
		if (Object.keys(mdrContactInformation).length > 0)
			params.mdrContactInformation = mdrContactInformation;
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'companies',
		'updateCompanyDetails',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
