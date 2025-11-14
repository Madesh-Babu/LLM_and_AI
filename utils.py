from google.oauth2 import service_account

def authenticate():
    key_path="key.json"
    credentials = service_account.Credentials.from_service_account_file(key_path)
    PROJECT_ID = credentials.project_id
    return credentials, PROJECT_ID

