FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
RUN mkdir -p /app/data /watch /done /fail
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV WATCH_DIR=/watch
ENV DONE_DIR=/done
ENV FAIL_DIR=/fail
EXPOSE 8800
CMD ["node", "src/index.js"]
