module.exports = {
	de: {
		github: {
			parameters: {
				Authentication: {
					displayName: 'Authentifizierung',
					options: {
						'Access Token': {
							displayName: 'Zugangstoken',
						},
					},
				},
				Resource: {
					displayName: 'Ressource',
					description: 'Beschreibung der Ressourcen',
					options: {
						Issue: {
							displayName: 'Thema',
							description: 'Beschreibung eines Themas',
						},
						File: {
							displayName: 'Datei',
						},
						Repository: {
							displayName: 'Repo',
						},
						Release: {
							displayName: 'Veröffentlichung',
						},
						Review: {
							displayName: 'Überprüfung',
						},
						User: {
							displayName: 'Benutzer',
						},
					},
				},
				Operation: {
					displayName: 'Aktion',
					options: {
						Create: {
							displayName: 'Schaffen',
							description: 'Neue Datei in Repo schaffen.',
						},
						Delete: {
							displayName: 'Entfernen',
						},
						Get: {
							displayName: 'Anfragen',
						},
					},
				},
				'Repository Owner': {
					displayName: 'Repo Besitzer',
					placeholder: 'Die n8n-io',
				},
				'Repository Name': {
					displayName: 'Repo Name',
					placeholder: 'Das n8n',
				},
				Title: {
					displayName: 'Titel',
				},
				Body: {
					displayName: 'Körper',
				},
				// TODO: Decide if a param like `Label` should be considered
				// a) a hidden top-level param with a header `Labels`, or
				// b) a nested param under the top-level param `Labels`
				Label: {
					displayName: 'Etikett',
					description: 'Beschreibung des Etikettes',
				},
				Assignee: {
					displayName: 'Beauftragte',
					description: 'Beschreibung des Beauftragtens',
				},
				Labels: {
					displayName: 'Etiketten',
					description: 'Beschreibung der Etiketten',
					multipleValueButtonText: 'Etikett hinzufügen',
				},
				Assignees: {
					displayName: 'Beauftragte',
					description: 'Beschreibung der Beauftragten',
					multipleValueButtonText: 'Beautragten hinzufügen',
				},
				'Additional Parameters': {
					displayName: 'Zusätzliche Parameter',
					options: {
						Author: {
							displayName: 'Autor',
						},
						Branch: {
							displayName: 'Ast',
						},
						Committer: {
							displayName: 'Commit-Macher',
						},
					},
				},
			},
		},
	},
};
