#!/bin/bash
# Fix line endings (in case file has Windows CRLF)
sed -i 's/\r$//' "$0"

# Create necessary directories with proper permissions
mkdir -p /app/mpp_files/uploads
chmod -R 777 /app/mpp_files

# Continue with normal startup
exec "$@"