require 'sinatra/base'

class BookCaster < Sinatra::Base
  def initialize
    @audio_books_root = ENV['AUDIO_BOOKS_ROOT'].dup || '/audiobooks'
    # Remove trailing slashes
    File.absolute_path(@audio_books_root.gsub!(/\/+$/, ''))
    super
  end

  get '/*/:book.:ext?' do |path, book, ext| 
    book_path = File.join(@audio_books_root, path, book)
    if File.directory?(book_path)
      case ext
      when 'cue'
        "#{book_path}.#{ext} returns a CUE file"
      when 'm3u'
        "#{book_path}.#{ext} returns a M3U file"
      when 'rss'
        "#{book_path}.#{ext} returns a RSS feed"
      when 'jpg'
        "#{book_path}.#{ext} returns an image"
      else 
        halt 404, "Sorry, I don't know of #{File.join(path, book)}.#{ext}"
      end
    end
  end

  get '/*/?:dir' do |path, dir|
    dir_path = File.join(@audio_books_root, path, dir)
    if File.directory?(dir_path)
      pass if Dir.glob(File.join(dir_path, '*')).any? { |entry| File.file?(entry) }
      "#{File.join(path, dir)} is a directory"
    else
      halt 404, "Sorry, I don't know of #{File.join(path, dir)}"
    end
  end

  get '/*/?:book' do |path, book|
    book_path = File.join(@audio_books_root, path, book)
    if File.directory?(book_path)
      entries = Dir.glob(File.join(book_path, '*'))
      halt 404, "Sorry, the book #{File.join(path, book)} contains other books, which is not allowed" if entries.any? { |entry| File.directory?(entry) }
      entries.each do | file |
        puts file
      end
      "#{book_path} is a book"
    end
  end
end
