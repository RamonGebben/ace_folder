var editor = ace.edit( "editor" );
var session = editor.getSession();

editor.setTheme( "ace/theme/merbivore" );
editor.setFontSize( "16px" );
editor.setShowPrintMargin( false );
editor.setReadOnly( true );
$('#editor').css( "line-height", "24px" );

session.setMode( "ace/mode/markdown" );
session.setUseWrapMode( true );
session.setUseSoftTabs( true );

var ace_modes = {
  "yml" : "yaml",
  "html" : "html",
  "scss" : "scss",
  "css" : "css",
  "less" : "lss",
  "js" : "javascript",
  "coffee" : "coffee",
  "rb" : "ruby",
  "markdown" : "markdown",
  "md" : "markdown",
  "xml" : "liquid"
};

var currentFile;
var oldFile;
var modified;

function openFolder() {
  $('.folder h3').click(function(){
    $( this ).parent().toggleClass('open');
  });
}

var update = function(){

  if( oldFile !== currentFile ){
    editor.setReadOnly( false );
    session.setMode( "ace/mode/" + ( ace_modes[ currentFile.split('.')[1] ] || "text" ));
    $('#nav').text( currentFile );
    if($('.loading')) {
        $('.loading').remove();
    }
    $('#files .file').removeClass('selected');
    $('#files .file').each( function(i,e){
      if( $(e).data('url') === currentFile ){
        $(e).addClass('selected');
      }
    });
  }
  if( modified ){
    $('#nav').addClass('modified');
  } else {
    $('#nav').removeClass('modified');
  }
  oldFile =  currentFile;
};

var save = function(){
  if( currentFile ){
    $.ajax({
      type: "PUT",
      contentType: "text/plain",
      url: "/file/" + currentFile,
        data: editor.getValue()
      });
      modified = false;
      TogetherJS.send({type: "fileChange", currentFile: currentFile, modified: modified });
      update();
    }
  };

  var there_was_input;
  $(document).bind('keydown', function(e) {
      there_was_input = true;
      if( (e.ctrlKey||e.metaKey) && (e.which === 83)) {
      e.preventDefault();
      save();
      return false;
    }
  });

  $.get( "/structure", function( data ) {
    var files = JSON.parse( data );
    var rootfiles = [];

    var folders = [];
    files.forEach( function( f ){
      ff = f.split('/');
      ff = ff.slice(0,ff.length-1).join('/');
      if( folders.indexOf( ff ) === -1 ) folders.push( ff );
    });

    folders.sort();
    // Dunno why we need this
    // $( "<div class='folder'>" ).text( "ROOT" ).appendTo( "#files" );

    folders.forEach( function( fd ){
      // $( "<div class='folder'>" ).text( fd.replace('_','') ).appendTo( "#files" );
      // Maybe do this a better cause this breaks
      $( "<div class='folder'>" ).append( $( "<h3>" + fd.replace('_','') + "</h3>") ).appendTo( "#files" );
      files.forEach( function( ff ){
        var fn = ff.split('/');
        if( fn.slice(0,fn.length-1).join('/') === fd ){
          fn = fn[fn.length-1].split('.');
          $( "<div class='file' data-url='" + ff + "'>" ).text( fn[0].replace('_','') ).appendTo( ".folder" );
        }
      });
    });

    $("#files .file").click( function( e ){
       var url = $(e.target).data('url');
       save();
       $.get("/file/" + url, function( data ){
         currentFile = url;
         editor.setValue( data, -1 );
         modified = false;
         update();
         TogetherJS.send({type: "fileChange", currentFile: currentFile, modified: modified });
       });
    });

  });


  TogetherJS.hub.on("fileChange", function (msg) {
    currentFile = msg.currentFile;
    modified = msg.modified;
    update();
  });

  TogetherJS.hub.on("hello", function (msg) {
    TogetherJS.send({type: "fileChange", currentFile: currentFile, modified: modified });
  });

  TogetherJS.on("ready", function(){
    setTimeout( function(){
       TogetherJS.send({type: "hello"});
    }, 500);
  });


  editor.on('change', function(){
    if( there_was_input ){
       TogetherJS.send({type: "fileChange", currentFile: currentFile, modified: modified });
       modified = true;
    }
    there_was_input = false;
    update();
  });
