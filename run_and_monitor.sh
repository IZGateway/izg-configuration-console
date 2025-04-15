#!/bin/bash
set -e

mkdir -p /app/logs
touch /app/logs/run_and_monitor.log

log_message() {
  echo "$1" | tee -a /app/logs/run_and_monitor.log
}

process_running() {
  if [ -n "$1" ] && kill -0 $1 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

# **********************************************
# * Start Filebeat (if ELASTIC_API_KEY is set) *
# **********************************************
if [ -n "$ELASTIC_API_KEY" ]; then
  /usr/bin/filebeat -e &
  FILEBEAT_PID=$!
  log_message "filebeat started, pid $FILEBEAT_PID"
else
  FILEBEAT_PID=""
  log_message "filebeat not started, ELASTIC_API_KEY not set"
fi

# ************************************************
# * Start Metricbeat (if ELASTIC_API_KEY is set) *
# ************************************************
if [ -n "$ELASTIC_API_KEY" ]; then
  /usr/bin/metricbeat -e &
  METRICBEAT_PID=$!
  log_message "metricbeat started, pid $METRICBEAT_PID"
else
  METRICBEAT_PID=""
  log_message "metricbeat not started, ELASTIC_API_KEY not set"
fi

# **************************************
# * Generate Self-Signed SSL for nginx *
# **************************************
mkdir -p /etc/nginx/ssl

# Create diffie-hellman file
openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout /etc/nginx/ssl/key.pem \
-out /etc/nginx/ssl/cert.pem \
-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# ***************
# * Start nginx *
# ***************
nginx -g 'daemon off;' &
NGINX_PID=$!
log_message "nginx started, PID $NGINX_PID"

# ***********************************
# * Replace BAKED variables for app *
# ***********************************
/app/replace-variable.sh

# **************************
# * Start node application *
# **************************
cd /app && npm start &
APP_PID=$!
log_message "node application started, PID $APP_PID"

# Monitor
while true; do

  if ! process_running $NGINX_PID; then
    echo "nginx service has stopped.  Exiting container."
    exit 1
  fi

  if ! process_running $APP_PID; then
    echo "Node application has stopped. Exiting container."
    exit 1
  fi

  # Check if filebeat should be running but isn't
  if [ -n "$ELASTIC_API_KEY" ] && [ -n "$FILEBEAT_PID" ] && ! process_running $FILEBEAT_PID; then
    echo "Filebeat has stopped unexpectedly. Exiting container."
    exit 1
  fi

  # Check if metricbeat should be running but isn't
  if [ -n "$ELASTIC_API_KEY" ] && [ -n "$METRICBEAT_PID" ] && ! process_running $METRICBEAT_PID; then
    echo "Metricbeat has stopped unexpectedly. Exiting container."
    exit 1
  fi

  sleep 5
done
