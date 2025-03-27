export const postGetMany = [
	{
		id: 1,
		date: '2025-03-27T18:05:01',
		date_gmt: '2025-03-27T18:05:01',
		guid: {
			rendered: 'https://myblog.com/?p=1',
		},
		modified: '2025-03-27T18:22:36',
		modified_gmt: '2025-03-27T18:22:36',
		slug: 'hello-world',
		status: 'publish',
		type: 'post',
		link: 'https://myblog.com/2025/03/27/hello-world/',
		title: {
			rendered: 'Hello world!',
		},
		content: {
			rendered:
				'\n<p>Welcome to WordPress. This is your first post. Edit or delete it, then start writing!</p>\n',
			protected: false,
		},
		excerpt: {
			rendered:
				'<p>Welcome to WordPress. This is your first post. Edit or delete it, then start writing!</p>\n',
			protected: false,
		},
		author: 1,
		featured_media: 0,
		comment_status: 'open',
		ping_status: 'open',
		sticky: false,
		template: '',
		format: 'standard',
		meta: {
			footnotes: '',
		},
		categories: [1],
		tags: [],
		class_list: [
			'post-1',
			'post',
			'type-post',
			'status-publish',
			'format-standard',
			'hentry',
			'category-uncategorised',
		],
		_links: {
			self: [
				{
					href: 'https://myblog.com/wp-json/wp/v2/posts/1',
					targetHints: {
						allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
					},
				},
			],
			collection: [
				{
					href: 'https://myblog.com/wp-json/wp/v2/posts',
				},
			],
			about: [
				{
					href: 'https://myblog.com/wp-json/wp/v2/types/post',
				},
			],
			author: [
				{
					embeddable: true,
					href: 'https://myblog.com/wp-json/wp/v2/users/1',
				},
			],
			replies: [
				{
					embeddable: true,
					href: 'https://myblog.com/wp-json/wp/v2/comments?post=1',
				},
			],
			'version-history': [
				{
					count: 1,
					href: 'https://myblog.com/wp-json/wp/v2/posts/1/revisions',
				},
			],
			'predecessor-version': [
				{
					id: 6,
					href: 'https://myblog.com/wp-json/wp/v2/posts/1/revisions/6',
				},
			],
			'wp:attachment': [
				{
					href: 'https://myblog.com/wp-json/wp/v2/media?parent=1',
				},
			],
			'wp:term': [
				{
					taxonomy: 'category',
					embeddable: true,
					href: 'https://myblog.com/wp-json/wp/v2/categories?post=1',
				},
				{
					taxonomy: 'post_tag',
					embeddable: true,
					href: 'https://myblog.com/wp-json/wp/v2/tags?post=1',
				},
			],
			curies: [
				{
					name: 'wp',
					href: 'https://api.w.org/{rel}',
					templated: true,
				},
			],
		},
	},
];

export const postGet = {
	id: 1,
	date: '2025-03-27T18:05:01',
	date_gmt: '2025-03-27T18:05:01',
	guid: {
		rendered: 'https://myblog.com/?p=1',
	},
	modified: '2025-03-27T18:22:36',
	modified_gmt: '2025-03-27T18:22:36',
	slug: 'hello-world',
	status: 'publish',
	type: 'post',
	link: 'https://myblog.com/2025/03/27/hello-world/',
	title: {
		rendered: 'New Title',
	},
	content: {
		rendered: '<p>Some new content</p>\n',
		protected: false,
	},
	excerpt: {
		rendered: '<p>Some new content</p>\n',
		protected: false,
	},
	author: 1,
	featured_media: 0,
	comment_status: 'open',
	ping_status: 'open',
	sticky: false,
	template: '',
	format: 'standard',
	meta: {
		footnotes: '',
	},
	categories: [1],
	tags: [],
	class_list: [
		'post-1',
		'post',
		'type-post',
		'status-publish',
		'format-standard',
		'hentry',
		'category-uncategorised',
	],
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts',
			},
		],
		about: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/types/post',
			},
		],
		author: [
			{
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/users/1',
			},
		],
		replies: [
			{
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/comments?post=1',
			},
		],
		'version-history': [
			{
				count: 1,
				href: 'https://myblog.com/wp-json/wp/v2/posts/1/revisions',
			},
		],
		'predecessor-version': [
			{
				id: 6,
				href: 'https://myblog.com/wp-json/wp/v2/posts/1/revisions/6',
			},
		],
		'wp:attachment': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/media?parent=1',
			},
		],
		'wp:term': [
			{
				taxonomy: 'category',
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/categories?post=1',
			},
			{
				taxonomy: 'post_tag',
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/tags?post=1',
			},
		],
		curies: [
			{
				name: 'wp',
				href: 'https://api.w.org/{rel}',
				templated: true,
			},
		],
	},
};

