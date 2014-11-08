require 'sinatra'
require 'json'

use Rack::Auth::Basic, "Restricted Area" do |username, password|
  username == 'relay42' and password == 'tablesoccer'
end

get '/' do
  File.read( "index.html" )
end

get '/structure' do
  Dir.glob("/home/ralf/nextgen/**/*").reject{ |fn| File.directory?(fn) }.collect{ |c| c.gsub("/home/ralf/nextgen/", "") }.to_json  	
end

get '/file/*' do
  # the last gsub keeps it within the directory
  File.read( "/home/ralf/nextgen/" + params[:splat].first.gsub("..","") )
end

put '/file/*' do
  File.write( "/home/ralf/nextgen/" + params[:splat].first.gsub("..",""), request.body.read.to_s )
  "OK"
end
