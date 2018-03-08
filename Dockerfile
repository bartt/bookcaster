FROM ruby:alpine

RUN apk add --no-cache bash build-base libxml2-dev libxslt-dev taglib-dev ca-certificates davfs2
RUN mkdir /webdav

RUN gem install --no-rdoc --no-ri bundler
RUN gem install nokogiri
COPY Gemfile app.rb config.ru /bookcaster/
COPY views/ /bookcaster/views/
COPY docker-entrypoint.sh /usr/local/bin
COPY davfs2.conf /etc/davfs2
RUN cd /bookcaster && bundle --without=development

WORKDIR /bookcaster

EXPOSE 9292

ENTRYPOINT ["bash", "docker-entrypoint.sh"]
