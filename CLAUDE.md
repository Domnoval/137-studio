## gstack (optional reference)

[gstack](https://github.com/garrytan/gstack) is a recommended skill pack for this
repo. It is not required: work goes ahead whether or not it's installed.

Check for it:

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

- **Installed:** skills like /qa, /ship, /review, /investigate and /browse are
  available. Use them where they fit. File paths live under `~/.claude/skills/gstack/`.
- **Missing:** carry on with the built-in tools. If a task would clearly benefit
  from gstack, mention it once. Never block on it.

Install on a local machine:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

For cloud sessions, add those two lines to the environment's setup script so new
sessions start with gstack already installed.
