FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json* ./
RUN npm install --production || npm install

# Bundle app source
COPY . .

# Ensure uploads dir exists
RUN mkdir -p /usr/src/app/uploads && chown -R node:node /usr/src/app/uploads

USER node

EXPOSE 3000
CMD ["node", "server.js"]
