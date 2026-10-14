# Multi-stage build para SPA React + Vite
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# Imagem de produção ultra leve com Nginx
FROM nginx:alpine

# Copiar arquivos estáticos compilados do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração Nginx com suporte a SPA routing (fallback para index.html)
RUN printf 'server {\n    listen 80;\n    server_name _;\n    location / {\n        root /usr/share/nginx/html;\n        index index.html index.htm;\n        try_files $uri $uri/ /index.html;\n    }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
