var consoleOpen = false;
var previewOpen = false;

function App( cfg ){

  // initialize properties
  this.files = [];
  this.editors = {};
  this.cfg = cfg;
  this.dirty = {};

  if( this.cfg.firebase && this.cfg.firebase !== "" ){
    this.firebase =  new Firebase( this.cfg.firebase );
    this.firebase.child('dirty').on('value', function( snapshot ){
      self.dirty = snapshot.val() || {};
      self.redraw_editor();
    });
  }

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
    window.open( '/file/' + self.editor.fn,'_new');
  });

  // install thema
  $('#theme').attr('href', "/themes/" + this.cfg.theme);

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
};

// collects new structure from server
App.prototype.refresh = function(){
  var self = this;
  $.get( "structure", function( data ) {
    self.files = JSON.parse( data );
    self.redraw_files();
    if( !self.currentFile && window.location.hash !== "" ) self.redirect();
  });
};

App.prototype.new_editor = function( editor_name, fn, mime, txt ){

  $("<div class='editor' id='" + editor_name + "'>").appendTo('body');

  // configure ace editor
  var ace_editor = ace.edit( editor_name );
  ace_editor.setTheme( "ace/theme/" + this.cfg.aceStyles[ mime ] );
  ace_editor.setFontSize( this.cfg.aceTweaks.fontSize );
  ace_editor.setShowPrintMargin( false );
  ace_editor.setReadOnly( false );
  var session = ace_editor.getSession();
  session.setMode( "ace/mode/" + this.cfg.aceModes[ mime ]  );
  session.setUseWrapMode( true );
  session.setUseSoftTabs( true );
  $( "#" + editor_name ).css( "line-height", this.cfg.aceTweaks.lineHeight );

  var status = { ace: ace_editor, fn: fn, mime: mime, txt: txt, editor_name: editor_name };

  // detect dirty
  var self = this;

  // Hookup firebase if configured
  if( this.firebase ){
    status.ref = this.firebase.child("files").child( editor_name );
    status.firepad = Firepad.fromACE( status.ref, ace_editor, { defaultText: txt });
    status.firepad.on('ready', function(){
        ace_editor.on('change', function(){
            var keyval = {};
            keyval[ editor_name ] = true;
            self.firebase.child('dirty').update(keyval);
        });
    });
  } else {
    ace_editor.setValue( txt, -1 );
    ace_editor.on('change', function(){
        var dirty = ace_editor.getValue() !== txt;
        if( self.dirty[ editor_name] !== dirty ){
            self.dirty[ editor_name ] = dirty;
            self.redraw_editor();
        }
    });
  }

  if(mime === 'text/x-markdown') session.on('change', self.render_markdown);

  return status;

};

App.prototype.select_editor = function( editor_name ){

  // hide current editor
  $('.editor').removeClass("active");

  // store the choice
  this.editor = this.editors[ editor_name ];

  // show current editor
  $( '#' + editor_name ).addClass("active");
  this.editor.ace.focus();

  this.redraw_editor();

};


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

};


// saves currentFile to server
App.prototype.save = function(){
  var self = this;
  var k = self.editor.editor_name;
    if( self.dirty[k] ){
      var newtxt = self.editors[k].ace.getValue();
      $.ajax({
        type: "PUT",
        contentType: "text/plain",
        url: "/file/" + self.editors[k].fn,
        data: newtxt,
        success: function(){
          var fn = self.editors[k].fn;
          if( window.location.pathname === "/meta/" && fn.substr(0,14) === "public/themes/" ){
            $('#theme').attr('href', fn.substr(6) + "?" + Date.now() );
          }
        }
      });
      if( self.firebase ){
        var keyval = {};
        keyval[ k ] = false;
        self.firebase.child('dirty').update( keyval );
      } else {
        self.dirty[k] = false;
      }
    }
  this.redraw_editor();
  if( previewOpen === true ) this.refresh_preview();
};


App.prototype.create = function( filepath ){
  var self = this;
  $.ajax({
    type: "POST",
    contentType: "text/plain",
    url: "/file/create?filepath=" + filepath,
    data: "",
      success: function(){
        console.log('created a new file');
        self.refresh();
      }
    });
};


