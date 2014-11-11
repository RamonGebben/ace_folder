// ACE Modes


var ace_modes = {
  "application/x-ruby" : "ruby",
  "application/javascript" : "javascript",
  "text/css" : "css",
  "text/x-markdown" : "markdown",
  "text/html" : "html",
  "unknown/.coffee" : "coffee"
}

var ace_styles = {
  "application/x-ruby" : "chaos",
  "application/javascript" : "chaos",
  "text/css" : "chaos",
  "text/x-markdown" : "chaos",
  "text/html" : "chaos",
  "unknown/.coffee" : "chaos"
}


// File Pane

function App(){

  // initialize properties
  this.files = [];
  this.editors = {};

  // keybinding save
  var self = this;
  $(document).bind('keydown', function(e) {
    if( (e.ctrlKey||e.metaKey) && (e.which === 83)) {
      e.preventDefault();
      self.save();
      return false;
    }
  });

  // collect structure
  this.refresh();

  // detect onhashchange
  window.onhashchange = this.redirect.bind( this );

  // install click handler on nav
  $('#nav').click( function(){
    window.open( '/file/' + self.editor.fn,'_new')
  })



}

// loads file based on hash fragment in url
App.prototype.redirect = function(){
  var self = this;
  for( var k in self.files ){
    self.files[k].forEach( function( file ){
      if( file.fn === window.location.hash.substr(1) ){
        $('#files .folder').each( function(i,e){
          if( $(e).data('url') === k ){
            $(e).addClass('open');
          }
        });
        self.load( file.fn, file.mime );
      }
    });
  }
}

// collects new structure from server
App.prototype.refresh = function(){
  var self = this;
  $.get( "structure", function( data ) {
    self.files = JSON.parse( data );
    self.redraw_files();
    if( !self.currentFile && window.location.hash !== "" ) self.redirect();
  });
}

App.prototype.new_editor = function( editor_name, fn, mime, txt ){

  $("<div class='editor' id='" + editor_name + "'>").appendTo('body');

  // configure ace editor
  var ace_editor = ace.edit( editor_name );
  ace_editor.setTheme( "ace/theme/" + ace_styles[mime] );
  ace_editor.setFontSize( "16px" );
  ace_editor.setShowPrintMargin( false );
  ace_editor.setReadOnly( false );
  var session = ace_editor.getSession();
  session.setMode( "ace/mode/" + ace_modes[ mime ]  );
  session.setUseWrapMode( true );
  session.setUseSoftTabs( true );
  $( "#" + editor_name ).css( "line-height", "26px" );

  // set the current value
  ace_editor.setValue( txt, -1 );

  var status = { ace: ace_editor, modified: false, fn: fn, mime: mime, txt: txt };

  // detect dirty
  var self = this;
  ace_editor.on('change', function(){
    if( !status.modified ){
      status.modified = true;
      self.redraw_editor();
    }
  });

  return status;

}

App.prototype.select_editor = function( editor_name ){

  // hide current editor
  $('.editor').removeClass("active")

  // store the choice
  this.editor = this.editors[ editor_name ];

  // show current editor
  $( '#' + editor_name ).addClass("active");
  this.editor.ace.focus();

  this.redraw_editor();

}


App.prototype.load = function( fn, mime ){

  // inject a new editor
  var editor_name = "editor_" + fn.split('/').join('-slash-').split('.').join('-dot-');

  // if we don't have this editor yet, fetch data and create it
  if( !this.editors [ editor_name ] ){
    var self = this;
    $.get("/file/" + fn, function( txt ){
      self.editors[ editor_name ] = self.new_editor( editor_name, fn, mime, txt );
      self.select_editor( editor_name );
    });
  } else {
    this.select_editor( editor_name );
  }

}


// saves currentFile to server
App.prototype.save = function(){
  var self = this;
  Object.keys( this.editors ).forEach( function(k){
    if( self.editors[k].modified ){
      $.ajax({
        type: "PUT",
        contentType: "text/plain",
        url: "/file/" + self.editors[k].fn,
        data: self.editors[k].ace.getValue(),
        success: function(){
          if( window.location.pathname === "/meta/" && self.editors[k].fn.substr(0,14) === "public/themes/" ){
            $('#theme').attr('href', self.editors[k].fn.substr(6) + "?" + Date.now() );                        
          }
        }
      });
      self.editors[k].modified = false;
    }
  });
  this.redraw_editor();
}

// call whenever currentFile changes
App.prototype.redraw_editor = function(){
  var self = this;

  // update url
  window.location.hash = this.editor.fn;

  // update window title
  document.title = this.editor.fn

  // update navigation
  $('#nav').text( this.editor.fn ).append( this.editor.modified ? "<em>modified</em>" : "<em>original<em>" ).append( "<strong>" + this.editor.mime + "</strong>" );
  if( this.editor.modified ) $('#nav').addClass('modified'); else $('#nav').removeClass('modified');
  if( this.editor.modified ) $('.editor.active').addClass('modified'); else $('.editor.active').removeClass('modified');

  // update file pane
  $('#files .file').removeClass('selected');
  $('#files .file').removeClass('modified');
  $('#files .file').each( function(i,e){
    var url = $(e).data('url');
    if( url === self.editor.fn ){
      $(e).addClass('selected');
    }
    for( var k in self.editors ){
      var editor = self.editors[k];
      if( url === editor.fn && editor.modified ){
        $(e).addClass('modified');
      }
    }

  });



}

// call whenever App.files changes
App.prototype.redraw_files = function(){
  var self = this;

  // reset it all
  $('#files').html('');

  // adding folders and files
  Object.keys( this.files ).sort().forEach( function( pathname ){
    var folder = $( "<div class='folder' data-url='" + pathname + "'><h3>" + pathname + "<em>" + self.files[ pathname ].length + "</em></h3></div>").appendTo( "#files" );
    self.files[ pathname ].forEach( function( file ){
      var name = file.fn.substr( pathname.length + 1 );
      $( folder ).append( $( "<div class='file' data-url='" + file.fn + "' data-mime='" + file.mime + "'>" ).text( name ) );
    });
  });

  // adding toggle behavior
  $('.folder h3').click(function(){
    $( this ).parent().toggleClass('open');
  });

  // adding 'open' behavior
  $("#files .file").click( function( e ){
    self.load( $(e.target).data('url'), $(e.target).data('mime') )
  });

  // remove loading animation
  if( $('.loading') )  $('.loading').remove();
  $('#files').addClass('loaded');


};

window.app = new App();
