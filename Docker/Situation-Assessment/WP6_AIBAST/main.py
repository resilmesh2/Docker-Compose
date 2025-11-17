import os
from pentester.neo4j_connector import Neo4jConnector
from pentester.planner import Planner
from pentester.utils import NovitaChatLLM, PentestState, Task
from huggingface_hub import InferenceClient
from openai import OpenAI
from pentester.graph_builder import GraphBuilder
from pentester.memory_saver import MemoryAgent
from pentester.executor import Executor
from pentester.planner import Planner
from pentester.config import ATTACKER_CONTAINER_NAME


api_key = os.getenv("NOVITA_API_KEY")


client = InferenceClient(provider="novita", api_key=api_key)

neo4j = Neo4jConnector(uri="bolt://localhost:7687", user="neo4j", password="testtest")

network_graph_file = r"./pentester/network_graph.json"

########## EXECUTOR ######################

# Load the Hugging Face model via API
exec_model = "meta-llama/llama-4-maverick-17b-128e-instruct-fp8"
# "meta-llama/Llama-3.1-8B-Instruct"

# ✅ Inject the client when creating the LangChain LLM
exec_llm = NovitaChatLLM(client=client, model=exec_model, max_tokens=2000)
input_file = r"./pentester/planner_tasks.json"

########### MEMORY AGENT ######################

# Load the Hugging Face model via API
mem_model = "meta-llama/llama-4-scout-17b-16e-instruct"
# "meta-llama/Llama-3.1-8B-Instruct" #"Qwen/Qwen2.5-Coder-32B-Instruct"

client = InferenceClient(provider="novita", api_key=api_key)

# ✅ Inject the client when creating the LangChain LLM
mem_llm = NovitaChatLLM(client=client, model=mem_model, max_tokens=2000)

plan_model = "meta-llama/llama-3.3-70b-instruct" #"meta-llama/llama-3.3-70b-instruct" # "deepseek/deepseek-v3-0324" # "meta-llama/llama-3.3-70b-instruct"
# "meta-llama/Llama-3.1-8B-Instruct" #"Qwen/Qwen2.5-Coder-32B-Instruct"

#client = InferenceClient(provider="novita", api_key=api_key)
client = OpenAI(
    base_url="https://api.novita.ai/v3/openai",
    api_key=api_key,
)
# ✅ Inject the client when creating the LangChain LLM
planner_llm = NovitaChatLLM(client=client, model=plan_model, max_tokens=2000, enable_stream=False)


# #################### EXPLOITATION ##############

mode = "xploit"

memory_agent = MemoryAgent(mem_llm=mem_llm, neo4j=neo4j, mode=mode)

memory_agent.load_network_graph()

print(memory_agent.network_graph)

executor = Executor(exec_llm=exec_llm, container_name=ATTACKER_CONTAINER_NAME)

planner = Planner(planner_llm, neo4j, mode=mode)


builder = GraphBuilder(memory_agent, executor, planner, network_graph_file, neo4j)

graph = builder.build_xp_graph()

init_task = {
}
# Task(**init_task)
# Execute workflow
initial_state = PentestState(
    iteration=1,
    pending_tasks=[],
    completed_tasks=[],
    current_phase="execution",
    current_task=None,
    errors=[],
    graph_data={},
)

result = graph.invoke(initial_state, {"recursion_limit": 50})

#################### SCANNING ##################

# mode = "scan"

# memory_agent = MemoryAgent(mem_llm=mem_llm, neo4j=neo4j, mode=mode)

# executor = Executor(exec_llm=exec_llm, container_name=ATTACKER_CONTAINER_NAME)

# planner = Planner(planner_llm, neo4j, mode=mode)

# builder = GraphBuilder(memory_agent, executor, planner, network_graph_file, neo4j)

# graph = builder.build_scan_graph()

# init_task = {
#             "task_id": 1,
#             "description": "Perform a basic network discovery scan to identify live hosts on the network.",
#             "target": "192.168.0.0/24",
#             "dependencies": [],
#             "task_type": "nmap_scan"
# }

# # Execute workflow
# initial_state = PentestState(
#     iteration=1,
#     pending_tasks=[Task(**init_task)],
#     completed_tasks=[],
#     current_phase="execution",
#     current_task=None,
#     errors=[],
#     graph_data={},
# )

# result = graph.invoke(initial_state, {"recursion_limit": 50})



