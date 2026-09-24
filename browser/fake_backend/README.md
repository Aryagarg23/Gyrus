# Gyrus mock search service

This small Express service is a standalone mock. It returns five generated links for a query; it does not call the project's research/news services or use the memory graph.

From this directory:

```sh
npm install
npm start
```

It listens on `http://localhost:3001` and exposes:

- `POST /api/query` with a JSON body such as `{"query":"javascript tutorial"}`
- `GET /api/health`

The current Electron shell uses the Flask endpoint `POST http://127.0.0.1:5000/api/search`, so this mock is not wired into the browser's search flow. The distinction and full backend requirements are described in the [root README](../../README.md).
