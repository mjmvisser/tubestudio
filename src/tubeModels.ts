import { findRootWithBisection } from './utils';
import type { AmpState } from './amp';

export abstract class TubeModel {
    type?: 'triode' | 'pentode';
    abstract Ip(Vg: number, Vp: number): number;

    constructor(public ampState: AmpState) {};

    Vg(Vp: number, Ip: number): number {
        return findRootWithBisection((Vg) => {
            return this.Ip(Vg, Vp) - Ip;
        }, -500, 0, 1000, 0.0000001, 0.0000001);
    }
    
    Vp(Vg: number, Ip: number): number {
        return findRootWithBisection((Vp) => {
            return this.Ip(Vg, Vp) - Ip;
        }, 0, 5000, 1000, 0.0000001, 0.0000001);
    }
}

abstract class Triode extends TubeModel {
    type: 'triode' = 'triode'; 
}

interface PentodeAmpState extends AmpState {
    Vg2: number;
    ultralinearTap: number;
}

abstract class Pentode extends TubeModel {
    type : 'pentode' = 'pentode';
    constructor(public ampState: PentodeAmpState) { super(ampState) };

    protected calculateVg2(Vp: number) : number {
        const t = this.ampState.mode === 'ultralinear' ? this.ampState.ultralinearTap / 100 : (this.ampState.mode === 'pentode' ? 0 : 1); 
        return this.ampState.Vg2 * (1 - t) + Vp * t;
    }
}

interface KorenTriodeParams {
    type: 'koren',
    mu: number;
    ex: number;
    Kg1: number;
    Kp: number;
    Kvb: number;
    Vct: number;
}

class KorenTriode extends Triode {
    constructor(ampState: AmpState, private params: KorenTriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number): number {
        // https://www.normankoren.com/Audio/Tubemodspice_article.html
        // https://www.normankoren.com/Audio/Tubemodspice_article_2.html
        const V1 = Vp * Math.log(1 + Math.exp(this.params.Kp * ((1 / this.params.mu) + (Vg + this.params.Vct) / Math.sqrt(this.params.Kvb + Vp * Vp)))) / this.params.Kp;
        return Math.pow(V1, this.params.ex) * (1 + Math.sign(V1)) / this.params.Kg1;

        // https://www.dmitrynizh.com/tubeparams_image.htm#my_own_models
        //return 2 * Math.pow(Vp * Math.log(1 + Math.exp(this.Kp * (1 / this.mu + (Vg + this.Vct) / Math.sqrt(this.Kvb + Vp*Vp)))) / this.Kp, this.ex) / this.Kg1;
    }
    
//    Vg(Vp, Ip) {
//        // https://www.dmitrynizh.com/tubeparams_image.htm#my_own_models
//        return Math.sqrt(this.Kvb + Vp*Vp) * Math.log(Math.exp((this.Kp / Vp) * Math.pow(Ip * this.Kg1 / 2, 1 / this.ex)) - 1) / this.Kp - Math.sqrt(this.Kvb + Vp * Vp) / this.mu - this.Vct;
//    }
}

interface KorenPentodeParams extends KorenTriodeParams {
    Kg2: number;
}

class KorenPentode extends Pentode {
    constructor(ampState: PentodeAmpState, private params: KorenPentodeParams) {
        super(ampState);
    }
    
    Ip(Vg: number, Vp: number) {
        const Vg2 = this.calculateVg2(Vp);

        // https://www.normankoren.com/Audio/Tubemodspice_article.html
        if (this.ampState.mode === 'triode') {
            const V1 = Vp * Math.log(1 + Math.exp(this.params.Kp * ((1 / this.params.mu) + (Vg + this.params.Vct) / Math.sqrt(this.params.Kvb + Vp * Vp)))) / this.params.Kp;
            return Math.pow(V1, this.params.ex) * (1 + Math.sign(V1)) / this.params.Kg1;
        } else {
            const V1 = Vg2 * Math.log(1 + Math.exp((1/this.params.mu + Vg / Vg2) * this.params.Kp)) / this.params.Kp;

            const Ip = (Math.pow(V1, this.params.ex) + Math.sign(V1) * Math.pow(V1, this.params.ex)) * Math.atan(Vp / this.params.Kvb) / this.params.Kg1;
            //const Ig2 = (((Vg + Vg2) / this.params.mu) >= 0) ? Math.pow((Vg + Vg2) / this.params.mu, 1.5) / this.params.Kg2 : 0;

            return Ip;
        }
    }
}

