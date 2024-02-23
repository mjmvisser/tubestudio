const tubeDatabase = [
    {
        name: "12AX7",
        type: "triode",
        datasheet: "https://frank.pocnet.net/sheets/049/1/12AX7A.pdf",
        mu: 100,
        Bplus: 300,
        Rp: 220000,
        Iq: 0.0006,
        maxPp: 1.2,
        maxVp: 500,
        maxIp: 0.005,
        minVg: -6,
        maxVg: 0,
        gridStep: 0.5,
        models: [
            {
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
            },
            {
                type: "koren",
                attribution: "koren",
                source: "https://www.normankoren.com/Audio/Tubemodspice_article.html",
                mu: 100,
                ex: 1.4,
                Kg1: 1060,
                Kg2: null,
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
                Glim: null,
                Xg: null,
            }
        ]
    },
    {
        name: "6L6GC",
        type: "pentode",
        datasheet: "https://frank.pocnet.net/sheets/127/6/6L6GC.pdf",
        mu: 8.7,
        Bplus: 360,
        Rp: 7600,
        Iq: 0.06,
        Vg2: 250,
        maxPp: 30,
        maxVp: 700,
        maxIp: 0.400,
        minVg: -80,
        maxVg: 0,
        maxVg2: 450,
        gridStep: 5,
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
]

export { tubeDatabase };