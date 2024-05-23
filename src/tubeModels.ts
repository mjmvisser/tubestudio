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

// these are non-optional for pentodes
interface PentodeAmpState extends AmpState {
    Vg2: number;
    ultralinearTap: number;
}

abstract class Pentode extends TubeModel {
    type : 'pentode' = 'pentode';
    constructor(public ampState: PentodeAmpState) { super(ampState) };

    abstract Ig2(Vg: number, Vp: number): number;

    protected calculateVg2(Vp: number) : number {
        if (this.ampState.mode === 'ultralinear') {
            return this.ampState.Vq + (this.ampState.ultralinearTap / 100) * (Vp - this.ampState.Vq);
        } else {
            return this.ampState.Vg2;
        }
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

    Ig2(Vg: number, Vp: number) {
        const Vg2 = this.calculateVg2(Vp);
        const Ig2 = ((Vg + Vg2) >= 0) ? Math.pow((Vg + Vg2) / this.params.mu, 1.5) / this.params.Kg2 : 0;

        return Ig2;
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

interface KorenNizhegorodovTriodeParams {
    type: 'paintkit'; // Koren model from PaintKIT.jar
    // Triode parameters
    MU: number;
    KG1: number;
    KP: number;
    KVB: number;
    VCT: number;
    EX: number;

    RGI?: number; // for grid current when grid is positive
}

class KorenNizhegorodovTriode extends Triode {
    constructor(ampState: AmpState, private params: KorenNizhegorodovTriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        const adj_e = this.params.KP * (1/this.params.MU + (this.params.VCT + Vg)/Math.sqrt(this.params.KVB + Vp*Vp));
        const E1 = (adj_e > 700) 
            ? Vp/this.params.KP*adj_e // avoid overflow preserving precision
            : Vp/this.params.KP*Math.log(1+Math.exp(adj_e));
        const Ip = pwr_pwrs(E1, this.params.EX)/this.params.KG1;
        return Ip;
    }

}

interface KorenNizhegorodovPentodeParams {
    type: 'paintkip'; // Koren-Nizhegorodov model from PaintKIP.jar
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
    private knee_func_erf(x: number) {
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

    private knee_simple(Vp: number) { 
        return this.params.tanhKnee 
          ? (Math.atan((Vp+this.params.tanhKnee.KNEX)/this.params.KNEE)*Math.tanh(Vp/this.params.tanhKnee.KNEE2))
          : Math.atan(Vp/this.params.KNEE); 
      }
      
    private top_adjustments(Vp: number, Vg: number) {
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
          
        const v_screen = this.calculateVg2(Vp);
        const triode_ip = this.plateCurrentTriode(v_screen, Vg, this.params.KG1);
        return (this.params.advSigmoid
                    ? (triode_ip * this.knee_func_erf(Vp/(
                                                      this.params.KNEE*(this.params.advSigmoid.KVBGI+triode_ip*this.params.KG1*this.params.advSigmoid.KVBG)
                                                      )
                                                  ))
                    : triode_ip * this.knee_simple(Vp))
              * this.top_adjustments(Vp, Vg) * (1 + this.params.KLAMG*Vp)  + this.params.KLAM*Vp;
    }

    Ig2(Vg: number, Vp: number) {
        const v_screen = this.calculateVg2(Vp);
        const triode_ip = this.plateCurrentTriode(v_screen, Vg, 1);
        const knee_coeff = this.params.advSigmoid
            ? (triode_ip * this.knee_func_erf(Vp/(
                                              this.params.KNEE*(this.params.advSigmoid.KVBGI+triode_ip*this.params.KG1*this.params.advSigmoid.KVBG)
                                              )
                                          ))
            : triode_ip * this.knee_simple(Vp);

        const Ip_dip = knee_coeff*(triode_ip/this.params.KG1)*(1 - this.top_adjustments(Vp, Vg));
        return (triode_ip/this.params.KG2) * (this.params.KVC - knee_coeff)/(1 + this.params.KLAMG*Vp) + Ip_dip;
    }
}

// to extract Ayumi parameters from SPICE model, see https://ayumi.cava.jp/audio/pctube/node47.html 

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
    
    private calculateCurrents(Vg: number, Vp: number) {
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

        // Screen current
        const Ig2 = Math.max(Ik4 - Ip, 0); // B.49

        return {Ip: Ip, Ig2: Ig2};
    }

    Ip(Vg: number, Vp: number) {
        return this.calculateCurrents(Vg, Vp).Ip;
    }

    Ig2(Vg: number, Vp: number) {
        return this.calculateCurrents(Vg, Vp).Ig2;
    }
}

interface WeaverPentodeParams {
    type: 'weaver'; // Rober Weaver's pentode model from https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/page-2
    EcRef: number;
    EsRef: number;
    g0: number;
    kp1: number;
    kp2: number;
    kp3: number;
    kp4: number;
    kt1: number;
    kt2: number;
    kc1: number;
    kc2: number;
    kc3: number;
    ks1: number;
    ks2: number;
    ks3: number;
    kcs: number;
}

class WeaverPentode extends Pentode {
    constructor(ampState: PentodeAmpState, private params: WeaverPentodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number): number {
        const Frc = this.params.kc1*Math.pow(Vg, 2)+this.params.kc2*Vg+this.params.kc3;
        const Frs = this.params.ks1*Math.pow(this.ampState.Vg2, 2)+this.params.ks2*this.ampState.Vg2+this.params.ks3;
        const Fsc = 1/(1-(this.params.kcs*(Vg-this.params.EcRef)*(1-this.ampState.Vg2/this.params.EsRef)));
        
        return Math.max(0, (this.params.g0*Vp+(this.params.kp1/(this.params.kp2+Vp)+this.params.kp3*Vp+this.params.kp4-this.params.g0*Vp)/(1+Math.exp((this.params.kt1-Vp)*this.params.kt2)))*Frc*Frs*Fsc);
    }

    // As per Bob's message: "I have not developed any model for control grid current or screen grid current. I'll probably take a crack at them eventually. In the meantime, an existing model (Koren or Ayumi) will have to be used for these."
    // Thus we calculate Ig2 using Koren's model.
    Ig2(Vg: number, Vp: number) {
        const Vg2 = this.calculateVg2(Vp);
        const Ig2 = ((Vg + Vg2) >= 0) ? Math.pow((Vg + Vg2) / this.params.mu, 1.5) / this.params.Kg2 : 0;

        return Ig2;
    }

}

function ppow(x: number, g: number) {
    return (x > 0.0) ? Math.pow(x, g) : 0.0;
}



interface CCRydel4TriodeParams {
    type: 'cc-rydel4',  // CurveCaptor's implementation of the Rydel model with 4 parameters
    Ka: number;
    Kb: number;
    mu: number;
    Vc: number;
}

class CCRydel4Triode extends Triode {
    constructor(ampState: AmpState, private params: CCRydel4TriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        const Ip = (this.params.Ka + this.params.Kb*Vg) * ppow(this.params.mu*Vg + Vp + this.params.Vc, 1.5);
        return Ip;
    }
}

interface CCRydel5TriodeParams {
    type: 'cc-rydel5';  // CurveCaptor's implementation of the Rydel model with 5 parameters
    Ka: number;
    Kb: number;
    mu: number;
    Vc: number;
    C: number;
}

class CCRydel5Triode extends Triode {
    constructor(ampState: AmpState, private params: CCRydel5TriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        const Ip = (this.params.Ka + this.params.Kb*Vg) * ppow(this.params.mu*Vg + Vp + this.params.Vc, 1.5) * Vp/this.params.C;
        return Ip;
    }
}

interface CCKoren4TriodeParams {
    type: 'cc-koren4'; // CurveCaptor's implementation of the Koren model with 4 parameters
    K: number;
    Kp: number;
    mu: number;
    gamma: number;
}

class CCKoren4Triode extends Triode {
    constructor(ampState: AmpState, private params: CCKoren4TriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        const U = Vp * Math.log(1.0 + Math.exp(this.params.Kp + this.params.Kp*this.params.mu*Vg/Vp))/this.params.Kp;
        const Ip = this.params.K * ppow(U, this.params.gamma);
        return Ip;
    }
}

interface CCKoren5TriodeParams {
    type: 'cc-koren5'; // CurveCaptor's implementation of the Koren model with 5 parameters
    K: number;
    Kp: number;
    mu: number;
    Kv: number;
    gamma: number;
}

class CCKoren5Triode extends Triode {
    constructor(ampState: AmpState, private params: CCKoren5TriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        const U = Vp * Math.log(1.0 + Math.exp(this.params.Kp + this.params.Kp*this.params.mu*Vg/Math.sqrt(1000.0*this.params.Kv + Vp*Vp)))/this.params.Kp;
        const Ip = this.params.K * ppow(U, this.params.gamma);
        return Ip;
    }
}

interface CCKoren6TriodeParams {
    type: 'cc-koren6'; // CurveCaptor's implementation of the Koren model with 6 parameters
    K: number;
    Kc: number;
    Kp: number;
    mu: number;
    nu: number;
    gamma: number;
}

class CCKoren6Triode extends Triode {
    constructor(ampState: AmpState, private params: CCKoren6TriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        const U = Vp * Math.log(1.0 + this.params.Kc + Math.exp(this.params.Kp + this.params.Kp*(this.params.mu+this.params.nu*Vg/1000.0)*Vg/Vp))/this.params.Kp;
        const Ip = this.params.K * ppow(U, this.params.gamma);
        return Ip;
    }
}

interface CCKoren8TriodeParams {
    type: 'cc-koren8'; // CurveCaptor's implementation of the Koren model with 8 parameters
    K: number;
    Kc: number;
    Kp: number;
    mu: number;
    nu: number;
    Kv: number;
    Vc: number;
    gamma: number;
}

class CCKoren8Triode extends Triode {
    constructor(ampState: AmpState, private params: CCKoren8TriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        const U = Vp * Math.log(1.0 + this.params.Kc + Math.exp(this.params.Kp + this.params.Kp*(this.params.mu+this.params.nu*Vg/1000.0)*Vg/Math.sqrt(this.params.Kv*this.params.Kv+(Vp-this.params.Vc)*(Vp-this.params.Vc))))/this.params.Kp;
        const Ip = this.params.K * ppow(U, this.params.gamma);
        return Ip;
    }
}

interface ImmlerTriodeParams {
    type: 'immler'; // https://adrianimmler.simplesite.com/
    
    // Parameters for space charge current Is (100% assigned to Ia @ Vg < 0)
    mu: number;     // Determines the voltage gain @ constant Ia
    rad: number;    // Differential anode resistance, set @ Iad and Vg=0V
    Vct: number;    // Offsets the Ia-traces on the Va axis. Electrode material's contact potential
    kp: number;     // Mimics the island effect
    xs: number;     // Determines the curve of the Ia traces. Typically between 1.2 and 1.8
    kIsr: number;   // Va-indepedent part of the Is reduction when gridcurrent occurs
    kvdg: number;   // Va-depedent part of the Is reduction when gridcurrent occurs

    // Parameters for assigning the space charge current to Ia and Ig @ Vg > 0
    kB: number;     // Describes how fast Ia drops to zero when Va approaches zero.
    radl: number;   // Differential resistance for the Ia emission limit @ very small Va and Vg > 0
    tsh: number;    // Ia transmission sharpness from 1th to 2nd Ia area. Keep between 3 and 20. Start with 20.
    xl: number;     // Exponent for the emission limit

    // Parameters of the grid-cathode vacuum diode
    kg: number;     // Inverse scaling factor for the Va independent part of Ig (caution - interacts with xg!)
    Vctg: number;   // Offsets the log Ig-traces on the Vg axis. Electrode material's contact potential
    xg: number;     // Determines the curve of the Ig slope versus (positive) Vg and Va >> 0
    VT: number;     // Log(Ig) slope @ Vg<0. VT=k/q*Tk (cathodes absolute temp, typically 1150K)
    rTr: number;    // ratio of VT for Igr. Typically 0.8
    kVT: number;    // Va dependant koeff. of VT
    gft1: number;   // reduces the steering voltage around Vg=-Vg0, for finetuning purposes
    gft1a: number;  // reduces the steering voltage around Vg=-Vg0. Effect decreases with 1/(1+kB*Va)
    gft2: number;   // finetunes the Igr drop @ incrasing Va and around Vg=-Vg0

    // special purpose parameters
    os: number;     // Overall scaling factor, if a user wishes to simulate manufacturing tolerances
    murc: number;   // Mu of the remote cutoff triode
    ksrc: number;   // Inverse Iarc gain factor for the remote cuttoff triode
    kprc: number;   // Mimics the island effect for the remote cotoff triode
    Vbatt: number;  // heater battery voltage for direct heated battery triodes
    Vdrmax: number; // max voltage of internal Vg drop, for convergence improvements
}

function smin(z: number, y: number, k: number) {
    // Min-function with smooth trans.
    return Math.pow(Math.pow(z+1, -k)+Math.pow(y+1, -k), -1/k);
}

function ssmin(z: number, y: number, k: number) {
    // smin-function which suppresses small residual differencies
    return Math.min(Math.min(z,y), smin(z*1.003,y*1.003,k));
} 

function uramp(x: number) {
    return x > 0 ? x : 0;
}

function Ivd(Vvd: number, kvd: number, xvd: number, VTvd: number) {
    if (Vvd < 3) {
        return 1/kvd*Math.pow(VTvd*xvd*Math.log(1+Math.exp(Vvd/VTvd/xvd)),xvd);
    } else {
        return 1/kvd*Math.pow(Vvd, xvd);
    }
}

class ImmlerTriode extends Triode {
    constructor(ampState: AmpState, private params: ImmlerTriodeParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        // Calculated parameters
        const Iad = 100/this.params.rad;    // Ia where the anode a.c. resistance is set according to rad.
        const ks = Math.pow(this.params.mu/(this.params.rad*this.params.xs*Math.pow(Iad, 1-1/this.params.xs)),-this.params.xs); // Reduces the unwished xs influence to the Ia slope
        const ksnom = Math.pow(this.params.mu/(this.params.rad*1.5*Math.pow(Iad, 1-1/1.5)),-1.5); //Sub-equation for calculating Vg0
        const Vg0 = this.params.Vct + Math.pow(Iad*ks, 1/this.params.xs) - Math.pow(Iad*ksnom, 2/3); // Reduces the xs influence to Vct.
        const Ild = Math.sqrt(this.params.radl)*1e-3; // Current where the Il a.c. resistance is set according to radl.
        const kl = Math.pow(1/(this.params.radl*this.params.xl*Math.pow(Ild, 1-1/this.params.xl)),-this.params.xl) // Reduces the xl influence to the Ia slope @ small Va

        const Vahc = Vp > 0 ? Vp : 0;  // Anode voltage, hard cut to zero @ neg. value
        const Vft = 1/(1+Math.pow(2*Math.abs(Vg+Vg0),3)); // an auxiliary voltage to finetune the triode around Vg=-Vg0
        const Vggi = (Vg+Vg0)*(1/(1+this.params.kIsr*Math.max(0, Vg+Vg0))) - this.params.gft1*Vft - this.params.gft1a*Vft/(1+this.params.kB*Vahc); // Effective internal grid voltage.
        const Vst = uramp(Math.max(Vggi+Vp/this.params.mu, Vp/this.params.kp*Math.log(1+Math.exp(this.params.kp*(1/this.params.mu+Vggi/(1+Vahc)))))); // Steering volt.
        const Is = this.params.os/ks*Math.pow(Vst,this.params.xs);

        //const Vstrc = uramp(Math.max(Vggi+Vahc/this.params.murc, Vahc/this.params.kprc*Math.log(1+Math.exp(this.params.kprc*(1/this.params.murc+Vggi/(1+Vahc)))))); // FOR REMOTE CUTOFF TUBES ONLY
        //const Isrc = this.params.os/this.params.ksrc*Math.pow(Vstrc,this.params.xs); // FOR REMOTE CUTOFF TUBES ONLY

        // const Ivdg = 1/this.params.kvdg*Math.pow(Vggi ,1.5);
        // const Icoh = Math.pow(uramp(Vggi-this.params.Vdrmax),2); // A convergence help which softly limits the internal Vg voltage drop.
        const fVT = this.params.VT * Math.exp(-this.params.kVT*Math.sqrt(Vp));
        // const Igvd = Ivd(Vg + this.params.Vctg + Math.min(0,Vp/this.params.mu), this.params.kg/this.params.os, this.params.xg, fVT); // limits the internal Vg for convergence reasons

        const Vstn = Vggi+Math.min(0,Vp)/this.params.mu; // special steering voltage, sensitive to negative Anodevoltages only

        // const Igr = Ivd(Vstn, ks/this.params.os, this.params.xs, this.params.rTr*fVT)/(1+(this.params.kB+Vft*this.params.gft2)*Vahc); // Is reflection to grid when Va approaches zero
        // const Ibgr = (Ivd(Vstn, ks/this.params.os, this.params.xs, this.params.rTr*fVT)+this.params.os/this.params.ksrc*Math.pow(Vggi,this.params.xs))/(1+(this.params.kB+Vft*this.params.gft2)*Vahc); // FOR REMOTE CUTOFF TUBES ONLY
        const Is0 = uramp(Ivd(Vstn, ks/this.params.os, this.params.xs, this.params.rTr*fVT) - this.params.os/ks*Math.pow(Vstn, this.params.xs));

        // const Vbatt = this.params.Vbatt/2; // for battery heated triodes; Offsets the average cathode potential to the half heater battery voltage

        const Ip = Is + Is0;        
        //const Igl = uramp(Ip-ssmin(1/kl*Math.pow(Vahc,this.params.xl),Ip,this.params.tsh)); // Ia emission limit

        return Ip;

/*
        // Space charge current model
        Rak A K 100G ;avoids "floating net" errors
        Bft   ft 0 V=1/(1+pow(2*abs(v(G,Ki)+Vg0),3)) ;an auxiliary voltage to finetune the triode around Vg=-Vg0
        Bggi GGi 0 V=(v(Gi,Ki)+Vg0)*(1/(1+kIsr*max(0, v(G,Ki)+Vg0))) - gft1*v(ft) - gft1a*v(ft)/(1+kB*v(Ahc)) ;Effective internal grid voltage.
        Bahc Ahc 0 V=uramp(v(A,Ki)) ;Anode voltage, hard cut to zero @ neg. value
        Bst   St 0 V=uramp(max(v(GGi)+v(A,Ki)/(mu), v(A,Ki)/kp*ln(1+exp(kp*(1/mu+v(GGi)/(1+v(Ahc)))))));Steering volt.
        Bs    Ai Ki I=os/ks*pow(v(St),xs) ;Langmuir-Childs law for the space charge current Is
        *Bstrc Strc 0 V=uramp(max(v(GGi)+v(Ahc)/(murc), v(Ahc)/kprc*ln(1+exp(kprc*(1/murc+v(GGi)/(1+v(Ahc)))))));FOR REMOTE CUTOFF TUBES ONLY
        *Bsrc   Ai Ki I=os/ksrc*pow(v(Strc),xs) ;FOR REMOTE CUTOFF TUBES ONLY
        *
        *Anode current limit @ small Va
        .func smin(z,y,k) {pow(pow(z+1f, -k)+pow(y+1f, -k), -1/k)} ;Min-function with smooth trans.
        .func ssmin(z,y,k) {min(min(z,y), smin(z*1.003,y*1.003,k))};smin-function which suppresses small residual differencies
        Ra  A Ai 1
        Bgl Gi A I=uramp(i(Ra)-ssmin(1/kl*pow(v(Ahc),xl),i(Ra),tsh)) ;Ia emission limit
        
        // Grid model
        Rgk G K 10G ;avoids "floating net" errors
        Bvdg G Gi I=1/kvdg*pow(v(G,Gi),1.5) ;Reduces the internal effective grid voltage when Ig rises
        Bcoh G Gi I=pow(uramp(v(G,Gi)-Vdrmax),2) ;A convergence help which softly limits the internal Vg voltage drop.
        Rgip G Gi 1G ;avoids some warnings
        .func fVT() {VT*exp(-kVT*sqrt(v(A,Ki)))}
        .func Ivd(Vvd, kvd, xvd, VTvd)  {if(Vvd < 3, 1/kvd*pow(VTvd*xvd*ln(1+exp(Vvd/VTvd/xvd)),xvd), 1/kvd*pow(Vvd, xvd))} ;Vacuum diode function
        Bgvd G Ki I=Ivd(v(G,Ki) + Vctg + min(0,v(A,Ki)/mu), kg/os, xg, fVT()) ;limits the internal Vg for convergence reasons
        Bstn Stn 0 V=v(GGi)+min(0,v(A,Ki))/mu ;special steering voltage, sensitive to negative Anodevoltages only
        Bgr Gi Ai I= ivd(v(Stn),ks/os, xs, rTr*fVT())/(1+(kB+v(ft)*gft2)*v(Ahc));Is reflection to grid when Va approaches zero
        *Bgr Gi Ai I=(ivd(v(Stn),ks/os, xs, rTr*fVT())+os/ksrc*pow(v(GGi),xs))/(1+(kB+v(ft)*gft2)*v(Ahc));FOR REMOTE CUTOFF TUBES ONLY
        Bs0 Ai Ki  I=uramp(ivd(v(Stn),ks/os, xs, rTr*fVT()) - os/ks*pow(v(Stn),xs))
        Bbatt Ki K V=Vbatt/2 ;for battery heated triodes; Offsets the average cathode potential to the half heater battery voltage
        
*/      

        return Ip;
    }
}


export type TubeModelParams = (
    AyumiTriodeParams | AyumiPentodeParams | 
    KorenTriodeParams | KorenPentodeParams | 
    KorenNizhegorodovTriodeParams | KorenNizhegorodovPentodeParams | 
    WeaverPentodeParams | 
    CCRydel4TriodeParams | CCRydel5TriodeParams |
    CCKoren4TriodeParams | CCKoren5TriodeParams | CCKoren6TriodeParams | CCKoren8TriodeParams |
    ImmlerTriodeParams) & {type: string; attribution: string; source: string};

export const tubeFactory = {
    createTube: (type: 'triode' | 'tetrode' | 'pentode', ampState: AmpState, params: TubeModelParams) => {
        switch (type) {
            case 'triode':
                switch (params.type) {
                    case 'koren':
                        return new KorenTriode(ampState, params as KorenTriodeParams);
                    case 'ayumi':
                        return new AyumiTriode(ampState, params as AyumiTriodeParams);
                    case 'paintkit':
                        return new KorenNizhegorodovTriode(ampState, params as KorenNizhegorodovTriodeParams);
                    case 'cc-rydel4':
                        return new CCRydel4Triode(ampState, params as CCRydel4TriodeParams);
                    case 'cc-rydel5':
                        return new CCRydel5Triode(ampState, params as CCRydel5TriodeParams);
                    case 'cc-koren4':
                        return new CCKoren4Triode(ampState, params as CCKoren4TriodeParams);
                    case 'cc-koren5':
                        return new CCKoren5Triode(ampState, params as CCKoren5TriodeParams);
                    case 'cc-koren6':
                        return new CCKoren6Triode(ampState, params as CCKoren6TriodeParams);
                    case 'cc-koren8':
                        return new CCKoren8Triode(ampState, params as CCKoren8TriodeParams);
                    case 'immler':
                        return new ImmlerTriode(ampState, params as ImmlerTriodeParams);
                    }
                break;

            case 'tetrode':
            case 'pentode':
                switch (params.type) {
                    case 'koren':
                        return new KorenPentode(ampState as PentodeAmpState, params as KorenPentodeParams);
                    case 'paintkip':
                        return new KorenNizhegorodovPentode(ampState as PentodeAmpState, params as KorenNizhegorodovPentodeParams);
                    case 'ayumi':
                        return new AyumiPentode(ampState as PentodeAmpState, params as AyumiPentodeParams);
                    case 'weaver':
                        return new WeaverPentode(ampState as PentodeAmpState, params as WeaverPentodeParams);
                }
        }
        
        throw "No such model: " + type + ", " + params.type;
    }
}


