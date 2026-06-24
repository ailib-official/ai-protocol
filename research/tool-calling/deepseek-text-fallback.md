# DeepSeek Text Tool Fallback — Research Notes
# Status: draft | Last updated: 2026-06-24

## Summary

DeepSeek declares native function calling (`capabilities.required: tools`) but empirical
evidence from velaclaw trial shows **unstable adherence** to OpenAI-compatible tool_calls,
especially on `deepseek-reasoner`. Text fallback is recommended.

## Native Support

| Model | Native FC | Reliability | Notes |
|-------|-----------|-------------|-------|
| deepseek-chat | Yes | partial | Usually works; occasional text-only output |
| deepseek-reasoner | Yes | unreliable | Often emits `<shell>` XML dialect instead |

## Observed Text Dialects

1. `<shell><command>...</command></shell>` — primary bias
2. `<tool_call name="x">{"command":"..."}` — name in attribute
3. `<tool_calls><tool_call id="1">{"name":"x","parameters":{...}}` — nested + field alias

## Recommended Manifest Config

```yaml
tool_calling:
  native:
    supported: true
    reliability: partial
    notes: "deepseek-reasoner function calling unstable; use text fallback"
  text_fallback:
    format: xml_json
    wrapper: tool_call
    body: json
    name_location: json_field
    args_key: parameters
    known_dialects:
      - tag: shell
        map_to: shell
      - tag: bash
        map_to: shell
    prompt_level: L2
```

## Sources

- velaclaw trial logs (2026-06): active/text-tool-call-standard.md §1.2
- ai-protocol v2/providers/deepseek.yaml
- DeepSeek API docs: https://api-docs.deepseek.com/
