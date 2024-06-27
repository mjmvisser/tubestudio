export interface TubeLimits {
    maxPp: number;  // maximum plate power dissipation
    maxVp: number;  // maximum plate voltage 
    maxVp0: number; // maximum plate voltage with tube cutoff (Ip<=5µA)
    maxIp: number;  // maximum plate current
    maxIk?: number; // maximum cathode current
    minVg: number;  // minimum grid voltage
    maxVg: number;  // maximum grid voltage
    maxVg2?: number;    // maximum screen voltage
    gridStep: number;   // grid voltage step between characteristic lines
}

export interface TubeDefaults {
    Bplus: number;
    Rp: number;
    Iq: number;
    Vg2?: number;
}
