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
        name: "12AY7",
        type: "triode",
        datasheet: "https://tube-data.com/sheets/049/1/12AY7.pdf",
        defaults: {
            Bplus: 250,
            Rp: 100000,
            Iq: 0.003,
        },
        limits: {
            maxPp: 1.5,
            maxVp: 300,
            maxVp0: 500,
            maxIp: 0.01,
            minVg: -10,
            maxVg: 0,
            gridStep: 0.5
        },
        models: [
            {
                type: "ayumi",
                attribution: "ayumi",
                source: "https://ayumi.cava.jp/audio/pctube/node48.html",
                G: 0.00054133951,
                muc: 33.263226783199315,
                alpha: 0.5420483594367906,
                Vgo: 0.71171435,
                Glim: 0.00095518541,
                Xg: 0.484901962646184
            }
        ]
    },
    {
        name: "7025",
        type: "triode",
        datasheet: "https://frank.pocnet.net/sheets/168/7/7025.pdf",
        defaults: {
            Bplus: 300,
            Rp: 220000,
            Iq: 0.0006,
        },
        limits: {
            maxPp: 1,
            maxVp: 330,
            maxVp0: 500,
            maxIp: 0.004,
            minVg: -5,
            maxVg: 0,
            gridStep: 0.5,
        },
        models: [
            {
                type: "koren",
                attribution: "koren",
                source: "https://www.normankoren.com/Audio/Tube_params.html",
                mu: 103.44,
                ex: 1.245,
                Kg1: 1515.4,
                Kp: 903.23,
                Kvb: 99.2,
                Vct: 0.5
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
            maxVg: 0,
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
            maxVg: 0,
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
                type: "paintkip",
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
            minVg: -40,
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
            Bplus: 285,
            Rp: 8000,
            Iq: 0.035,
            Vg2: 250,
        },
        limits: {
            maxPp: 14,
            maxVp: 450,
            maxVp0: 550,
            maxIp: 0.200,
            minVg: -60,
            maxVg: 0,
            maxVg2: 450,
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
                type: "koren",
                attribution: "jgreen",
                source: "https://www.iceamplifiers.co.uk/index.php?cont=./spice/6V6GT.html&head=1&foot=1",
                mu: 12.67,
                ex: 1.198,
                Kg1: 915.0,
                Kp: 38.07,
                Kg2: 4500,
                Kvb: 30.2,
                Vct: 0,
            },
            {
                type: "weaver",
                attribution: "weaver",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/post-3667593",
                mu: 12.67,  // from https://www.iceamplifiers.co.uk/index.php?cont=./spice/6V6GT.html&head=1&foot=1
                kg2: 4500,  // from https://www.iceamplifiers.co.uk/index.php?cont=./spice/6V6GT.html&head=1&foot=1
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
    },
    {
        name: "6N16B",
        type: "triode",
        datasheet: "https://frank.pocnet.net/sheets/113/6/6N16B.pdf",
        defaults: {
            Bplus: 250,
            Rp: 22000,
            Iq: 0.0063,
        },
        limits: {
            maxPp: 0.9,
            maxVp: 200,
            maxVp0: 350,
            maxIp: 0.014,
            maxVg: 0,
            minVg: -10,
            gridStep: 1
        },
        models: [
            {
                type: "ayumi",
                attribution: "cogsncogs",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/page-141#post-6517463",
                G: 0.0017414379,
                muc: 20.345725754852303,
                alpha: 0.5149117604361072,
                Vgo: -0.22873155,
                Glim: 0.0031872368,
                Xg: 0.47432845278392877                
            }
        ]
    },
    {
        name: "6N17B",
        type: "triode",
        datasheet: "https://frank.pocnet.net/sheets/113/6/6N17B.pdf",
        defaults: {
            Bplus: 250,
            Rp: 22000,
            Iq: 0.0033,
        },
        limits: {
            maxPp: 0.9,
            maxVp: 250,
            maxVp0: 500,
            maxIp: 0.01,
            maxVg: 0,
            minVg: -6,
            gridStep: 0.5,
        },
        models: [
            {
                type: "ayumi",
                attribution: "cogsncogs",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/page-141#post-6517463",
                G: 0.0081637051,
                muc: 44.708457869267896,
                alpha: 0.7181753930931891,
                Vgo: -0.35544294,
                Glim: 0.0043739599,
                Xg: 0.49299135092665114
            }
        ]
    },
    {
        name: "6N21B",
        type: "triode",
        datasheet: "https://frank.pocnet.net/sheets/113/6/6N21B.pdf",
        defaults: {
            Bplus: 250,
            Rp: 22000,
            Iq: 0.0035,
        },
        limits: {
            maxPp: 1,
            maxVp: 250,
            maxVp0: 350,
            maxIp: 0.01,
            maxVg: 0.5,
            minVg: -3,
            gridStep: 0.5,
        },
        models: [
            {
                type: "ayumi",
                attribution: "cogsncogs",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/page-141#post-6517463",
                G: 0.004751622,
                muc: 46.775302409036854,
                alpha: 0.6943293696411353,
                Vgo: 0.22747067,
                Glim: 0.0035909401000000004,
                Xg: 0.4927373196784875
            }
        ]
    },
    {
        name: "6P30B",
        type: "pentode",
        datasheet: "https://frank.pocnet.net/sheets/113/6/6P30B.pdf",
        defaults: {
            Bplus: 120,
            Rp: 8000,
            Iq: 0.035,
            Vg2: 120,
        },
        limits: {
            maxPp: 5.5,
            maxVp: 250,
            maxVp0: 350,
            maxIp: 0.150,
            maxVg2: 250,
            maxVg: 0,
            minVg: -50,
            gridStep: 2
        },
        models: [
            {
                type: "paintkip",
                attribution: "koonw",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/page-173#post-7168490",
                MU: 6.837,
                KG1: 773.95,
                KP: 23.65,
                KVB: 563.29,
                VCT: -0.2423,
                EX: 1.148,
                KG2: 1451.75,
                KNEE: 94.96,
                KVC: 1.751,
                KLAM: 9.875e-9,
                KLAMG: 0.001102,
                advSigmoid: {
                    KD: 0.0003623,
                    KC: 94754.67,
                    KR1: 3153.92,
                    KR2: 0.025,
                    KVBG: 0.1002,
                    KB1: 7.012,
                    KB2: 0.00941,
                    KB3: 2.133,
                    KB4: 0.2661,
                    KVBGI: 0.1562
                },
                addKink: {
                    KNK: -151.04,
                    KNG: 0.01941,
                    KNPL: 1826.35,
                    KNSL: 245447.88,
                    KNPR: 1826.35,
                    KNSR: 12.71
                }
            }
        ]
    },
    {
        name: "6P37N-V",
        type: "tetrode",
        datasheet: "https://lampes-et-tubes.info/rt/6P37N-V.pdf",
        defaults: {
            Bplus: 100,
            Iq: 0.125,
            Rp: 2200,
            Vg2: 100,
        },
        limits: {
            maxPp: 15,
            maxVp: 300,
            maxVp0: 500,
            maxVg2: 200,
            maxIp: 0.400,
            maxVg: 0,
            minVg: -80,
            gridStep: 2
        },
        models: [
            {
                type: "paintkip",
                attribution: "mjmvisser",
                source: "https://www.diyaudio.com/community/threads/vacuum-tube-spice-models.243950/post-7711675",
                MU: 19.75,
                KG1: 3731.2,
                KP: 8.656,
                KVB: 0.5,
                VCT: 0.272,
                EX: 2.563,
                KG2: 1029,
                KNEE: 12.74,
                KVC: 2.57,
                KLAM: 0.00005319,
                KLAMG: 0.000168,
                advSigmoid: {
                    KD: 0.003648,
                    KC: 0.1008,
                    KR1: 0.003744,
                    KR2: 0.04288,
                    KVBG: 0.009,
                    KB1: 1.8,
                    KB2: 3.4,
                    KB3: 1.84,
                    KB4: 1,
                    KVBGI: 1.597
                }            
            }
        ]
    }
];