interface AyumiTriodeParams {
    type: 'ayumi',
    G: number;
    muc: number;
    alpha: number;
    Vgo: number;    
    Glim?: number;
    Xg?: number;
}

interface AyumiTriodeParamsFullySpecified extends AyumiTriodeParams {
    Glim: number;
    Xg: number;
}

class AyumiTriode extends Triode {
    private a: number;
    private b: number;
    private c: number;

    private Gp: number;
    private mum: number;

    private params: AyumiTriodeParamsFullySpecified;

    constructor(ampState: AmpState, params: AyumiTriodeParams) {
        super(ampState);
        this.params = params as AyumiTriodeParamsFullySpecified;

        this.a = (params.alpha === 1) ? Infinity : 1/(1 - params.alpha); // B.24
        this.b = 1.5 - this.a;                                           // B.25
        this.c = 3 * params.alpha - 1;                                   // B.26
        
        this.Gp = params.G * Math.pow(this.c * this.a / 3, this.b);      // B.27
        
        this.mum = this.a / 1.5 * params.muc  // B.6

        this.params = {
            type: 'ayumi',
            G: params.G,
            muc: params.muc,
            alpha: params.alpha,
            Vgo: params.Vgo,
            Glim: (params.Glim === undefined) ? this.Gp * Math.pow(1 + 1/this.mum, 1.5) : params.Glim, // B.21
            Xg: (params.Xg === undefined) ? 0.5 / Math.pow(1 + 1/this.mum, 1.5) : params.Xg,           // B.20
        };
    }
    
    Ip(Vg: number, Vp: number): number {
        console.assert(Vp >= 0);
        
        const Vgg = Vg + this.params.Vgo;  // B.23
        
        // Cathode current // B.28
        let Ik = 0;
        if (Vgg <= 0) {
            if (Vp > 0) {
                const estm = Math.max(Vgg + Vp/this.params.muc, 0);
                Ik = this.params.G * Math.pow(this.c / 2 / this.params.muc * Vp, this.b) * Math.pow(1.5 / this.a * estm, this.a);
            } else {
                Ik = 0;
            }
        } else {  // Vgg > 0
            const estp = Math.max(Vgg + Vp / this.mum, 0);
            Ik = this.Gp * Math.pow(estp, 1.5);
        }

        // Grid current // B.29
        let Ig = 0;
        if (Vgg > 0) {
            if (Vg > 0) {
                Ig = this.params.Xg * this.params.Glim * Math.pow(Vg, 1.5) * (1.2 * (Vg / (Vp + Vg)) + 0.4);
            }
        }

        const Iplim = (1 - this.params.Xg) * this.params.Glim * Math.pow(Vp, 1.5);  // B.30
        
        return Math.max(Math.min(Ik - Ig, Iplim), 0);       // B.31
    }
}

interface AyumiPentodeParams extends AyumiTriodeParams {
    r: number;
    Ea: number;
}

interface AyumiPentodeParamsFullySpecified extends AyumiPentodeParams {
    Glim: number;
    Xg: number;
}

class AyumiPentode extends Pentode {
    private a: number;
    private b: number;
    private c: number;

    private Gp: number;
    private mum: number;

    private params: AyumiPentodeParamsFullySpecified;

    constructor(ampState: PentodeAmpState, params: AyumiPentodeParams) {
        super(ampState);
        this.params = params as AyumiPentodeParamsFullySpecified;

        this.a = (params.alpha === 1) ? Infinity : 1/(1 - params.alpha); // B.24
        this.b = 1.5 - this.a;                                           // B.25
        this.c = 3 * params.alpha - 1;                                   // B.26
        
        this.Gp = params.G * Math.pow(this.c * this.a / 3, this.b);      // B.27
        
        this.mum = this.a / 1.5 * params.muc  // B.6

        this.params = {
            type: 'ayumi',
            G: params.G,
            muc: params.muc,
            alpha: params.alpha,
            Vgo: params.Vgo,
            r: params.r,
            Ea: params.Ea,
            Xg: (params.Xg === undefined) ? 0.5 / Math.pow(1 + 1/this.mum, 1.5) : params.Xg,           // B.20
            Glim: (params.Glim === undefined) ? this.Gp * Math.pow(1 + 1/this.mum, 1.5) : params.Glim, // B.21
        };
    }
    
