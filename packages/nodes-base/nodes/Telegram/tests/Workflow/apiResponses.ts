export const getChatResponse = {
	ok: true,
	result: {
		id: 123456789,
		first_name: 'Nathan',
		last_name: 'W',
		username: 'n8n',
		type: 'private',
		active_usernames: ['n8n'],
		bio: 'Automation',
		has_private_forwards: true,
		max_reaction_count: 11,
		accent_color_id: 3,
	},
};

export const sendMessageResponse = {
	ok: true,
	result: {
		message_id: 40,
		from: {
			id: 9876543210,
			is_bot: true,
			first_name: '@n8n',
			username: 'n8n_test_bot',
		},
		chat: {
			id: 123456789,
			first_name: 'Nathan',
			last_name: 'W',
			username: 'n8n',
			type: 'private',
		},
		date: 1732960606,
		text: 'a\n\nThis message was sent automatically with n8n',
		entities: [
			{
				offset: 3,
				length: 41,
				type: 'italic',
			},
			{
				offset: 44,
				length: 3,
				type: 'text_link',
				url: 'https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.telegram_8c8c5237b8e37b006a7adce87f4369350c58e41f3ca9de16196d3197f69eabcd',
			},
		],
		link_preview_options: {
			is_disabled: true,
		},
	},
};

export const sendMediaGroupResponse = {
	ok: true,
	result: [
		{
			message_id: 41,
			from: {
				id: 9876543210,
				is_bot: true,
				first_name: '@n8n',
				username: 'n8n_test_bot',
			},
			chat: {
				id: 123456789,
				first_name: 'Nathan',
				last_name: 'W',
				username: 'n8n',
				type: 'private',
			},
			date: 1732963445,
			photo: [
				{
					file_id:
						'AgACAgQAAxkDAAMpZ0rsde8lw0E3xttFxGpPdwkExZIAAv21MRvcM11S26tCdFbflv4BAAMCAANzAAM2BA',
					file_unique_id: 'AQAD_bUxG9wzXVJ4',
					file_size: 919,
					width: 90,
					height: 24,
				},
				{
					file_id:
						'AgACAgQAAxkDAAMpZ0rsde8lw0E3xttFxGpPdwkExZIAAv21MRvcM11S26tCdFbflv4BAAMCAANtAAM2BA',
					file_unique_id: 'AQAD_bUxG9wzXVJy',
					file_size: 6571,
					width: 320,
					height: 87,
				},
				{
					file_id:
						'AgACAgQAAxkDAAMpZ0rsde8lw0E3xttFxGpPdwkExZIAAv21MRvcM11S26tCdFbflv4BAAMCAAN4AAM2BA',
					file_unique_id: 'AQAD_bUxG9wzXVJ9',
					file_size: 9639,
					width: 458,
					height: 124,
				},
			],
		},
	],
};

export const sendLocationMessageResponse = {
	ok: true,
	result: {
		message_id: 42,
		from: {
			id: 9876543210,
			is_bot: true,
			first_name: '@n8n',
			username: 'n8n_test_bot',
		},
		chat: {
			id: 123456789,
			first_name: 'Nathan',
			last_name: 'W',
			username: 'n8n',
			type: 'private',
		},
		date: 1732963630,
		reply_to_message: {
			message_id: 40,
			from: {
				id: 9876543210,
				is_bot: true,
				first_name: '@n8n',
				username: 'n8n_test_bot',
			},
			chat: {
				id: 123456789,
				first_name: 'Nathan',
				last_name: 'W',
				username: 'n8n',
				type: 'private',
			},
			date: 1732960606,
			text: 'a\n\nThis message was sent automatically with n8n',
			entities: [
				{
					offset: 3,
					length: 41,
					type: 'italic',
				},
				{
					offset: 44,
					length: 3,
					type: 'text_link',
					url: 'https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.telegram_8c8c5237b8e37b006a7adce87f4369350c58e41f3ca9de16196d3197f69eabcd',
				},
			],
			link_preview_options: {
				is_disabled: true,
			},
		},
		location: {
			latitude: 0.00001,
			longitude: 0.000003,
		},
	},
};

