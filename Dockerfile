FROM bartt/ruby:2.1.3
MAINTAINER Bart Teeuwisse <bart@thecodemill.biz>

RUN apt-get install -y libtag1-dev && \
    cd / && \
    git clone https://github.com/bartt/bookcaster.git && \
    cd /bookcaster && bundle

VOLUME ["/bookcaster", "/audiobooks"]
WORKDIR /bookcaster

EXPOSE 9292

CMD ["rackup", "--env", "production"]
