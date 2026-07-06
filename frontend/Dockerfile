FROM node:20.19.0-bookworm-slim

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
