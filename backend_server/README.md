# SnapSort Backend

FastAPI service that accepts shopping app screenshots and extracts product details using OpenAI Vision.

## Prerequisites

- Python 3.10+ available as `python3`
- OpenAI API key
- macOS/Linux shell (script uses Bash/venv)

## Setup & Run

1. In this folder, create a .env file and set `OPENAI_API_KEY=your_key`.
2. Start the server (creates venv, installs deps, runs uvicorn):
   ```bash
   ./run_local.sh
   ```
   Server listens on `http://localhost:8000` (0.0.0.0:8000).

## Health Check

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`.

## Analyze API

- Method: `POST /analyze`
- Body: `multipart/form-data` with 1–10 `files` fields (images).
- Response: JSON `{ "results": [ { "filename", "type", "products": [ { "brand", "product_name", "price" } ], "error" } ] }`

### Example: cURL

```bash
curl -X POST http://localhost:8000/analyze \
  -F "files=@/path/to/img1.png" \
  -F "files=@/path/to/another.jpg"
```

### Example: JavaScript (browser/Node fetch)

```js
const form = new FormData();
for (const file of files) form.append("files", file); // files is a FileList or array of File

const res = await fetch("http://localhost:8000/analyze", {
  method: "POST",
  body: form,
});
const data = await res.json();
console.log(data.results);
```

If calling from a separate dev server, set up a proxy or enable CORS; none is configured by default.
