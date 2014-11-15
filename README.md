## Scaffold editor

This is a scaffold use this as an starting point.

## Setting up an ubuntu environment

   sudo apt-get install ruby2.0 ruby2.0-dev libmagic-dev build-essentials
   gem2.0 install bundle
   bundle install

For newer versions of ubuntu you might want to grab ruby2.1 instead.
This code has been tested with ruby2.0 and up, but might actually work ruby1.9 

## Configuring

 * open acefolder.rb in your favorite editor
 * change the seting which folder to edit
 * change the blacklist to something usefull
 * copy public/config.json.default to public/config.json and edit your settings
 * maybe add a firebase url to get collabortive editing to work (and enable auto-save on firebase)

## Launch

    ruby acefolder.rb
