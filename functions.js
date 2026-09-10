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
  $("[name='annotation']").on("input", updateDefaultColour)
  updateDefaultColour()
})


// distinguishable colours cycled through as new annotations are added, so
// that a plate doesn't end up entirely the default yellow
const COLOUR_PALETTE = [
  "#EEDA00", "#4E79A7", "#E15759", "#59A14F", "#B07AA1",
  "#F28E2B", "#76B7B2", "#EDC948", "#FF9DA7", "#9C755F"
]


function getUsedColours() {
  // hex colours currently assigned to annotated wells
  var colours = new Set()
  $("#selectable li").each(function() {
    var rgbString = $(this).prop("style")["background-color"]
    if ($(this).attr("annotation") != "" && rgbString != "") {
      colours.add(rgbStringToHex(rgbString).toUpperCase())
    }
  })
  return colours
}


function getAnnotationColour(annotation) {
  // hex colour already used for an annotation, or "" if it's a new annotation
  var colour = ""
  $("#selectable li").each(function() {
    var rgbString = $(this).prop("style")["background-color"]
    if ($(this).attr("annotation") == annotation && rgbString != "") {
      colour = rgbStringToHex(rgbString).toUpperCase()
      return false
    }
  })
  return colour
}


function hslToHex(h, s, l) {
  // h in degrees, s and l as percentages
  s /= 100
  l /= 100
  var a = s * Math.min(l, 1 - l)
  var component = function(n) {
    var k = (n + h / 30) % 12
    var value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * value).toString(16).padStart(2, "0")
  }
  return ("#" + component(0) + component(8) + component(4)).toUpperCase()
}


function generatedColour(i) {
  // colours beyond the fixed palette, spread around the colour wheel by the
  // golden angle so consecutive annotations stay distinguishable
  var hue = (30 + i * 137.508) % 360
  var saturation = 55 + (i % 3) * 15
  var lightness = 50 + (i % 4) * 8
  return hslToHex(hue, saturation, lightness)
}


function nextDefaultColour() {
  // first palette colour not already in use, then generated colours once the
  // whole palette has been used
  var used = getUsedColours()
  for (const colour of COLOUR_PALETTE) {
    if (!used.has(colour)) { return colour }
  }
  for (var i = 0; i < 1000; i++) {
    var colour = generatedColour(i)
    if (!used.has(colour)) { return colour }
  }
  return COLOUR_PALETTE[0]
}


function updateDefaultColour() {
  // keep re-used labels on their existing colour, and move new labels onto
  // an unused colour so the user doesn't have to pick one manually
  var annotation = $("[name='annotation']").val()
  var existing = (annotation == "") ? "" : getAnnotationColour(annotation)
  $("[name='colour']").val(existing == "" ? nextDefaultColour() : existing)
}


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
  updateDefaultColour()
}


// clear annotations of selected wells
function clearAnnotations() {
  $(".ui-selected").each(function() {
    setWellColour(this.id, "")
    // specifically set well text colour to black
    $("#" + this.id).css("color", "#000000")
    setWellAnnotation(this.id, "")
    setWellTitle(this.id, "")
  })
  deselectWells()
  drawLegend()
}


function addAnnotationsFromArray(annotations) {
  // given an array of annotations, parsed from a file
  // add these annotations to the on-screen wells
  for (const annotation of annotations) {
    setWellColour(annotation.id, annotation.colour)
    setWellAnnotation(annotation.id, annotation.annotation)
    setWellTitle(annotation.id, `${annotation.id}: ${annotation.annotation}`)
  }
  drawLegend()
  updateDefaultColour()
}


function rgbStringToHex(rgb) {
  // convert style RGB string to colour hex code
  // e.g "rgb(255, 255, 255)" -> "#FFFFFF"
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


const importAnnotations = async (event) => {
  // read in plate annotation from previously exported file
  const file = event.target.files[0]
  const fileContents = await readUploadedFileAsText(file)
  let annotations = parseCSV(fileContents)
  addAnnotationsFromArray(annotations)
}


const readUploadedFileAsText = (inputFile) => {
  // I hate javascript so so much
  const temporaryFileReader = new FileReader();
  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort()
      reject(new DOMException("Problem parsing input file."))
    };
    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result);
    }
    temporaryFileReader.readAsText(inputFile)
  });
};


function parseCSV(csvText) {
  // parse csv text into an array of objects {id, annotation, colour}
  var annotations = []
  var well, annotation, colour
  if (!csvText || csvText.trim() === "") {
    return []
  }
  const lines = csvText.split("\n")
  for (var i = 1; i < lines.length; i++) {
    if (lines[i] != "") {
      [well, annotation, colour] = lines[i].split(",")
      annotations.push({ id: well, annotation: annotation, colour: colour })
    }
  }
  return annotations
}



function getUniqueAnnotations() {
  // scan through selectable elements and return an array of unique
  // {annotation, style} sorted alphabetically, so the legend order doesn't
  // depend on where on the plate an annotation happens to be used
  var annotations = new Map()
  $("#selectable li").each(function() {
    var annotation = $(this).attr("annotation")
    if (annotation == "" || annotations.has(annotation)) { return true }
    annotations.set(annotation, $(this).attr("style"))
  })
  return Array.from(annotations, function([annotation, style]) {
    return { annotation: annotation, style: style }
  }).sort(function(a, b) {
    // natural sort, so "cmpd 2" comes before "cmpd 10"
    return a.annotation.localeCompare(b.annotation, undefined, {
      numeric: true, sensitivity: "base"
    })
  })
}


function buildLegendHtml(annotations) {
  // create HTML for legend from an array of {annotation, style}
  var list = `<ul>`
  for (var i = 0; i < annotations.length; i++) {
    list += `<li><span style="${annotations[i].style}">${annotations[i].annotation}</span></li>`
  }
  list += "</ul>"
  return list
}


function drawLegend() {
  var annotations = getUniqueAnnotations()
  var legendHtml = buildLegendHtml(annotations)
  $("#legend").html(legendHtml)
}
