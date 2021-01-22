// import {
// 	INodeProperties,
// } from 'n8n-workflow';

// export const allRedditOperations = [
// 	{
// 		displayName: 'Operation',
// 		name: 'operation',
// 		type: 'options',
// 		default: 'get',
// 		description: 'Operation to perform',
// 		options: [
// 			{
// 				name: 'Get All',
// 				value: 'getAll',
// 			},
// 		],
// 		displayOptions: {
// 			show: {
// 				resource: [
// 					'allReddit',
// 				],
// 			},
// 		},
// 	},
// ] as INodeProperties[];

// export const allRedditFields = [
// 	{
// 		displayName: 'Information',
// 		name: 'information',
// 		type: 'options',
// 		required: true,
// 		default: 'trending',
// 		description: 'All-Reddit information to retrieve',
// 		options: [
// 			{
// 				name: 'Trending',
// 				value: 'trending',
// 				description: 'Currently trending subreddits',
// 			},
// 			{
// 				name: 'Best',
// 				value: 'best',
// 				description: 'Top posts in all of Reddit',
// 			},
// 		],
// 		displayOptions: {
// 			show: {
// 				resource: [
// 					'allReddit',
// 				],
// 				operation: [
// 					'getAll',
// 				],
// 			},
// 		},
// 	},
// 	{
// 		displayName: 'Return All',
// 		name: 'returnAll',
// 		type: 'boolean',
// 		default: false,
// 		description: 'Return all results',
// 		displayOptions: {
// 			show: {
// 				resource: [
// 					'allReddit',
// 				],
// 				operation: [
// 					'getAll',
// 				],
// 				information: [
// 					'best',
// 				],
// 			},
// 		},
// 	},
// 	{
// 		displayName: 'Limit',
// 		name: 'limit',
// 		type: 'number',
// 		default: 5,
// 		description: 'The number of results to return',
// 		typeOptions: {
// 			minValue: 1,
// 			maxValue: 100,
// 		},
// 		displayOptions: {
// 			show: {
// 				resource: [
// 					'allReddit',
// 				],
// 				operation: [
// 					'getAll',
// 				],
// 				information: [
// 					'best',
// 				],
// 				returnAll: [
// 					false,
// 				],
// 			},
// 		},
// 	},
// ] as INodeProperties[];
