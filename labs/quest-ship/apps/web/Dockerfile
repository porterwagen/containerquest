FROM nginx:1.27-alpine
ARG APP_VERSION=dev
RUN echo "{\"service\":\"web\",\"version\":\"${APP_VERSION}\"}" > /usr/share/nginx/html/version.json
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
