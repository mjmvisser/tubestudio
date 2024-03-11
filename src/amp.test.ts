import { describe, expect, test as base } from 'vitest';
import { TubeDefaults, TubeLimits } from '@/tube';
import { TubeModelParams, TubeModel, tubeFactory } from "./tubeModels";
import { Amp, AmpState } from '@/amp';

const triodeDefaults: TubeDefaults = {
    Bplus: 300,
    Rp: 220000,
    Iq: 0.0006,
};

const triodeLimits: TubeLimits = {
    maxPp: 1.2,
    maxVp: 500,
    maxIp: 0.005,
    minVg: -6,
    maxVg: 0,
    gridStep: 0.5,
};

const triodeModelParams: TubeModelParams = {
    type: "koren",
    attribution: "koonw",
    source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/post-6217829",
    mu: 100,
    ex: 1.658,
    Kg1: 2354.4,
    Kg2: null,
    Kp: 771.4,
    Kvb: 63.48,
    Vct: 0.7102,
};

interface AmpFixtures {
    triodeAmp: Amp;
    triodeModel: TubeModel;
}

const test = base.extend<AmpFixtures>({
    triodeAmp: async ({ task }, use) => {
        const amp = new Amp('triode', triodeDefaults, triodeLimits);
        await use(amp);
    },
    triodeModel: async ({ task }, use) => {
        const model = tubeFactory.createTube('triode', null, triodeModelParams);
        await use(model);
    }
});

describe.each([
    { topology: 'se', Bplus: 350, loadType: 'resistive', Rp: 180000, biasMethod: 'cathode', Rk: 2965, Vq: 224, Iq: 0.0007, Vg: -2.08 },
    { topology: 'se', Bplus: 350, loadType: 'reactive', Rp: 180000, biasMethod: 'cathode', Rk: 5805, Vq: 350, Iq: 0.0006, Vg: -3.48 },
    { topology: 'pp', Bplus: 350, loadType: 'reactive', Rp: 180000, biasMethod: 'cathode', Rk: 5805, Vq: 350, Iq: 0.0006, Vg: -3.48 },
] as AmpState[])('triode topology=$topology, Bplus=$Bplus, loadType=$loadType, Rp=$Rp, biasMethod=$biasMethod, Rk=$Rk, Vq=$Vq, Iq=$Iq, Vg=$Vg', ({topology, Bplus, loadType, Rp, biasMethod, Rk, Vq, Iq, Vg}) => {
    describe('no model', () => {
        test('Rp, Vq, Iq', ({ triodeAmp: amp }) => {
            amp.topology = topology;
            amp.biasMethod = biasMethod;
            amp.Bplus = Bplus;
            amp.loadType = loadType;
            amp.Vg = Vg;
            amp.Rp = Rp;
            amp.Vq = Vq;
            amp.Iq = Iq;
            
            expect(amp.topology).to.equal(topology);
            expect(amp.Bplus).to.equal(Bplus);
            expect(amp.loadType).to.equal(loadType);
            expect(amp.Rp).to.equal(Rp);
            expect(amp.biasMethod).to.equal(biasMethod);
            expect(amp.Rk).to.be.null;
            expect(amp.Vq).to.be.approximately(Vq, 0.1);
            expect(amp.Iq).to.be.approximately(Iq, 0.00001);
            expect(amp.Vg).to.be.null;
        });

        test('Iq, Rp, Vq', ({ triodeAmp: amp }) => {
            amp.topology = topology;
            amp.biasMethod = biasMethod;
            amp.Bplus = Bplus;
            amp.loadType = loadType;
            amp.Vg = Vg;
            amp.Iq = Iq;
            amp.Rp = Rp;
            amp.Vq = Vq;
            
            expect(amp.topology).to.equal(topology);
            expect(amp.Bplus).to.equal(Bplus);
            expect(amp.loadType).to.equal(loadType);
            expect(amp.Rp).to.equal(Rp);
            expect(amp.biasMethod).to.equal(biasMethod);
            expect(amp.Rk).to.be.null;
            expect(amp.Vq).to.be.approximately(Vq, 0.1);
            expect(amp.Iq).to.be.approximately(Iq, 0.00001);
            expect(amp.Vg).to.be.null;
        });

        test('Iq, Vq, Rp', ({ triodeAmp: amp }) => {
            amp.topology = topology;
            amp.biasMethod = biasMethod;
            amp.Bplus = Bplus;
            amp.loadType = loadType;
            amp.Vg = Vg;
            amp.Iq = Iq;
            amp.Vq = Vq;
            amp.Rp = Rp;
            
            expect(amp.topology).to.equal(topology);
            expect(amp.Bplus).to.equal(Bplus);
            expect(amp.loadType).to.equal(loadType);
            expect(amp.Rp).to.equal(Rp);
            expect(amp.biasMethod).to.equal(biasMethod);
            expect(amp.Rk).to.be.null;
            expect(amp.Vq).to.be.approximately(Vq, 0.1);
            expect(amp.Iq).to.be.approximately(Iq, 0.00001);
            expect(amp.Vg).to.be.null;
        });
    });
});

