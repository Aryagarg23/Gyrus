from flask import Flask, request, jsonify
from flask_cors import CORS
from backend.src.db_schema import Query, Link, Concept
from backend.src.fivedvector import collect_all_intent
from backend.MCP.newscrew_http import run as news_run
from backend.MCP.researchcrew import run as res_run
from backend.tools.sources_parser import consolidate
from backend.src.query_orch import connect_links_to_query, find_similar_concepts, create_concept, connect_concept_to_query, retrieve_all_links_to_concept, retrieve_graph
from backend.tools.concept_categorizer import get_concept

app = Flask(__name__)
CORS(app)

@app.route('/api/search', methods=['POST'])
def search():
    data = request.get_json()
    query = Query(data['query'], intent="")

    result = collect_all_intent(query=query.content)

    intent = result.get('most_significant').get('intent')
    print("intent", intent)
    query.intent = intent

    if intent == 'News':
        links = consolidate(query.getContent(), news_run)
        answer = {'links': links, 'intent': intent}
    elif intent == 'Research':
        links = consolidate(query.getContent(), res_run)
        answer = {'links': links, 'intent': intent}
    else:
        # For Navigational, Transactional, and Answer intents, just return the query
        answer = {'query': query.getContent(), 'intent': intent}


    if answer != '':
        return jsonify(answer), 200
    else:
        return jsonify(answer), 400


@app.route('/api/add-links', methods=['POST'])
def link_adder():
    try:
        data = request.get_json()
        links = data.get('links')
        query = data.get('query')
        intent = data.get('intent')

        q = Query(query, intent)
        l = [Link(i) for i in links]
        connect_links_to_query(q, l)

        return jsonify('Success!'), 200
    except Exception as e:
        return jsonify(f"Error: {e}"), 400


@app.route('/api/new-query', methods=['POST'])
def query_adder():
    try:
        data = request.get_json()
        query = data.get('query')
        intent = data.get('intent')

        q = Query(query, intent)
        sim_concepts = find_similar_concepts(q)
        if isinstance(sim_concepts, str):
            # run_db_query returns an error string instead of raising
            raise RuntimeError(sim_concepts)

        # Empty DB (no Concept nodes yet): sim_concepts is [], so [0] raised
        # IndexError. Untested against a live Neo4j.
        if not sim_concepts or (sim_concepts[0].get('similarity') or 0) < 0.35:
            create_concept(q)

        else:
            for i in sim_concepts:
                if (i.get('similarity') or 0) > 0.40:
                    # connect_concept_to_query reads concept.name; rows are dicts
                    connect_concept_to_query(q, Concept(i.get('name'), i.get('intent'), None))

        return jsonify('Success!'), 200

    except Exception as e:
        return jsonify(f'Error: {e}'), 400


@app.route('/api/get-all-links-to-concept', methods=['POST'])
def get_all_links_to_concept():
    try:
        data = request.get_json()
        query = data.get('query')

        concept = get_concept(query)

        links = retrieve_all_links_to_concept(concept)

        return jsonify(links), 200

    except Exception as e:
        return jsonify(f'Error: {e}'), 400

@app.route('/api/get-graph', methods=['GET'])
def get_graph():
    try:
        graph = retrieve_graph()
    except Exception as e:
        return jsonify(f'Error: {e}'), 500

    return jsonify(graph), 200


@app.route('/api/health', methods=['GET'])
def health():
    # Cheap reachability check for the frontend (browser/src/js/api.js).
    # Says nothing about Neo4j or API keys.
    return jsonify({'ok': True}), 200

if __name__ == "__main__":
    app.run()