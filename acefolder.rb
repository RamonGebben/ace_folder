require 'sinatra'
require 'json'
require 'mimemagic'
require 'pathname'

# set to whichever folder you want to edit
set :acefolder, 'demo/'
set :blacklist, '_site img mp4 theme-assets'.split

def collect_mime( fn )
  return "folder" if File.directory?( fn )
  return MimeMagic.by_magic( fn ) || MimeMagic.by_path( fn )  || "unknown/" + File.extname( fn )
end

def collect_files( folder, blacklist )
  Dir.glob( folder + "**/*")
             .reject{ |fn| File.directory?( fn ) || blacklist.any?{ |bw| fn.start_with?( settings.acefolder + bw ) } }
             .sort
             .group_by{ |fn| File.dirname( fn ) }
end

use Rack::Auth::Basic, "Restricted Area" do |username, password|
  username == 'demo' and password == 'demo'
end

get '/' do
  File.read( "public/index.html" )
end

get '/structure' do
  files = collect_files( settings.acefolder, settings.blacklist )
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
  if params[:s3] then
    throw "Pizza"
  end
  "OK"
end

post '/file/create' do
  `touch #{settings.acefolder}/#{params[:filepath]}`
end

get '/meta/' do
  File.read( "public/index.html" )
end

get '/meta/structure' do
  files = collect_files("public",[])
  files.each do |p,ff|
    files[p] = ff.collect{ |fn| { fn: fn , mime:  collect_mime( fn ) } }
  end
  return files.to_json
end

get '/meta/file/*' do
  File.read( params[:splat].first )
end

put '/meta/file/*' do
  File.write( params[:splat].first, request.body.read.to_s )
  "OK"
end
