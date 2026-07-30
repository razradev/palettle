let paletteDecimal = [];
// Check if palette declared
if (typeof palette !== "undefined")
  palette.forEach((color) => {
    color = color.replace("#", "");
    // Get base 10 value of color hex code
    paletteDecimal.push(parseInt(color, 16));
  });

// Convert from ctx image data to palletized image data
function dataToPalette(imageData) {
  const pixels = imageData.data;
  let palletizedImageData = [];
  // Iterates through each pixel and converts from rgb to palette index
  for (let p = 0; p < pixels.length; p += 4) {
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    const a = pixels[p + 3];

    if (a == 0) {
      // Transparency = 0
      palletizedImageData.push(0);
    } else {
      palletizedImageData.push(
        paletteDecimal.indexOf(b + g * 256 + r * 256 * 256) + 1,
      );
    }
  }

  imageDataInput.value = palletizedImageData;

  return palletizedImageData;
}

// Convert from palletized image data to ctx image data with optional palette input for gallery
function paletteToData(palletizedImageData, pal = palette) {
  const imageData = new ImageData(canvasSize, canvasSize);
  let sourceData = [];

  let imgPalette = pal;
  if (typeof pal == typeof "") imgPalette = pal.split(",");

  let imgPaletteDecimal = [];
  imgPalette.forEach((color) => {
    color = color.replace("#", "");
    imgPaletteDecimal.push(parseInt(color, 16));
  });

  // Does the inverse of dataToPalette
  for (let p = 0; p < palletizedImageData.length; p++) {
    let r, g, b, a;
    if (palletizedImageData[p] == 0) {
      r = 0;
      g = 0;
      b = 0;
      a = 0;
    } else {
      a = 255;
      const color = imgPaletteDecimal[palletizedImageData[p] - 1];
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
