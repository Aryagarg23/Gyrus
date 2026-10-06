// Starter memory graph for demo mode (no backend).
//
// This is demo content, and a small easter egg: it is the graph the team
// might have built while building Gyrus. Concepts come from the project's own
// research (intent detection, the memory graph, crews, Weave tracing, CHAAP,
// ORCAS-I, Clay, Friction). Queries are written the way each person writes
// commit messages: Raihan in caps with exclamation marks, Kaaustaaub terse and
// lowercase, Arya reflective. They are illustrative, not a log of real
// searches. Every link is a real URL: the Gyrus repo, Devpost, the writeup,
// Friction, the team's sites, and the homepages of the tools Gyrus used.
//
// Shape matches what app.js renders and /api/get-graph returns: {nodes, links}.
// Node types are lowercase here because the renderer colours by
// 'concept' | 'query' | 'link'; they stand for the backend's Neo4j labels
// Concept, Query and Link. Edge types are the backend's SEARCHED_BY
// (concept -> query) and CLICKED (query -> link). Ids follow api.js's demo
// scheme (concept:<name>, query:<text>, link:<url>) so new searches merge in.
(function () {
  // [concept, [[query, [urls...]], ...]]
  const GRAPH = [
    ['gyrus', [
      ['can an agentic browser win against the feed', [
        'https://aryagarg23.com/writing/gyrus',
        'https://devpost.com/software/gyrus-an-agentic-browser-to-increase-intelligence',
        'https://github.com/Aryagarg23/Gyrus',
      ]],
    ]],
    ['intent detection', [
      ['za intent getting zero shot deberta!!', ['https://huggingface.co']],
      ['is this query research or just an answer', []],
    ]],
    ['orcas-i', [
      ['roberta orcas-i 2m', ['https://huggingface.co']],
    ]],
    ['memory graph', [
      ['neo4j concept query link', ['https://neo4j.com']],
      ['MORE DB QUERIES for our good ol links to concepts!', ['https://neo4j.com']],
    ]],
    ['crews', [
      ['crewai mcp server', ['https://www.crewai.com']],
      ['research + news crew sources', ['https://arxiv.org', 'https://www.semanticscholar.org', 'https://exa.ai']],
      ['gdelt newsapi latest', ['https://www.gdeltproject.org', 'https://newsapi.org']],
    ]],
    ['weave tracing', [
      ['weave crewai import', ['https://wandb.ai']],
      ['what did the crew decide, and why', ['https://wandb.ai']],
    ]],
    ['pii obfuscation', [
      ['CHAAP CHAAP regex for za emails!!', ['https://github.com/Aryagarg23/Gyrus']],
    ]],
    ['clay', [
      ['would weights and biases mind a browser called clay', ['https://wandb.ai']],
    ]],
    ['friction', [
      ['what does this question look like at the os level', ['https://github.com/Aryagarg23/Friction']],
    ]],
    ['the team', [
      ['who built gyrus', ['https://kaaustaaub.netlify.app/', 'https://www.rai-1975.com/']],
    ]],
  ];

  const nodes = [];
  const links = [];
  const seen = new Set();

  function node(type, name) {
    const id = `${type}:${name}`;
    if (!seen.has(id)) {
      seen.add(id);
      nodes.push({ id, name, type });
    }
    return id;
  }

  GRAPH.forEach(([concept, queries]) => {
    const c = node('concept', concept);
    queries.forEach(([text, urls]) => {
      const q = node('query', text);
      links.push({ source: c, target: q, type: 'SEARCHED_BY' });
      urls.forEach((url) => {
        links.push({ source: q, target: node('link', url), type: 'CLICKED' });
      });
    });
  });

  window.GYRUS_DEMO_SEED = { nodes, links };
})();
