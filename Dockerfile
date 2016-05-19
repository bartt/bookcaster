FROM bartt/ruby:2.1.3
MAINTAINER Bart Teeuwisse <bart@thecodemill.biz>

RUN apt-get install -y libtag1-dev
COPY Gemfile Gemfile.lock app.rb config.ru views/ /bookcaster/
RUN cd /bookcaster && bundle

VOLUME ["/bookcaster", "/audiobooks"]
WORKDIR /bookcaster

EXPOSE 9292
USER nobody

CMD ["rackup", "--env", "production"]
