from backend.src.db_controller import run_db_query
from backend.src.db_schema import Concept, Query, Link
from sentence_transformers import SentenceTransformer
from backend.tools.concept_categorizer import get_concept
from typing import List

################################################
# SINGULAR TRANSACTIONS TO MAIN GRAPH
################################################
def find_similar_concepts(query: Query, top_k=5):
    print("query", query)
    model = SentenceTransformer('all-MiniLM-L6-v2', use_auth_token=False)  # or another model
    content = query.getContent()
    print("content", content)
    relevant_concept = get_concept(content)
    print("relevant_concept", relevant_concept)
    embedding = model.encode(relevant_concept).tolist()
    print("embedding", embedding)

    db_query = """
            WITH $embedding AS queryEmbedding
            MATCH (c:Concept)
            WITH c,
                REDUCE(dot = 0.0, i IN RANGE(0, SIZE(queryEmbedding)-1) | dot + queryEmbedding[i] * c.embeds[i]) AS dotProduct,
                SQRT(REDUCE(qSum = 0.0, i IN RANGE(0, SIZE(queryEmbedding)-1) | qSum + queryEmbedding[i]^2)) AS queryMagnitude,
                SQRT(REDUCE(cSum = 0.0, i IN RANGE(0, SIZE(c.embeds)-1) | cSum + c.embeds[i]^2)) AS conceptMagnitude
            WITH c,
                CASE
                    WHEN queryMagnitude = 0 OR conceptMagnitude = 0 THEN 0.0
                    ELSE dotProduct / (queryMagnitude * conceptMagnitude)
                END AS similarity
            RETURN c.name AS name, c.intent AS intent, similarity
            ORDER BY similarity DESC
            LIMIT $top_k
            """
    vars = {"embedding": embedding, "top_k": top_k}
    result = run_db_query(db_query, vars)

    return result

def create_concept(query: Query):
    model = SentenceTransformer('all-MiniLM-L6-v2', use_auth_token=False)  # or another model
    content = query.getContent()
    concept = get_concept(content)
    intent = query.intent # Assuming the roberta handles this
    embedding = model.encode(concept).tolist()

    concept = Concept(name=concept, intent=intent, embedding=embedding)

    cypher_query = """
    MERGE (c:Concept {name: $concept_name})
    ON CREATE SET c.intent = $intent, c.embeds = $embedding

    MERGE (q:Query {content: $query_content})
    ON CREATE SET q.intent = $intent

    MERGE (c)-[:SEARCHED_BY]->(q)
    """

    parameters = {
        "concept_name": concept.name,
        "intent": concept.intent,
        "embedding": concept.embedding,
        "query_content": content,
    }

    run_db_query(cypher_query, parameters)

def connect_concept_to_query(query: Query, concept: Concept):
    cypher_query = """
    MERGE (c:Concept {name: $concept_name})
    MERGE (q:Query {content: $query_content})
    MERGE (c)-[:SEARCHED_BY]->(q)
    """

    parameters = {
        "concept_name": concept.name,
        "query_content": query.content
    }

    run_db_query(cypher_query, parameters)

def connect_links_to_query(query: Query, links_visited: List[Link]):
    cypher_query = """
    MERGE (q: Query {content: $query_content})
    MERGE (l: Link {address: $link_address})
    MERGE (q)-[:CLICKED]-(l)
    """

    parameters = {
        "query_content": query.content,
        "link_address": ""
    }

    for link in links_visited:
        parameters["link_address"] = link.address

        # print(parameters)
        run_db_query(cypher_query, parameters)

def retrieve_all_related_concepts(query: Query):
    cypher_query = """
    MATCH (n:Concept)
    MATCH (m:Query {content: $query_content})
    MATCH (n)-[r:SEARCHED_BY]-(m:Query)
    RETURN n
    """

    parameters = {
        "query_content": query.content
    }

    result = run_db_query(cypher_query, parameters)

    return result


def retrieve_all_links_to_query(query: Query):
    cypher_query = """
    MATCH (n:Query {content: $query_content})
    MATCH (m:Link)
    MATCH (n)-[r:CLICKED]-(m)
    RETURN m
    """

    parameters = {
        "query_content": query.content
    }

    result = run_db_query(cypher_query, parameters)

    return result

def retrieve_all_links_to_concept(concept):
    cypher_query = """
    MATCH (n:Concept {name: $concept_name})
    MATCH (m:Query)
    MATCH (l:Link)
    MATCH (n)-[:SEARCHED_BY]-(m)-[:CLICKED]-(l)
    RETURN l
    """
    parameters = {
        "concept_name": concept
    }

    result = run_db_query(cypher_query, parameters)

    return(result)

def retrieve_graph():
    """Return the memory graph as JSON-safe {nodes, links} for the frontend.

    nodes: [{id, name, type}]  id = Neo4j elementId, type = 'concept'|'query'|'link'
    links: [{source, target, type}]  source/target are node ids, type = relationship type

    Untested against a live Neo4j: written from the schema in this file
    (Concept.name, Query.content, Link.address). elementId() needs Neo4j 5+.
    """
    cypher_query = """
    MATCH (n)
    WHERE n:Concept OR n:Query OR n:Link
    OPTIONAL MATCH (n)-[r]->(m)
    WHERE m:Concept OR m:Query OR m:Link
    RETURN elementId(n) AS n_id, labels(n) AS n_labels,
           coalesce(n.name, n.content, n.address) AS n_name,
           type(r) AS r_type,
           elementId(m) AS m_id, labels(m) AS m_labels,
           coalesce(m.name, m.content, m.address) AS m_name
    """
    result = run_db_query(cypher_query)
    if isinstance(result, str):
        # run_db_query returns an error string instead of raising
        raise RuntimeError(result)

    def node_type(labels):
        for label in ("Concept", "Query", "Link"):
            if label in (labels or []):
                return label.lower()
        return "unknown"

    nodes = {}
    links = []
    seen_links = set()

    for record in result:
        for prefix in ("n", "m"):
            node_id = record.get(f"{prefix}_id")
            if node_id is not None and node_id not in nodes:
                nodes[node_id] = {
                    "id": node_id,
                    "name": record.get(f"{prefix}_name") or "",
                    "type": node_type(record.get(f"{prefix}_labels")),
                }

        r_type = record.get("r_type")
        source, target = record.get("n_id"), record.get("m_id")
        if r_type is None or source is None or target is None:
            continue  # OPTIONAL MATCH found no relationship
        key = (source, target, r_type)
        if key not in seen_links:
            seen_links.add(key)
            links.append({"source": source, "target": target, "type": r_type})

    return {"nodes": list(nodes.values()), "links": links}



# if __name__ == "__main__":
#     q = Query('My breadboard is broken, how do I fix it?', intent='Informational')
#     print(find_similar_concepts(q))
    # q = Query('How to make sourdough', intent='Informational')
    # print(create_concept(q))
    # print(retrieve_graph())
