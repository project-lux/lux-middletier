# Image to be used as build space
FROM node:20.18.0-bookworm AS builder

RUN mkdir /build
ADD . /build

RUN apt-get update && \
  apt-get install -y --no-install-recommends yarnpkg && \
  cd /build/ && \
  yarnpkg install --production

# Image that will actually be deployed
# debian 11: bullseye
FROM debian:11.7-slim

COPY --from=builder /build /app

# procps contains "free" command
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends ca-certificates wget unzip jq procps nodejs && \
    wget "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -O "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf ./aws && \
    apt-get remove -y curl wget unzip && \
    apt-get autoremove -y && \
    rm awscliv2.zip && \
    rm -rf /var/lib/apt/lists/*

ADD docker/import-config-start.sh /app/

WORKDIR /app

RUN node --version

CMD ["./import-config-start.sh"]
