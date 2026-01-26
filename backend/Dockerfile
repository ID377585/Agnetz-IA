FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
  && apt-get upgrade -y \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/server.js"]
