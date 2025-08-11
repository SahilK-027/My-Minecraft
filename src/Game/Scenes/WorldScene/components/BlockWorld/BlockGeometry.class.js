import * as THREE from 'three';

export class BlockGeometry {
  static createGeometry(atlas, blockConfig) {
    const geometry = new THREE.BufferGeometry();

    // Vertices: Using consistent winding order (counter-clockwise when viewed from outside)
    const vertices = new Float32Array([
      // Front face (z = +0.5) - looking at front from outside
      -0.5,
      -0.5,
      0.5, // bottom-left
      0.5,
      -0.5,
      0.5, // bottom-right
      0.5,
      0.5,
      0.5, // top-right
      -0.5,
      0.5,
      0.5, // top-left

      // Back face (z = -0.5) - looking at back from outside (vertices reversed for correct winding)
      0.5,
      -0.5,
      -0.5, // bottom-left (from outside view)
      -0.5,
      -0.5,
      -0.5, // bottom-right (from outside view)
      -0.5,
      0.5,
      -0.5, // top-right (from outside view)
      0.5,
      0.5,
      -0.5, // top-left (from outside view)

      // Top face (y = +0.5) - looking down from above
      -0.5,
      0.5,
      0.5, // front-left
      0.5,
      0.5,
      0.5, // front-right
      0.5,
      0.5,
      -0.5, // back-right
      -0.5,
      0.5,
      -0.5, // back-left

      // Bottom face (y = -0.5) - looking up from below (reversed winding)
      -0.5,
      -0.5,
      -0.5, // back-left (from below view)
      0.5,
      -0.5,
      -0.5, // back-right (from below view)
      0.5,
      -0.5,
      0.5, // front-right (from below view)
      -0.5,
      -0.5,
      0.5, // front-left (from below view)

      // Right face (x = +0.5) - looking at right side from outside
      0.5,
      -0.5,
      0.5, // front-bottom
      0.5,
      -0.5,
      -0.5, // back-bottom
      0.5,
      0.5,
      -0.5, // back-top
      0.5,
      0.5,
      0.5, // front-top

      // Left face (x = -0.5) - looking at left side from outside (reversed winding)
      -0.5,
      -0.5,
      -0.5, // back-bottom (from outside view)
      -0.5,
      -0.5,
      0.5, // front-bottom (from outside view)
      -0.5,
      0.5,
      0.5, // front-top (from outside view)
      -0.5,
      0.5,
      -0.5, // back-top (from outside view)
    ]);

    // Indices: 2 triangles per face with correct winding order
    const indices = new Uint16Array([
      // Front face
      0, 1, 2, 0, 2, 3,
      // Back face
      4, 5, 6, 4, 6, 7,
      // Top face
      8, 9, 10, 8, 10, 11,
      // Bottom face
      12, 13, 14, 12, 14, 15,
      // Right face
      16, 17, 18, 16, 18, 19,
      // Left face
      20, 21, 22, 20, 22, 23,
    ]);

    // Normals: outward-facing normals for each face
    const normals = new Float32Array([
      // Front face normals (z = +1)
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      // Back face normals (z = -1)
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      // Top face normals (y = +1)
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      // Bottom face normals (y = -1)
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      // Right face normals (x = +1)
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      // Left face normals (x = -1)
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ]);

    // UV placeholder - will be filled by createUVsForBlock
    const uvs = new Float32Array(24 * 2); // 24 vertices * 2 components

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    return geometry;
  }

  static createUVsForBlock(atlas, faceTextures) {
    const uvs = new Float32Array(48); // 24 vertices * 2 components
    const faces = ['front', 'back', 'top', 'bottom', 'right', 'left'];

    faces.forEach((face, faceIndex) => {
      const texName = faceTextures[face];
      const uvData = atlas.getUVData(texName);
      if (!uvData) {
        console.warn(`UV data not found for texture: ${texName}`);
        return;
      }

      // Get base UV coordinates from atlas
      let baseUVs = atlas.createFaceUVs(uvData);

      if (!baseUVs || baseUVs.length !== 8) {
        console.warn(`Invalid face UVs for texture: ${texName}`);
        return;
      }

      // Extract UV bounds (assuming baseUVs is [uMin,vMin, uMax,vMin, uMax,vMax, uMin,vMax])
      const uMin = baseUVs[0];
      const vMin = baseUVs[1];
      const uMax = baseUVs[2];
      const vMax = baseUVs[5];

      let faceUVs;

      // Handle each face with correct orientation
      switch (face) {
        case 'front':
          // Front face: standard mapping (bottom-left, bottom-right, top-right, top-left)
          faceUVs = [
            uMin,
            vMax, // bottom-left
            uMax,
            vMax, // bottom-right
            uMax,
            vMin, // top-right
            uMin,
            vMin, // top-left
          ];
          break;

        case 'back':
          // Back face: horizontally flipped (bottom-right, bottom-left, top-left, top-right)
          faceUVs = [
            uMax,
            vMax, // bottom-right (flipped)
            uMin,
            vMax, // bottom-left (flipped)
            uMin,
            vMin, // top-left (flipped)
            uMax,
            vMin, // top-right (flipped)
          ];
          break;

        case 'top':
          // Top face: standard mapping
          faceUVs = [
            uMin,
            vMin, // front-left
            uMax,
            vMin, // front-right
            uMax,
            vMax, // back-right
            uMin,
            vMax, // back-left
          ];
          break;

        case 'bottom':
          // Bottom face: vertically flipped
          faceUVs = [
            uMin,
            vMax, // back-left (flipped)
            uMax,
            vMax, // back-right (flipped)
            uMax,
            vMin, // front-right (flipped)
            uMin,
            vMin, // front-left (flipped)
          ];
          break;

        case 'right':
          // Right face: standard mapping
          faceUVs = [
            uMin,
            vMax, // front-bottom
            uMax,
            vMax, // back-bottom
            uMax,
            vMin, // back-top
            uMin,
            vMin, // front-top
          ];
          break;

        case 'left':
          // Left face: horizontally flipped
          faceUVs = [
            uMax,
            vMax, // back-bottom (flipped)
            uMin,
            vMax, // front-bottom (flipped)
            uMin,
            vMin, // front-top (flipped)
            uMax,
            vMin, // back-top (flipped)
          ];
          break;

        default:
          // Fallback to standard mapping
          faceUVs = [uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin];
      }

      // Set UVs for this face
      const start = faceIndex * 8;
      for (let i = 0; i < 8; i++) {
        uvs[start + i] = faceUVs[i];
      }
    });

    return uvs;
  }

  static createBlockGeometries(atlas, blockConfigs) {
    const geometries = new Map();

    Object.entries(blockConfigs).forEach(([blockId, config]) => {
      const geometry = BlockGeometry.createGeometry(atlas, config);
      const uvs = BlockGeometry.createUVsForBlock(atlas, config.faces);

      // Update the geometry's UV attribute
      geometry.getAttribute('uv').array.set(uvs);
      geometry.getAttribute('uv').needsUpdate = true;

      // Compute bounding box and sphere for proper culling
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      geometries.set(Number(blockId), geometry);
    });

    return geometries;
  }
}
