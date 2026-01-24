FROM node:22-slim
ENV NODE_ENV=production

WORKDIR /app
COPY --chown=node:node package*.json ./

# Install dependencies for canvas and fonts
# python3 is needed for node-gyp if build from source is required, 
# but node:22-slim usually works well with prebuilds.
# We install fontconfig for custom fonts.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fontconfig \
    python3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --omit=dev && \
    npm cache clean --force

# Copy custom fonts from local fonts/ directory to system font path
# Debian font path is /usr/local/share/fonts or /usr/share/fonts
COPY fonts/ /usr/local/share/fonts/custom/
# Refresh font cache
RUN fc-cache -fv

COPY --chown=node:node . .
USER node
EXPOSE 3005

CMD ["npm", "start"]
