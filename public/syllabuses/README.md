# ZIMSEC syllabus files

Place syllabus PDFs in this directory and add each one to `manifest.json`. The PDF is extracted server-side before it is supplied to the AI; it is never treated as plain text.

Example file names:
- `biology.pdf`
- `advanced-level-mathematics.pdf`
- `english-language.pdf`

After adding a file, update the manifest with its exact public path:

```json
{
  "subjects": [
    { "id": "biology", "name": "Biology", "path": "biology.pdf", "format": "pdf" }
  ]
}
```

The `id` must be unique and should contain lowercase letters, numbers, and hyphens. The `path` must match the file name exactly.
