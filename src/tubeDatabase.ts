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
            maxVp: 330,
            maxVp0: 500,
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
            },
            {
                type: "immler",
                attribution: "immler",
                source: "https://adrianimmler.simplesite.com/452103976/12ax7.tsi5",
                mu: 94.3,
                rad: 39200,
                Vct: 0.28,
                kp: 950,
                xs: 1.5,
                kIsr: 0.09,
                kvdg: 800,
                kB: 1.0,
                radl: 790,
                tsh: 12,
                xl: 1.5,
                kg: 6000,
                Vctg: 0.25,
                xg: 1.65,
                VT: 0.147,
                rTr: 0.5,
                kVT: 0.042,
                gft1: 0.015,
                gft1a: 0.1,
                gft2: 0,
                os: 1,
                murc: 10,
                ksrc: 10000000000,
                kprc: 1000,
                Vbatt: 0,
                Vdrmax: 100
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
            maxVp: 500,
            maxVp0: 700,
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
            maxVp: 500,
            maxVp0: 700,
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
    },
    {
        name: "EF80",
        type: "pentode",
        datasheet: "https://frank.pocnet.net/sheets/010/e/EF80.pdf",
        defaults: {
            Bplus: 300,
            Rp: 22500,
            Iq: 0.0082,
            Vg2: 200,
        },
        limits: {
            maxPp: 3.8,
            maxVp: 300,
            maxVp0: 550,
            maxIp: 0.05,
            maxIk: 0.015,
            minVg: -4,
            maxVg: 0,
            maxVg2: 400,
            gridStep: 1,
        },
        models: [
            {
                type: "koren-nizhegorodov",
                attribution: "koonw",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/page-166",
                MU: 51.5,
                KG1: 737.47,
                KP: 186.79,
                KVB: 1085.66,
                VCT: 0.2779,
                EX: 1.558, 
                KG2: 724.57,
                KLAM: 0,
                KLAMG: 1.102E-4,
                KNEE: 963.53,
                KVC: 1.795,
                advSigmoid: {
                    KD: 118.44,
                    KC: 571.64,
                    KR1: 0.00625,
                    KR2: 0.1745,
                    KVBG: 0.008104,
                    KB1: 0.908,
                    KB2: 0.01702,
                    KB3: 0.00625,
                    KB4: 3.442,
                    KVBGI: 0.04391,
                },
                addKink: {
                    KNK: 0.05906,
                    KNG: 1.122E-4,
                    KNPL: 0.3353,
                    KNSL: 0.07806,
                    KNPR: 621.29,
                    KNSR: 5.842E6,
                }

/*
.SUBCKT EF80 P G2 G K ; LTSpice tetrode.asy pinout
* .SUBCKT EF80 P G K G2 ; Koren Pentode Pspice pinout
+ PARAMS: MU=51.5 KG1=737.47 KP=186.79 KVB=1085.66 VCT=0.2779 EX=1.558 KG2=724.57 KNEE=963.53 KVC=1.795
+ KLAMG=1.102E-4  KD=118.44 KC=571.64 KR1=0.00625 KR2=0.1745 KVBG=0.008104 KB1=0.908 KB2=0.01702 KB3=0.00625 KB4=3.442 KVBGI=0.04391 KNK=0.05906 KNG=1.122E-4 KNPL=0.3353 KNSL=0.07806 KNPR=621.29 KNSR=5.842E6
+ CCG=7.5P CGP=3.3P CCP=0.012P VGOFF=-0.6 IGA=3E-10 IGB=0.02556 IGC=20 IGEX=1.413
* Vp_MAX=350 Ip_MAX=35 Vg_step=1 Vg_start=0 Vg_count=10
* X_MIN=58 Y_MIN=202 X_SIZE=746 Y_SIZE=406 FSZ_X=1296 FSZ_Y=736 XYGrid=false
* Rp=1600 Vg_ac=23.5 P_max=2.5 Vg_qui=-23.4 Vp_qui=240
* showLoadLine=n showIp=y isDHP=n isPP=n isAsymPP=n isUL=n showDissipLimit=y
* showIg1=y isInputSnapped=n addLocalNFB=n
* XYProjections=n harmonicPlot=y dissipPlot=n
* UL=0.43 EG2=170 gridLevel2=y addKink=y isTanhKnee=n advSigmoid=y
*/                
            }
        ]
    },
    {
        name: "6P25B",
        type: "tetrode",
        datasheet: "https://rudatasheet.ru/tubes/6p25b/",
        defaults: {
            Bplus: 110,
            Rp: 5000,
            Iq: 0.03,
            Vg2: 110,
        },
        limits: {
            maxPp: 4.1,
            maxVp: 170,
            maxVp0: 350,
            maxIp: 0.08,
            minVg: -20,
            maxVg: 0,
            maxVg2: 200,
            gridStep: 2,
        },
        models: [
            {
                type: "paintkip",
                attribution: "koonw",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/page-166",
                MU: 7.268,
                KG1: 1385.86,
                KP: 29.56,
                KVB: 12,
                VCT: 0.2,
                EX: 1.288, 
                KG2: 2633.9,
                KNEE: 21.01,
                KVC: 1.592,
                KLAM: 1.18E-6,
                KLAMG: 8.982E-4,
                tanhKnee: {
                    KNEE2: 9.32,
                    KNEX: 2.423,
                },
                addKink: {
                    KNK: -0.2328,
                    KNG: 0.0383,
                    KNPL: 23.23,
                    KNSL: 10.45,
                    KNPR: 29.34,
                    KNSR: 34.62,
                }
/*
+ PARAMS: MU=7.268 KG1=1385.86 KP=29.56 KVB=12 VCT=0.2 EX=1.288 KG2=2633.9 KNEE=21.01 KVC=1.592
+ KLAM=1.18E-6 KLAMG=8.982E-4 KNEE2=9.32 KNEX=2.423  KNK=-0.2328 KNG=0.0383 KNPL=23.23 KNSL=10.45 KNPR=29.34 KNSR=34.62
+ CCG=6.7P CGP=6.2P CCP=0.8P VGOFF=-0.6 IGA=0.001 IGB=0.3 IGC=8 IGEX=2
* Vp_MAX=250 Ip_MAX=65 Vg_step=4 Vg_start=0 Vg_count=11
* X_MIN=36 Y_MIN=13 X_SIZE=803 Y_SIZE=519 FSZ_X=1296 FSZ_Y=736 XYGrid=true
* Rp=1400 Vg_ac=20 P_max=4.1 Vg_qui=-20 Vp_qui=300
* showLoadLine=n showIp=y isDHP=n isPP=n isAsymPP=n isUL=n showDissipLimit=y
* showIg1=y isInputSnapped=y addLocalNFB=n
* XYProjections=n harmonicPlot=y dissipPlot=n
* UL=0.43 EG2=110 gridLevel2=y addKink=y isTanhKnee=y advSigmoid=n
*/
            }
        ]
    },
    {
        name: "6V6",
        type: "tetrode",
        datasheet: "https://frank.pocnet.net/sheets/127/6/6V6.pdf",
        defaults: {
            Bplus: 340,
            Rp: 8000,
            Iq: 0.032,
            Vg2: 300,
        },
        limits: {
            maxPp: 14,
            maxVp: 315,
            maxVp0: 500,
            maxIp: 0.170,
            minVg: -30,
            maxVg: 0,
            maxVg2: 285,
            gridStep: 5,
        },
        models: [
            {
                type: "ayumi",
                attribution: "ayumi",
                source: "https://ayumi.cava.jp/audio/pctube/node48.html",
                G: 0.00060166202,
                muc: 7.0192317,
                alpha: 0.559517723002632,
                Vgo: 0.99999998,
                Glim: 0.00112921,
                Xg: 0.45544727730005935,
                r: 0.083999767,
                Ea: -3125,
            },
            {
                type: "weaver",
                attribution: "weaver",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/post-3667593",
                EcRef: 0,
                EsRef: 250,
                g0: 2.9777E-03,
                kp1: -2.6959E+01,
                kp2: 3.0208E+02,
                kp3: -6.1546E-05,
                kp4: 1.7709E-01,
                kt1: 2.2138E+01,
                kt2: 2.2108E-01,
                kc1: 8.8589E-04,
                kc2: 5.9183E-02,
                kc3: 1.0066E+00,
                ks1: 5.8261E-06,
                ks2: 2.5991E-03,
                ks3: -1.3870E-02,
                kcs: 0.2000,
            }


        ]
    }
];


