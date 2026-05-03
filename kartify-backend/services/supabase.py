"""
Supabase client initialization.
"""

from supabase import create_client, Client
from config import get_settings


def get_supabase_client() -> Client:
    """Creates and returns a Supabase client instance."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


# Singleton client for reuse across the app
supabase: Client = get_supabase_client()
