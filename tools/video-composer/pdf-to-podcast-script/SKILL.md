---
name: pdf-to-podcast-script
description: Use when converting parsed PDF page text, slide text, page screenshots, presentation notes, or document content into a page-by-page Chinese podcast script for TTS or AI Podcast video workflows.
---

# PDF To Podcast Script

## Purpose

Turn parsed PDF pages into a page-by-page Chinese podcast script that can be sent directly to a TTS or AI Podcast service. The script must explain the uploaded document, not invent a new topic.

This skill is for document-grounded video workflows where each PDF page is shown on screen while the audio explains that page.

## Inputs

- `pages`: ordered pages extracted from the uploaded PDF.
- `pageNumber`: 1-based page number.
- `pageText`: text extracted from that PDF page.
- `extraContext`: optional user-provided audience, point of view, emphasis, or style requirements.
- `podcastStyle`: usually `podcast_interview`.
- `targetSeconds`: optional desired spoken length per page.

## Core Rule

The PDF page is the source of truth.

Only explain:

- Text that appears on the current page.
- Direct implications of that text.
- User-provided `extraContext`.
- Lightweight transitions from the previous or next page.

Do not introduce unrelated products, papers, APIs, companies, statistics, examples, or background facts unless they appear in the PDF text or user context.

If a page has little text, explain the page title, visual purpose, and viewing goal. Do not fill the gap with an unrelated educational topic.

## Internal Reasoning

Before writing each page script, internally derive:

1. page topic: what this page is actually about.
2. viewer task: what the viewer should notice on this page.
3. explanation angle: how to make the page understandable in spoken Chinese.
4. transition: how this page connects to the previous and next page.
5. boundary: what must not be added because it is not in the PDF.

Do not output this reasoning. Only output strict JSON.

## Podcast Style

Default to a two-person knowledge podcast rhythm:

- Host A opens, frames the page, and explains the main idea.
- Host B acts as the listener proxy: confirms value, asks short questions, or restates confusion.
- The first page must have a natural podcast opening. It may start with `今天我们要聊的话题是...`, `今天咱们来聊...`, or a more natural variant.
- Each page should sound conversational, not like OCR text being read aloud.
- Use short sentences and natural Chinese connectors such as `其实`, `简单来说`, `那就是说`, `对`, `嗯`.
- Keep page explanations compact. Prefer 20-60 seconds per page unless the user requests longer.

## Output Schema

Return strict JSON only. No Markdown fences, no commentary.

```json
{
  "title": "整份 PDF 的播客标题",
  "summary": "整份 PDF 的一句话摘要",
  "audience": "目标听众",
  "pages": [
    {
      "pageNumber": 1,
      "pageTitle": "当前页标题",
      "speakerPrompt": "可直接交给 AI Podcast 的中文口播开场或本页讲解。",
      "spokenSummary": "本页必须讲到的核心内容，仍然是可朗读中文。",
      "targetSeconds": 45
    }
  ]
}
```

## Field Rules

- `pages.length` must equal the number of extracted PDF pages.
- `pageNumber` must be sequential from 1.
- `speakerPrompt` must be TTS-visible spoken Chinese, not an instruction to the model.
- `spokenSummary` must summarize the page content in spoken Chinese.
- `speakerPrompt` and `spokenSummary` must never contain JSON keys, Markdown, speaker labels, workflow notes, or system instructions.
- `targetSeconds` should be between 12 and 60.

## Page Grounding Checklist

Before returning JSON, verify:

- Every page script mentions the actual page topic.
- No page script discusses a topic absent from the PDF page and `extraContext`.
- The first page has a podcast-style opening.
- Later pages naturally connect to the previous page.
- The text can be read aloud without exposing prompt instructions.
- The output is valid JSON.

## Common Failures

- **Only sending a topic to AI Podcast:** The service may expand it into unrelated content. Send a complete page-grounded script plus the page source text.
- **Using prompt text as subtitles:** Subtitles must come from the actual TTS or AI Podcast transcript/timestamps.
- **Inventing examples:** If the PDF does not contain an example, say `可以理解为...` only when it is directly implied by the page.
- **Overlong page audio:** Keep each page focused. Do not turn one sparse page into a full lesson.
