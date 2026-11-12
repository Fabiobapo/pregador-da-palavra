# Holyrics Connector

This is a standalone Node.js service that relays an allowlisted set of actions
to the Holyrics API Server. The Holyrics token stays in this service's
environment and is never returned to callers.

## Run

```bash
cp .env.example .env
npm start
```

Set `HOLYRICS_TOKEN` and `CONNECTOR_KEY` in `.env` before starting. Use a
connector key of at least 16 characters. Keep `.env` private; it is ignored by
Git. Do not put the connector key in browser code or expose this service to an
untrusted network.

The service listens on `127.0.0.1:3939` by default. Check it at
`http://127.0.0.1:3939/health`.

Requests to `/status` and `/action/<ActionName>` require the
`x-connector-key` header. Only actions listed in `ALLOWED_ACTIONS` are
forwarded. For example:

```bash
curl -H "x-connector-key: YOUR_CONNECTOR_KEY" \
  http://127.0.0.1:3939/status
```

The browser's `ALLOWED_ORIGINS` setting is a CORS policy, not authentication.
The connector key must remain server-side; a web frontend must not embed it in
JavaScript.
