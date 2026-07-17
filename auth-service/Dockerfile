FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./tsconfig.json
COPY src ./src

EXPOSE 8001

CMD ["npm", "run", "dev"]
