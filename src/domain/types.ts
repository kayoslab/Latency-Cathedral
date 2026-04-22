export interface ProbeSample {
  url: string;
  statusCode: number;
  rttMs: number;
  timestampMs: number;
}

export interface NetworkSnapshot {
  samples: ProbeSample[];
  medianRtt: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  timestampMs: number;
}

export interface SceneParams {
  height: number;
  symmetry: number;
  fracture: number;
  fog: number;
  lightIntensity: number;
  ruinLevel: number;
}
