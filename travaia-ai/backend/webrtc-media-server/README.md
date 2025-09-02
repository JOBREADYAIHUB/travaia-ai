# TRAVAIA WebRTC Media Server

Enterprise-grade WebRTC infrastructure for real-time voice communication using LiveKit and COTURN.

## Architecture

- **LiveKit Server**: Main WebRTC media server for room management and media routing
- **Redis**: Session storage and pub/sub for scaling
- **COTURN**: TURN/STUN server for NAT traversal
- **Load Balancer**: Multi-region deployment support

## Quick Start

### Local Development

```bash
# Set environment variables
export LIVEKIT_API_KEY="your-api-key"
export LIVEKIT_API_SECRET="your-api-secret"
export LIVEKIT_WEBHOOK_KEY="your-webhook-key"
export TURN_PASSWORD="your-turn-password"

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Production Deployment

```bash
# Deploy to Google Cloud Run
gcloud run deploy travaia-webrtc-server \
  --image=livekit/livekit-server:latest \
  --platform=managed \
  --region=us-central1 \
  --port=7880 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --set-env-vars="LIVEKIT_API_KEY=${LIVEKIT_API_KEY},LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}"
```

## Configuration

### Environment Variables

- `LIVEKIT_API_KEY`: API key for LiveKit authentication
- `LIVEKIT_API_SECRET`: API secret for LiveKit authentication
- `LIVEKIT_WEBHOOK_KEY`: Webhook authentication key
- `TURN_USERNAME`: TURN server username (default: travaia)
- `TURN_PASSWORD`: TURN server password
- `EXTERNAL_IP`: External IP address for TURN server

### SSL Certificates

Place SSL certificates in the `certs/` directory:
- `cert.pem`: SSL certificate
- `key.pem`: Private key

## API Integration

### Creating Rooms

```python
import livekit
from livekit import api

# Initialize client
client = api.LiveKitAPI(
    url="wss://webrtc.travaia.com",
    api_key="your-api-key",
    api_secret="your-api-secret"
)

# Create room
room = await client.room.create_room(
    api.CreateRoomRequest(
        name="coaching-session-123",
        max_participants=2,
        empty_timeout=300
    )
)
```

### Generating Access Tokens

```python
from livekit import AccessToken, VideoGrants

def create_token(user_id: str, room_name: str) -> str:
    token = AccessToken(api_key, api_secret)
    token.with_identity(user_id)
    token.with_name(f"User {user_id}")
    token.with_grants(VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True
    ))
    return token.to_jwt()
```

## Monitoring

### Health Checks

- LiveKit: `http://localhost:7880/health`
- Redis: `redis-cli ping`
- COTURN: Check logs at `/var/log/coturn.log`

### Metrics

LiveKit exposes Prometheus metrics at `/metrics` endpoint.

## Scaling

### Multi-Region Deployment

Deploy LiveKit servers in multiple regions:
- US: `us-central1`, `us-east1`
- EU: `europe-west1`, `europe-west3`
- ASIA: `asia-southeast1`, `asia-northeast1`

### Load Balancing

Use Google Cloud Load Balancer with health checks:

```yaml
health_check:
  path: /health
  port: 7880
  interval: 30s
  timeout: 10s
```

## Security

### Network Security

- All traffic encrypted with DTLS/SRTP
- TURN server authentication required
- Webhook signature verification
- Rate limiting on API endpoints

### Access Control

- JWT-based room access tokens
- User identity verification
- Room-level permissions
- Recording consent management

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check TURN server configuration and firewall rules
2. **Audio Quality**: Verify codec settings and bandwidth limits
3. **Scaling Issues**: Monitor Redis connection pool and memory usage

### Debug Commands

```bash
# Check LiveKit logs
docker logs travaia-livekit-server

# Test TURN connectivity
turnutils_uclient -T -u travaia -w password -v turn.travaia.com

# Monitor Redis
redis-cli monitor
```

## Integration with TRAVAIA Services

### CareerGPT Coach Service

```python
# Create coaching room
room_name = f"coaching-{user_id}-{session_id}"
token = create_token(user_id, room_name)

# Join room for voice coaching
await careergpt_service.start_voice_session(
    session_id=session_id,
    room_name=room_name,
    access_token=token
)
```

### Voice Processing Service

```python
# Process audio from WebRTC stream
audio_data = await webrtc_room.receive_audio()
processed_audio = await voice_service.optimize_audio(audio_data)
await webrtc_room.send_audio(processed_audio)
```
