# Build the stock ngmodule SSR example in production mode
FROM node:20-bullseye-slim

WORKDIR /app
RUN corepack enable

# Install runtime/build deps used by dist packages (keep @angular symlinked to dist)
RUN printf '{ "name": "ssrf-ngmodule-prod", "private": true }' > /app/package.json
RUN npm install --no-save \
  @babel/core \
  @jridgewell/sourcemap-codec \
  chokidar \
  convert-source-map \
  reflect-metadata \
  rxjs \
  semver \
  tslib \
  typescript \
  xhr2 \
  yargs

# Copy only what we need for the ngmodule build and runtime
COPY dist/packages-dist ./dist/packages-dist
COPY integration/platform-server ./integration/platform-server

# Ensure @angular packages resolve during build (root + project node_modules)
RUN mkdir -p /app/node_modules/@angular /app/integration/platform-server/node_modules/@angular
RUN ln -sfn /app/dist/packages-dist/animations /app/node_modules/@angular/animations \
  && ln -sfn /app/dist/packages-dist/common /app/node_modules/@angular/common \
  && ln -sfn /app/dist/packages-dist/compiler /app/node_modules/@angular/compiler \
  && ln -sfn /app/dist/packages-dist/compiler-cli /app/node_modules/@angular/compiler-cli \
  && ln -sfn /app/dist/packages-dist/core /app/node_modules/@angular/core \
  && ln -sfn /app/dist/packages-dist/forms /app/node_modules/@angular/forms \
  && ln -sfn /app/dist/packages-dist/platform-browser /app/node_modules/@angular/platform-browser \
  && ln -sfn /app/dist/packages-dist/platform-server /app/node_modules/@angular/platform-server \
  && ln -sfn /app/dist/packages-dist/router /app/node_modules/@angular/router

WORKDIR /app/integration/platform-server
ENV CI=true
RUN corepack pnpm install
RUN ln -sfn /app/dist/packages-dist/animations /app/integration/platform-server/node_modules/@angular/animations \
  && ln -sfn /app/dist/packages-dist/common /app/integration/platform-server/node_modules/@angular/common \
  && ln -sfn /app/dist/packages-dist/compiler /app/integration/platform-server/node_modules/@angular/compiler \
  && ln -sfn /app/dist/packages-dist/compiler-cli /app/integration/platform-server/node_modules/@angular/compiler-cli \
  && ln -sfn /app/dist/packages-dist/core /app/integration/platform-server/node_modules/@angular/core \
  && ln -sfn /app/dist/packages-dist/forms /app/integration/platform-server/node_modules/@angular/forms \
  && ln -sfn /app/dist/packages-dist/platform-browser /app/integration/platform-server/node_modules/@angular/platform-browser \
  && ln -sfn /app/dist/packages-dist/platform-server /app/integration/platform-server/node_modules/@angular/platform-server \
  && ln -sfn /app/dist/packages-dist/router /app/integration/platform-server/node_modules/@angular/router
RUN corepack pnpm exec ng run ngmodule:build:production

EXPOSE 4206
CMD ["node", "./dist/ngmodule/server/server.mjs"]
