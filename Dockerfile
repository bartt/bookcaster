FROM bartt/ruby:2.1.3
MAINTAINER Bart Teeuwisse <bart@thecodemill.biz>

RUN cd / && \
    git clone https://github.com/bartt/bookcaster.git && \
    cd /bookcaster && bundle

VOLUME /bookcaster
WORKDIR /bookcaster

EXPOSE 9292

CMD ["rackup"]
