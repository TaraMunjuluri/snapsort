import asyncio
import base64
import json
import mimetypes
import os
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel


SYSTEM_PROMPT = """
You are a vision model specialized in analyzing shopping app screenshots.

TASK:
1. Identify the general type of screenshot.
2. Extract all clothing products visible in the screenshot.
Each product includes: brand, product_name, price.
3. Output JSON EXACTLY following:
{
  "type": "...",
  "extracted": [
    { "brand": null, "product_name": "...", "price": "$21.42" }
  ]
}
}
"""

JSON_SCHEMA = {
    "type": "json_schema",
    "name": "shopping_extraction",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "type": {"type": "string"},
            "extracted": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "brand": {"type": ["string", "null"]},
                        "product_name": {"type": "string"},
                        "price": {"type": ["string", "null"]},
                    },
                    "required": ["brand", "product_name", "price"],
                },
            },
        },
        "required": ["type", "extracted"],
    },
    "strict": True,
}

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="SnapSort backend", version="0.1.0")

# CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProductOut(BaseModel):
    brand: Optional[str]
    product_name: str
    price: Optional[str]


class ImageResult(BaseModel):
    filename: str
    type: str
    products: List[ProductOut]
    error: Optional[str] = None


class AnalyzeResponse(BaseModel):
    results: List[ImageResult]


def _encode_image(upload: UploadFile) -> str:
    """Return a data: URL that OpenAI Vision accepts."""
    data = upload.file.read()
    if not data:
        raise ValueError("empty file")
    mime_type = mimetypes.guess_type(upload.filename or "")[0] or "image/png"
    b64_image = base64.b64encode(data).decode("ascii")
    return f"data:{mime_type};base64,{b64_image}"


def _call_model(image_data_url: str):
    response = client.responses.create(
        model="gpt-4.1",
        input=[
            {"role": "system", "content": [{"type": "input_text", "text": SYSTEM_PROMPT}]},
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Analyze this shopping screenshot."},
                    {"type": "input_image", "image_url": image_data_url, "detail": "high"},
                ],
            },
        ],
        text={"format": JSON_SCHEMA},
    )
    return json.loads(response.output_text)


async def _analyze_file(upload: UploadFile) -> ImageResult:
    try:
        data_url = _encode_image(upload)
        raw = await asyncio.to_thread(_call_model, data_url)
        return ImageResult(
            filename=upload.filename,
            type=raw.get("type", "unknown"),
            products=[ProductOut(**item) for item in raw.get("extracted", [])],
        )
    except Exception as exc:  # noqa: BLE001
        return ImageResult(filename=upload.filename, type="error", products=[], error=str(exc))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(files: List[UploadFile] = File(..., description="1-10 images to analyze")):
    if not files:
        raise HTTPException(status_code=400, detail="At least one image is required")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum of 10 images allowed")
    if not client.api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    tasks = [_analyze_file(upload) for upload in files]
    results = await asyncio.gather(*tasks)
    return AnalyzeResponse(results=results)
