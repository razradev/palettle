const canvas = document.getElementById("drawingCanvas");
const canvasSize = canvas.width;
const canvasDetails = document.getElementById("canvasDetails");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
ctx.imageSmoothingEnabled = false;

const imageDataInput = document.getElementById("imageData");

let paletteDecimal = [];
palette.forEach((color) => {
  color = color.replace("#", "");
  paletteDecimal.push(parseInt(color, 16));
});

let isMouseDown = false;
let lastPosition = { x: 0, y: 0 };

const Tool = Object.freeze({
  Draw: 0,
  Erase: 1,
  Fill: 2,
  Move: 3,
  Select: 4,
});
let currentTool = Tool.Draw;

let currentColor = palette[0];
ctx.fillStyle = currentColor;

let undoStack = [];
let redoStack = [];

let isKeyDown = { undo: false, redo: false };

let paletteImageData = dataToPalette(
  ctx.getImageData(0, 0, canvas.width, canvas.height),
);

function setColor(color) {
  currentColor = color;
}

function setTool(tool) {
  currentTool = tool;
}

function isInCanvas(mousePos, canvasBounding) {
  return (
    mousePos.x >= canvasBounding.left &&
    mousePos.x <= canvasBounding.right &&
    mousePos.y >= canvasBounding.top &&
    mousePos.y <= canvasBounding.bottom
  );
}

function getPixelMousePos(absMousePos, canvas) {
  const relMousePos = {
    x: absMousePos.x - canvas.getBoundingClientRect().left,
    y: absMousePos.y - canvas.getBoundingClientRect().top,
  };

  return {
    x: Math.floor(
      (relMousePos.x / canvas.getBoundingClientRect().width) * canvasSize,
    ),
    y: Math.floor(
      (relMousePos.y / canvas.getBoundingClientRect().height) * canvasSize,
    ),
  };
}

function undo() {
  redoStack.push(undoStack.pop());
  if (undoStack.length > 0) paletteImageData = undoStack[undoStack.length - 1];
  else {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    paletteImageData = dataToPalette(
      ctx.getImageData(0, 0, canvasSize, canvasSize),
    );
  }

  ctx.putImageData(paletteToData(paletteImageData), 0, 0);
}

function redo() {
  if (redoStack.length == 0) return;

  paletteImageData = redoStack.pop();
  undoStack.push(paletteImageData);

  ctx.putImageData(paletteToData(paletteImageData), 0, 0);
}

function dataToPalette(imageData) {
  const pixels = imageData.data;
  let paletizedImageData = [];
  for (let p = 0; p < pixels.length; p += 4) {
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    const a = pixels[p + 3];

    if (r == 0 && g == 0 && b == 0 && a == 0) {
      paletizedImageData.push(-1);
    } else {
      paletizedImageData.push(
        paletteDecimal.indexOf(b + g * 256 + r * 256 * 256),
      );
    }
  }

  imageDataInput.value = paletizedImageData;

  return paletizedImageData;
}

function paletteToData(paletizedImageData) {
  const imageData = ctx.createImageData(canvasSize, canvasSize);
  let sourceData = [];

  for (let p = 0; p < paletizedImageData.length; p++) {
    let r, g, b, a;
    if (paletizedImageData[p] == -1) {
      r = 0;
      g = 0;
      b = 0;
      a = 0;
    } else {
      a = 255;
      const color = paletteDecimal[paletizedImageData[p]];
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

window.addEventListener("mousemove", (event) => {
  const absMousePos = { x: event.clientX, y: event.clientY };
  if (isInCanvas(absMousePos, canvas.getBoundingClientRect())) {
    const pixelMousePos = getPixelMousePos(absMousePos, canvas);
    canvasDetails.textContent = `(${pixelMousePos.x}, ${pixelMousePos.y}) ${canvasSize}x${canvasSize}`;

    ctx.putImageData(paletteToData(paletteImageData), 0, 0);

    if (currentTool == Tool.Draw) {
      ctx.fillStyle = currentColor;
      ctx.fillRect(pixelMousePos.x, pixelMousePos.y, 1, 1);
    } else if (currentTool == Tool.Erase) {
      ctx.clearRect(pixelMousePos.x, pixelMousePos.y, 1, 1);
    }

    if (isMouseDown && currentTool == Tool.Draw) {
      const gap = Math.max(
        Math.abs(lastPosition.x - pixelMousePos.x),
        Math.abs(lastPosition.y - pixelMousePos.y),
      );
      ctx.fillRect(pixelMousePos.x, pixelMousePos.y, 1, 1);
      if (gap != 0) {
        const dx = (lastPosition.x - pixelMousePos.x) / gap;
        const dy = (lastPosition.y - pixelMousePos.y) / gap;

        for (let pixel = 0; pixel < gap; pixel++) {
          ctx.fillRect(
            Math.floor(pixelMousePos.x + dx * pixel),
            Math.floor(pixelMousePos.y + dy * pixel),
            1,
            1,
          );
        }
      }

      paletteImageData = dataToPalette(
        ctx.getImageData(0, 0, canvas.width, canvas.height),
      );
    } else if (isMouseDown && currentTool == Tool.Erase) {
      const gap = Math.max(
        Math.abs(lastPosition.x - pixelMousePos.x),
        Math.abs(lastPosition.y - pixelMousePos.y),
      );
      if (gap != 0) {
        const dx = (lastPosition.x - pixelMousePos.x) / gap;
        const dy = (lastPosition.y - pixelMousePos.y) / gap;

        for (let pixel = 0; pixel < gap; pixel++) {
          ctx.clearRect(
            Math.floor(pixelMousePos.x + dx * pixel),
            Math.floor(pixelMousePos.y + dy * pixel),
            1,
            1,
          );
        }

        ctx.clearRect(pixelMousePos.x, pixelMousePos.y, 1, 1);
      }

      paletteImageData = dataToPalette(
        ctx.getImageData(0, 0, canvas.width, canvas.height),
      );
    }

    lastPosition = pixelMousePos;
  }
});

window.addEventListener("mousedown", (event) => {
  isMouseDown = true;
});

window.addEventListener("mouseup", (event) => {
  if (isMouseDown && paletteImageData != undoStack[undoStack.length - 1]) {
    undoStack.push(paletteImageData);
    redoStack = [];
  }

  isMouseDown = false;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
    if (event.shiftKey && !isKeyDown.redo) {
      isKeyDown.redo = true;
      redo();
    } else if (!isKeyDown.undo) {
      isKeyDown.undo = true;
      undo();
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key == "z") {
    isKeyDown.undo = false;
    isKeyDown.redo = false;
  }
});
