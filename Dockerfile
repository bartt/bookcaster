FROM ruby:2-alpine

RUN echo "@testing http://nl.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN apk update && \
  apk add --no-cache \
    bash \
    build-base \
    libxml2-dev \
    libxslt-dev \
    taglib-dev \
    ca-certificates \
    s3fs-fuse@testing
RUN mkdir /audiobooks
RUN gem install \
  bundler \
  nokogiri
COPY Gemfile app.rb config.ru /bookcaster/
COPY views/ /bookcaster/views/
COPY docker-entrypoint.sh /usr/local/bin
RUN cd /bookcaster && bundle config set --local without 'development' && bundle
RUN apk del \
  build-base && \
  rm -rf /var/cache/apk/*;

WORKDIR /bookcaster

EXPOSE 9292

ENTRYPOINT ["bash", "docker-entrypoint.sh"]
