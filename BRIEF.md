# BRIEF — Gyrus (repo: Aryagarg23/Gyrus, was wb_hack_sf)
Slug: gyrus. Hackathon: WeaveHacks — Agent Protocols Hackathon (Weights & Biases + Google), San Francisco, July 2025. Prizes: none listed.
Team: Arya Garg, Kaaustaaub Shankar, Raihan Rafeek (memory graph, API, PII obfuscation, memory-intent analysis).
What: an agentic browser meant to increase intelligence, not replace it. "Crews" = personalized AI teams that adapt to behavior; memory graph + fine-tuned zero-shot classifier (RoBERTa on ORCAS-II, ~2M entries) detect intent from history; guides research/studying; CHAAP encryption for privacy.
Tech: Electron.js, CrewAI, Langchain, Neo4j memory graph, GDELT/NewsAPI/Exa/Semantic Scholar/arXiv, Weave tracking, ngrok backend.
Devpost: https://devpost.com/software/gyrus-an-agentic-browser-to-increase-intelligence
Prototype idea: toy intent classifier — a tiny keyword/embedding-free scorer routing ~12 sample queries into intents (research / study / shop / doomscroll), chart: horizontal bar of intent confidence per query group, second chart: "assist vs replace" framing — fraction of task kept with the human across modes.
