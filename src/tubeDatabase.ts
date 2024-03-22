import type { TubeDefaults, TubeLimits } from "./tube";
import type { TubeModelParams } from "./tubeModels"

export interface TubeInfo {
    name: string;
    type: 'triode' | 'tetrode' | 'pentode';
    datasheet?: string;
    defaults: TubeDefaults;
    limits: TubeLimits;
    models: TubeModelParams[];
}

export const tubeDatabase : TubeInfo[] = [
    {
        name: "12AX7",
        type: "triode",
        datasheet: "https://frank.pocnet.net/sheets/049/1/12AX7A.pdf",
        defaults: {
            Bplus: 300,
            Rp: 220000,
            Iq: 0.0006,
        },
        limits: {
            maxPp: 1.2,
            maxVp: 500,
            maxIp: 0.005,
            minVg: -6,
            maxVg: 0,
            gridStep: 0.5,
        },
        models: [
            {
                type: "koren",
                attribution: "koonw",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/post-6217829",
                mu: 100,
                ex: 1.658,
                Kg1: 2354.4,
                Kp: 771.4,
                Kvb: 63.48,
                Vct: 0.7102,
            },
            {
                type: "koren",
                attribution: "koren",
                source: "https://www.normankoren.com/Audio/Tubemodspice_article.html",
                mu: 100,
                ex: 1.4,
                Kg1: 1060,
                Kp: 600,
                Kvb: 300,
                Vct: 0.0
            },
            {
                type: "ayumi",
                attribution: "ayumi",
                source: "https://ayumi.cava.jp/audio/appendix/node11.html",
                G: 0.00071212,
                muc: 88.41380,
                alpha: 0.43455,
                Vgo: 0.59837,
            }
        ]
    },
    {
        name: "6L6GC",
        type: "pentode",
        datasheet: "https://frank.pocnet.net/sheets/127/6/6L6GC.pdf",
        defaults: {
            Bplus: 360,
            Rp: 7600,
            Iq: 0.06,
            Vg2: 250,
        },
        limits: {
            maxPp: 30,
            maxVp: 700,
            maxIp: 0.400,
            minVg: -80,
            maxVg: 15,
            maxVg2: 450,
            gridStep: 5,
        },
        models: [
            {
                type: "koren",
                attribution: "koren",
                source: "https://www.normankoren.com/Audio/Tubemodspice_article.html",
                mu: 8.7,
                ex: 1.35,
                Kg1: 1460,
                Kg2: 4500,
                Kp: 48,
                Kvb: 12,
                Vct: 0.0
            },
        ]
    },
    {
        name: "6L6",
        type: "pentode",
        datasheet: "https://frank.pocnet.net/sheets/049/6/6L6.pdf",
        defaults: {
            Bplus: 360,
            Rp: 7600,
            Iq: 0.06,
            Vg2: 250,
        },
        limits: {
            maxPp: 19,
            maxVp: 700,
            maxIp: 0.400,
            minVg: -90,
            maxVg: 15,
            maxVg2: 450,
            gridStep: 5,
        },
        models: [
            {
                type: "ayumi",
                attribution: "ayumi",
                source: "https://ayumi.cava.jp/audio/pctube/node47.html#SECTION00952010000000000000",
                G: 0.00219489,
                muc: 4.99994,
                alpha: 0.6916982033712802,
                Vgo: 0.91804059,
                Glim: 0.0027828,
                Xg: 0.79545,
                r: 0.057828332,
                Ea: -2180,
            }
        ]
    }
];