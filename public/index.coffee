App = (cfg) ->

  # initialize properties
  @files = []
  @editors = {}
  @cfg = cfg
  console.log @cfg

  # keybinding save
  self = this
  $(document).bind "keydown", (e) ->
    if (e.ctrlKey or e.metaKey) and (e.which is 83)
      e.preventDefault()
      self.save()
      false


  # collect structure
  @refresh()

  # detect onhashchange
  window.onhashchange = @redirect.bind(this)

  # install click handler on nav
  $("#nav").click ->
    window.open "/file/" + self.editor.fn, "_new"
    return


  # install thema
  $("#theme").attr "href", "/themes/" + @cfg.theme
  return

# loads file based on hash fragment in url
App::redirect = ->
  self = this
  for k of self.files
    self.files[k].forEach (file) ->
      if file.fn is window.location.hash.substr(1)
        $("#files .folder").each (i, e) ->
          $(e).addClass "open"  if $(e).data("url") is k
          return

        self.load file.fn, file.mime
      return

  return


# collects new structure from server
App::refresh = ->
  self = this
  $.get "structure", (data) ->
    self.files = JSON.parse(data)
    self.redraw_files()
    self.redirect()  if not self.currentFile and window.location.hash isnt ""
    return

  return

App::new_editor = (editor_name, fn, mime, txt) ->
  $("<div class='editor' id='" + editor_name + "'>").appendTo "body"

  # configure ace editor
  ace_editor = ace.edit(editor_name)
  ace_editor.setTheme "ace/theme/" + @cfg.aceStyles[mime]
  ace_editor.setFontSize @cfg.aceTweaks.fontSize
  ace_editor.setShowPrintMargin false
  ace_editor.setReadOnly false
  session = ace_editor.getSession()
  session.setMode "ace/mode/" + @cfg.aceModes[mime]
  session.setUseWrapMode true
  session.setUseSoftTabs true
  $("#" + editor_name).css "line-height", @cfg.aceTweaks.lineHeight

  # set the current value
  ace_editor.setValue txt, -1
  status =
    ace: ace_editor
    modified: false
    fn: fn
    mime: mime
    txt: txt


  # detect dirty
  self = this
  ace_editor.on "change", ->
    unless status.modified
      status.modified = true
      self.redraw_editor()
    return

  status

App::select_editor = (editor_name) ->

  # hide current editor
  $(".editor").removeClass "active"

  # store the choice
  @editor = @editors[editor_name]

  # show current editor
  $("#" + editor_name).addClass "active"
  @editor.ace.focus()
  @redraw_editor()
  return

App::load = (fn, mime) ->

  # inject a new editor
  editor_name = "editor_" + fn.split("/").join("-slash-").split(".").join("-dot-")

  # if we don't have this editor yet, fetch data and create it
  unless @editors[editor_name]
    self = this
    $.get "/file/" + fn, (txt) ->
      self.editors[editor_name] = self.new_editor(editor_name, fn, mime, txt)
      self.select_editor editor_name
      return

  else
    @select_editor editor_name
  return


# saves currentFile to server
App::save = ->
  self = this
  Object.keys(@editors).forEach (k) ->
    if self.editors[k].modified
      $.ajax
        type: "PUT"
        contentType: "text/plain"
        url: "/file/" + self.editors[k].fn
        data: self.editors[k].ace.getValue()
        success: ->
          $("#theme").attr "href", self.editors[k].fn.substr(6) + "?" + Date.now()  if window.location.pathname is "/meta/" and self.editors[k].fn.substr(0, 14) is "public/themes/"
          return

      self.editors[k].modified = false
    return

  @redraw_editor()
  return


# call whenever currentFile changes
App::redraw_editor = ->
  self = this

  # update url
  window.location.hash = @editor.fn

  # update window title
  document.title = @editor.fn

  # update navigation
  $("#nav").text(@editor.fn).append((if @editor.modified then "<em>modified</em>" else "<em>original<em>")).append "<strong>" + @editor.mime + "</strong>"
  if @editor.modified
    $("#nav").addClass "modified"
  else
    $("#nav").removeClass "modified"
  if @editor.modified
    $(".editor.active").addClass "modified"
  else
    $(".editor.active").removeClass "modified"

  # update file pane
  $("#files .file").removeClass "selected"
  $("#files .file").removeClass "modified"
  $("#files .file").each (i, e) ->
    url = $(e).data("url")
    $(e).addClass "selected"  if url is self.editor.fn
    for k of self.editors
      editor = self.editors[k]
      $(e).addClass "modified"  if url is editor.fn and editor.modified
    return

  return


# call whenever App.files changes
App::redraw_files = ->
  self = this

  # reset it all
  $("#files").html ""

  # adding folders and files
  Object.keys(@files).sort().forEach (pathname) ->
    folder = $("<div class='folder' data-url='" + pathname + "'><h3>" + pathname + "<em>" + self.files[pathname].length + "</em></h3></div>").appendTo("#files")
    self.files[pathname].forEach (file) ->
      name = file.fn.substr(pathname.length + 1)
      $(folder).append $("<div class='file' data-url='" + file.fn + "' data-mime='" + file.mime + "'>").text(name)
      return

    return


  # adding toggle behavior
  $(".folder h3").click ->
    $(this).parent().toggleClass "open"
    return


  # adding 'open' behavior
  $("#files .file").click (e) ->
    self.load $(e.target).data("url"), $(e.target).data("mime")
    return


  # remove loading animation
  $(".loading").remove()  if $(".loading")
  $("#files").addClass "loaded"
  return

$.get "/config.json", (config) ->
  window.app = new App(config)
  return
