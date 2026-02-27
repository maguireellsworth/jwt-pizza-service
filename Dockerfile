ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine
WORKDIR /usr/src/app
COPY . .
RUN npm ci --foreground-scripts --loglevel=verbose
EXPOSE 80
CMD ["node", "index.js", "80"]