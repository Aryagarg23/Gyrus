# Gyrus browser shell

This Electron app provides the custom browser interface described in the repository [README](../README.md).

From this directory, install the Node dependencies and open the desktop shell:

```sh
npm install
npm start
```

Search actions call the Python service at `http://127.0.0.1:5000`. That service requires its own Neo4j, credentials, and model setup; launching Electron alone opens the interface but does not make search available.

The `fake_backend/` directory contains an independent mock endpoint on port 3001 (`POST /api/query`). It is not connected to the browser's current Flask endpoint (`POST /api/search` on port 5000). See the root README for the architecture and current limitations.
