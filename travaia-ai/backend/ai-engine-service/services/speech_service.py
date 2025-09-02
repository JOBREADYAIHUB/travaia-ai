"""
Google Cloud Speech Service - Enterprise TTS/STT for 10M+ users
Optimized for high-performance speech processing with caching and batching
"""

import os
import asyncio
import base64
from typing import Optional, Dict, Any, List
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud import texttospeech, speech
import redis
import hashlib

logger = structlog.get_logger(__name__)

class SpeechService:
    """Enterprise speech service with caching and optimization"""
    
    def __init__(self):
        # Initialize Google Cloud clients
        self.tts_client = texttospeech.TextToSpeechClient()
        self.stt_client = speech.SpeechClient()
        
        # Redis for caching (optional, fallback gracefully)
        try:
            self.redis_client = redis.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                decode_responses=True,
                socket_connect_timeout=5
            )
            self.redis_client.ping()
            self.cache_enabled = True
        except:
            self.redis_client = None
            self.cache_enabled = False
            logger.warning("Redis not available, caching disabled")
        
        # TTS Configuration for enterprise quality
        self.tts_config = {
            "voice": texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Neural2-F",  # High-quality neural voice
                ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
            ),
            "audio_config": texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=1.0,
                pitch=0.0,
                volume_gain_db=0.0,
                sample_rate_hertz=24000  # High quality
            )
        }
        
        # STT Configuration for accuracy
        self.stt_config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code="en-US",
            model="latest_long",  # Best accuracy for interviews
            use_enhanced=True,
            enable_automatic_punctuation=True,
            enable_word_confidence=True,
            enable_word_time_offsets=True,
            profanity_filter=False,  # Keep original for analysis
            speech_contexts=[
                speech.SpeechContext(
                    phrases=[
                        "technical skills", "project management", "team leadership",
                        "problem solving", "communication", "experience", "challenge"
                    ]
                )
            ]
        )
        
        logger.info("Speech service initialized", cache_enabled=self.cache_enabled)

    def _get_cache_key(self, text: str, voice_params: Dict) -> str:
        """Generate cache key for TTS"""
        key_data = f"{text}_{voice_params.get('language_code', 'en-US')}_{voice_params.get('name', 'default')}"
        return f"tts:{hashlib.md5(key_data.encode()).hexdigest()}"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def text_to_speech(
        self, 
        text: str, 
        language_code: str = "en-US",
        voice_name: Optional[str] = None,
        speaking_rate: float = 1.0
    ) -> Dict[str, Any]:
        """Convert text to speech with enterprise caching"""
        
        # Prepare voice configuration
        voice_params = {
            "language_code": language_code,
            "name": voice_name or self._get_default_voice(language_code),
            "ssml_gender": texttospeech.SsmlVoiceGender.FEMALE
        }
        
        # Check cache first
        cache_key = self._get_cache_key(text, voice_params)
        if self.cache_enabled:
            try:
                cached_audio = self.redis_client.get(cache_key)
                if cached_audio:
                    logger.info("TTS cache hit", text_length=len(text))
                    return {
                        "audio_content": cached_audio,
                        "cached": True,
                        "duration_estimate": len(text) * 0.1  # Rough estimate
                    }
            except Exception as e:
                logger.warning("Cache read failed", error=str(e))
        
        try:
            # Configure voice and audio
            voice = texttospeech.VoiceSelectionParams(**voice_params)
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=speaking_rate,
                sample_rate_hertz=24000
            )
            
            # Prepare synthesis input
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Generate speech
            response = await asyncio.to_thread(
                self.tts_client.synthesize_speech,
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            # Encode audio content
            audio_b64 = base64.b64encode(response.audio_content).decode('utf-8')
            
            # Cache the result
            if self.cache_enabled:
                try:
                    self.redis_client.setex(cache_key, 3600, audio_b64)  # 1 hour cache
                except Exception as e:
                    logger.warning("Cache write failed", error=str(e))
            
            logger.info("TTS synthesis completed", text_length=len(text), language=language_code)
            
            return {
                "audio_content": audio_b64,
                "cached": False,
                "duration_estimate": len(text) * 0.1,
                "language_code": language_code,
                "voice_name": voice_params["name"]
            }
            
        except Exception as e:
            logger.error("TTS synthesis failed", error=str(e), text_length=len(text))
            raise Exception(f"Speech synthesis failed: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def speech_to_text(
        self, 
        audio_content: str,  # Base64 encoded
        language_code: str = "en-US",
        encoding: str = "WEBM_OPUS"
    ) -> Dict[str, Any]:
        """Convert speech to text with confidence scoring"""
        
        try:
            # Decode audio content
            audio_data = base64.b64decode(audio_content)
            
            # Configure recognition
            audio = speech.RecognitionAudio(content=audio_data)
            
            # Update config for this request
            config = speech.RecognitionConfig(
                encoding=getattr(speech.RecognitionConfig.AudioEncoding, encoding),
                sample_rate_hertz=48000,
                language_code=language_code,
                model="latest_long",
                use_enhanced=True,
                enable_automatic_punctuation=True,
                enable_word_confidence=True,
                enable_word_time_offsets=True,
                profanity_filter=False,
                speech_contexts=self.stt_config.speech_contexts
            )
            
            # Perform recognition
            response = await asyncio.to_thread(
                self.stt_client.recognize,
                config=config,
                audio=audio
            )
            
            # Process results
            if not response.results:
                return {
                    "transcript": "",
                    "confidence": 0.0,
                    "words": [],
                    "duration": 0.0,
                    "error": "No speech detected"
                }
            
            # Get best result
            result = response.results[0]
            alternative = result.alternatives[0]
            
            # Extract word-level details
            words = []
            if hasattr(alternative, 'words'):
                for word in alternative.words:
                    words.append({
                        "word": word.word,
                        "confidence": word.confidence,
                        "start_time": word.start_time.total_seconds(),
                        "end_time": word.end_time.total_seconds()
                    })
            
            # Calculate duration
            duration = words[-1]["end_time"] if words else 0.0
            
            logger.info(
                "STT transcription completed", 
                transcript_length=len(alternative.transcript),
                confidence=alternative.confidence,
                word_count=len(words)
            )
            
            return {
                "transcript": alternative.transcript,
                "confidence": alternative.confidence,
                "words": words,
                "duration": duration,
                "language_code": language_code,
                "word_count": len(words)
            }
            
        except Exception as e:
            logger.error("STT transcription failed", error=str(e))
            return {
                "transcript": "",
                "confidence": 0.0,
                "words": [],
                "duration": 0.0,
                "error": f"Transcription failed: {str(e)}"
            }

    def _get_default_voice(self, language_code: str) -> str:
        """Get default high-quality voice for language"""
        voice_map = {
            "en-US": "en-US-Neural2-F",
            "en-GB": "en-GB-Neural2-F", 
            "es-ES": "es-ES-Neural2-F",
            "fr-FR": "fr-FR-Neural2-F",
            "de-DE": "de-DE-Neural2-F",
            "it-IT": "it-IT-Neural2-F",
            "pt-BR": "pt-BR-Neural2-F",
            "ja-JP": "ja-JP-Neural2-B",
            "ko-KR": "ko-KR-Neural2-A",
            "zh-CN": "zh-CN-Neural2-A"
        }
        return voice_map.get(language_code, "en-US-Neural2-F")

    async def batch_text_to_speech(self, texts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Batch TTS processing for efficiency"""
        tasks = []
        for item in texts:
            task = self.text_to_speech(
                text=item["text"],
                language_code=item.get("language_code", "en-US"),
                voice_name=item.get("voice_name"),
                speaking_rate=item.get("speaking_rate", 1.0)
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results and handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "error": str(result),
                    "text": texts[i]["text"],
                    "audio_content": None
                })
            else:
                processed_results.append(result)
        
        logger.info("Batch TTS completed", batch_size=len(texts))
        return processed_results

    async def get_supported_voices(self, language_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get list of supported voices"""
        try:
            response = await asyncio.to_thread(self.tts_client.list_voices)
            
            voices = []
            for voice in response.voices:
                if language_code and language_code not in voice.language_codes:
                    continue
                    
                voices.append({
                    "name": voice.name,
                    "language_codes": list(voice.language_codes),
                    "gender": voice.ssml_gender.name,
                    "natural_sample_rate": voice.natural_sample_rate_hertz
                })
            
            return voices
            
        except Exception as e:
            logger.error("Failed to get supported voices", error=str(e))
            return []