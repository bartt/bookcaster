FROM node:lts-alpine
LABEL author="Bart Teeuwisse <bart@thecodemill.biz>"

COPY package.json /bookcaster/
COPY dist/ /bookcaster/dist/
COPY views/ /bookcaster/views/
RUN mkdir /bookcaster/data 
RUN cd /bookcaster && npm install --omit dev --omit optional --omit peer && apk add sqlite

WORKDIR /bookcaster
VOLUME [ "/bookcaster/data" ]

EXPOSE 8080

CMD ["npm", "run", "start"]