// call whenever currentFile changes
App.prototype.redraw_editor = function(){
  var self = this;

  if( this.editor ){

    window.location.hash = this.editor.fn;
    document.title = this.editor.fn;

    // update navigation
    var editor_name = this.editor_editor_name;
    $('#nav').text( this.editor.fn ).append( this.dirty[ this.editor.editor_name ] ? "<em>modified</em>" : "<em>original<em>" ).append( "<strong>" + this.editor.mime + "</strong>" );
    if( this.dirty[ editor_name ] ) $('#nav').addClass('modified'); else $('#nav').removeClass('modified');
    if( this.dirty[ editor_name ] ) $('.editor.active').addClass('modified'); else $('.editor.active').removeClass('modified');

  }

  // update file pane
  $('#files .file').removeClass('selected');
  $('#files .file').removeClass('modified');
  $('#files .file').each( function(i,e){
    var url = $(e).data('url');
    if( url === self.editor.fn ){
      $(e).addClass('selected');
    }
    for( var k in self.dirty ){
      if( self.dirty[k] ){
        var editor_name = "editor_" + url.split('/').join('-slash-').split('.').join('-dot-');
        if( editor_name === k ) $(e).addClass('modified');
      }
    }

  });

};

// call whenever App.files changes
App.prototype.redraw_files = function(){
  var self = this;

  // reset it all
  $('#files').html('');

  // adding folders and files
  Object.keys( this.files ).sort().forEach( function( pathname ){
    var pretty_pathname = pathname;
    if( self.cfg.minimalFolderNames ){
        pretty_pathname = pathname.split('/');
        pretty_pathname = pretty_pathname[ pretty_pathname.length-1 ];
    }
    var folder = $( "<div class='folder" + ( self.cfg.folded ? "" : " open" ) + "' data-url='" + pathname + "'><h3>" + pretty_pathname + "<em>" + self.files[ pathname ].length + "</em></h3></div>").appendTo( "#files" );
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
    self.load( $(e.target).data('url'), $(e.target).data('mime') );
  });

  // remove loading animation
  if( $('.loading') )  $('.loading').remove();
  $('#files').addClass('loaded');


};

App.prototype.toggleConsole = function() {
  consoleOpen = !consoleOpen;
  if (consoleOpen) {
      $('#console').css('top', '0px');
  }else {
      $('#console').css('top', '-615px');
  }
};

App.prototype.togglePreview = function() {
  self = this;
  previewOpen = !previewOpen;
  if (previewOpen) {
      self.openPreview();
  }else {
      self.closePreview();
  }
};

App.prototype.openPreview = function(){
  self = this;
  var hash = window.location.hash;
  var url = hash.split('#')[1];
  var mime = url.split('.')[1];
  var editor_name = "editor_" + url.split('/').join('-slash-').split('.').join('-dot-');

  $('#'+ editor_name +'').css('left', '50%');
  if( hash === "") {
    console.log('Please select a file to preview first.');
  }else {
    if(mime === 'md' || mime === 'markdown') {
      $('body').append( '<div id="preview" class="markdown"></div>' );
      self.render_markdown();
    }else {
      $('body').append( '<iframe id="preview" src="/file/'+ url +'"></iframe>' );
    }
  }

};

App.prototype.closePreview = function(){
  $('.editor').css('left', '0');
  $('#preview').remove();
};

App.prototype.refresh_preview = function(){
  var hash = window.location.hash;
  var url = hash.split('#')[1];
  var mime = url.split('.')[1];
  var editor_name = "editor_" + url.split('/').join('-slash-').split('.').join('-dot-');

  if(mime === 'md' || mime === 'markdown') {

  }else {
    document.getElementById('preview').contentWindow.location.reload(true);
  }
};


App.prototype.render_markdown = function(){
  marked.setOptions({ gfm: true });
  var editor_name =  "editor_" + window.location.hash.split('#')[1].split('/').join('-slash-').split('.').join('-dot-');
  var editor = ace.edit(editor_name);
  var markdown = editor.getSession().getValue();
  var output = marked(markdown);
  $('#preview').html('');
  $('#preview').append(output);
};


App.prototype.help = function(){
  var help_menu = "Create a file => app.create('path/to/file.js')";
  return help_menu;
};


jQuery(function($, undefined) {
    $('#console').terminal(function(command, term) {
        if (command !== '') {
            try {
                var result = window.eval(command);
                if (result !== undefined) {
                    term.echo(new String(result));
                }
            } catch(e) {
                term.error(new String(e));
            }
        } else {
           term.echo('');
        }
    }, {
        greetings: 'Javascript console, use app.help() for help.',
        name: 'js_console',
        height: 600,
        prompt: '$ » '});
});



$(document).ready(function(){

  key('⌘+return, ctrl+return', function(){
    app.togglePreview();
  });

  key('esc', function(){
    app.toggleConsole();
  });

  $.get('/config.json', function( config ){
    window.app = new App( config );
  });

});
