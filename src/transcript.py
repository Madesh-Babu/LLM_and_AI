import asyncio
from flask import current_app


def _safe_emit(event_emitter, event_name, payload):
    if not event_emitter or not hasattr(event_emitter, "emit"):
        return
    try:
        event_emitter.emit(event_name, payload)
    except Exception:
        pass


async def create_ragent_callback():
    active_sessions = set()

    def on_session_start(session_id):
        active_sessions.add(session_id)

    def on_session_end(session_id):
        active_sessions.discard(session_id)

    async def on_transcript(session_id, transcript, chat_payload, event_emitter, TTS):
        if session_id not in active_sessions:
            on_session_start(session_id)

        # 🔥 USE EXISTING RAG CHAIN
        rag_chain = current_app.config["RAG_CHAIN"]

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, rag_chain.invoke, transcript
        )

        _safe_emit(event_emitter, "ai_response", {
            "response": response,
            "session_id": session_id
        })

        return {"query": transcript}

    on_transcript.on_session_start = on_session_start
    on_transcript.on_session_end = on_session_end
    return on_transcript
