const canvases = art.map((a) => document.getElementById(a.author));

canvases.forEach((canvas) => {
  if (canvas) {
    const c = canvas.getContext("2d");
    const imageData = canvas.textContent;
    const parsedImageData = imageData.split(",").map((p) => parseInt(p));

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    c.putImageData(paletteToData(parsedImageData), 0, 0);
  }
});