    Ip(Vg: number, Vp: number): number {
        console.assert(Vp >= 0);
        
        const Vg2 = this.calculateVg2(Vp);

        console.assert(Vg2 >= 0);

        const Vgg = Vg + this.params.Vgo;  // B.23
        
        // Cathode current // B.32
        let Ik = 0;
        if (Vgg <= 0) {
            const estm = Math.max(Vgg + Vg2 / this.params.muc, 0);
            if (Vg2 > 0) {
                Ik = this.params.G * Math.pow(this.c / 2 / this.params.muc * Vg2, this.b) * Math.pow(1.5 / this.a * estm, this.a); 
            }
        } else {  // Vgg > 0
            const estp = Math.max(Vgg + Vg2 / this.mum, 0);
            Ik = this.Gp * Math.pow(estp, 1.5);
        }

        // Grid current // B.33
        Vg = Math.max(Vg, 0);
        let Ig = 0;
        if (Vgg > 0) {
            if (Vp + Vg > 0) {
                Ig = this.params.Xg * this.params.Glim * Math.pow(Vg, 1.5) * (Vg / (Vp + Vg) * 1.2 + 0.4);
            }
        } else {
            Ig = this.params.Xg * this.params.Glim * Math.pow(Vg, 1.5) * (Vg * 1.2 + 0.4);
        }

        // Reduction in cathode current when plate voltage is lower than 2nd grid voltage
        let f = 1;
        if (Vg2 > 0) {
            f = 1 - 0.4 * (Math.exp(-Vp / Vg2 * 15) - Math.exp(-15)); // B.34
        }
        const Ik2 = f * (Ik - Ig); // B.37

        // Screen grid current distribution ratio
        const g = (1 - this.params.r) * Math.pow(1 - Vp / (Vp + 10), 1.5) + this.params.r; // B.38
        const Ig2_th = g * Ik2; // B.39

        // Cathode current including plate resistance
        const h = (Vp - this.params.Ea) / (Vg2 - this.params.Ea); // B.42
        const Ik3 = h * Ik2; // B.43

        // Cathode emission limits
        const Iklim = (1 - this.params.Xg) * this.params.Glim * Math.pow(Math.max(Vp, Vg2), 1.5); // B.46
        const Ik4 = Math.min(Ik3, Iklim);   // B.47

        // Plate current limit
        const Iplim = (1 - this.params.Xg) * this.params.Glim * Math.pow(Vp, 1.5);  // B.30

        // Plate current
        const Ip = Math.max(Math.min(Ik4 - Ig2_th, Iplim), 0);  // B.48

        //const Ig2 = Math.max(Ik4 - Ip, 0); // B.49

        return Ip;
    }
}

export type TubeModelParams = (AyumiTriodeParams | AyumiPentodeParams | KorenTriodeParams | KorenPentodeParams) & {type: string; attribution: string; source: string};

export const tubeFactory = {
    createTube: (type: 'triode' | 'tetrode' | 'pentode', ampState: AmpState, params: TubeModelParams) => {
        switch (type) {
            case 'triode':
                switch (params.type) {
                    case 'koren':
                        return new KorenTriode(ampState, params as KorenTriodeParams);
                    case 'ayumi':
                        return new AyumiTriode(ampState, params as AyumiTriodeParams);
                }
                break;

            case 'tetrode':
            case 'pentode':
                switch (params.type) {
                    case 'koren':
                        return new KorenPentode(ampState as PentodeAmpState, params as KorenPentodeParams);
                    case 'ayumi':
                        return new AyumiPentode(ampState as PentodeAmpState, params as AyumiPentodeParams);
                }
        }
        
        throw "No such model: " + type + ", " + params.type;
    }
}


