"""__projectName__ — minimal LangGraph agent entrypoint."""
from __future__ import annotations

from langgraph.graph import END, StateGraph
from typing import TypedDict


class State(TypedDict):
    user_input: str
    response: str


def respond(state: State) -> State:
    return {"user_input": state["user_input"], "response": f"echo: {state['user_input']}"}


def build_graph() -> StateGraph:
    g = StateGraph(State)
    g.add_node("respond", respond)
    g.set_entry_point("respond")
    g.add_edge("respond", END)
    return g.compile()


if __name__ == "__main__":
    graph = build_graph()
    out = graph.invoke({"user_input": "hello", "response": ""})
    print(out)
