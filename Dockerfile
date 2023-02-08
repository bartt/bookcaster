FROM node:lts-alpine

COPY package.json /bookcaster/
COPY dist/ /bookcaster/
COPY views/ /bookcaster/views/
COPY public/ /bookcaster/public/
RUN mkdir /bookcaster/data 
RUN cd /bookcaster && npm install

WORKDIR /bookcaster

EXPOSE 8080

ENTRYPOINT ["npm", "run", "start"]