describe.each([
    { topology: 'se', Bplus: 350, loadType: 'resistive', Rp: 180000, biasMethod: 'cathode', Rk: 2945, Vq: 222, Iq: 0.0007, Vg: -2.05 },
    { topology: 'se', Bplus: 350, loadType: 'reactive', Rp: 180000, biasMethod: 'cathode', Rk: 5805, Vq: 350, Iq: 0.0006, Vg: -3.48 },
    { topology: 'pp', Bplus: 350, loadType: 'reactive', Rp: 180000, biasMethod: 'cathode', Rk: 5805, Vq: 350, Iq: 0.0006, Vg: -3.48 },
] as AmpState[])('triode topology=$topology, Bplus=$Bplus, loadType=$loadType, Rp=$Rp, biasMethod=$biasMethod, Rk=$Rk, Vq=$Vq, Iq=$Iq, Vg=$Vg', ({topology, Bplus, loadType, Rp, biasMethod, Rk, Vq, Iq, Vg}) => {
    describe('with model', () => {
        test('Rp, Vq, Iq', ({ triodeAmp: amp, triodeModel: model }) => {
            amp.model = model;
            model.ampState = amp;
            amp.topology = topology;
            amp.biasMethod = biasMethod;
            amp.Bplus = Bplus;
            amp.loadType = loadType;
            amp.Vg = Vg;
            amp.Rp = Rp;
            amp.Vq = Vq;
            amp.Iq = Iq;
            
            expect(amp.topology).to.equal(topology);
            expect(amp.Bplus).to.equal(Bplus);
            expect(amp.loadType).to.equal(loadType);
            expect(amp.Rp).to.equal(Rp);
            expect(amp.biasMethod).to.equal(biasMethod);
            expect(amp.Rk).to.be.approximately(Rk, 1);;
            expect(amp.Vq).to.be.approximately(Vq, 0.1);
            expect(amp.Iq).to.be.approximately(Iq, 0.00001);
            expect(amp.Vg).to.be.approximately(Vg, 0.01);
        });

        test('Iq, Rp, Vq', ({ triodeAmp: amp, triodeModel: model }) => {
            amp.model = model;
            model.ampState = amp;
            amp.topology = topology;
            amp.biasMethod = biasMethod;
            amp.Bplus = Bplus;
            amp.loadType = loadType;
            amp.Vg = Vg;
            amp.Iq = Iq;
            amp.Rp = Rp;
            amp.Vq = Vq;
            
            expect(amp.topology).to.equal(topology);
            expect(amp.Bplus).to.equal(Bplus);
            expect(amp.loadType).to.equal(loadType);
            expect(amp.Rp).to.equal(Rp);
            expect(amp.biasMethod).to.equal(biasMethod);
            expect(amp.Rk).to.be.approximately(Rk, 1);;
            expect(amp.Vq).to.be.approximately(Vq, 0.1);
            expect(amp.Iq).to.be.approximately(Iq, 0.00001);
            expect(amp.Vg).to.be.approximately(Vg, 0.01);
        });

        test('Iq, Vq, Rp', ({ triodeAmp: amp, triodeModel: model }) => {
            amp.model = model;
            model.ampState = amp;
            amp.topology = topology;
            amp.biasMethod = biasMethod;
            amp.Bplus = Bplus;
            amp.loadType = loadType;
            amp.Vg = Vg;
            amp.Iq = Iq;
            amp.Vq = Vq;
            amp.Rp = Rp;
            
            expect(amp.topology).to.equal(topology);
            expect(amp.Bplus).to.equal(Bplus);
            expect(amp.loadType).to.equal(loadType);
            expect(amp.Rp).to.equal(Rp);
            expect(amp.biasMethod).to.equal(biasMethod);
            expect(amp.Rk).to.be.approximately(Rk, 1);;
            expect(amp.Vq).to.be.approximately(Vq, 0.1);
            expect(amp.Iq).to.be.approximately(Iq, 0.00001);
            expect(amp.Vg).to.be.approximately(Vg, 0.01);
        });
    });
});
