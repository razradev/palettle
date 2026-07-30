let paletteDecimal = [];
palette.forEach((color) => {
  color = color.replace("#", "");
  paletteDecimal.push(parseInt(color, 16));
});

function dataToPalette(imageData) {
  const pixels = imageData.data;
  let paletizedImageData = [];
  for (let p = 0; p < pixels.length; p += 4) {
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    const a = pixels[p + 3];

    if (r == 0 && g == 0 && b == 0 && a == 0) {
      paletizedImageData.push(0);
    } else {
      paletizedImageData.push(
        paletteDecimal.indexOf(b + g * 256 + r * 256 * 256) + 1,
      );
    }
  }

  imageDataInput.value = paletizedImageData;

  return paletizedImageData;
}

function paletteToData(paletizedImageData, pal = palette) {
  const imageData = new ImageData(canvasSize, canvasSize);
  let sourceData = [];

  let imgPalette = pal;
  if (typeof pal == typeof "") imgPalette = pal.split(",");

  let imgPaletteDecimal = [];
  imgPalette.forEach((color) => {
    color = color.replace("#", "");
    imgPaletteDecimal.push(parseInt(color, 16));
  });

  for (let p = 0; p < paletizedImageData.length; p++) {
    let r, g, b, a;
    if (paletizedImageData[p] == 0) {
      r = 0;
      g = 0;
      b = 0;
      a = 0;
    } else {
      a = 255;
      const color = imgPaletteDecimal[paletizedImageData[p] - 1];
      r = Math.floor(color / 256 / 256) % 256;
      g = Math.floor((color % (256 * 256)) / 256) % 256;
      b = color % 256;
    }

    sourceData.push(r);
    sourceData.push(g);
    sourceData.push(b);
    sourceData.push(a);
  }

  imageData.data.set(sourceData);

  return imageData;
}
