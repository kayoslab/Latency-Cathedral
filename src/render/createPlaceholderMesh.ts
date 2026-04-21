import { Mesh, BoxGeometry, MeshStandardMaterial } from 'three';

export function createPlaceholderMesh(): Mesh {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ color: 0x8866aa });
  return new Mesh(geometry, material);
}
