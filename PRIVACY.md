# Privacy

Inline AI Branches currently runs entirely in the browser on supported chat pages.

## Data Stored

The prototype stores branch data in the current page's `localStorage` under:

```text
inline-ai-branches:v1
```

This can include snippets of AI answers and branch messages you type.

## Network Access

The current version does not send branch data to any server.

## Future Model Integration

If real AI replies are added, the extension should:

- Ask the user to configure the provider explicitly
- Make it clear what content is sent to the model
- Avoid sending full conversations by default
- Provide a way to delete local branch data
