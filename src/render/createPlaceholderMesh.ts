import { Mesh, BoxGeometry, MeshStandardMaterial } from 'three';

/** @deprecated Replaced by buildCathedralGeometry in US-011. Will be removed once US-011 is confirmed stable. */
export function createPlaceholderMesh(): Mesh {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ color: 0x8866aa });
  return new Mesh(geometry, material);
}
