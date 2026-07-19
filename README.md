# Gyrus

An agentic browser that tries to make you a sharper researcher instead of just outsourcing the thinking to an agent.

Built in 36-ish hours at WeaveHacks — Agent Protocols Hackathon (Weights & Biases + Google), San Francisco (July 2025).

Gyrus started life as Clay — we rebranded for the hackathon in case Weights & Biases minded the name. The research behind it later evolved into [Friction](https://github.com/Aryagarg23/Friction), the same question taken to the OS and hardware level.

https://github.com/user-attachments/assets/02b633c0-783a-4aa4-b7f7-60a021f90381

## What it does

Gyrus watches what you search and builds a memory graph of it in Neo4j: queries, the concepts they cluster into, and the links you click. Every query goes through an intent classifier first — Research, Answer, Transactional, News, or Navigational — and what happens next depends on the intent. A Research or News query gets handed to a CrewAI "crew" that pulls from Exa, arXiv, Semantic Scholar, GDELT, or NewsAPI and comes back with a consolidated set of links. Everything else just passes through.

Before any query text leaves the machine for an external API or model, a PII scrubber (CHAAP) strips emails, phone numbers, SSNs, card numbers, and names out of it.

The browser itself is an Electron app with a custom webview shell, not a wrapper around Chrome's UI.

## How it works

- **Intent detection** — `backend/src/fivedvector.py` scores each query against two signal sources: a lookup over past DB behavior, and a zero-shot DeBERTa classifier (`backend/tools/intent_zero_shot_classifier.py`, ensembled over four hypothesis templates) — and takes whichever source is most confident. `model-finetune/roberta.py` is a separate Colab notebook that fine-tunes RoBERTa on the ORCAS-I-2M query dataset (~2M queries) for the same intent split, to check the zero-shot approach against a supervised baseline.
- **Memory graph** — `backend/src/query_orch.py` embeds each query's concept with `sentence-transformers` (MiniLM) and writes it into Neo4j as `Concept`, `Query`, and `Link` nodes, connected by `SEARCHED_BY` and `CLICKED` edges. A new concept merges into an existing one above a cosine-similarity threshold instead of duplicating it.
- **Crews** — `backend/MCP/newscrew_http.py` and `researchcrew.py` are CrewAI agents wired to Exa, arXiv, Semantic Scholar, GDELT, and NewsAPI through an MCP server, with Weave tracking on the CrewAI runs.
- **Privacy** — `backend/tools/chaap_anonymize.py` is a regex-based obfuscator that scrubs PII before a query touches any external API or model.
- **Frontend** — `browser/` is an Electron app (`main.js`, `preload.js`) talking to the Flask backend (`backend/src/app.py`) over REST.

## Prototype

`prototype/crew_routing.py` draws a concept sketch of the shipped routing architecture — no invented numbers, just the pipeline as built: a browsing signal (history, current tabs, queries) passes through the CHAAP PII obfuscation layer, then feeds both the Neo4j memory graph and the zero-shot intent classifier, which together settle on an intent (research / study / shop / doomscroll). That intent picks a matching CrewAI crew, which pulls from arXiv, Semantic Scholar, Exa, GDELT, and NewsAPI, and lands on an assist action (surface papers, quiz, block-the-feed nudge).

Run it locally to regenerate the figure:
```
MPLCONFIGDIR=/home/arya/projects/hackathons/.mplcache /home/arya/projects/hackathons/.venv/bin/python prototype/crew_routing.py
```

![Gyrus routing: from a browsing signal to an assist action](https://vircgxpcwyvniemqmdyi.supabase.co/storage/v1/object/public/media/writing/Gyrus/crew_routing.png)

## Team

- **Arya Garg** — [github.com/Aryagarg23](https://github.com/Aryagarg23) — browser frontend (Electron UI, styling), backend wiring.
- **[Kaaustaaub Shankar](https://kaaustaaub.netlify.app/)** — memory graph, API.
- **[Raihan Rafeek](https://www.rai-1975.com/)** — PII obfuscation (CHAAP), memory-intent analysis.

## Links

- [Devpost](https://devpost.com/software/gyrus-an-agentic-browser-to-increase-intelligence)
- [Writeup](https://aryagarg23.com/writing/gyrus)
- [aryagarg23.com](https://aryagarg23.com)
- [Devpost profile](https://devpost.com/Aryagarg23)

## More hackathon builds

- [WhiteBox](https://github.com/Aryagarg23/WhiteBox) — traceable GraphRAG over medical literature (Future of Data 2024, 1st place)
- [G-Code-Assembler](https://github.com/Aryagarg23/G-Code-Assembler) — G-code assembly + STL visualization (MakeUC 2024, Kinetic Vision winner)
- [Terminally-Addicted](https://github.com/Aryagarg23/Terminally-Addicted) — Spotify, GitHub, GPT and YouTube without leaving the terminal (HackOHI/O 2024)
- [Memento](https://github.com/Aryagarg23/Memento) — digital memory journal for Alzheimer's patients and caregivers (RevolutionUC 2024, 3rd overall)
- [Buycott](https://github.com/Aryagarg23/Buycott) — barcode scan -> parent company -> NLP stance on social issues (MakeUC 2023, 1st overall)
- [SignLink](https://github.com/Aryagarg23/SignLink) — video calls with real-time ASL fingerspelling to text (BoilerMake X 2023)
- [Kuka Arm Viz](https://github.com/Aryagarg23/Visualizing-Kuka-7-Node-Robot-Arm) — interactive 7-DOF robot arm in WebGL with inverse kinematics (RevolutionUC 2023)
- [Hi-Five](https://github.com/Aryagarg23/Hi-Five) — anonymous friend-matching on OCEAN personality vectors (SASEhack 2024)
- [Friction](https://github.com/Aryagarg23/Friction) — speculative OS + hardware that protects flow state with physical friction (Fig Build 2026)
