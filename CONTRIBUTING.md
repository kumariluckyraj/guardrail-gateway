# Contributing

Thanks for helping! This project is small, so every contribution matters.

## Ways to help

- Report a bug or a security problem (open an issue)
- Suggest a policy rule or a feature
- Improve the docs
- Add tests or an SDK for another language

## Setup

Follow "Run it locally" in the README.

## Making a change

1. Fork the repo and create a branch: `git checkout -b my-change`
2. Make a small, focused change.
3. Run the backend tests: `cd backend && python -m pytest app/tests -q`
4. Open a pull request. Say what you changed and why.

## Rules

- **Never commit secrets.** No `.env` files, API keys or passwords.
- Keep security-sensitive behaviour safe by default. If something fails, the gateway should block or ask a
  human, never silently allow.
- Keep pull requests small. One idea per PR.

## Security problems

Please do not post security holes in public issues. Contact the maintainer directly (see the GitHub profile).