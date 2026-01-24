FROM node:22-slim
ENV NODE_ENV=production

# Build argument to control image generation support (defaults to true)
ARG ENABLE_IMAGES=true
# Persist the build arg as an environment variable for the running container
ENV ENABLE_IMAGES=$ENABLE_IMAGES

WORKDIR /app
COPY --chown=node:node package*.json ./

# Conditionally install system dependencies for canvas
# If ENABLE_IMAGES is false, we skip this heavy step (~100MB+ saved)
RUN if [ "$ENABLE_IMAGES" = "true" ]; then \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fontconfig \
    python3 \
    && rm -rf /var/lib/apt/lists/*; \
    else \
    echo "Skipping graphics libraries (Lightweight Mode)"; \
    fi

# Conditionally install dependencies
# If ENABLE_IMAGES is false, we use --no-optional to skip 'canvas'
RUN if [ "$ENABLE_IMAGES" = "true" ]; then \
    npm install --omit=dev; \
    else \
    npm install --omit=dev --no-optional; \
    fi && \
    npm cache clean --force

# Copy custom fonts
COPY fonts/ /usr/local/share/fonts/custom/

# Conditionally refresh font cache
RUN if [ "$ENABLE_IMAGES" = "true" ]; then \
    fc-cache -fv; \
    fi

COPY --chown=node:node . .
USER node
EXPOSE 3005

CMD ["npm", "start"]