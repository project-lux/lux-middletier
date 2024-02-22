#!/bin/sh

# Run from the root directory, e.g.
# $ ./docker/build-docker-image.sh

# If USE_LOCAL_CONFIG_JSON is set to anything else than yes,
# the container will use the local file config.json instead of downloading it from S3.
export USE_LOCAL_CONFIG_JSON=yes

IMAGE_NAME=${IMAGE_NAME:-lux-middle}

docker build -t $IMAGE_NAME -f docker/Dockerfile .
