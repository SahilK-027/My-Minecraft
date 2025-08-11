// TextureAtlas.class (patched)
import * as THREE from 'three';

export class TextureAtlas {
  constructor(textureSize = 32, atlasSize = 512) {
    this.textureSize = textureSize;
    this.atlasSize = atlasSize;
    this.texturesPerRow = Math.floor(atlasSize / textureSize);
    this.textureMap = new Map();
    this.canvas = document.createElement('canvas');
    this.canvas.width = atlasSize;
    this.canvas.height = atlasSize;
    this.ctx = this.canvas.getContext('2d');
    this.currentIndex = 0;

    this.atlasTexture = new THREE.CanvasTexture(this.canvas);
    this.atlasTexture.magFilter = THREE.NearestFilter;
    this.atlasTexture.minFilter = THREE.NearestFilter;
    this.atlasTexture.generateMipmaps = false;
  }

  addTexture(name, texture) {
    if (this.textureMap.has(name)) return this.textureMap.get(name);

    const row = Math.floor(this.currentIndex / this.texturesPerRow);
    const col = this.currentIndex % this.texturesPerRow;
    const x = col * this.textureSize;
    const y = row * this.textureSize;

    const updateUV = () => {
      const uvData = {
        index: this.currentIndex,
        minU: x / this.atlasSize,
        maxU: (x + this.textureSize) / this.atlasSize,
        // NOTE: since atlasTexture.flipY = false, we flip V here
        minV: 1 - (y + this.textureSize) / this.atlasSize,
        maxV: 1 - y / this.atlasSize,
        row,
        col,
      };
      this.textureMap.set(name, uvData);
      this.currentIndex++;
      // always mark the CanvasTexture as updated after drawing
      if (this.atlasTexture) this.atlasTexture.needsUpdate = true;
      return uvData;
    };

    const drawImg = (img) => {
      try {
        // clear the cell first (optional)
        this.ctx.clearRect(x, y, this.textureSize, this.textureSize);
        this.ctx.drawImage(img, x, y, this.textureSize, this.textureSize);
      } catch (e) {
        console.warn('drawImage failed for', name, e);
      }
      return updateUV();
    };

    if (texture && texture.image) {
      const img = texture.image;

      // If ImageBitmap or complete HTMLImageElement
      if (img instanceof ImageBitmap || img.complete === true) {
        drawImg(img);
      } else if (img && typeof img.addEventListener === 'function') {
        // not yet loaded — attach handlers
        const onLoad = () => {
          drawImg(img);
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
        };
        const onError = (e) => {
          console.warn('image load error for', name, e);
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
      } else {
        // fallback: try drawing anyway
        drawImg(img);
      }
    } else {
      console.warn('Texture image not available yet for', name);
      // Create uvData anyway so callers see something — they'll likely get updated when image loads
      return updateUV();
    }

    return this.textureMap.get(name) || null;
  }

  generateAtlasTexture() {
    // keep for compatibility — return the existing CanvasTexture
    if (!this.atlasTexture) {
      this.atlasTexture = new THREE.CanvasTexture(this.canvas);
    }
    this.atlasTexture.needsUpdate = true;
    return this.atlasTexture;
  }

  getUVData(name) {
    return this.textureMap.get(name) || null;
  }

  getTextureNames() {
    return Array.from(this.textureMap.keys());
  }

  /**
   * Create face UVs. Uses the atlas flipY convention: atlasTexture.flipY === false
   * If you ever toggle flipY, update this function to match.
   */
  createFaceUVs(uvData) {
    const { minU, maxU, minV, maxV } = uvData;
    // vertex order assumed: bottom-left, bottom-right, top-right, top-left
    return [
      minU,
      maxV, // bottom-left
      maxU,
      maxV, // bottom-right
      maxU,
      minV, // top-right
      minU,
      minV, // top-left
    ];
  }

  debugAtlas() {
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = this.canvas.width;
    atlasCanvas.height = this.canvas.height;
    const ctx = atlasCanvas.getContext('2d');
    ctx.drawImage(this.canvas, 0, 0);

    const cellSize = this.textureSize;
    ctx.strokeStyle = 'grey';
    ctx.lineWidth = 1;

    for (let x = 0; x <= atlasCanvas.width; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, atlasCanvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= atlasCanvas.height; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(atlasCanvas.width, y);
      ctx.stroke();
    }

    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'fixed';
    debugDiv.style.bottom = '70px';
    debugDiv.style.left = '10px';
    debugDiv.style.zIndex = '9999';
    debugDiv.style.background = 'rgba(0,0,0,0.8)';
    debugDiv.style.padding = '10px';
    debugDiv.style.borderRadius = '5px';

    const img = document.createElement('img');
    img.src = atlasCanvas.toDataURL();
    img.style.width = '200px';
    img.style.height = '200px';
    img.style.imageRendering = 'pixelated';

    const title = document.createElement('div');
    title.textContent = 'Texture Atlas';
    title.style.color = 'white';
    title.style.marginBottom = '5px';
    title.style.textAlign = 'center';

    debugDiv.appendChild(title);
    debugDiv.appendChild(img);
    document.body.appendChild(debugDiv);

    console.log('Texture Atlas Map:', this.textureMap);
  }
}
