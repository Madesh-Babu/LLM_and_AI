import asyncio
from src.mock_ragent import CreateVoiceGateway

from src.adapter import FlaskAdapter
from src.transcript import create_ragent_callback
from src.config import get_ragent_config


def init_ragent(app, socketio):
    # config
    config_overrides, server_config = get_ragent_config()

    # adapter
    adapter = FlaskAdapter(app, socketio, **server_config)

    # callback
    on_transcript = asyncio.run(create_ragent_callback())

    # gateway
    gateway = CreateVoiceGateway.create(
        framework_adapter=adapter,
        on_transcript=on_transcript,
        config_overrides=config_overrides,
    )
    
    print("🚀 Ragent voice gateway initialized with mock implementation")
    return gateway
