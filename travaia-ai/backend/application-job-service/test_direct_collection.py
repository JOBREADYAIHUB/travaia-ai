"""
Simple test script to directly inspect and verify Firestore collection documents
"""
import os
import sys
import asyncio
from datetime import datetime
from google.cloud import firestore
import json

# Add the current directory to path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_direct_collection_access():
    """Directly access the documents in the user's jobApplications collection"""
    
    print("\n===== DIRECT FIRESTORE COLLECTION TEST =====\n")
    
    # User ID to test with
    user_id = "wRj3wH7vR0eUdH6Ckf6ZjFnLjyg1"  # Real user ID from screenshot
    
    try:
        # Initialize Firestore client
        print("Initializing Firestore client...")
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        db = firestore.Client(project=project_id)
        print(f"Connected to project: {project_id}")
        
        # Access user document
        print(f"\nAccessing user document for ID: {user_id}")
        user_doc_ref = db.collection("users").document(user_id)
        user_doc = user_doc_ref.get()
        print(f"User document exists: {user_doc.exists}")
        
        # List user's collections
        print("\nUser collections:")
        user_collections = [c.id for c in user_doc_ref.collections()]
        print(f"Found collections: {user_collections}")
        
        # Access jobApplications collection if it exists
        if "jobApplications" in user_collections:
            print("\n=== jobApplications collection ===")
            apps_ref = user_doc_ref.collection("jobApplications")
            
            # Get all documents
            print("Fetching all documents...")
            apps_docs = list(apps_ref.stream())
            print(f"Total documents: {len(apps_docs)}")
            
            # Print document IDs
            print("\nDocument IDs:")
            for idx, doc in enumerate(apps_docs[:10]):  # Show first 10 only
                print(f"{idx + 1}. {doc.id}")
            
            # Print a sample document
            if apps_docs:
                print("\nFirst document fields:")
                sample = apps_docs[0].to_dict()
                print(json.dumps({
                    "id": apps_docs[0].id,
                    "fields": list(sample.keys()),
                    "data": {
                        k: str(v) if not isinstance(v, (int, bool, str, float)) else v
                        for k, v in sample.items()
                    }
                }, indent=2))
        else:
            print("\nNo jobApplications collection found.")
        
        # Also check the root applications collection (old path)
        print("\n=== Root applications collection check ===")
        old_apps_ref = db.collection("applications").where("user_id", "==", user_id).limit(5)
        old_apps = list(old_apps_ref.stream())
        print(f"Documents in root 'applications' collection: {len(old_apps)}")
        
        if old_apps:
            print("First document from root collection:")
            old_sample = old_apps[0].to_dict()
            print(json.dumps({
                "id": old_apps[0].id,
                "fields": list(old_sample.keys()),
                "sample_data": {k: str(v) for k, v in list(old_sample.items())[:5]}
            }, indent=2))
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    # Set up output to both console and file
    output_file = "collection_test_output.txt"
    print(f"Writing output to {output_file}...")
    
    # Save original stdout
    original_stdout = sys.stdout
    
    # Open file for writing
    with open(output_file, 'w') as f:
        # Redirect stdout to file
        sys.stdout = f
        
        # Run the test
        asyncio.run(test_direct_collection_access())
        
    # Restore stdout
    sys.stdout = original_stdout
    print(f"Test complete. Results written to {output_file}")
    
    # Read back the file and print to console
    try:
        with open(output_file, 'r') as f:
            print("\n===== TEST RESULTS =====\n")
            print(f.read())
    except Exception as e:
        print(f"Error reading results: {e}")
