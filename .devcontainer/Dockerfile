FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=development

# Install dependencies including GDAL and ImageMagick
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    git \
    ca-certificates \
    gdal-bin \
    python3-gdal \
    libgdal-dev \
    python3 \
    python3-pip \
    python3-dev \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Add NodeSource repository and install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Verify installation
RUN node -v && npm -v

# Set working directory
WORKDIR /workspace

# Expose Next.js default port
EXPOSE 3000

CMD ["bash"]