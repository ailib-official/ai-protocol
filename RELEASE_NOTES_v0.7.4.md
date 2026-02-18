# AI-Protocol v0.7.4 Release Notes

**Release Date**: 2026-02-19

## Summary

V2 provider manifest expansion: STT/TTS/Rerank capabilities, Jina AI rerank provider, and alignment with ai-protocol-mock.

## What's New

### New Provider: Jina AI

- **`v2/providers/jina.yaml`**: Rerank-only provider
  - Endpoint: `https://api.jina.ai/v1/rerank`
  - Models: `jina-reranker-v2-base-multilingual`, `jina-reranker-v3`
  - Auth: Bearer token via `JINA_API_KEY`

### Manifest Updates

- **OpenAI**: STT input formats extended to mp3, wav, flac, m4a, ogg, aac (Whisper API verified)
- **Cohere**: Rerank metadata with models (rerank-v3.5, rerank-english-v3.0, rerank-multilingual-v3.0)

### Documentation

- README/README_CN: v2 build path, STT/TTS/Rerank in roadmap
- Scripts: Chinese module headers (build.js, validate.js)
