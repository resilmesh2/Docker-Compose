import logging
import os
import re
import ipaddress
from dotenv import load_dotenv

from typing import List, Dict, Any, Tuple, Optional, Set
from huggingface_hub import InferenceClient
import networkx as nx
from langchain.prompts import PromptTemplate
from langgraph.graph import StateGraph, END

from pentester.utils import NovitaChatLLM, LLMtoCommand, PentestState, PentestNode
from pentester.config import MEM_LOG
from pentester.pentest_types import PlannerInfo, ScanResult, Task
from pentester.neo4j_connector import Neo4jConnector
from pentester.memory_saver import MemoryAgent
from pentester.graph_builder import GraphBuilder
from pentester.memory_saver_templates import (
    nmap_template,
    json_summarize_template,
    analysis_template,
)
from pentester.test_data import simpulate_completed_tasks, simulate_pending_tasks  



api_key = os.getenv("NOVITA_API_KEY")


client = InferenceClient(provider="novita", api_key=api_key)

neo4j = Neo4jConnector(uri="bolt://localhost:7687", user="neo4j", password="testtest")

########## EXECUTOR ######################

# Load the Hugging Face model via API
exec_model = "meta-llama/llama-3.3-70b-instruct"
# "meta-llama/Llama-3.1-8B-Instruct"

# ✅ Inject the client when creating the LangChain LLM
exec_llm = NovitaChatLLM(client=client, model=exec_model, max_tokens=2000)
input_file = r"./pentester/planner_tasks.json"

########### MEMORY AGENT ######################

# Load the Hugging Face model via API
mem_model = "meta-llama/Llama-3.1-8B-Instruct"
# "meta-llama/Llama-3.1-8B-Instruct" #"Qwen/Qwen2.5-Coder-32B-Instruct"

client = InferenceClient(provider="novita", api_key=api_key)

# ✅ Inject the client when creating the LangChain LLM
mem_llm = NovitaChatLLM(client=client, model=mem_model, max_tokens=2000)

builder = GraphBuilder(mem_llm, exec_llm, input_file, neo4j)

graph = builder.build_mem_graph()


var = {
    "pending_tasks": [
        {
            "task_id": 1,
            "description": "Perform a basic network discovery scan to identify live hosts on the network.",
            "target": "192.168.0.0/24",
            "type": "nmap_scan",
            "error_count": 0,
            "dependencies": [],
            "command": "nmap -sP -T4 --min-parallelism 100 --host-timeout 10ms --max-rtt-timeout 200ms 192.168.0.0/24",
            "command_output": """Starting Nmap 7.95 ( https://nmap.org ) at 2025-07-10 07:55 UTC
Nmap scan report for 192.168.0.1
Host is up (0.000081s latency).
MAC Address: 02:42:2E:B5:C1:EA (Unknown)
Nmap scan report for rm_llm_multiagent-solution-1.rm_llm_multiagent_resilmesh (192.168.0.3)
Host is up (0.0000070s latency).
MAC Address: 02:42:C0:A8:00:03 (Unknown)
Nmap scan report for rm_llm_multiagent-orchestrator-1.rm_llm_multiagent_resilmesh (192.168.0.4)
Host is up (0.0000060s latency).
MAC Address: 02:42:C0:A8:00:04 (Unknown)
Nmap scan report for rm_llm_multiagent-plc-1.rm_llm_multiagent_resilmesh (192.168.0.5)
Host is up (0.0000060s latency).
MAC Address: 02:42:C0:A8:00:05 (Unknown)
Nmap scan report for rm_llm_multiagent-robot-1.rm_llm_multiagent_resilmesh (192.168.0.6)
Host is up (0.000028s latency).
MAC Address: 02:42:C0:A8:00:06 (Unknown)
Nmap scan report for 9adca534bd37 (192.168.0.2)
Host is up.
Nmap done: 256 IP addresses (6 hosts up) scanned in 3.61 seconds
""",
            "error": None,
            "task_summary": None
        }
    ],
    "completed_tasks": [
        {
            "task_id": 1,
            "description": "Perform a basic network discovery scan to identify live hosts on the network.",
            "target": "192.168.0.0/24",
            "type": "nmap_scan",
            "error_count": 0,
            "dependencies": [],
            "command": "nmap -sP -T4 --min-parallelism 100 --host-timeout 10ms --max-rtt-timeout 200ms 192.168.0.0/24",
            "command_output": """Starting Nmap 7.95 ( https://nmap.org ) at 2025-07-10 07:55 UTC
Nmap scan report for 192.168.0.1
Host is up (0.000081s latency).
MAC Address: 02:42:2E:B5:C1:EA (Unknown)
Nmap scan report for rm_llm_multiagent-solution-1.rm_llm_multiagent_resilmesh (192.168.0.3)
Host is up (0.0000070s latency).
MAC Address: 02:42:C0:A8:00:03 (Unknown)
Nmap scan report for rm_llm_multiagent-orchestrator-1.rm_llm_multiagent_resilmesh (192.168.0.4)
Host is up (0.0000060s latency).
MAC Address: 02:42:C0:A8:00:04 (Unknown)
Nmap scan report for rm_llm_multiagent-plc-1.rm_llm_multiagent_resilmesh (192.168.0.5)
Host is up (0.0000060s latency).
MAC Address: 02:42:C0:A8:00:05 (Unknown)
Nmap scan report for rm_llm_multiagent-robot-1.rm_llm_multiagent_resilmesh (192.168.0.6)
Host is up (0.000028s latency).
MAC Address: 02:42:C0:A8:00:06 (Unknown)
Nmap scan report for 9adca534bd37 (192.168.0.2)
Host is up.
Nmap done: 256 IP addresses (6 hosts up) scanned in 3.61 seconds
""",
            "error": None,
            "task_summary": None
        }
    ],
    "current_phase": "memory_saving",
    "errors": [],
    "graph_data": {}
}





# Execute workflow
initial_state = PentestState(
    **var
)

result = graph.invoke(initial_state)