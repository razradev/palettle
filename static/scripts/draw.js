// Sets input value in form to be username
document.getElementById("authorInput").value =
  localStorage.getItem("username") || "";

// Setup canvas for drawing
const canvas = document.getElementById("drawingCanvas");
canvas.width = canvasSize;
canvas.height = canvasSize;

const canvasDetails = document.getElementById("canvasDetails");

//Setup drawing context
const ctx = canvas.getContext("2d", { willReadFrequently: true });
ctx.imageSmoothingEnabled = false;

// Image data form input
const imageDataInput = document.getElementById("imageData");

// Mouse input
let isMouseDown = false;
let lastPosition = { x: 0, y: 0 };
let absMousePos = { x: 0, y: 0 };

// Different drawing tools
const Tool = Object.freeze({
  Draw: 0,
  Erase: 1,
  Fill: 2,
});
let currentTool = Tool.Draw;
const tools = document.querySelectorAll("#draw, #erase, #fill");

// Current drawing color
let currentColor = palette[0];
ctx.fillStyle = currentColor;

// Global stack for undo & redo
let undoStack = [];
let redoStack = [];

// No key holding
let isInputDown = { undo: false, redo: false, fill: false };

// Create blank image data in palette format
let paletteImageData = dataToPalette(
  ctx.getImageData(0, 0, canvas.width, canvas.height),
);

// Attempt to get already drawn image data from account
fetch(`/draw`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: localStorage.getItem("username") }),
})
  .then((response) => response.json())
  .then((data) => {
    // Set current image data to previous if possible
    if (data.status === "success") {
      const existingImageData = data.existing[0].image_data;
      paletteImageData = existingImageData
        .split(",")
        .map((pixel) => parseInt(pixel) || 0);
      undoStack.push(paletteImageData);
      // Update input
      imageDataInput.value = paletteImageData;
    }
  });

// Setters for buttons
function setColor(color) {
  currentColor = color;
}

function setTool(tool) {
  currentTool = tool;
}

// Check if mouse is in canvas
function isInCanvas(mousePos, canvasBounding) {
  return (
    mousePos.x >= canvasBounding.left &&
    mousePos.x <= canvasBounding.right &&
    mousePos.y >= canvasBounding.top &&
    mousePos.y <= canvasBounding.bottom
  );
}

// Convert global mouse position to position on canvas
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
  // Move from undo to redo
  redoStack.push(undoStack.pop());
  // Go back to previous image data or clear if no more data
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
  // Inverse of undo
  if (redoStack.length == 0) return;

  paletteImageData = redoStack.pop();
  undoStack.push(paletteImageData);

  ctx.putImageData(paletteToData(paletteImageData), 0, 0);
}

// Clears entire canvas
function clearCanvas() {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  paletteImageData = dataToPalette(
    ctx.getImageData(0, 0, canvas.width, canvas.height),
  );
}

// Uses flood fill algorith, for bucket tool
function floodFill(position) {
  const startColor = paletteImageData[position.x + position.y * canvasSize];
  const currentColorIndex = palette.indexOf(currentColor) + 1;

  if (startColor == currentColorIndex) return;

  let stack = [position.x + position.y * canvasSize];

  // Limited to prevent crashing/hanging
  for (let i = 0; i < 10000; i++) {
    if (stack.length <= 0) break;
    let n = stack[0];
    stack.splice(0, 1);
    if (startColor == paletteImageData[n]) {
      paletteImageData[n] = currentColorIndex;

      // Checking all directions in 1D array and pushing to stack
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

  // Update input
  imageDataInput.value = paletteImageData;
}

// Runs 60 times per second
const loop = setInterval(() => {
  if (isInCanvas(absMousePos, canvas.getBoundingClientRect())) {
    const pixelMousePos = getPixelMousePos(absMousePos, canvas);
    canvasDetails.textContent = `(${pixelMousePos.x}, ${pixelMousePos.y}) ${canvasSize}x${canvasSize}`; // Information for users about their mouse position

    ctx.putImageData(paletteToData(paletteImageData), 0, 0); // Go to most recent image data

    if (currentTool == Tool.Draw) {
      // Highlight pixel with current color
      ctx.fillStyle = currentColor;
      ctx.fillRect(pixelMousePos.x, pixelMousePos.y, 1, 1);
    } else if (currentTool == Tool.Erase) {
      // Show pixel if it was cleared
      ctx.clearRect(pixelMousePos.x, pixelMousePos.y, 1, 1);
    }

    if (isMouseDown && currentTool == Tool.Draw) {
      // Draws a line between 2 points if the mouse moves more than 1 pixel in a frame (creates pixel perfect line where ctx.lineto anti-aliases)
      const gap = Math.max(
        Math.abs(lastPosition.x - pixelMousePos.x),
        Math.abs(lastPosition.y - pixelMousePos.y),
      );

      // Fills pixels with current color
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
      // Same as draw with clear rect
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
    } else if (isMouseDown && !isInputDown.fill && currentTool == Tool.Fill) {
      // Fill with current color (only when key is pressed, not held)
      isInputDown.fill = true;
      floodFill(pixelMousePos);
    }

    // Last position store for creating a line in draw and erase
    lastPosition = pixelMousePos;
  }
}, 16.67);

// Event listeners to get mouse input
window.addEventListener("mousemove", (event) => {
  absMousePos = { x: event.clientX, y: event.clientY };
});
window.addEventListener("mousedown", (event) => {
  isMouseDown = true;
});
window.addEventListener("mouseup", (event) => {
  // Push to undo stack every time the mouse button is lifted
  if (isMouseDown && paletteImageData != undoStack[undoStack.length - 1]) {
    undoStack.push(paletteImageData);
    redoStack = [];
  }

  isMouseDown = false;
  isInputDown.fill = false;
});

window.addEventListener("keydown", (event) => {
  // Undo and Redo keyboard inputs
  if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
    if (event.shiftKey && !isInputDown.redo) {
      isInputDown.redo = true;
      redo();
    } else if (!isInputDown.undo) {
      isInputDown.undo = true;
      undo();
    }
  }

  // Tool shortcuts
  if (event.key === "b") setTool(Tool.Draw);
  if (event.key === "e") setTool(Tool.Erase);
  if (event.key === "g") setTool(Tool.Fill);

  tools.forEach((t) => (t.checked = false));
  tools[currentTool].checked = true;
});

window.addEventListener("keyup", (event) => {
  // Reset isInputDown
  if (event.key == "z") {
    isInputDown.undo = false;
    isInputDown.redo = false;
  }
});
