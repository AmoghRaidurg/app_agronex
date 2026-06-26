import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
supabase = create_client(url, key)

try:
    print("USERS:", supabase.table("users").select("*").limit(1).execute().data)
    print("CROPS:", supabase.table("crops").select("*").limit(1).execute().data)
except Exception as e:
    print("ERROR:", str(e))
except Exception as e:
    print("ERROR:", str(e))
