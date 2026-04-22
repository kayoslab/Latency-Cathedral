/**
 * Gothic arch and tracery shape utilities.
 */
import { Shape, QuadraticBezierCurve3, Vector3 } from 'three';

/** Solid filled pointed arch. */
export function createSolidArchShape(halfWidth: number, height: number): Shape {
  const shape = new Shape();
  const wallH = height * 0.55;
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(-halfWidth, wallH);
  shape.quadraticCurveTo(-halfWidth * 0.08, height * 1.06, 0, height);
  shape.quadraticCurveTo(halfWidth * 0.08, height * 1.06, halfWidth, wallH);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(-halfWidth, 0);
  return shape;
}

/** Small decorative arch for blind arcading. */
export function createSmallArchShape(halfWidth: number, height: number): Shape {
  const shape = new Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(-halfWidth, height * 0.5);
  shape.quadraticCurveTo(-halfWidth * 0.1, height * 1.05, 0, height);
  shape.quadraticCurveTo(halfWidth * 0.1, height * 1.05, halfWidth, height * 0.5);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(-halfWidth, 0);
  return shape;
}

/** Bezier curve for flying buttress arc. */
export function createButtressCurve(
  startX: number, startY: number,
  endX: number, endY: number,
  z: number,
): QuadraticBezierCurve3 {
  const midX = (startX + endX) * 0.5;
  const midY = Math.max(startY, endY) + Math.abs(endX - startX) * 0.3;
  return new QuadraticBezierCurve3(
    new Vector3(startX, startY, z),
    new Vector3(midX, midY, z),
    new Vector3(endX, endY, z),
  );
}
