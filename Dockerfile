FROM node:lts-alpine
LABEL author="Bart Teeuwisse <bart@thecodemill.biz>"

COPY package.json /bookcaster/
COPY dist/ /bookcaster/
COPY views/ /bookcaster/views/
COPY public/ /bookcaster/public/
RUN mkdir /bookcaster/data 
RUN cd /bookcaster && npm install

WORKDIR /bookcaster
VOLUME [ "/bookcaster/data" ]

EXPOSE 8080

CMD ["npm", "run", "start"]
