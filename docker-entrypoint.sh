#!/bin/bash
set -e

# Create necessary directories with proper permissions
mkdir -p /app/mpp_files/uploads
chmod -R 777 /app/mpp_files

# Wait for Postgres to be ready using Django's database connection
echo "Waiting for Postgres..."
until python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mpp_backend.settings')
django.setup()
from django.db import connection
try:
    connection.ensure_connection()
    print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
" 2>/dev/null; do
  echo "Waiting for Postgres..."
  sleep 2
done

echo "Postgres is ready!"

# Run migrations and collect static files
python manage.py migrate
python manage.py collectstatic --noinput

# Execute CMD
exec "$@"