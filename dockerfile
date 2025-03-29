FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create directory for uploaded files
RUN mkdir -p mpp_files

# Run migrations and collect static files when container starts
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]