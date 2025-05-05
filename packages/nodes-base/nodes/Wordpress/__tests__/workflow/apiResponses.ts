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

export const userCreate = {
	id: 2,
	username: 'new-user',
	name: 'nathan tester',
	first_name: 'Nathan',
	last_name: 'Tester',
	email: 'nathan@domain.com',
	url: '',
	description: '',
	link: 'https://myblog.com/author/new-user/',
	locale: 'en_GB',
	nickname: 'new-user',
	slug: 'new-user',
	roles: ['subscriber'],
	registered_date: '2025-03-27T19:49:07+00:00',
	capabilities: {
		read: true,
		level_0: true,
		subscriber: true,
	},
	extra_capabilities: {
		subscriber: true,
	},
	avatar_urls: {
		'24': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=24&d=mm&r=g',
		'48': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=48&d=mm&r=g',
		'96': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=96&d=mm&r=g',
	},
	meta: {
		persisted_preferences: [],
	},
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/users/2',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/users',
			},
		],
	},
};

export const userGet = {
	id: 2,
	name: 'nathan tester',
	url: '',
	description: '',
	link: 'https://myblog.com/author/new-user/',
	slug: 'new-user',
	avatar_urls: {
		'24': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=24&d=mm&r=g',
		'48': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=48&d=mm&r=g',
		'96': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=96&d=mm&r=g',
	},
	meta: [],
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/users/2',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/users',
			},
		],
	},
};

export const userGetMany = [
	{
		id: 1,
		name: 'nodeqa',
		url: 'https://myblog.com',
		description: '',
		link: 'https://myblog.com/author/nodeqa/',
		slug: 'nodeqa',
		avatar_urls: {
			'24': 'https://secure.gravatar.com/avatar/de2d127be16acfb3d435ff80b5e13687?s=24&d=mm&r=g',
			'48': 'https://secure.gravatar.com/avatar/de2d127be16acfb3d435ff80b5e13687?s=48&d=mm&r=g',
			'96': 'https://secure.gravatar.com/avatar/de2d127be16acfb3d435ff80b5e13687?s=96&d=mm&r=g',
		},
		meta: [],
		_links: {
			self: [
				{
					href: 'https://myblog.com/wp-json/wp/v2/users/1',
					targetHints: {
						allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
					},
				},
			],
			collection: [
				{
					href: 'https://myblog.com/wp-json/wp/v2/users',
				},
			],
		},
	},
];

export const userUpdate = {
	id: 2,
	username: 'new-user',
	name: 'Name Change',
	first_name: 'Name',
	last_name: 'Change',
	email: 'nathan@domain.com',
	url: '',
	description: '',
	link: 'https://myblog.com/author/new-user/',
	locale: 'en_GB',
	nickname: 'newuser',
	slug: 'new-user',
	roles: ['subscriber'],
	registered_date: '2025-03-27T19:49:07+00:00',
	capabilities: {
		read: true,
		level_0: true,
		subscriber: true,
	},
	extra_capabilities: {
		subscriber: true,
	},
	avatar_urls: {
		'24': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=24&d=mm&r=g',
		'48': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=48&d=mm&r=g',
		'96': 'https://secure.gravatar.com/avatar/6eabaa023affb379ccfd92d522ab0e37?s=96&d=mm&r=g',
	},
	meta: {
		persisted_preferences: [],
	},
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/users/2',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/users',
			},
		],
	},
};

