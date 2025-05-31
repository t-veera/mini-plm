import os
import sys
from pathlib import Path
import dj_database_url  # Make sure this is installed in your backend image

# -- Core Config --
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = 'django-insecure-+^=x8m(8zf^@ro0k)ib)w%+l=_6e5$px0zv0uj9qh2f4h9^g5u'
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')  # read DEBUG from env

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', '*').split(',')

# -- Application definition --
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'files',  # Your app
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS must be high up
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'mpp_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'mpp_backend.wsgi.application'

# -- Database: Pull from DATABASE_URL (Docker uses Postgres) --
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("WARNING: DATABASE_URL environment variable not set, using SQLite fallback", file=sys.stderr)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
    print(f"Using DATABASE_URL: {DATABASE_URL}", file=sys.stderr)
    print(f"Database config: {DATABASES['default']}", file=sys.stderr)

# -- Static & Media --
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static')
]

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'mpp_files')

# -- CORS --
CORS_ALLOW_ALL_ORIGINS = True

# -- Security --
X_FRAME_OPTIONS = 'ALLOWALL'

# -- Internationalization --
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
