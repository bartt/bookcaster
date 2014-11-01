require 'sinatra/base'
require 'taglib'

HOUR = 60 * 60
MIN = 60

class BookCaster < Sinatra::Base

  def initialize
    @audio_books_root = ENV['AUDIO_BOOKS_ROOT'] && ENV['AUDIO_BOOKS_ROOT'].dup || '/audiobooks'
    # Remove trailing slashes
    @audio_books_root = File.absolute_path(@audio_books_root.gsub(/\/+$/, ''))
    super
  end

  get '/' do
    validate_books_root
    @entries = dir_entries(@audio_books_root)
    halt 404, '<h1>Sorry, the root directory contains more then just books, which is not allowed</h1>' unless valid_dir?(@entries)
    '/ is a directory'
    @books = select_books(@entries)
    @dirs = select_dirs(@entries)
    erb :directory, :layout => :page
  end

  get '/*/?:book.:ext?' do |path, book, ext|
    validate_books_root
    book_path = File.join(@audio_books_root, path, book)
    if File.directory?(book_path)
      @entries = dir_entries(book_path)
      case ext
      when 'm3u'
        "#{book_path}.#{ext} returns a M3U file"
      when 'rss'
        "#{book_path}.#{ext} returns a RSS feed"
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
      "#{book_path} is a #{duration_in_hours_and_minutes(@duration)} long book"
    end
  end

  helpers do
    def validate_books_root
      halt 404, "<h1>Sorry, the root directory doesn't exist</h1>" unless File.directory?(@audio_books_root)
    end

    def dir_entries(dir_path)
      attr_map = {}
      Dir.glob(File.join(dir_path, '*')).each do |entry|
        attr_map[entry] = File.file?(entry) && File.readable?(entry) && TagLib::FileRef.open(entry) do |audio_file|
          unless audio_file.null?
            attrs = {}
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
      entries.keys.select { |candidate| valid_book?(dir_entries(candidate)) }
    end

    def select_dirs(entries)
      entries.keys.select { |candidate| valid_dir?(dir_entries(candidate)) }
    end

    def book_image(entries)
      entries.keys.find do |entry|
        has_image_ext(entry) && File.file?(entry) && File.readable?(entry)
      end
    end

    def image_ext
      '.jpg'
    end

    def has_image_ext(entry)
      File.extname(entry).downcase == image_ext
    end

    def to_url(path)
      url = path.nil? ? '' : path.sub(@audio_books_root, '')
      url = "#{File.dirname(url)}#{image_ext}" if has_image_ext(url)
      url
    end

    def book_duration(entries)
      entries.values.compact.inject(0) { |sum, attributes| sum += attributes['length'] }
    end

    def duration_in_hours_and_minutes(duration)
      '%d:%02d' % [duration / HOUR, (duration % HOUR) / MIN]
    end
  end

  not_found do
    "<h1>Sorry, I don't know of #{request.path_info}</h1>"
  end
end
