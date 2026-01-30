"""Superset configuration for PIAM Demo.

Security Note: CSRF and Talisman are disabled for local demo convenience.
For production hardening, see: https://superset.apache.org/docs/security/
"""

import os

# Security
SECRET_KEY = os.environ.get('SUPERSET_SECRET_KEY', 'piam-demo-secret-key')
TALISMAN_ENABLED = False
WTF_CSRF_ENABLED = False

# Mapbox (required for deck.gl map basemap)
MAPBOX_API_KEY = os.environ.get('MAPBOX_API_KEY', '')

# Feature flags
FEATURE_FLAGS = {
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_NATIVE_FILTERS_SET": True,
    "ENABLE_TEMPLATE_PROCESSING": True,
    "EMBEDDED_SUPERSET": True,
    "ALERT_REPORTS": False,
}

# Cache (simple for demo)
CACHE_CONFIG = {
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 60,
}

# SQL Lab
SQL_MAX_ROW = 10000
SQLLAB_TIMEOUT = 60

# Dashboard auto-refresh options (seconds)
SUPERSET_DASHBOARD_PERIODICAL_REFRESH_LIMIT = 10
SUPERSET_DASHBOARD_PERIODICAL_REFRESH_WARNING_MESSAGE = None

# Theme
APP_NAME = "PIAM Analytics"

# ClickHouse connection
SQLALCHEMY_DATABASE_URI = 'sqlite:////app/superset_home/superset.db'

# Default row limit
DEFAULT_SQLLAB_LIMIT = 1000
