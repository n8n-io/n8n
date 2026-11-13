# Working Skills.sh integration

The Skills Hub has a Discover tab with popular and trending skills, category filters, search, and an in-app detail page. Save uses the existing GitHub importer. Try reuses its reader and scanner, then runs an unsaved agent. The integration uses the existing `136_skill_sync` opt-in flag. No database migration is needed.

This is a working discovery pilot. The API access and content limits in [the research report](README.md) still apply.

## User flow

1. Open Settings → Context → Skills → Discover.
2. Browse the popular list, switch to Trending, filter a category, or search for a task. Cards show the author description, repository, install count, and an official badge when Skills.sh supplies one.
3. Open a skill inside n8n. Review its purpose, instructions, files, declared requirements, license, and available audit results. GitHub adds repository stars, topics, and the last push date. Select Save skill or Try skill from either the card or detail page.
4. For Save, choose a scope and review the matching skill in the GitHub import dialog. Save stores the skill and source connection.
5. For Try, review the current GitHub instructions, enter a task, and select Run test. The dialog selects an available model credential. The user can change it.
6. Read the response in the dialog. Save skill remains a separate action.

Try runs one text-only prompt with the existing inline agent runtime. It does not save a skill, source connection, agent, or chat history. Each run starts fresh. It can load the skill and supported Markdown references. It has no connected apps, shell, browser, or uploaded files.

```mermaid
sequenceDiagram
    actor User
    participant Hub as Skills Hub
    participant Reader as GitHub reader and scanner
    participant Agent as Inline agent runtime
    User->>Hub: Try skill
    Hub->>Reader: Read current content
    Reader-->>Hub: Checked skill and content hash
    User->>Hub: Enter task and run
    Hub->>Reader: Read and check the content hash
    Hub->>Agent: Run with selected model and embedded skill
    Agent-->>Hub: Response and skill load status
    Hub-->>User: Show result; offer Save separately
```

## Implementation

| Area | Change |
| --- | --- |
| API types | `skills/skill-catalog.schema.ts` defines browse, search, metadata, and detail contracts. |
| Skills backend | `SkillCatalogService` uses `OutboundHttp` for Skills.sh search, public rankings, downloaded snapshots, and audits. It validates records and builds fixed source links. Optional GitHub metadata has a separate cache. |
| Rankings | The public site embeds its first 600 ranked records in serialized page data. The adapter parses JSON without executing scripts. It keeps the supplied order and excludes sources that the GitHub importer cannot use. A changed page shape produces an unavailable state. |
| Route access | Global and project routes have explicit list scopes and the existing feature gate. Per-user route limits are 30 requests per minute for browse, search, and detail, and 60 for card metadata. |
| Network bounds | Search returns at most 24 records, with a 1 MiB response limit. New upstream calls share four request slots and a 2 MiB response limit. All requests have a 10-second timeout and disable redirects. Downloads accept at most 256 files and 256 Ki characters per file. |
| Caching | Rankings cache for one minute. Skill snapshots and details cache for 15 minutes. Repository metadata caches for one hour. Concurrent requests for the same cached key share a fetch. Snapshot and detail caches have byte limits. |
| Skills Hub | `SkillsDiscover.vue` loads the popular list on entry. It displays 12 cards at a time and enriches visible descriptions with up to three concurrent requests. `SkillCatalogDetail.vue` provides Overview, Instructions, and Files tabs. A `catalogSkill` URL parameter supports direct links and browser navigation. |
| Categories | Deterministic n8n rules use the skill name first and the author description second. The UI labels these as n8n groupings. These are provisional categories, not author claims or a Skills.sh taxonomy. |
| GitHub review | `SkillSourceConnectDialog.vue` accepts a catalog item. It imports only one exact name match, using the opaque key returned by GitHub discovery. It rejects missing and ambiguous matches. |
| Trial API | Project-scoped prepare and run routes require Agent execution and skill list access. Prepare allows 10 requests per user per minute. Run allows five. A user can have one active trial per main process. |
| Trial content | `SkillSourceService.readPublicSkill` reuses discovery, exact-name matching, parsing, and scanning. Blocked content cannot run. A changed content hash requires the user to reopen the trial. |
| Trial runtime | `AgentSkillTrialService` embeds the checked skill in an inline runtime. It uses the existing model resolver and user-scoped credential provider. It closes the runtime after each result or error. |
| Trial bounds | Each request has a 90-second deadline, six model iterations, and a 2,048-token output limit per call. The existing budget guardrail stops further calls after the session reaches $0.25. This is a between-call limit, not a hard invoice cap. Disconnecting the client cancels the run. |
| Trial UI | `AgentSkillTrialDialog.vue` uses the existing Agent modal and model picker. It shows instructions, scanner notes, a prompt, and a Markdown result. Save opens the existing importer. |

The detail page displays the Skills.sh snapshot. The app still reads all imported files from GitHub and reviews them again before saving. It does not execute the Skills CLI or interpret the catalog slug as a GitHub folder.

## Limits to review

- The anonymous search endpoint is used by the official Skills CLI. A stable service agreement for n8n is still unverified. The authenticated v1 API is not integrated.
- The ranking adapter depends on public website data rather than a stable API contract. Replace it with supported catalog access before production. The anonymous snapshot and audit routes also need a supported access agreement.
- Search records do not supply descriptions or audits. Snapshot downloads add author descriptions, instructions, and frontmatter. Audit and repository failures leave those optional fields out. No model scores or satisfaction ratings are invented.
- Popular and search counts are total installs. Trending counts are labeled recent installs. The app preserves Skills.sh's ranking rather than calculating its own trend score.
- Categories use simple rules. Review their accuracy before making them a production taxonomy. Repository topics are shown as repository metadata, not skill-specific categories.
- These bounds reduce request bursts. They are not a cross-instance quota manager. The pilot reports upstream rate limits; it does not bypass them or implement automatic retry storms.
- Install counts are popularity data. They do not measure runs or success.
- The existing importer allows one repository connection per scope. It blocks adding another skill from that repository once connected. The integration keeps that rule. A later import-more feature must reuse the stored connection and its access checks.
- The existing importer preserves `SKILL.md` and supported Markdown references. It omits other files, including scripts and some license files. The review lists omissions. [CONTEXT-481](https://linear.app/n8n/issue/CONTEXT-481) tracks broader file support.
- A skill may require scripts or external tools. The trial supports text tasks and Markdown references only. Full agent setup, multi-turn chat, attachments, and tool connections remain future work.
- The GitHub discovery cap and folder-depth limit can prevent a catalog match. Missing or ambiguous matches stop the import.
- GitHub and Skills.sh can change independently. A catalog result can be stale. The importer reads and scans the current GitHub content again before it saves.

## Validation and preview

[Validation results](validation.md) record automated and live checks. Earlier screenshots show [live discovery](evidence/working-discover.png) and [the original saved-agent flow](evidence/working-trial.png). The one-shot trial replaces that flow.

The review instance runs at `http://127.0.0.1:5681/settings/context/skills`. The backend uses port 5679. Both listeners use loopback. The database and test account are separate from the user's n8n data.

The preview starts the compiled backend with `N8N_FEATURE_FLAG_OVERRIDES='{"136_skill_sync":true}'`. It uses the local `vite-preview.config.mts` to point the editor at that backend and keep its listener on loopback. `NODE_OPTIONS=--dns-result-order=ipv4first` is required for outbound requests on this review host.

This change is ready for code and product review. Broader rollout needs supported API access, an import-more flow, and a decision on file and runtime compatibility.
