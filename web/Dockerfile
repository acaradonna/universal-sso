FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN rm -rf node_modules package-lock.json && npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]