export const okTrueResponse = {
	ok: true,
	result: true,
};

export const sendStickerResponse = {
	ok: true,
	result: {
		message_id: 44,
		from: {
			id: 9876543210,
			is_bot: true,
			first_name: '@n8n',
			username: 'n8n_test_bot',
		},
		chat: {
			id: 123456789,
			first_name: 'Nathan',
			last_name: 'W',
			username: 'n8n',
			type: 'private',
		},
		date: 1732965815,
		document: {
			file_name: '1_webp_ll.png',
			mime_type: 'image/png',
			thumbnail: {
				file_id: 'AAMCBAADGQMAAyxnSvW31uMAAWa2AAFl0vD1zqc_3xXeAAIbBwACJ95cUvzVqVKE_cXTAQAHbQADNgQ',
				file_unique_id: 'AQADGwcAAifeXFJy',
				file_size: 12534,
				width: 320,
				height: 241,
			},
			thumb: {
				file_id: 'AAMCBAADGQMAAyxnSvW31uMAAWa2AAFl0vD1zqc_3xXeAAIbBwACJ95cUvzVqVKE_cXTAQAHbQADNgQ',
				file_unique_id: 'AQADGwcAAifeXFJy',
				file_size: 12534,
				width: 320,
				height: 241,
			},
			file_id: 'BQACAgQAAxkDAAMsZ0r1t9bjAAFmtgABZdLw9c6nP98V3gACGwcAAifeXFL81alShP3F0zYE',
			file_unique_id: 'AgADGwcAAifeXFI',
			file_size: 122750,
		},
	},
};

export const editMessageTextResponse = {
	ok: true,
	result: {
		message_id: 40,
		from: {
			id: 9876543210,
			is_bot: true,
			first_name: '@n8n',
			username: 'n8n_test_bot',
		},
		chat: {
			id: 123456789,
			first_name: 'Nathan',
			last_name: 'W',
			username: 'n8n',
			type: 'private',
		},
		date: 1732960606,
		edit_date: 1732967008,
		text: 'test',
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: 'foo',
						callback_data: 'callback',
					},
					{
						text: 'n8n',
						url: 'https://n8n.io/',
					},
				],
			],
		},
	},
};

export const chatAdministratorsResponse = {
	ok: true,
	result: [
		{
			user: {
				id: 9876543210,
				is_bot: true,
				first_name: '@n8n',
				username: 'n8n_test_bot',
			},
			status: 'administrator',
			can_be_edited: false,
			can_manage_chat: true,
			can_change_info: true,
			can_post_messages: true,
			can_edit_messages: true,
			can_delete_messages: true,
			can_invite_users: true,
			can_restrict_members: true,
			can_promote_members: false,
			can_manage_video_chats: true,
			can_post_stories: true,
			can_edit_stories: true,
			can_delete_stories: true,
			is_anonymous: false,
			can_manage_voice_chats: true,
		},
		{
			user: {
				id: 123456789,
				is_bot: false,
				first_name: 'Nathan',
				last_name: 'W',
				username: 'n8n',
				language_code: 'en',
			},
			status: 'creator',
			is_anonymous: false,
		},
	],
};

