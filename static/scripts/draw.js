const canvas = document.getElementById("drawingCanvas");
const canvasSize = canvas.width;
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let isMouseDown = false;
let lastPosition = { x: 0, y: 0 };
let currentColor = "black";
ctx.fillStyle = currentColor;

let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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

window.addEventListener("mousemove", (event) => {
  const absMousePos = { x: event.clientX, y: event.clientY };
  if (isInCanvas(absMousePos, canvas.getBoundingClientRect())) {
    const pixelMousePos = getPixelMousePos(absMousePos, canvas);

    ctx.putImageData(imageData, 0, 0);

    ctx.fillRect(pixelMousePos.x, pixelMousePos.y, 1, 1);

    if (isMouseDown) {
      ctx.moveTo(lastPosition.x + 0.5, lastPosition.y + 0.5);
      ctx.lineTo(pixelMousePos.x + 0.5, pixelMousePos.y + 0.5);
      ctx.strokeWidth = 1;
      ctx.stroke();
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    lastPosition = pixelMousePos;
  }

  window.addEventListener("mousedown", (event) => {
    isMouseDown = true;
  });

  window.addEventListener("mouseup", (event) => {
    isMouseDown = false;
  });
});
