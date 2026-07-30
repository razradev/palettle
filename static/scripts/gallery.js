const canvasElements = document.querySelectorAll("canvas");

canvasElements.forEach((canvas, i) => {
  if (art[i] && art[i].image_data) {
    const c = canvas.getContext("2d");
    const parsedImageData = art[i].image_data
      .split(",")
      .map((p) => parseInt(p) || 0);

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    c.putImageData(paletteToData(parsedImageData, art[i].palette), 0, 0);
  }
});
