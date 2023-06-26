// https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
function decideTextColour(bgColor, lightColor = "#FFFFFF", darkColor = "#000000") {
  var color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
  var r = parseInt(color.substring(0, 2), 16); // hexToR
  var g = parseInt(color.substring(2, 4), 16); // hexToG
  var b = parseInt(color.substring(4, 6), 16); // hexToB
  return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186) ?
    darkColor : lightColor;
}


function saveAs(text, filename) {
  var pom = document.createElement('a');
  pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  pom.setAttribute('download', filename);
  pom.click();
}


function deselectWells() {
  $.each($(".ui-selected"), function() {
    $(this).removeClass("ui-selected")
  })
}


$(function() {
  $("#selectable").selectable();
})


function setWellColour(id, colour) {
  $("#" + id).css("background", colour)
  $("#" + id).css("color", decideTextColour(colour))
}


function setWellAnnotation(id, value) {
  $("#" + id).attr("annotation", value)
}


function setWellTitle(id, value) {
  $("#" + id).attr("title", value)
}


function addAnnotations() {
  var annotation = $("[name='annotation']").val()
  var colour = $("[name='colour']").val()
  $(".ui-selected").each(function() {
    setWellColour(this.id, colour)
    setWellAnnotation(this.id, annotation)
    setWellTitle(this.id, `${this.id}: ${annotation}`)
  })
  deselectWells()
  drawLegend()
}


function rgbStringToHex(rgb) {
  var a = rgb.split("(")[1].split(")")[0]
  a = a.split(",")
  var b = a.map(function(x) {
    x = parseInt(x).toString(16)
    return (x.length == 1) ? "0" + x : x
  })
  return "#" + b.join("")
}


function exportAnnotations() {
  let excl_empty = $("#chk-excl-empty").prop("checked")
  var csv = "well,annotation,colour\n"
  // loop though wells, get well-id and annotation
  $("#selectable li").each(function() {
    well = this.id
    var annotation = $(this).attr("annotation")
    var rgbString = $(this).prop("style")["background-color"]
    if (rgbString.length > 0) {
      var colourHex = rgbStringToHex(rgbString)
    } else {
      var colourHex = ""
    }
    if (excl_empty && annotation == "") {
      return true
    }
    csv += `${well},${annotation},${colourHex}\n`
  })
  saveAs(csv, "platemap.csv")
}


function getUniqueAnnotations() {
  // scan through selectable elements and return an array of
  // unique colour + annotation
  var annotations = new Set()
  $("#selectable li").each(function() {
    colour = $(this).attr("style")
    annotation = $(this).attr("annotation")
    if (annotation == "") { return true }
    annotations.add(`<li><span style="${colour}">${annotation}</span></li>`)
  })
  return Array.from(annotations)
}


function buildLegendHtml(annotations) {
  // create HTML for legend from an array of [[colour, annotation-name]]
  var list = `<ul>`
  for (i = 0; i < annotations.length; i++) {
    list += annotations[i]
  }
  list += "</ul>"
  return list
}


function drawLegend() {
  var annotations = getUniqueAnnotations()
  var legendHtml = buildLegendHtml(annotations)
  $("#legend").html(legendHtml)
}
