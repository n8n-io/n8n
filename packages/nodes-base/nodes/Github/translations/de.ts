module.exports = {
	de: {
		github: {
			credentials: {
				githubOAuth2Api: {
					server: {
						displayName: 'Deutsch',
						description: 'Deutsch',
					},
				},
				githubApi: {
					server: {
						displayName: 'Deutsch',
						description: 'Deutsch',
					},
				},
			},

			parameters: {
				authentication: {
					displayName: 'Authentifizierung',
					options: {
						accessToken: {
							displayName: 'Zugangstoken',
						},
					},
				},
				resource: {
					displayName: 'Ressource',
					description: 'Beschreibung der Ressourcen',
					options: {
						issue: {
							displayName: 'Thema',
							description: 'Beschreibung eines Themas',
						},
						file: {
							displayName: 'Datei',
						},
						repository: {
							displayName: 'Repo',
						},
						release: {
							displayName: 'Veröffentlichung',
						},
						review: {
							displayName: 'Überprüfung',
						},
					},
				},
				operation: {
					displayName: 'Aktion',
					options: {
						create: {
							displayName: 'Schaffen',
							description: 'Neue Datei in Repo schaffen.',
						},
						get: {
							displayName: 'Anfragen',
							description: 'Beschreibung.',
						},
					},
				},
				owner: {
					displayName: 'Repo Besitzer',
					placeholder: 'Die n8n-io',
				},
				repository: {
					displayName: 'Repo Name',
					placeholder: 'Das n8n',
				},
				title: {
					displayName: 'Titel',
				},
				body: {
					displayName: 'Körper',
				},
				// TODO: Decide if a param like `Label` should be considered
				// a) a hidden top-level param with a header `Labels`, or
				// b) a nested param under the top-level param `Labels`
				label: {
					displayName: 'Etikett',
					description: 'Beschreibung des Etikettes',
				},
				assignee: {
					displayName: 'Beauftragte',
					description: 'Beschreibung des Beauftragtens',
				},
				labels: {
					displayName: 'Etiketten',
					description: 'Beschreibung der Etiketten',
					multipleValueButtonText: 'Etikett hinzufügen',
				},
				assignees: {
					displayName: 'Beauftragte',
					description: 'Beschreibung der Beauftragten',
					multipleValueButtonText: 'Beautragten hinzufügen',
				},
				additionalParameters: {
					displayName: 'Zusätzliche Parameter',
					options: {
						author: {
							displayName: 'Autor',
						},
						branch: {
							displayName: 'Ast',
						},
						committer: {
							displayName: 'Commit-Macher',
						},
					},
				},
			},
		},
	},
};
