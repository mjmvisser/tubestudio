export interface TubeLimits {
    maxPp: number;
    maxVp: number;
    maxIp: number;
    minVg: number;
    maxVg: number;
    maxVg2?: number;
    gridStep: number;
}

export interface TubeDefaults {
    Bplus: number;
    Rp: number;
    Iq: number;
    Vg2?: number;
}
