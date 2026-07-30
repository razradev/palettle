document.getElementById("username").value = localStorage.getItem("username");

const canvas = document.getElementById("drawingCanvas");
canvas.width = canvasSize;
canvas.height = canvasSize;
const canvasDetails = document.getElementById("canvasDetails");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
ctx.imageSmoothingEnabled = false;

const imageDataInput = document.getElementById("imageData");

let isMouseDown = false;
let lastPosition = { x: 0, y: 0 };
let absMousePos = { x: 0, y: 0 };

const Tool = Object.freeze({
  Draw: 0,
  Erase: 1,
  Fill: 2,
});
let currentTool = Tool.Draw;

let currentColor = palette[0];
ctx.fillStyle = currentColor;

let undoStack = [];
let redoStack = [];

let isKeyDown = { undo: false, redo: false, fill: false };

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

function clearCanvas() {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  paletteImageData = dataToPalette(
    ctx.getImageData(0, 0, canvas.width, canvas.height),
  );
}

function floodFill(position) {
  const startColor = paletteImageData[position.x + position.y * canvasSize];
  const currentColorIndex = palette.indexOf(currentColor) + 1;

  if (startColor == currentColorIndex) return;

  let stack = [position.x + position.y * canvasSize];
  for (let i = 0; i < 10000; i++) {
    if (stack.length <= 0) break;
    let n = stack[0];
    stack.splice(0, 1);
    if (startColor == paletteImageData[n]) {
      paletteImageData[n] = currentColorIndex;

      if (
        n - 1 >= 0 &&
        Math.floor(n / canvasSize) == Math.floor((n - 1) / canvasSize)
      )
        stack.push(n - 1);

      if (
        n + 1 < paletteImageData.length &&
        Math.floor(n / canvasSize) == Math.floor((n + 1) / canvasSize)
      )
        stack.push(n + 1);

      if (n + canvasSize < paletteImageData.length) stack.push(n + canvasSize);
      if (n - canvasSize >= 0) stack.push(n - canvasSize);
    }
  }

  imageDataInput.value = paletteImageData;
}

const loop = setInterval(() => {
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
    } else if (isMouseDown && !isKeyDown.fill && currentTool == Tool.Fill) {
      isKeyDown.fill = true;
      floodFill(pixelMousePos);
    }

    lastPosition = pixelMousePos;
  }
}, 16.67);

window.addEventListener("mousemove", (event) => {
  absMousePos = { x: event.clientX, y: event.clientY };
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
  isKeyDown.fill = false;
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
