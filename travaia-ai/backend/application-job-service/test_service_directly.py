"""
Direct test script for ApplicationService
This script tests the fixed pagination functionality directly without requiring the API server
"""
import asyncio
import os
import json
import sys
import traceback
from datetime import datetime, timezone

# Set up logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger('test_service')

# Add the current directory to path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print(f"Script starting in {os.getcwd()}...")
print(f"Python version: {sys.version}")
print(f"Path: {sys.path}")

try:
    from services.application_service import ApplicationService
    print("Successfully imported ApplicationService")
except ImportError as e:
    print(f"Error importing ApplicationService: {e}")
    traceback.print_exc()
    sys.exit(1)

async def test_pagination_directly():
    """Test the pagination functionality directly using the ApplicationService class"""
    
    print("\n\n========== TESTING PAGINATION DIRECTLY ==========\n")
    
    try:
        # Create instance of the service
        print("Creating ApplicationService instance...")
        service = ApplicationService()
        print("ApplicationService instance created successfully")
        
        # Use the real user ID provided
        test_user_id = "wRj3wH7vR0eUdH6Ckf6ZjFnLjyg1"  # Real user ID
        
        # Test various pagination scenarios
        scenarios = [
            {"page": 1, "limit": 5, "name": "First page with 5 items"},
            {"page": 2, "limit": 5, "name": "Second page with 5 items"},
            {"page": 1, "limit": 10, "name": "First page with 10 items"},
            {"page": 1, "limit": 50, "name": "First page with 50 items (all)"},
        ]
        
        print(f"🔍 Testing ApplicationService pagination directly")
        print(f"👤 Using user_id: {test_user_id}")
        
        # Check collection directly
        try:
            print("\n📁 Direct collection check:")
            db = service.db
            if not db:
                print("   ❌ Firestore DB not initialized")
            else:
                # Check root collections
                root_collections = [c.id for c in db.collections()]
                print(f"   Root collections: {root_collections}")
                
                # Check if user document exists
                user_doc = db.collection('users').document(test_user_id)
                user_exists = user_doc.get().exists
                print(f"   User document exists: {user_exists}")
                
                # Check user's subcollections
                if user_exists:
                    user_collections = [c.id for c in user_doc.collections()]
                    print(f"   User's collections: {user_collections}")
                    
                    # Check documents in jobApplications collection directly
                    if 'jobApplications' in user_collections:
                        print("\n📄 Checking documents in jobApplications collection:")
                        apps_ref = user_doc.collection('jobApplications')
                        apps = list(apps_ref.stream())
                        print(f"   Found {len(apps)} documents directly in collection")
                        
                        if apps:
                            # Print document IDs to verify they match what we see in Firebase console
                            print("   Document IDs:")
                            for app in apps[:5]:  # Show first 5
                                print(f"   - {app.id}")
                            
                            # Check first document fields
                            first_doc = apps[0].to_dict()
                            print(f"\n📄 First document fields: {list(first_doc.keys())}")
                            
                            # Check for timestamp fields
                            has_updated = 'updated_at' in first_doc
                            has_created = 'created_at' in first_doc
                            has_timestamp = 'timestamp' in first_doc
                            print(f"   Has updated_at: {has_updated}")
                            print(f"   Has created_at: {has_created}")
                            print(f"   Has timestamp: {has_timestamp}")
                            
                    # Look for applications under older path pattern
                    applications_ref = db.collection('applications').where('user_id', '==', test_user_id).limit(5)
                    old_apps = list(applications_ref.stream())
                    print(f"\n   Root 'applications' collection has {len(old_apps)} docs for this user")
                    
                    if len(old_apps) > 0:
                        sample = old_apps[0].to_dict()
                        print(f"   Sample old app fields: {list(sample.keys())}")
                else:
                    print("   ❌ User document doesn't exist")
        except Exception as e:
            print(f"   ❌ Error checking collections: {str(e)}")
            traceback.print_exc()
        
        for scenario in scenarios:
            page = scenario["page"]
            limit = scenario["limit"]
            name = scenario["name"]
            
            print(f"\n📊 Testing: {name}")
            print(f"   Parameters: page={page}, limit={limit}")
            
            try:
                start_time = datetime.now(timezone.utc)
                result = await service.get_user_applications_paginated(
                    user_id=test_user_id,
                    page=page,
                    limit=limit
                )
                end_time = datetime.now(timezone.utc)
                duration = (end_time - start_time).total_seconds()
                
                # Print results summary
                print(f"⏱️ Query duration: {duration:.3f}s")
                
                if result and "applications" in result:
                    apps_count = len(result["applications"])
                    print(f"📝 Retrieved {apps_count} applications")
                    
                    # Show details of pagination metadata
                    if "pagination" in result:
                        pagination = result["pagination"]
                        print("\n📚 Pagination metadata:")
                        print(f"   Page: {pagination.get('page')}")
                        print(f"   Limit: {pagination.get('limit')}")
                        print(f"   Total: {pagination.get('total')}")
                        print(f"   Total pages: {pagination.get('total_pages')}")
                        print(f"   Has next: {pagination.get('has_next')}")
                        print(f"   Has prev: {pagination.get('has_prev')}")
                    
                    # Show sample of first application if available
                    if apps_count > 0:
                        first_app = result["applications"][0]
                        print("\n📄 First application sample:")
                        for key in ["application_id", "job_title", "company_name", "status"]:
                            if key in first_app:
                                print(f"   {key}: {first_app[key]}")
                else:
                    print("❌ No applications or invalid result structure returned")
                    if result:
                        print(f"   Result structure: {list(result.keys())}")
                        
            except Exception as e:
                print(f"❌ Error: {str(e)}")
                import traceback
                print(traceback.format_exc())
        
        print("\n✅ Pagination testing complete")
        
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_pagination_directly())
