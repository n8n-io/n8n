---
name: pdf-research-podcast-script
description: Use when converting parsed scientific or research PDF pages plus user context into one continuous Chinese two-person podcast script with page visual anchors.
---

# PDF Research Podcast Script

## Purpose

Turn a scientific, medical, or educational PDF into one continuous two-person podcast. The PDF is the evidence source, while page numbers are visual anchors for the video composer.

This is not a page-by-page mini episode generator. Write one coherent episode that uses pages as screen timing markers.

## Core Rules

- Generate one continuous two-person podcast, not separate per-page clips.
- Treat PDF pages as visual anchors: each segment declares the page that should be shown while that part is spoken.
- Build a whole-document explanation around the research question, evidence chain, key findings, limitations, and listener value.
- Use the user's viewpoint or audience request as the narrative angle when provided.
- Do not restart the episode on each page.
- Do not write per-page endings, thanks, next-time phrases, or bye-bye.
- Do not invent claims that are absent from the PDF or user-provided context.
- Strong claims such as `重磅`, `顶级期刊`, `新标杆`, or `改写临床实践` must be supported by PDF text or user context.
- For medical or scientific content, preserve uncertainty and explain boundaries: what the page supports, what it does not prove, and what follow-up evidence would matter.

## Output Schema

Return strict JSON only:

```json
{
  "title": "整集播客标题",
  "summary": "整集摘要",
  "audience": "目标听众",
  "thesis": "主论点",
  "pageAnchors": [
    {
      "pageNumber": 1,
      "topic": "这一页在整集中的作用",
      "visualRole": "画面此时帮助观众看到什么"
    }
  ],
  "segments": [
    {
      "role": "A",
      "text": "连续双人播客中的一段口播。",
      "pageNumber": 1,
      "evidenceRefs": ["来自页面或用户观点的证据短语"],
      "targetSeconds": 24
    }
  ]
}
```

## Segment Rules

- `role` must be `A` or `B`.
- `pageNumber` must reference an existing page.
- `targetSeconds` should usually be 12-45 seconds.
- Only the first segment may naturally open the episode.
- Later segments must connect to previous segments directly.
- Segment text must not include speaker labels, JSON fields, Markdown, workflow instructions, or stage directions.
- Adjacent segments should sound like turns in one recording.

## Quality Checklist

- The script has a clear thesis and coherent information arc.
- The first 20 seconds tell listeners why the paper matters.
- Each major PDF page contributes evidence, not filler.
- Useful viewpoints are added as interpretation, but claims remain grounded.
- Limitations and uncertainty are explained when evidence is incomplete.
- The final segment closes with a content takeaway, not a podcast farewell.
