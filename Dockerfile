FROM docker.io/node:22-alpine
ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache build-base g++ cairo-dev jpeg-dev pango-dev giflib-dev ttf-dejavu && \
    npm install --omit=dev && \
    npm cache clean --force
COPY . .
USER node
EXPOSE 3005

CMD ["npm", "start"]