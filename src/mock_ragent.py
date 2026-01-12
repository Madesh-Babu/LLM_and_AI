"""
Mock ragent implementation for Python 3 compatibility
Provides the same interface as the original ragent package
"""

from abc import ABC, abstractmethod
from flask import request
import socketio

class RealtimeConfig:
    """Mock RealtimeConfig class"""
    
    @classmethod
    def to_dict(cls):
        return {
            'sample_rate': 16000,
            'channels': 1,
            'bit_depth': 16,
            'format': 'wav',
            'chunk_size': 1024
        }

class ConfigService:
    """Mock ConfigService class"""
    
    def __init__(self, config_overrides=None):
        self.config_overrides = config_overrides or {}
    
    def get_server_config(self):
        return {
            'host': '0.0.0.0',
            'port': 5000,
            'debug': True
        }

# Abstract base classes for interfaces
class WebApp(ABC):
    @abstractmethod
    def add_route(self, rule, endpoint, view_func, **options):
        pass
    
    @abstractmethod
    def route(self, rule, **options):
        pass
    
    @abstractmethod
    def run(self, host="0.0.0.0", port=5000, **options):
        pass
    
    @abstractmethod
    def get_wsgi_app(self):
        pass

class WebSocketHandler(ABC):
    @abstractmethod
    def on(self, event, handler):
        pass
    
    @abstractmethod
    def on_error(self, handler):
        pass
    
    @abstractmethod
    def emit(self, event, data=None, **kwargs):
        pass
    
    @abstractmethod
    def get_current_client_id(self) -> str:
        pass

class WebFrameworkAdapter(ABC):
    @abstractmethod
    def create_app(self, **config) -> WebApp:
        pass
    
    @abstractmethod
    def create_websocket_handler(self, app: WebApp, **kwargs) -> WebSocketHandler:
        pass
    
    @abstractmethod
    def get_app_instance(self) -> WebApp:
        pass
    
    @abstractmethod
    def get_websocket_handler(self) -> WebSocketHandler:
        pass

class UniversalSocketIOHandler:
    """Mock UniversalSocketIOHandler"""
    
    def __init__(self, socketio):
        self.socketio = socketio
    
    def on(self, event, handler):
        self.socketio.on(event, handler)
    
    def emit(self, event, data=None, **kwargs):
        self.socketio.emit(event, data, **kwargs)

class CreateVoiceGateway:
    """Mock Voice Gateway Creator"""
    
    @staticmethod
    def create(framework_adapter, on_transcript, config_overrides=None):
        """Mock voice gateway creation"""
        print("🚀 Mock ragent voice gateway created")
        print(f"   Framework adapter: {type(framework_adapter).__name__}")
        print(f"   Config overrides: {config_overrides}")
        
        # Set up WebSocket handlers for voice
        socketio = framework_adapter.get_websocket_handler()._socketio
        
        @socketio.on('start_voice_session')
        def handle_start_voice_session():
            print(f"🎤 Voice session started")
            session_id = f"session_{hash(str(socketio)) % 10000}"
            socketio.emit('voice_session_start', {'session_id': session_id})
        
        @socketio.on('end_voice_session')
        def handle_end_voice_session(data):
            print(f"🔇 Voice session ended: {data}")
            session_id = data.get('session_id') if data else 'unknown'
            socketio.emit('voice_session_end', {'session_id': session_id})
        
        @socketio.on('voice_audio')
        def handle_voice_audio(data):
            print(f"🔊 Received audio data: {len(str(data))} chars")
            # Mock processing - in real implementation this would use ASR
            mock_transcript = "This is a mock transcript from audio processing"
            
            # Call the transcript callback
            try:
                result = on_transcript(
                    data.get('session_id') if data else 'unknown', 
                    mock_transcript, 
                    data or {}, 
                    socketio, 
                    None  # Mock TTS
                )
                print(f"🤖 Processed transcript: {result}")
                
                # Emit AI response
                socketio.emit('ai_response', {
                    'response': mock_transcript,
                    'session_id': data.get('session_id') if data else 'unknown'
                })
                
            except Exception as e:
                print(f"❌ Error processing transcript: {e}")
                socketio.emit('error', {'message': str(e)})
        
        return MockVoiceGateway()

class MockVoiceGateway:
    """Mock Voice Gateway implementation"""
    
    def __init__(self):
        self.active_sessions = set()
    
    def start_session(self, session_id):
        self.active_sessions.add(session_id)
        print(f"🎤 Voice session started: {session_id}")
    
    def end_session(self, session_id):
        self.active_sessions.discard(session_id)
        print(f"🔇 Voice session ended: {session_id}")
    
    def process_audio(self, session_id, audio_data):
        print(f"🔊 Processing audio for session {session_id}: {len(audio_data)} bytes")
        return {"status": "processed"}

# Create the interfaces module
interfaces_module = type('interfaces', (), {
    'WebApp': WebApp,
    'WebSocketHandler': WebSocketHandler,
    'WebFrameworkAdapter': WebFrameworkAdapter
})

# Create the infrastructure module
infrastructure_module = type('infrastructure', (), {
    'UniversalSocketIOHandler': UniversalSocketIOHandler
})

# Create the voice_gateway module
voice_gateway_module = type('voice_gateway', (), {
    'RealtimeConfig': RealtimeConfig,
    'CreateVoiceGateway': CreateVoiceGateway,
    'interfaces': interfaces_module,
    'infrastructure': infrastructure_module
})

# Create the mock ragent module
import sys
from types import ModuleType

ragent = ModuleType('ragent')
ragent.voice_gateway = voice_gateway_module

# Add to sys.modules
sys.modules['ragent'] = ragent
sys.modules['ragent.voice_gateway'] = voice_gateway_module
sys.modules['ragent.voice_gateway.interfaces'] = interfaces_module
sys.modules['ragent.voice_gateway.infrastructure'] = infrastructure_module

print("🔧 Mock ragent module with interfaces loaded successfully")
