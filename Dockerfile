FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install -g npm@latest

RUN npm install

COPY . .

RUN mkdir -p /media/footage/

CMD [ "node", "motion_capture.js" ]
