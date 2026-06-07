FROM python:3.12-slim

WORKDIR /app

# Install dependencies first as their own layer so edits to source don't bust the
# pip cache. psycopg2-binary and passlib ship pure/manylinux wheels, so no gcc or
# libpq-dev is needed at build time.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source. PHI (*.db) and secrets (.env) are excluded via
# .dockerignore and never enter the image.
COPY . .

# Run as an unprivileged user, not root.
RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# No --reload in the image; SECRET_KEY / DATABASE_URL / APP_ENV / CORS_ORIGINS are
# supplied via runtime env, not baked in. seed_users.py is never run during build
# or startup.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
