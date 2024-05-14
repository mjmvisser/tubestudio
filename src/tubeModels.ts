import { findRootWithBisection } from './utils';
import type { AmpState } from './amp';

export abstract class TubeModel {
    type?: 'triode' | 'pentode';
    abstract Ip(Vg: number, Vp: number): number;

    constructor(public ampState: AmpState) {};

    Vg(Vp: number, Ip: number): number {
        return findRootWithBisection((Vg) => {
            return this.Ip(Vg, Vp) - Ip;
        }, -500, 50, 1000, 0.0000001, 0.0000001);
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

interface KorenNizhegorodovPentodeParams {
    type: 'koren-nizhegorodov'; // PaintKIP model
    // Triode parameters
    MU: number;
    KG1: number;
    KP: number;
    KVB: number;
    VCT: number;
    EX: number;

    RGI?: number; // for grid current when grid is positive

    // Pentode/tetrode parameters
    KG2: number;
    KLAM: number;  // sets a slight linear slope of the top of the curves - set to zero if unused
    KLAMG: number;  // simple grid-dependent linear slope of the top of the curves - set to zero if unused
    KNEE: number;   // pentode knee parameter - KVB in the original Koren Improved Model
    KVC: number;    // controls to what degree the knee bend of the plate lines is mirrored by the screen lines

    // Tanh knee is sharper and better for beam tetrodes
    // atan still defines the top but is shifted
    tanhKnee?: {
        KNEE2: number;  // controls curving on the top of the knee
        KNEX: number;   // by how many volts the knee controlled by parameter KNEE is shifted to the left
    }

    advSigmoid?: {
        KD: number;
        KC: number;
        KR1: number;
        KR2: number;

        KVBG: number;
        KB1: number;
        KB2: number;
        KB3: number;
        KB4: number;
        KVBGI: number;
    };

    addKink?: {
        KNK: number;
        KNG: number;
        KNPL: number;
        KNSL: number;
        KNPR: number;
        KNSR: number;
    }
}

function limit(x: number, min: number, max: number) {
    if (x < min) {
        return min;
    } else if (x > max) {
        return max;
    } else {
        return x;
    }
}

function pwr(arg: number, pow: number) {
    return Math.pow(Math.abs(arg), pow);
}

function pwr_pwrs(arg: number, pow: number) {
    if (arg >= 0) return 2 * Math.pow(arg, pow);
    else // this really is a 0
    return 0.0; // Math.pow(arg, pow) - Math.pow(-arg, pow);
  }

class KorenNizhegorodovPentode extends Pentode {
    constructor(ampState: PentodeAmpState, private params: KorenNizhegorodovPentodeParams) {
        super(ampState);
    }

    private plateCurrentTriode(Vp: number, Vg: number, kg: number) {
        const adj_e = this.params.KP * (1/this.params.MU + (this.params.VCT + Vg)/Math.sqrt(this.params.KVB + Vp*Vp));
        const E1 = (adj_e > 700) ? Vp/this.params.KP*adj_e : Vp/this.params.KP*Math.log(1+Math.exp(adj_e));// avoid overflow preserving precision
        
        const Iplate = pwr_pwrs(E1,this.params.EX)/kg;
        return Iplate;
    }

    // see https://en.wikipedia.org/wiki/Sigmoid_function
    // https://en.wikipedia.org/wiki/Error_function
    // https://www.desmos.com/calculator/rxyjk5jjvo
    knee_func_erf(x: number) {
        if (this.params.advSigmoid) {
            const xb1 = pwr(x, this.params.advSigmoid.KB1);
            const xb2 = pwr(x, this.params.advSigmoid.KB2);
            const xb3 = pwr(x, this.params.advSigmoid.KB3);
            const power = -xb1*(this.params.advSigmoid.KC+this.params.advSigmoid.KR1*xb2)/(this.params.advSigmoid.KD+this.params.advSigmoid.KR2*xb3);
            return 1.5708*pwr((1-Math.exp(power)),this.params.advSigmoid.KB4);
        } else {
            return 0;
        }
    }

    knee_simple(Vp: number) { 
        return this.params.tanhKnee 
          ? (Math.atan((Vp+this.params.tanhKnee.KNEX)/this.params.KNEE)*Math.tanh(Vp/this.params.tanhKnee.KNEE2))
          : Math.atan(Vp/this.params.KNEE); 
      }
      
    top_adjustments(Vp: number, Vg: number) {
        if (this.params.addKink) {
            // to do: improve this by relacing LIMIT with the approach from 
            // https://www.desmos.com/calculator/64of4ge5ym
            const magnitude = limit(this.params.addKink.KNK-Vg*this.params.addKink.KNG,0,0.3);
            let dent_eq = // see https://www.desmos.com/calculator/64of4ge5ym
            -Math.atan((Vp-this.params.addKink.KNPL)/this.params.addKink.KNSL)  // left side of 'trough' aka kink aka dip
            +Math.atan((Vp-this.params.addKink.KNPR)/this.params.addKink.KNSR); // right side of 'trough' aka kink aka dip
            dent_eq *= magnitude;
            dent_eq += 1;
            return dent_eq;
        } else {
            return 1;
        }
    }
      
    Ip(Vg: number, Vp: number) {
//        if (addLocalNFB) Eg += Ep*NFB; // apply local NFB
            // if (currentTabIdx == 2 && doLIN && Eg_last != Eg) 
            //   plateCurrent_li_adjust(Ep, Eg);
          
        const v_screen = this.ampState.mode === 'ultralinear' ? (this.ampState.Vq + this.ampState.ultralinearTap * (Vp - this.ampState.Vq)) : this.ampState.Vg2;
        const triode_ip = this.plateCurrentTriode(v_screen, Vg, this.params.KG1);
        return (this.params.advSigmoid
                    ? (triode_ip * this.knee_func_erf(Vp/(
                                                      this.params.KNEE*(this.params.advSigmoid.KVBGI+triode_ip*this.params.KG1*this.params.advSigmoid.KVBG)
                                                      )
                                                  ))
                    : triode_ip * this.knee_simple(Vp))
              * this.top_adjustments(Vp, Vg) * (1 + this.params.KLAMG*Vp)  + this.params.KLAM*Vp;
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
            ...params,
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

export type TubeModelParams = (AyumiTriodeParams | AyumiPentodeParams | KorenTriodeParams | KorenPentodeParams | KorenNizhegorodovPentodeParams) & {type: string; attribution: string; source: string};

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
                    case 'koren-nizhegorodov':
                        return new KorenNizhegorodovPentode(ampState as PentodeAmpState, params as KorenNizhegorodovPentodeParams);
                    case 'ayumi':
                        return new AyumiPentode(ampState as PentodeAmpState, params as AyumiPentodeParams);
                }
        }
        
        throw "No such model: " + type + ", " + params.type;
    }
}