export const pageCreate = {
	id: 9,
	date: '2025-03-27T20:17:01',
	date_gmt: '2025-03-27T20:17:01',
	guid: {
		rendered: 'https://myblog.com/?page_id=9',
		raw: 'https://myblog.com/?page_id=9',
	},
	modified: '2025-03-27T20:17:01',
	modified_gmt: '2025-03-27T20:17:01',
	password: '',
	slug: '',
	status: 'draft',
	type: 'page',
	link: 'https://myblog.com/?page_id=9',
	title: {
		raw: 'A new page',
		rendered: 'A new page',
	},
	content: {
		raw: 'Some content',
		rendered: '<p>Some content</p>\n',
		protected: false,
		block_version: 0,
	},
	excerpt: {
		raw: '',
		rendered: '<p>Some content</p>\n',
		protected: false,
	},
	author: 1,
	featured_media: 0,
	parent: 0,
	menu_order: 1,
	comment_status: 'closed',
	ping_status: 'closed',
	template: '',
	meta: {
		footnotes: '',
	},
	permalink_template: 'https://myblog.com/%pagename%/',
	generated_slug: 'a-new-page',
	class_list: ['post-9', 'page', 'type-page', 'status-draft', 'hentry'],
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/9',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages',
			},
		],
		about: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/types/page',
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
				href: 'https://myblog.com/wp-json/wp/v2/comments?post=9',
			},
		],
		'version-history': [
			{
				count: 0,
				href: 'https://myblog.com/wp-json/wp/v2/pages/9/revisions',
			},
		],
		'wp:attachment': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/media?parent=9',
			},
		],
		'wp:action-publish': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/9',
			},
		],
		'wp:action-unfiltered-html': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/9',
			},
		],
		'wp:action-assign-author': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/9',
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

export const pageGet = {
	id: 2,
	date: '2025-03-27T18:05:01',
	date_gmt: '2025-03-27T18:05:01',
	guid: {
		rendered: 'https://myblog.com/?page_id=2',
	},
	modified: '2025-03-27T18:05:01',
	modified_gmt: '2025-03-27T18:05:01',
	slug: 'sample-page',
	status: 'publish',
	type: 'page',
	link: 'https://myblog.com/sample-page/',
	title: {
		rendered: 'Sample Page',
	},
	content: {
		rendered:
			'\n<p>This is an example page. It&#8217;s different from a blog post because it will stay in one place and will show up in your site navigation (in most themes). Most people start with an About page that introduces them to potential site visitors. It might say something like this:</p>\n\n\n\n<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow"><p>Hi there! I&#8217;m a bike messenger by day, aspiring actor by night, and this is my website. I live in Los Angeles, have a great dog named Jack, and I like pi&#241;a coladas. (And gettin&#8217; caught in the rain.)</p></blockquote>\n\n\n\n<p>&#8230;or something like this:</p>\n\n\n\n<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow"><p>The XYZ Doohickey Company was founded in 1971, and has been providing quality doohickeys to the public ever since. Located in Gotham City, XYZ employs over 2,000 people and does all kinds of awesome things for the Gotham community.</p></blockquote>\n\n\n\n<p>As a new WordPress user, you should go to <a href="https://myblog.com/wp-admin/">your dashboard</a> to delete this page and create new pages for your content. Have fun!</p>\n',
		protected: false,
	},
	excerpt: {
		rendered:
			'<p>This is an example page. It&#8217;s different from a blog post because it will stay in one place and will show up in your site navigation (in most themes). Most people start with an About page that introduces them to potential site visitors. It might say something like this: Hi there! I&#8217;m a bike messenger [&hellip;]</p>\n',
		protected: false,
	},
	author: 1,
	featured_media: 0,
	parent: 0,
	menu_order: 0,
	comment_status: 'closed',
	ping_status: 'open',
	template: '',
	meta: {
		footnotes: '',
	},
	class_list: ['post-2', 'page', 'type-page', 'status-publish', 'hentry'],
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/2',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages',
			},
		],
		about: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/types/page',
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
				href: 'https://myblog.com/wp-json/wp/v2/comments?post=2',
			},
		],
		'version-history': [
			{
				count: 0,
				href: 'https://myblog.com/wp-json/wp/v2/pages/2/revisions',
			},
		],
		'wp:attachment': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/media?parent=2',
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

