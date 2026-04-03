FROM node:22-alpine

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY server.js index.html ./
RUN chown -R app:app /app

USER app

EXPOSE 6000
CMD ["node", "server.js"]
