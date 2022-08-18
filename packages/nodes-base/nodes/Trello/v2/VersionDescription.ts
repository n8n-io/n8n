/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	attachmentFields,
	attachmentOperations,
} from './AttachmentDescription';

import {
	boardFields,
	boardOperations,
} from './BoardDescription';

import {
	boardMemberFields,
	boardMemberOperations,
} from './BoardMemberDescription';

import {
	cardFields,
	cardOperations,
} from './CardDescription';

import {
	cardCommentFields,
	cardCommentOperations,
} from './CardCommentDescription';

import {
	checklistFields,
	checklistOperations,
} from './ChecklistDescription';

import {
	labelFields,
	labelOperations,
} from './LabelDescription';

import {
	listFields,
	listOperations,
} from './ListDescription';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Trello',
	name: 'trello',
	icon: 'file:trello.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Create, change and delete boards and cards',
	defaults: {
		name: 'Trello',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'trelloApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Attachment',
					value: 'attachment',
				},
				{
					name: 'Board',
					value: 'board',
				},
				{
					name: 'Board Member',
					value: 'boardMember',
				},
				{
					name: 'Card',
					value: 'card',
				},
				{
					name: 'Card Comment',
					value: 'cardComment',
				},
				{
					name: 'Checklist',
					value: 'checklist',
				},
				{
					name: 'Label',
					value: 'label',
				},
				{
					name: 'List',
					value: 'list',
				},
			],
			default: 'card',
		},

		// ----------------------------------
		//         operations
		// ----------------------------------
		...attachmentOperations,
		...boardOperations,
		...boardMemberOperations,
		...cardOperations,
		...cardCommentOperations,
		...checklistOperations,
		...labelOperations,
		...listOperations,

		// ----------------------------------
		//         fields
		// ----------------------------------
		...attachmentFields,
		...boardFields,
		...boardMemberFields,
		...cardFields,
		...cardCommentFields,
		...checklistFields,
		...labelFields,
		...listFields,

	],
};