export const pageGetMany = [
	{
		id: 2,
		date: '2025-03-27T18:05:01',
		date_gmt: '2025-03-27T18:05:01',
		guid: {
			rendered: 'https://myblog.com/?page_id=2',
		},
		modified: '2025-03-27T18:05:01',
		modified_gmt: '2025-03-27T18:05:01',
		slug: 'sample-page',
		status: 'publish',
		type: 'page',
		link: 'https://myblog.com/sample-page/',
		title: {
			rendered: 'Sample Page',
		},
		content: {
			rendered:
				'\n<p>This is an example page. It&#8217;s different from a blog post because it will stay in one place and will show up in your site navigation (in most themes). Most people start with an About page that introduces them to potential site visitors. It might say something like this:</p>\n\n\n\n<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow"><p>Hi there! I&#8217;m a bike messenger by day, aspiring actor by night, and this is my website. I live in Los Angeles, have a great dog named Jack, and I like pi&#241;a coladas. (And gettin&#8217; caught in the rain.)</p></blockquote>\n\n\n\n<p>&#8230;or something like this:</p>\n\n\n\n<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow"><p>The XYZ Doohickey Company was founded in 1971, and has been providing quality doohickeys to the public ever since. Located in Gotham City, XYZ employs over 2,000 people and does all kinds of awesome things for the Gotham community.</p></blockquote>\n\n\n\n<p>As a new WordPress user, you should go to <a href="https://myblog.com/wp-admin/">your dashboard</a> to delete this page and create new pages for your content. Have fun!</p>\n',
			protected: false,
		},
		excerpt: {
			rendered:
				'<p>This is an example page. It&#8217;s different from a blog post because it will stay in one place and will show up in your site navigation (in most themes). Most people start with an About page that introduces them to potential site visitors. It might say something like this: Hi there! I&#8217;m a bike messenger [&hellip;]</p>\n',
			protected: false,
		},
		author: 1,
		featured_media: 0,
		parent: 0,
		menu_order: 0,
		comment_status: 'closed',
		ping_status: 'open',
		template: '',
		meta: {
			footnotes: '',
		},
		class_list: ['post-2', 'page', 'type-page', 'status-publish', 'hentry'],
		_links: {
			self: [
				{
					href: 'https://myblog.com/wp-json/wp/v2/pages/2',
					targetHints: {
						allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
					},
				},
			],
			collection: [
				{
					href: 'https://myblog.com/wp-json/wp/v2/pages',
				},
			],
			about: [
				{
					href: 'https://myblog.com/wp-json/wp/v2/types/page',
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
					href: 'https://myblog.com/wp-json/wp/v2/comments?post=2',
				},
			],
			'version-history': [
				{
					count: 0,
					href: 'https://myblog.com/wp-json/wp/v2/pages/2/revisions',
				},
			],
			'wp:attachment': [
				{
					href: 'https://myblog.com/wp-json/wp/v2/media?parent=2',
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

export const pageUpdate = {
	id: 2,
	date: '2025-03-27T18:05:01',
	date_gmt: '2025-03-27T18:05:01',
	guid: {
		rendered: 'https://myblog.com/?page_id=2',
		raw: 'https://myblog.com/?page_id=2',
	},
	modified: '2025-03-27T20:21:11',
	modified_gmt: '2025-03-27T20:21:11',
	password: '',
	slug: 'new-slug',
	status: 'publish',
	type: 'page',
	link: 'https://myblog.com/new-slug/',
	title: {
		raw: 'New Title',
		rendered: 'New Title',
	},
	content: {
		raw: 'Updated Content',
		rendered: '<p>Updated Content</p>\n',
		protected: false,
		block_version: 0,
	},
	excerpt: {
		raw: '',
		rendered: '<p>Updated Content</p>\n',
		protected: false,
	},
	author: 1,
	featured_media: 0,
	parent: 0,
	menu_order: 0,
	comment_status: 'closed',
	ping_status: 'open',
	template: '',
	meta: {
		footnotes: '',
	},
	permalink_template: 'https://myblog.com/%pagename%/',
	generated_slug: 'new-title',
	class_list: ['post-2', 'page', 'type-page', 'status-publish', 'hentry'],
	_links: {
		self: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/2',
				targetHints: {
					allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
				},
			},
		],
		collection: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages',
			},
		],
		about: [
			{
				href: 'https://myblog.com/wp-json/wp/v2/types/page',
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
				href: 'https://myblog.com/wp-json/wp/v2/comments?post=2',
			},
		],
		'version-history': [
			{
				count: 1,
				href: 'https://myblog.com/wp-json/wp/v2/pages/2/revisions',
			},
		],
		'predecessor-version': [
			{
				id: 10,
				href: 'https://myblog.com/wp-json/wp/v2/pages/2/revisions/10',
			},
		],
		'wp:attachment': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/media?parent=2',
			},
		],
		'wp:action-publish': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/2',
			},
		],
		'wp:action-unfiltered-html': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/2',
			},
		],
		'wp:action-assign-author': [
			{
				href: 'https://myblog.com/wp-json/wp/v2/pages/2',
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
