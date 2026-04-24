
export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const rotRad = (rotation * Math.PI) / 180;

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // Max dimension for the output image to stay within Firestore limits
  const maxDimension = 1000;
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth > targetHeight) {
      targetHeight = (maxDimension / targetWidth) * targetHeight;
      targetWidth = maxDimension;
    } else {
      targetWidth = (maxDimension / targetHeight) * targetWidth;
      targetHeight = maxDimension;
    }
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d');

  if (!finalCtx) return '';

  // Instead of putImageData (which doesn't scale), we draw from the intermediate canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = pixelCrop.width;
  tempCanvas.height = pixelCrop.height;
  tempCanvas.getContext('2d')?.putImageData(data, 0, 0);

  finalCtx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);

  // As Base64 string with 0.7 quality
  return finalCanvas.toDataURL('image/jpeg', 0.7);

  // As a blob
  /*
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      resolve(URL.createObjectURL(file))
    }, 'image/jpeg')
  })
  */
};

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Failed to load image')));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}
