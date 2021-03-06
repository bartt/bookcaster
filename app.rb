require 'sinatra/base'
require 'sinatra/content_for'
require 'taglib'
require 'nokogiri'
require 'yaml'
require 'thin'

HOUR = 60 * 60
MIN = 60

class BookCaster < Sinatra::Base
  helpers Sinatra::ContentFor

  use Rack::Auth::Basic, "Protected Books" do |username, password|
    ENV['AUDIO_BOOKS_USER'] && ENV['AUDIO_BOOKS_PASSWORD'] && username == ENV['AUDIO_BOOKS_USER'] && password == ENV['AUDIO_BOOKS_PASSWORD']
  end

  def initialize
    @audio_books_root = ENV['AUDIO_BOOKS_ROOT'] && ENV['AUDIO_BOOKS_ROOT'].dup || '/audiobooks'
    # Remove trailing slashes
    @audio_books_root = File.absolute_path(@audio_books_root.gsub(/\/+$/, ''))
    super
    # Serve audio book static files
    Sinatra::Base.set :public_folder, @audio_books_root
    @auth_user = ENV['AUDIO_BOOKS_USER']
    @auth_password = ENV['AUDIO_BOOKS_PASSWORD']
  end

  configure do
    mime_type :m3u, 'audio/x-mpegurl'
    mime_type :opml, 'application/xml'
    mime_type :jpg, 'image/jpeg'
    enable :logging
    set :server, :thin
    enable :threaded
  end

  get '/' do
    validate_books_root
    @entries = dir_entries(@audio_books_root)
    halt 404, '<h1>Sorry, the root directory contains more then just books, which is not allowed</h1>' unless valid_dir?(@entries)
    @books = select_books(@entries)
    @dirs = select_dirs(@entries)
    erb :directory, :layout => :page
  end

  get '/robots.txt' do
    content_type 'text/plain'
    "User-agent: *\nDisallow: /\n"
  end

  get '/*/?:book.:ext?' do |path, book, ext|
    validate_books_root
    book_path = File.join(@audio_books_root, path, book)
    if File.directory?(book_path)
      @entries = dir_entries(book_path)
      case ext
      when 'm3u'
        erb :m3u, :content_type => :m3u
      when 'opml'
        erb :opml, :content_type => :opml
      when 'rss'
        title = book_title(@entries)
        author = book_author(@entries)
        description = book_title_and_author(@entries)
        url = to_url(book_path)
        image_url = to_url(book_image(@entries))
        audio_files = book_audio_files(@entries)
        last_build_time = audio_files.collect { |file| @entries[file]['mtime'] }.max
        that = self
        entries = @entries
        nokogiri do |xml|
          xml.rss('xmlns:itunes' => 'http://www.itunes.com/dtds/podcast-1.0.dtd',
              'xml:lang'=> 'en', 'version'=>'2.0', 'xmlns:atom' => 'http://www.w3.org/2005/Atom') {
            xml.channel {
              xml.title title
              xml.link url
              xml['atom'].link('href' => "#{url}.rss",
                  'rel' => 'self', 'type' => 'application/rss+xml')
              xml.description description
              xml.lastBuildDate last_build_time.strftime('%a, %d %b %Y %H:%M:%S %z')
              xml.language 'en'
              xml['itunes'].image('href'=> image_url)
              xml.image {
                url image_url
                title title
                link url
              }
              xml['itunes'].author author
              xml['itunes'].explicit 'clean'
              xml['itunes'].category('text' => 'Kids & Family')
              xml['itunes'].owner {
                xml['itunes'].name 'Bookcaster'
                xml['itunes'].email 'bookcaster@bartt.me'
              }
              audio_file_count = audio_files.count
              audio_files.each_with_index do |file, index|
                xml.item {
                  xml.title "#{title} - Episode #{index + 1}"
                  xml.description description
                  xml.link that.to_url(file)
                  xml.enclosure('url' => that.to_url(file), 'length' => entries[file]['length'], 'type' => that.get_mime_type(file))
                  xml.guid that.to_url(file)
                  xml['itunes'].duration that.duration_formatted(entries[file]['length'])
                  xml.author "email@example.com (#{author})"
                  xml['itunes'].author author
                  xml.pubDate (last_build_time - (audio_file_count + index) * 24 * HOUR).strftime('%a, %d %b %Y %H:%M:%S %z')
                }
              end
            }
          }
        end
      when 'jpg'
        image_path = book_image(@entries)
        send_file(image_path) if image_path
        halt 404
      else
        halt 404
      end
    end
  end

  get '/*/?:dir' do |path, dir|
    validate_books_root
    dir_path = File.join(@audio_books_root, path, dir)
    if File.directory?(dir_path)
      @entries = dir_entries(dir_path)
      pass unless valid_dir?(@entries)
      @books = select_books(@entries)
      @dirs = select_dirs(@entries)
      erb :directory, :layout => :page
    else
      halt 404
    end
  end

  get '/*/?:book' do |path, book|
    validate_books_root
    book_path = File.join(@audio_books_root, path, book)
    if File.directory?(book_path)
      @entries = dir_entries(book_path)
      halt 404, "<h1>Sorry, the book #{request.path_info} contains other books, which is not allowed</h1>" unless valid_book?(@entries)
      @duration = book_duration(@entries)
      @books = {book_path => dir_entries(book_path)}
      erb :book_list, :layout => :page
    end
  end

  helpers do
    def validate_books_root
      halt 404, "<h1>Sorry, the root directory doesn't exist</h1>" unless File.directory?(@audio_books_root)
    end

    def dir_entries(dir_path)
      # YAML.load returns false when entries.yaml is empty.
      attr_map = YAML.load(IO.read(File.join(dir_path, 'entries.yaml'))) || {} rescue {}
      return attr_map unless attr_map.empty?
      Dir.glob(File.join(dir_path, '*')).each do |entry|
        next if entry =~ /favicon.*/
        attr_map[entry] = File.file?(entry) && File.readable?(entry) && TagLib::FileRef.open(entry) do |audio_file|
          unless audio_file.null?
            attrs = { 'mtime' => File.stat(entry).mtime }
            %w(title album artist comment genre track year).each do |attr|
              attrs[attr] = audio_file.tag.send(attr.to_sym)
            end
            %w(bitrate channels length sample_rate).each do |attr|
              attrs[attr] = audio_file.audio_properties.send(attr.to_sym)
            end
            attrs
          end
        end
      end
      IO.write(File.join(dir_path, 'entries.yaml'), YAML.dump(attr_map)) unless valid_dir?(attr_map);
      attr_map
    end

    def valid_dir?(entries)
      entries.keys.all? { |entry| File.directory?(entry) }
    end

    def invalid_dir?(entries)
      !valid_dir?(entries)
    end

    def valid_book?(entries)
      !entries.empty? && entries.keys.all? { |entry| File.file?(entry) }
    end

    def invalid_book?(entries)
      !valid_book?(entries)
    end

    def select_books(entries)
      books = {}
      entries.keys.each do |candidate|
        candidate_entries = dir_entries(candidate)
        books[candidate] = candidate_entries if valid_book?(candidate_entries)
      end
      books
    end

    def select_dirs(entries)
      entries.keys.select { |candidate| valid_dir?(dir_entries(candidate)) }
    end

    def book_image(entries)
      entries.keys.find do |entry|
        has_image_ext(entry) && File.file?(entry) && File.readable?(entry)
      end
    end

    def book_title(entries)
      title_index = entries.keys.find{ |entry| entries[entry] && entries[entry]['album'] && entries[entry]['album'] > '' }
      title = ''
      title += entries[title_index]['album'] if title_index
      title
    end

    def book_author(entries)
      author_index = entries.keys.find{ |entry| entries[entry] && entries[entry]['artist'] && entries[entry]['artist'] > '' }
      title = ''
      title += entries[author_index]['artist'] if author_index
      title
    end

    def book_title_and_author(entries)
      "#{book_title(entries)} by #{book_author(entries)}"
    end

    def book_audio_files(entries)
      entries.keys.select do |entry|
        entries[entry]
      end.sort!
    end

    def book_m3u(entries)
      title = book_title(entries)
      author = book_author(entries)
      audio_files = book_audio_files(entries)
      "#EXTM3U\n\n" +
        audio_files.collect do |file|
          "#EXTINF:#{entries[file]['length']},#{title} - #{author}\n#{to_url(file, force_http = true)}"
        end.flatten.join("\n\n")
    end

    def image_ext
      '.jpg'
    end

    def has_image_ext(entry)
      File.extname(entry).downcase == image_ext
    end

    def has_audio_ext(entry)
      %w(.mp3 .mp4).include?(File.extname(entry).downcase)
    end

    def get_mime_type(entry)
      case File.extname(entry).downcase
      when '.mp3', '.mp4'
        'audio/mpeg'
      else ''
      end
    end

    def to_path(file)
      path = file.nil? ? '' : file.sub(@audio_books_root, '')
      # Correct for paths in the entries.yaml files which still include /webdav from when the files were stored by transip.nl.
      path = path.sub('/webdav', '')
      path = "#{File.dirname(path)}/#{File.basename(path)}" if has_image_ext(path) || has_audio_ext(path)
      path
    end

    def to_url(path, force_http = false)
      url = "#{force_http ? 'http' : request.scheme}://#{@auth_user}:#{@auth_password}@#{request.host}"
      url += ":#{request.port}" unless [80, 443].include? request.port
      url += "#{to_path(path)}"
      url
    end

    # itpc:// works with iTunes in desktop Safari and with Downcast on iOS.
    def to_podcast(path)
      to_url(path).gsub(/^https?/, 'itpc')
    end

    def book_duration(entries)
      entries.values.compact.inject(0) { |sum, attributes| sum += attributes['length'] || 0 }
    end

    def duration_in_hours_and_minutes(duration)
      '%d:%02d' % [duration / HOUR, (duration % HOUR) / MIN]
    end

    def duration_formatted(duration)
      '%d:%02d:%02d' % [duration / HOUR, (duration % HOUR) / MIN, (duration % HOUR) % MIN]
    end
  end

  not_found do
    "<h1>Sorry, I don't know of #{request.path_info}</h1>"
  end
end
