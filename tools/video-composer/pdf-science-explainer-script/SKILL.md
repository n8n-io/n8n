---
name: pdf-science-explainer-script
description: Use when converting latest science PDF text and page screenshot visual analysis into continuous Chinese news-style science explainer scripts for short-form videos.
---

# PDF Science Explainer Script

## Purpose

Turn parsed PDF pages and page screenshot visual analysis into a continuous Chinese science explainer narration for short-form video.

The workflow is latest-literature-led and PDF-checked. The PDF provides the research question, evidence chain, conclusions, and limits. The user's opinion or angle may provide focus, but it must not override the uploaded literature.

## Inputs

- `pages`: ordered PDF pages with extracted text.
- `visualAnalysis`: ordered page screenshot analysis.
- `viewpoint`: optional user opinion, angle, claim, or desired focus.
- `narrationMode`: `single_speaker` or `two_speaker`.
- `aspectRatio`: `9:16` or `16:9`, used only for pacing and short-video awareness.

## Core Rules

- Do not read the PDF line by line.
- Treat the full PDF as one continuous literature explainer, not page-by-page mini episodes.
- Use the user's viewpoint to decide emphasis, but keep the literature as the source of truth.
- Use PDF text and screenshot analysis to support, limit, or correct that viewpoint.
- If a page does not support the viewpoint, say so carefully.
- Visual analysis may describe titles, hierarchy, highlighted boxes, charts, tables, diagrams, labels, and visible relationships.
- Do not invent chart values, methods, study conclusions, or background facts not visible in the PDF text or page screenshot.
- Prefer cautious science language: `这一页只能说明`, `更像是在提示`, `还不能直接证明`, `至少可以看到`.
- Use a news-broadcast science style: formal, concise, evidence-led, and restrained.
- Avoid blog/podcast filler such as `今天咱们聊`, `欢迎大家`, `我们来看一下`, `嗯`, `没错`, `哇`, `那我们开始吧`.
- Use short spoken sentences so generated subtitles can align tightly to the timing data.
- Page numbers are visual anchors only. A segment's `pageNumber` means the video should show that page while speaking the segment.
- Only the first segment may open the topic. Later segments must continue the same narrative.
- Do not include closing phrases such as `感谢收听`, `下期再见`, `拜拜`, or `本期到这里`.

## Output

Return strict JSON only:

```json
{
  "title": "视频标题",
  "summary": "一句话摘要",
  "mode": "single_speaker",
  "thesis": "整集主论点",
  "audience": "目标听众",
  "deliveryStyle": "news_science_explainer",
  "pageAnchors": [
    {
      "pageNumber": 1,
      "topic": "画面对应的文献主题",
      "visualRole": "这页作为画面锚点时承担的视觉作用"
    }
  ],
  "segments": [
    {
      "role": "A",
      "text": "可直接用于 TTS 的中文口播内容，一到两个短句。",
      "pageNumber": 1,
      "evidenceRefs": ["page:1 title", "page:1 figure"],
      "targetSeconds": 35
    }
  ]
}
```

## Mode Rules

For `single_speaker`, use role `A` for every segment. Write formal Chinese science narration.

For `two_speaker`, use `A` and `B` only when the user requests it. Keep turns compact, serious, and page-grounded. Do not use casual podcast banter.

## Checklist

- `pageAnchors.length` equals the extracted PDF page count.
- Page anchor numbers are sequential from 1.
- `segments` form one continuous narrative.
- Every segment has a valid `pageNumber`.
- `text` is spoken Chinese, not instructions.
- No Markdown fences.
- No page introduces unrelated facts.
- Sparse or visually unclear pages produce shorter and more cautious narration.
