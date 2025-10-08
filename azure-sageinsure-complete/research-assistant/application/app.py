# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Adapted from https://github.com/kyopark2014/strands-agent
# SPDX-License-Identifier: MIT

import logging
import sys

import streamlit as st

import chat

logging.basicConfig(
    level=logging.INFO,  # Default to INFO level
    format="%(filename)s:%(lineno)d | %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)],
)
logger = logging.getLogger("streamlit")

# title
st.set_page_config(
    page_title="SageInsure Research Assistant",
    page_icon="🔬",
    layout="centered",
    initial_sidebar_state="auto",
    menu_items=None,
)

with st.sidebar:
    st.title("Menu")

    st.markdown(
        "🧠 **Azure OpenAI GPT-4o** powered research assistant with MCP servers for comprehensive analysis. "
        "Integrated with Azure Cognitive Search and Azure Container Apps."
    )

    # model selection box
    modelName = st.selectbox(
        "🖊️ Choose your Azure OpenAI model",
        (
            "GPT-4o (Latest)",
            "GPT-4o-mini",
            "GPT-4 Turbo",
            "GPT-3.5 Turbo",
        ),
        index=0,
    )

    # extended thinking for GPT-4o models
    select_reasoning = st.checkbox(
        "Advanced Reasoning (GPT-4o models)", value=False
    )
    reasoningMode = (
        "Enable"
        if select_reasoning and "GPT-4o" in modelName
        else "Disable"
    )
    logger.info(f"reasoningMode: {reasoningMode}")

    chat.update(modelName, reasoningMode)

    clear_button = st.button("Reset Conversation", key="clear")

st.title("🔬 SageInsure Research Assistant")
st.markdown("**Powered by:** 🧠 Azure OpenAI GPT-4o | 🔍 Azure Cognitive Search | 📡 MCP Servers | 🏗️ Azure Container Apps")

if clear_button is True:
    chat.initiate()

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []
    st.session_state.greetings = False


# Display chat messages from history on app rerun
def display_chat_messages():
    """Print message history
    @returns None
    """
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            if "images" in message:
                for url in message["images"]:
                    logger.info(f"url: {url}")

                    file_name = url[url.rfind("/") + 1 :]
                    st.image(url, caption=file_name, use_container_width=True)
            st.markdown(message["content"])


display_chat_messages()

# Greet user
if not st.session_state.greetings:
    with st.chat_message("assistant"):
        intro = "🔬 **Welcome to SageInsure Research Assistant!**\n\nI'm powered by **Azure OpenAI GPT-4o** with access to multiple research databases through MCP servers:\n\n📚 **Available Research Sources:**\n• ArXiv - Academic papers and preprints\n• PubMed - Medical literature\n• ClinicalTrials.gov - Clinical trial data\n• ChEMBL - Chemical database\n• Tavily - Web search\n\n🎯 **I can help with:**\n• Insurance industry research\n• Risk analysis and trends\n• Regulatory compliance research\n• Market analysis\n• Technical documentation\n\nHow can I assist with your research today?"
        st.markdown(intro)
        # Add assistant response to chat history
        st.session_state.messages.append({"role": "assistant", "content": intro})
        st.session_state.greetings = True

if clear_button or "messages" not in st.session_state:
    st.session_state.messages = []
    st.session_state.greetings = False
    st.rerun()

    chat.clear_chat_history()

# Always show the chat input
if prompt := st.chat_input("Enter your message."):
    with st.chat_message("user"):  # display user message in chat message container
        st.markdown(prompt)

    st.session_state.messages.append(
        {"role": "user", "content": prompt}
    )  # add user message to chat history
    prompt = prompt.replace('"', "").replace("'", "")
    logger.info(f"prompt: {prompt}")

    with st.chat_message("assistant"):
        sessionState = ""
        chat.references = []
        chat.image_url = []
        response = chat.run_multi_agent_system(prompt, "Enable", st)

    st.session_state.messages.append({"role": "assistant", "content": response})