export const sendAnimationMessageResponse = {
	ok: true,
	result: {
		message_id: 45,
		from: {
			id: 9876543210,
			is_bot: true,
			first_name: '@n8n',
			username: 'n8n_test_bot',
		},
		chat: {
			id: 123456789,
			first_name: 'Nathan',
			last_name: 'W',
			username: 'n8n',
			type: 'private',
		},
		date: 1732968868,
		animation: {
			file_name: 'Telegram---Opening-Image.gif.mp4',
			mime_type: 'video/mp4',
			duration: 6,
			width: 320,
			height: 320,
			thumbnail: {
				file_id: 'AAMCBAADGQMAAy1nSwGkq99SDYaaS1VR0EMAAUrOw1cAAiYEAALzCVxR7jIYS8d3HycBAAdtAAM2BA',
				file_unique_id: 'AQADJgQAAvMJXFFy',
				file_size: 36480,
				width: 320,
				height: 320,
			},
			thumb: {
				file_id: 'AAMCBAADGQMAAy1nSwGkq99SDYaaS1VR0EMAAUrOw1cAAiYEAALzCVxR7jIYS8d3HycBAAdtAAM2BA',
				file_unique_id: 'AQADJgQAAvMJXFFy',
				file_size: 36480,
				width: 320,
				height: 320,
			},
			file_id: 'CgACAgQAAxkDAAMtZ0sBpKvfUg2GmktVUdBDAAFKzsNXAAImBAAC8wlcUe4yGEvHdx8nNgQ',
			file_unique_id: 'AgADJgQAAvMJXFE',
			file_size: 309245,
		},
		document: {
			file_name: 'Telegram---Opening-Image.gif.mp4',
			mime_type: 'video/mp4',
			thumbnail: {
				file_id: 'AAMCBAADGQMAAy1nSwGkq99SDYaaS1VR0EMAAUrOw1cAAiYEAALzCVxR7jIYS8d3HycBAAdtAAM2BA',
				file_unique_id: 'AQADJgQAAvMJXFFy',
				file_size: 36480,
				width: 320,
				height: 320,
			},
			thumb: {
				file_id: 'AAMCBAADGQMAAy1nSwGkq99SDYaaS1VR0EMAAUrOw1cAAiYEAALzCVxR7jIYS8d3HycBAAdtAAM2BA',
				file_unique_id: 'AQADJgQAAvMJXFFy',
				file_size: 36480,
				width: 320,
				height: 320,
			},
			file_id: 'CgACAgQAAxkDAAMtZ0sBpKvfUg2GmktVUdBDAAFKzsNXAAImBAAC8wlcUe4yGEvHdx8nNgQ',
			file_unique_id: 'AgADJgQAAvMJXFE',
			file_size: 309245,
		},
		caption: 'Animation',
	},
};

export const sendAudioResponse = {
	ok: true,
	result: {
		message_id: 46,
		from: {
			id: 9876543210,
			is_bot: true,
			first_name: '@n8n',
			username: 'n8n_test_bot',
		},
		chat: {
			id: 123456789,
			first_name: 'Nathan',
			last_name: 'W',
			username: 'n8n',
			type: 'private',
		},
		date: 1732969291,
		audio: {
			duration: 3,
			file_name: 'sample-3s.mp3',
			mime_type: 'audio/mpeg',
			file_id: 'CQACAgQAAxkDAAMuZ0sDSxCh3hW89NQa-eTpxKioqGAAAjsEAAIBCU1SGtsPA4N9TSo2BA',
			file_unique_id: 'AgADOwQAAgEJTVI',
			file_size: 52079,
		},
	},
};

export const getMemberResponse = {
	ok: true,
	result: {
		user: {
			id: 123456789,
			is_bot: false,
			first_name: 'Nathan',
			last_name: 'W',
			username: 'n8n',
			language_code: 'en',
		},
		status: 'creator',
		is_anonymous: false,
	},
};

export const sendMessageWithBinaryDataAndReplyMarkupResponse = {
	ok: true,
	result: {
		message_id: 123,
		from: {
			id: 1234578901,
			is_bot: true,
			first_name: 'TestBot',
			username: 'TestBot',
		},
		chat: {
			id: 987654321,
			first_name: 'Some',
			last_name: 'Guy',
			username: 'SomeGuy',
			type: 'private',
		},
		date: 1750195377,
		document: {
			file_name: 'file.json',
			mime_type: 'application/json',
			file_id: 'BQACAgIAAxkDAANFaFHcsX7_6XEYxKTw3Y93hBKxdPEAAm1_AAJ3NpBKL3xbHXAyvIU2BA',
			file_unique_id: 'AgADbX8AAnc2kEo',
			file_size: 24,
		},
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: 'Test Button',
						callback_data: '123',
					},
				],
			],
		},
	},
};