export const postUpdate = {
	id: 1,
	date: '2025-03-27T18:05:01',
	date_gmt: '2025-03-27T18:05:01',
	guid: {
		rendered: 'https://myblog.com/?p=1',
		raw: 'https://myblog.com/?p=1',
	},
	modified: '2025-03-27T18:22:36',
	modified_gmt: '2025-03-27T18:22:36',
	password: '',
	slug: 'hello-world',
	status: 'publish',
	type: 'post',
	link: 'https://myblog.com/2025/03/27/hello-world/',
	title: {
		raw: 'New Title',
		rendered: 'New Title',
	},
	content: {
		raw: 'Some new content',
		rendered: '<p>Some new content</p>\n',
		protected: false,
		block_version: 0,
	},
	excerpt: {
		raw: '',
		rendered: '<p>Some new content</p>\n',
		protected: false,
	},
	author: 1,
	featured_media: 0,
	comment_status: 'open',
	ping_status: 'open',
	sticky: false,
	template: '',
	format: 'standard',
	meta: {
		footnotes: '',
	},
	categories: [1],
	tags: [],
	permalink_template: 'https://myblog.com/2025/03/27/%postname%/',
	generated_slug: 'new-title',
	class_list: [
		'post-1',
		'post',
		'type-post',
		'status-publish',
		'format-standard',
		'hentry',
		'category-uncategorised',
	],
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts',
			},
		],
		about: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/types/post',
			},
		],
		author: [
			{
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/users/1',
			},
		],
		replies: [
			{
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/comments?post=1',
			},
		],
		'version-history': [
			{
				count: 1,
				href: 'https://myblog.com/wp-json/wp/v2/posts/1/revisions',
			},
		],
		'predecessor-version': [
			{
				id: 6,
				href: 'https://myblog.com/wp-json/wp/v2/posts/1/revisions/6',
			},
		],
		'wp:attachment': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/media?parent=1',
			},
		],
		'wp:term': [
			{
				taxonomy: 'category',
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/categories?post=1',
			},
			{
				taxonomy: 'post_tag',
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/tags?post=1',
			},
		],
		'wp:action-publish': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
			},
		],
		'wp:action-unfiltered-html': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
			},
		],
		'wp:action-sticky': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
			},
		],
		'wp:action-assign-author': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
			},
		],
		'wp:action-create-categories': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
			},
		],
		'wp:action-assign-categories': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
			},
		],
		'wp:action-create-tags': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
			},
		],
		'wp:action-assign-tags': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/1',
			},
		],
		curies: [
			{
				name: 'wp',
				href: 'https://api.w.org/{rel}',
				templated: true,
			},
		],
	},
};

export const postCreate = {
	id: 7,
	date: '2025-03-27T18:30:04',
	date_gmt: '2025-03-27T18:30:04',
	guid: {
		rendered: 'https://myblog.com/2025/03/27/new-post/',
		raw: 'https://myblog.com/2025/03/27/new-post/',
	},
	modified: '2025-03-27T18:30:04',
	modified_gmt: '2025-03-27T18:30:04',
	password: '',
	slug: 'new-post',
	status: 'publish',
	type: 'post',
	link: 'https://myblog.com/2025/03/27/new-post/',
	title: {
		raw: 'New Post',
		rendered: 'New Post',
	},
	content: {
		raw: 'This is my content',
		rendered: '<p>This is my content</p>\n',
		protected: false,
		block_version: 0,
	},
	excerpt: {
		raw: '',
		rendered: '<p>This is my content</p>\n',
		protected: false,
	},
	author: 1,
	featured_media: 0,
	comment_status: 'closed',
	ping_status: 'closed',
	sticky: true,
	template: '',
	format: 'standard',
	meta: {
		footnotes: '',
	},
	categories: [1],
	tags: [],
	permalink_template: 'https://myblog.com/2025/03/27/%postname%/',
	generated_slug: 'new-post',
	class_list: [
		'post-7',
		'post',
		'type-post',
		'status-publish',
		'format-standard',
		'hentry',
		'category-uncategorised',
	],
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts',
			},
		],
		about: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/types/post',
			},
		],
		author: [
			{
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/users/1',
			},
		],
		replies: [
			{
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/comments?post=7',
			},
		],
		'version-history': [
			{
				count: 0,
				href: 'https://myblog.com/wp-json/wp/v2/posts/7/revisions',
			},
		],
		'wp:attachment': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/media?parent=7',
			},
		],
		'wp:term': [
			{
				taxonomy: 'category',
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/categories?post=7',
			},
			{
				taxonomy: 'post_tag',
				embeddable: true,
				href: 'https://myblog.com/wp-json/wp/v2/tags?post=7',
			},
		],
		'wp:action-publish': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
			},
		],
		'wp:action-unfiltered-html': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
			},
		],
		'wp:action-sticky': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
			},
		],
		'wp:action-assign-author': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
			},
		],
		'wp:action-create-categories': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
			},
		],
		'wp:action-assign-categories': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
			},
		],
		'wp:action-create-tags': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
			},
		],
		'wp:action-assign-tags': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/posts/7',
			},
		],
		curies: [
			{
				name: 'wp',
				href: 'https://api.w.org/{rel}',
				templated: true,
			},
		],
	},
};
