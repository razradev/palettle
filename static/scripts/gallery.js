// Gets all canvases
const canvasElements = document.querySelectorAll("canvas");

canvasElements.forEach((canvas, i) => {
  if (art[i] && art[i].image_data) {
    const c = canvas.getContext("2d");
    // Unshorten image data
    const parsedImageData = art[i].image_data
      .split(",")
      .map((p) => parseInt(p) || 0);

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Draw image data
    c.putImageData(paletteToData(parsedImageData, art[i].palette), 0, 0);
  }
});
