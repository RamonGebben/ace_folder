require 'sinatra'
require 'json'

# set to whichever folder you want to edit
set :acefolder, 'public/'
set :file_type_whitelist, "css js html md".split(' ')

use Rack::Auth::Basic, "Restricted Area" do |username, password|
  username == 'demo' and password == 'scaffold'
end

get '/' do
  File.read( "/home/ralf/Projects/ace_folder/public/index.html" )
end

get '/structure' do
  Dir.glob( settings.acefolder + "**/*").reject{ |fn| File.directory?(fn) }.collect{ |c| c.gsub( settings.acefolder, "" ) }.to_json
end

get '/file/*' do
  File.read( settings.acefolder + params[:splat].first.gsub("..","") )
end

put '/file/*' do
  File.write( settings.acefolder + params[:splat].first.gsub("..",""), request.body.read.to_s )
  "OK"
end
