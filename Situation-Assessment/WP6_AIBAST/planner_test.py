import os
from huggingface_hub import InferenceClient
from pentester.neo4j_connector import Neo4jConnector
from pentester.planner import Planner
from pentester.utils import NovitaChatLLM, PentestNode
import json 

# api_key = os.getenv("NOVITA_API_KEY")
# client = InferenceClient(provider="novita", api_key=api_key)
# neo4j = Neo4jConnector(uri="bolt://localhost:7687", user="neo4j", password="testtest")
# client = InferenceClient(provider="novita", api_key=api_key)
# mem_model = "meta-llama/Llama-3.1-8B-Instruct"
# planner_llm = NovitaChatLLM(client=client, model=mem_model, max_tokens=2000)

# planner = Planner(planner_llm, neo4j)

# graph_data = planner.get_graph_data()
# print(graph_data)
# new_tasks = planner.process_graph_data(graph_data)
# print(new_tasks)
# #planner.add_generated_task_to_task_list(new_tasks)


import networkx as nx

network_graph = nx.DiGraph()
network_graph_file = r"pentester\network_graph_draft.json"

with open(network_graph_file, "r") as file:
    network_graph_data = json.load(file)




for ip, info in network_graph_data.items():
    node = PentestNode(ip=ip, info=info)
    network_graph.add_node(ip, node=node)
   

#print(network_graph.nodes)