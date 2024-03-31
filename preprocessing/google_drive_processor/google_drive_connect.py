import os
import shutil
import subprocess
from pydrive.auth import GoogleAuth
from pydrive.drive import GoogleDrive

# Function to delete a local directory
def delete_local_folder(path):
    if os.path.exists(path):
        shutil.rmtree(path)

def find_folder(folder_name, parent_id=None):
    if parent_id is None:
        folder_list = drive.ListFile({'q': f"title='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"}).GetList()
    else:
        folder_list = drive.ListFile({'q': f"title='{folder_name}' and mimeType='application/vnd.google-apps.folder' and '{parent_id}' in parents and trashed=false"}).GetList()
    return folder_list[0]['id'] if folder_list else None

# Function to download a folder from Google Drive
def download_folder(drive, folder_id, folder_name):
    local_path = os.path.join(os.getcwd(), folder_name)
    delete_local_folder(local_path)  # Delete existing folder if present
    os.makedirs(local_path)

    file_list = drive.ListFile({'q': f"'{folder_id}' in parents and trashed=false"}).GetList()
    for file in file_list:
        print(f"Downloading {file['title']}...")
        file.GetContentFile(os.path.join(local_path, file['title']))

# Function to upload files to a Google Drive folder
def upload_files(drive, local_folder_path, parent_folder_id):
    # Check if 'generated' folder exists in the Google Drive folder
    generated_folder_list = drive.ListFile({'q': f"title='generated' and mimeType='application/vnd.google-apps.folder' and '{parent_folder_id}' in parents and trashed=false"}).GetList()

    if generated_folder_list:
        generated_folder_id = generated_folder_list[0]['id']
    else:
        # Create 'generated' folder
        generated_folder = drive.CreateFile({'title': 'generated', 'mimeType': 'application/vnd.google-apps.folder', 'parents': [{'id': parent_folder_id}]})
        generated_folder.Upload()
        generated_folder_id = generated_folder['id']

    # Upload files to the 'generated' folder
    for file_name in os.listdir(local_folder_path):
        file_path = os.path.join(local_folder_path, file_name)
        if os.path.isfile(file_path):
            file = drive.CreateFile({'title': file_name, 'parents': [{'id': generated_folder_id}]})
            file.SetContentFile(file_path)
            file.Upload()
            print(f"Uploaded {file_name} to 'generated' folder")


# Authentication
gauth = GoogleAuth()
if os.path.exists("credentials.json"):
    gauth.LoadCredentialsFile("credentials.json")
if gauth.credentials is None:
    gauth.LocalWebserverAuth()
elif gauth.access_token_expired:
    gauth.Refresh()
else:
    gauth.Authorize()
gauth.SaveCredentialsFile("credentials.json")

drive = GoogleDrive(gauth)

# Find folders
mosaic_folder_id = find_folder('MOSAIC')
if mosaic_folder_id:
    ben_folder_id = find_folder("Ben Photo Dump 2024-03-29", parent_id=mosaic_folder_id)
    if ben_folder_id:
        subfolders = drive.ListFile({'q': f"'{ben_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"}).GetList()
        for subfolder in subfolders:
            
            generated_folder_list = drive.ListFile({'q': f"title='generated' and mimeType='application/vnd.google-apps.folder' and '{subfolder['id']}' in parents and trashed=false"}).GetList()
            if not generated_folder_list:
                download_folder(drive, subfolder['id'], subfolder['title'])
                subprocess.run(["python3", "../mosaic.py", subfolder['title']])
                upload_files(drive, os.path.join(os.getcwd(), subfolder['title']), subfolder['id'])
                delete_local_folder(os.path.join(os.getcwd(), subfolder['title']))  # Delete local folder after upload
            else:
                print(f"Generated folder already present for {subfolder['title']}")
    else:
        print("Ben Photo Dump 2024-03-29 folder not found")
else:
    print("MOSAIC folder not found.")
