# Base on offical NGINX Alpine image
FROM nginx:alpine

RUN apk add --no-cache openssl

# Remove any existing config files
RUN rm /etc/nginx/conf.d/*

# Copy config files
# *.conf files in conf.d/ dir get included in main config
COPY ./default.conf /etc/nginx/conf.d/

RUN mkdir -p /etc/nginx/ssl

RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout /etc/nginx/ssl/key.pem \
-out /etc/nginx/ssl/cert.pem \
-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Expose the listening port
EXPOSE 443

# Launch NGINX
CMD [ "nginx", "-g", "daemon off;" ]
