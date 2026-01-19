# RAG Document Q&A App - Future Improvements

This document tracks potential enhancements and features for future development.

---

## 🖼️ Image Understanding with LLaVA

**Priority:** Medium  
**Complexity:** Medium  
**Status:** Planned

### Problem

Currently, images are processed using OCR (pytesseract) which only extracts text. Images without text (photos, diagrams, charts) return unhelpful placeholder text.

### Solution

Integrate LLaVA (Large Language and Vision Assistant) via Ollama for visual understanding.

### Implementation Steps

1. **Install LLaVA model**

   ```bash
   ollama pull llava
   ```

2. **Update document processor** to:
   - Store image file path in metadata
   - Generate image description using LLaVA during indexing
   - Combine OCR text + visual description for comprehensive understanding

3. **Update RAG pipeline** to:
   - Detect when query involves images (keywords: "image", "picture", "photo", "show", "see")
   - Send actual image to LLaVA for real-time visual Q&A when needed

4. **Backend changes needed:**
   - Add `app/core/vision.py` for LLaVA integration
   - Update `document_processor.py` to use vision for images
   - Add config option: `VISION_MODEL=llava` in `.env`

### Code Sketch

```python
# app/core/vision.py
import ollama
import base64

class VisionProcessor:
    def __init__(self, model: str = "llava"):
        self.model = model

    def describe_image(self, image_path: str) -> str:
        """Generate a description of an image using LLaVA."""
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        response = ollama.chat(
            model=self.model,
            messages=[{
                "role": "user",
                "content": "Describe this image in detail. Include any text, objects, people, colors, and layout.",
                "images": [image_data]
            }]
        )
        return response["message"]["content"]

    def query_image(self, image_path: str, question: str) -> str:
        """Ask a question about a specific image."""
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        response = ollama.chat(
            model=self.model,
            messages=[{
                "role": "user",
                "content": question,
                "images": [image_data]
            }]
        )
        return response["message"]["content"]
```

### Alternative: GPT-4 Vision

If OpenAI API key is available, can use GPT-4 Vision for better accuracy:

```python
from openai import OpenAI

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4-vision-preview",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Describe this image"},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data}"}}
        ]
    }]
)
```

---

## 📊 Additional Future Improvements

### High Priority

| Feature                  | Description                                                          | Complexity |
| ------------------------ | -------------------------------------------------------------------- | ---------- |
| **PDF Table Extraction** | Better extraction of tables from PDFs using `camelot` or `tabula-py` | Medium     |
| **Document Versioning**  | Track document versions and allow rollback                           | Medium     |
| **Search History**       | Save and replay previous searches                                    | Low        |

### Medium Priority

| Feature                  | Description                                           | Complexity |
| ------------------------ | ----------------------------------------------------- | ---------- |
| **Multi-user Support**   | User authentication and per-user document collections | High       |
| **Document Folders**     | Organize documents into folders/categories            | Medium     |
| **Export Conversations** | Export chat history to PDF/Markdown                   | Low        |
| **Batch Upload**         | Upload multiple files at once with progress tracking  | Medium     |

### Low Priority

| Feature                     | Description                                    | Complexity |
| --------------------------- | ---------------------------------------------- | ---------- |
| **Dark/Light Theme Toggle** | User preference for UI theme                   | Low        |
| **Keyboard Shortcuts**      | Power user shortcuts (Ctrl+K for search, etc.) | Low        |
| **Document Annotations**    | Highlight and annotate retrieved passages      | High       |
| **Citation Formatting**     | Format sources in APA/MLA/Chicago style        | Low        |

---

## 🔧 Technical Debt

| Item                  | Description                                      | Priority |
| --------------------- | ------------------------------------------------ | -------- |
| **Error Handling**    | More graceful error messages in UI               | Medium   |
| **Loading States**    | Better skeleton loaders for all async operations | Low      |
| **Test Coverage**     | Add unit and integration tests                   | High     |
| **API Documentation** | Add OpenAPI/Swagger documentation                | Medium   |
| **Rate Limiting**     | Prevent API abuse                                | Medium   |

---

## 📝 Notes

- LLaVA requires ~4GB VRAM for the 7B model
- Consider `llava:13b` for better quality if hardware supports it
- For production, consider caching image descriptions to avoid re-processing

---

_Last updated: January 18, 2026_
