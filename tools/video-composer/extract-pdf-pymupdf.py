#!/usr/bin/env python3
import json
import sys
from pathlib import Path

import fitz


def safe_page_name(page_number: int) -> str:
    return f"page-{page_number:03d}"


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: extract-pdf-pymupdf.py INPUT_PDF PAGES_DIR OUTPUT_JSON", file=sys.stderr)
        return 1

    input_pdf = Path(sys.argv[1])
    pages_dir = Path(sys.argv[2])
    output_json = Path(sys.argv[3])
    pages_dir.mkdir(parents=True, exist_ok=True)

    document = fitz.open(input_pdf)
    pages = []
    for index, page in enumerate(document, start=1):
        name = safe_page_name(index)
        image_path = pages_dir / f"{name}.png"
        text_path = pages_dir / f"{name}.txt"
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        pixmap.save(image_path)
        text = page.get_text("text").strip()
        text_path.write_text(text, encoding="utf-8")
        pages.append({
            "pageNumber": index,
            "imagePath": str(image_path),
            "textPath": str(text_path),
            "text": text,
            "isTextSparse": len(text) < 20,
        })

    payload = {
        "sourceType": "pdf",
        "pageCount": len(pages),
        "pages": pages,
    }
    output_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "pageCount": len(pages), "outputJson": str(output_json)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
