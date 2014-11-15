<<<<<<< HEAD
def example
    puts "Hello, world #{ 3 + 4 }"
end
=======
require 'sinatra'
require 'json'
require 'mimemagic'
require 'pathname'

# set to whichever folder you want to edit
set :acefolder, 'demo/'

def collect_mime( fn )
  return "folder" if File.directory?( fn )
  return MimeMagic.by_magic( fn ) || MimeMagic.by_path( fn )  || "unknown/" + File.extname( fn )
end

use Rack::Auth::Basic, "Restricted Area" do |username, password|
  username == 'demo' and password == 'scaffold'
end

get '/' do
  File.read( "public/index.html" )
end

get '/structure' do
  files = Dir.glob( settings.acefolder + "**/*").reject{ |fn| File.directory?( fn ) }.group_by{ |fn| File.dirname( fn ) }
  files.each do |p,ff|
    files[p] = ff.collect{ |fn| { fn: fn , mime:  collect_mime( fn ) } }
  end
  return files.to_json
end

get '/file/*' do
  File.read( params[:splat].first )
end

put '/file/*' do
  File.write( params[:splat].first, request.body.read.to_s )
  "OK"
end
>>>>>>> 6c53eba4b884ba1495519abfde81216d1d6102b7
