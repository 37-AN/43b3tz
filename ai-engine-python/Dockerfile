FROM python:3.11-slim

WORKDIR /app

# Install cron and other dependencies
RUN apt-get update && apt-get install -y cron libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Set up cron
COPY crontab /etc/cron.d/pipeline-cron
RUN chmod 0644 /etc/cron.d/pipeline-cron
RUN crontab /etc/cron.d/pipeline-cron

# Touch log file to prevent cron from failing to start
RUN touch /var/log/cron.log

# Command runs cron in foreground
CMD ["cron", "-f"]
