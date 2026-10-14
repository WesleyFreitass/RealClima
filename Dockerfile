# Multi-stage build para SPA React + Vite
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
RUN npm ci || npm install

COPY . .
RUN npm run build

# Imagem de produção ultra leve com Nginx
FROM nginx:alpine

# Copiar arquivos estáticos compilados do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração Nginx com suporte a SPA routing (fallback para index.html) e APK Android
RUN printf 'server {\n    listen 80;\n    server_name _;\n    include /etc/nginx/mime.types;\n    types {\n        application/vnd.android.package-archive apk;\n    }\n    location / {\n        root /usr/share/nginx/html;\n        index index.html index.htm;\n        try_files $uri $uri/ /index.html;\n    }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
