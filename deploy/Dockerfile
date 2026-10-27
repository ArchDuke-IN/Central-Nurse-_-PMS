# PMS nurse station — production image.
#
# The application is a static folder, so the image is a static file server and
# nothing else. No build happens here: the site is built on the host by
# "npm run web" and copied in, which keeps the image reproducible and the
# build output auditable.

FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8420 \
    HOST=0.0.0.0

WORKDIR /app

# The server has no dependencies, so there is nothing to install.
COPY tools/serve.mjs ./tools/serve.mjs

# The built site. Expects dist-web/ from the host build.
COPY dist-web/ ./site/

# Bind to all interfaces inside the container; publish with -p.
EXPOSE 8420

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8420)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node

CMD ["node", "tools/serve.mjs", "--root", "site", "--port", "8420", "--host", "0.0.0.0"]