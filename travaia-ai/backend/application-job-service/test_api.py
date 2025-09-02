"""
Test script to verify the job applications API endpoint
"""
import requests
import json
import os
from datetime import datetime
import argparse

def test_get_applications(user_id, page=1, limit=10, base_url="http://localhost:8000"):
    """Test the get applications endpoint with pagination"""
    
    url = f"{base_url}/api/applications"
    
    # Add pagination parameters
    params = {
        "page": page,
        "limit": limit
    }
    
    # Add authorization header with fake user ID for testing
    headers = {
        "Authorization": f"Bearer {user_id}"  # In the auth middleware, we're extracting user_id from the token
    }
    
    print(f"🔍 Testing GET {url}")
    print(f"📄 Parameters: page={page}, limit={limit}")
    print(f"👤 Using user_id: {user_id}")
    
    try:
        response = requests.get(url, params=params, headers=headers)
        
        # Print status and timing info
        print(f"📊 Status: {response.status_code}")
        print(f"⏱️ Response time: {response.elapsed.total_seconds():.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            
            # Pretty print the response data structure
            print("\n📋 Response structure:")
            if "applications" in data:
                print(f"  applications: list[{len(data['applications'])} items]")
                
                # If we have applications, show details of the first one
                if data['applications']:
                    first_app = data['applications'][0]
                    print("\n📝 Sample application:")
                    for key, value in first_app.items():
                        if key != 'notes' and key != 'contacts':
                            print(f"  {key}: {value}")
                else:
                    print("  No applications found")
                
                # Show pagination info
                if "pagination" in data:
                    print("\n📚 Pagination info:")
                    for key, value in data["pagination"].items():
                        print(f"  {key}: {value}")
            else:
                # If the structure is different, just pretty print everything
                print(json.dumps(data, indent=2))
                
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return None

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Test the job applications API')
    parser.add_argument('--user', required=True, help='User ID for testing')
    parser.add_argument('--page', type=int, default=1, help='Page number')
    parser.add_argument('--limit', type=int, default=10, help='Number of items per page')
    parser.add_argument('--url', default='http://localhost:8000', help='Base URL of the API')
    
    args = parser.parse_args()
    
    # Run the test
    test_get_applications(
        user_id=args.user,
        page=args.page,
        limit=args.limit,
        base_url=args.url
    )
