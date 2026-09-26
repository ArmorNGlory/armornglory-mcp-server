FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
COPY data/ ./data/
COPY .well-known/ ./.well-known/
COPY llms.txt llms-full.txt openapi.yaml ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/.well-known ./.well-known
COPY --from=builder /app/llms.txt ./llms.txt
COPY --from=builder /app/llms-full.txt ./llms-full.txt
COPY --from=builder /app/openapi.yaml ./openapi.yaml

ENV NODE_ENV=production
ENTRYPOINT ["node", "dist/index.js"]
