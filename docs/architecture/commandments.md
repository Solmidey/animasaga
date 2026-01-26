# The Commandments

These rules are non-negotiable.

- Never connect frontend directly to a database
- Gatekeep every single action server-side
- Do not hide premium logic in the client
- Keep secrets off the browser
- Environment variables do not imply safety
- Never do sensitive math on the client
- Sanitize all inputs
- Rate-limit every meaningful action
- Never log sensitive information
- Keep dependencies updated
- Handle errors without leaking internals

Any system that violates these rules is invalid by design.
