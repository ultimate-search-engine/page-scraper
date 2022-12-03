FROM node:16

RUN apt-get update && \
    apt-get -y install xvfb gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
      libdbus-1-3 chromium libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
      libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
      libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
      libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils libgbm-dev libxkbcommon-x11-0 libgtk-3-0 wget && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true 
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium


# Add user so we don't need --no-sandbox.
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser

# Run everything after as non-privileged user.

WORKDIR /app
RUN touch .env
RUN npm init -y && \
    npm i puppeteer express
COPY ./page-scraper/package.json .
# COPY ./page-scraper/package-lock.json .
COPY ./page-scraper/server.ts .

RUN npm install
RUN chmod -R 777 /app/package-lock.json
RUN npm run build

RUN chmod -R 777 /app/node_modules/.package-lock.json
EXPOSE 8080

USER pptruser
CMD ["npm", "start"]
