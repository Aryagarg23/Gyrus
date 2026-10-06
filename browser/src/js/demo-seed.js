// Starter memory graph for demo mode (no backend). Placeholder content:
// phase 3 replaces it. Same {nodes, links} shape app.js renders and the
// real /api/get-graph returns. Ids follow api.js's demo scheme
// (concept:<name>, query:<text>, link:<url>) so new searches merge into it.
window.GYRUS_DEMO_SEED = {
  nodes: [
    { id: 'concept:knowledge graphs', name: 'knowledge graphs', type: 'concept' },
    { id: 'query:what is a knowledge graph', name: 'what is a knowledge graph', type: 'query' },
    { id: 'link:https://en.wikipedia.org/wiki/Knowledge_graph', name: 'https://en.wikipedia.org/wiki/Knowledge_graph', type: 'link' },
    { id: 'concept:search intent', name: 'search intent', type: 'concept' },
    { id: 'query:types of search queries', name: 'types of search queries', type: 'query' },
  ],
  links: [
    { source: 'concept:knowledge graphs', target: 'query:what is a knowledge graph', type: 'SEARCHED_BY' },
    { source: 'query:what is a knowledge graph', target: 'link:https://en.wikipedia.org/wiki/Knowledge_graph', type: 'CLICKED' },
    { source: 'concept:search intent', target: 'query:types of search queries', type: 'SEARCHED_BY' },
  ],
};
