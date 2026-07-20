FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
EXPOSE 8787
CMD ["node", "src/index.js"]
