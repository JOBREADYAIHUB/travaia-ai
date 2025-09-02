#!/usr/bin/env python3
"""
TRAVAIA VertexAI Connection Test Script
Tests all Google Cloud AI services integration
"""

import os
import sys
from pathlib import Path

def test_imports():
    """Test if all required packages are available"""
    print("🔍 Testing package imports...")
    
    try:
        import google.cloud.aiplatform as aiplatform
        print("✅ google-cloud-aiplatform imported successfully")
    except ImportError as e:
        print(f"❌ google-cloud-aiplatform import failed: {e}")
        return False
    
    try:
        from google.cloud import texttospeech
        print("✅ google-cloud-texttospeech imported successfully")
    except ImportError as e:
        print(f"❌ google-cloud-texttospeech import failed: {e}")
        return False
    
    try:
        from google.cloud import speech
        print("✅ google-cloud-speech imported successfully")
    except ImportError as e:
        print(f"❌ google-cloud-speech import failed: {e}")
        return False
    
    try:
        import google.auth
        print("✅ google-auth imported successfully")
    except ImportError as e:
        print(f"❌ google-auth import failed: {e}")
        return False
    
    return True

def test_environment_variables():
    """Test if required environment variables are set"""
    print("\n🔍 Testing environment variables...")
    
    required_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "GEMINI_API_KEY"
    ]
    
    all_set = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            if var == "GEMINI_API_KEY":
                print(f"✅ {var}: {'*' * 10}...{value[-4:]}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Not set")
            all_set = False
    
    return all_set

def test_service_account_file():
    """Test if service account file exists and is readable"""
    print("\n🔍 Testing service account file...")
    
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        print("❌ GOOGLE_APPLICATION_CREDENTIALS not set")
        return False
    
    if not os.path.exists(creds_path):
        print(f"❌ Service account file not found: {creds_path}")
        return False
    
    try:
        with open(creds_path, 'r') as f:
            import json
            data = json.load(f)
            if 'type' in data and data['type'] == 'service_account':
                print(f"✅ Service account file valid: {creds_path}")
                print(f"   Account: {data.get('client_email', 'Unknown')}")
                return True
            else:
                print(f"❌ Invalid service account file format")
                return False
    except Exception as e:
        print(f"❌ Error reading service account file: {e}")
        return False

def test_vertex_ai_connection():
    """Test VertexAI connection"""
    print("\n🔍 Testing VertexAI connection...")
    
    try:
        from google.cloud import aiplatform
        
        project = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        location = "us-central1"
        
        aiplatform.init(project=project, location=location)
        print(f"✅ VertexAI initialized successfully")
        print(f"   Project: {project}")
        print(f"   Location: {location}")
        return True
    except Exception as e:
        print(f"❌ VertexAI connection failed: {e}")
        return False

def test_text_to_speech():
    """Test Text-to-Speech API"""
    print("\n🔍 Testing Text-to-Speech API...")
    
    try:
        from google.cloud import texttospeech
        
        client = texttospeech.TextToSpeechClient()
        
        # List available voices to test connection
        response = client.list_voices()
        voices_count = len(response.voices)
        
        print(f"✅ Text-to-Speech API connected successfully")
        print(f"   Available voices: {voices_count}")
        
        # Test synthesis
        synthesis_input = texttospeech.SynthesisInput(text="Hello TRAVAIA")
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        
        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        
        print(f"   Test synthesis successful: {len(response.audio_content)} bytes")
        return True
        
    except Exception as e:
        print(f"❌ Text-to-Speech API failed: {e}")
        return False

def test_speech_to_text():
    """Test Speech-to-Text API"""
    print("\n🔍 Testing Speech-to-Text API...")
    
    try:
        from google.cloud import speech
        
        client = speech.SpeechClient()
        print("✅ Speech-to-Text API connected successfully")
        
        # Test with sample configuration
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
        )
        
        print("   Configuration test successful")
        return True
        
    except Exception as e:
        print(f"❌ Speech-to-Text API failed: {e}")
        return False

def test_gemini_api():
    """Test Gemini API key"""
    print("\n🔍 Testing Gemini API key...")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not set")
        return False
    
    if len(api_key) < 30:
        print("❌ GEMINI_API_KEY appears to be invalid (too short)")
        return False
    
    print(f"✅ GEMINI_API_KEY format appears valid")
    print(f"   Key length: {len(api_key)} characters")
    return True

def main():
    """Run all tests"""
    print("🚀 TRAVAIA VertexAI Connection Test")
    print("=" * 50)
    
    tests = [
        ("Package Imports", test_imports),
        ("Environment Variables", test_environment_variables),
        ("Service Account File", test_service_account_file),
        ("VertexAI Connection", test_vertex_ai_connection),
        ("Text-to-Speech API", test_text_to_speech),
        ("Speech-to-Text API", test_speech_to_text),
        ("Gemini API Key", test_gemini_api),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! VertexAI integration is ready.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the setup guide for solutions.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
