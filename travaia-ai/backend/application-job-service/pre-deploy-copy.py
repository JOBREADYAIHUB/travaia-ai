import os
import shutil

# Define the source and destination directories
source_dir = os.path.join(os.path.dirname(__file__), 'shared')
dest_dir = os.path.join(os.path.dirname(__file__), 'shared_copy')

# Remove the destination directory if it already exists
if os.path.exists(dest_dir):
    shutil.rmtree(dest_dir)

# Copy the source directory to the destination
shutil.copytree(source_dir, dest_dir)

print(f"Successfully copied 'shared' to 'shared_copy'.")
