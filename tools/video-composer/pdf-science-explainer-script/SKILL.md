---
name: pdf-science-explainer-script
description: Use when converting PDF page text and page screenshot visual analysis into viewpoint-led Chinese science explainer scripts for short-form videos.
---

# PDF Science Explainer Script

## Purpose

Turn parsed PDF pages and page screenshot visual analysis into concise Chinese science explainer narration.

The workflow is viewpoint-led and PDF-checked. The user's opinion or angle provides the narrative spine. The PDF page text and page screenshot visual analysis provide evidence, limits, and corrections.

## Inputs

- `pages`: ordered PDF pages with extracted text.
- `visualAnalysis`: ordered page screenshot analysis.
- `viewpoint`: optional user opinion, angle, claim, or desired focus.
- `narrationMode`: `single_speaker` or `two_speaker`.
- `aspectRatio`: `9:16` or `16:9`, used only for pacing and short-video awareness.

## Core Rules

- Do not read the PDF line by line.
- Each page should explain one to three useful points.
- Use the user's viewpoint to decide what matters.
- Use PDF text and screenshot analysis to support, limit, or correct that viewpoint.
- If a page does not support the viewpoint, say so carefully.
- Visual analysis may describe titles, hierarchy, highlighted boxes, charts, tables, diagrams, labels, and visible relationships.
- Do not invent chart values, methods, study conclusions, or background facts not visible in the PDF text or page screenshot.
- Prefer cautious science language: `这一页只能说明`, `更像是在提示`, `还不能直接证明`, `至少可以看到`.

## Output

Return strict JSON only:

```json
{
  "title": "视频标题",
  "summary": "一句话摘要",
  "mode": "single_speaker",
  "pages": [
    {
      "pageNumber": 1,
      "pageTitle": "本页主题",
      "visualNotes": "页面截图里的图表、重点框、层级或表格信息",
      "evidenceNotes": "本页如何支持、限制或修正用户观点",
      "speakerPrompt": "可直接用于 TTS 的中文口播内容",
      "spokenSummary": "用于审阅的本页口播摘要",
      "targetSeconds": 35
    }
  ]
}
```

## Mode Rules

For `single_speaker`, write natural Chinese science explainer narration without speaker labels.

For `two_speaker`, write short question-answer turns. Keep the turns compact and page-grounded.

## Checklist

- `pages.length` equals the extracted PDF page count.
- Page numbers are sequential from 1.
- `speakerPrompt` is spoken Chinese, not instructions.
- No Markdown fences.
- No page introduces unrelated facts.
- Sparse or visually unclear pages produce shorter and more cautious narration.
