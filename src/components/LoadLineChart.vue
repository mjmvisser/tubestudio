<script setup lang="ts">
import { ref, reactive, computed, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { Scatter } from 'vue-chartjs'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import type { ChartData, ChartDataset, ChartOptions, Tick, TooltipItem } from 'chart.js';
import { tubeDatabase } from '@/tubeDatabase';
import type { TubeInfo } from '@/tubeDatabase';
import { tubeFactory } from '@/tubeModels';
import { Amp, Point } from '@/amp';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import RadioButton from 'primevue/radiobutton';
import Checkbox from 'primevue/checkbox';
//import zoomPlugin from 'chartjs-plugin-zoom';


Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const tubes = tubeDatabase.map((tube, index) => ({ id: index, name: tube.name }));

const models = computed(() => {
    if (selectedTube.value !== null) {
        return tubeDatabase[selectedTube.value].models.map((model, index) => ({ name: model.attribution + ' (' + model.type + ')', id: index }));
    } else {
        return [];
    }
});

const selectedTube : Ref<number | null> = ref(null);
const tubeParams : Ref<TubeInfo | null> = ref(null);
const selectedModel : Ref<number | null> = ref(null);

//const Iq_ma : Ref<number | null> = ref(null);

let amp : any = reactive({
    topology: 'se',
    mode: 'triode',
    Bplus: 300,
    Iq: 0.0006,
    Vq: 168,
    Vg: -2,
    Vg2: 275,
    biasMethod: 'cathode',
    loadType: 'resistive',
    Rp: 50000,
    Rk: 3000,
    Znext: 1000000,
    ultralinearTap: 100,
    inputHeadroom: 0.0001
});

watch(selectedTube, (index) => {
    if (index !== null) {
        tubeParams.value = tubeDatabase[index];

        // clear the model
        selectedModel.value = null;

        // create amp with defaults
        amp = reactive(new Amp(tubeParams.value.type, tubeParams.value.defaults, tubeParams.value.limits));
        Iq_ma.value = amp.Iq * 1000;
    }
});

watch(selectedModel, (index) => {
    if (index !== null && tubeParams.value !== null) {
        amp.model = tubeFactory.createTube(tubeParams.value.type, amp, tubeParams.value.models[index]);
    }
});

const Iq_ma = computed({
    get() {
        if (amp) {
            return amp.Iq * 1000;
        } else {
            return null;
        }
    },
    set(newValue) {
        if (newValue !== null && amp) {
            amp.Iq = newValue / 1000;
        }
    }
});

function proportionalStep(value: number) {
    const absValue = Math.abs(value);
    if (absValue < 1) {
        return 0.01;
    } else if (absValue < 10) {
        return 0.1;
    } else if (absValue < 100) {
        return 1;
    } else if (absValue < 1000) {
        return 10;
    } else if (absValue < 10000) {
        return 100;
    } else if (absValue < 100000) {
        return 1000;
    } else if (absValue < 1000000) {
        return 10000;
    } else if (absValue < 10000000) {
        return 100000;
    } else {
        return 1000000;
    }
}

const chartData = computed(() : ChartData<'scatter'> => {
    let datasets : ChartDataset<'scatter'>[] = [];

    amp?.Iq;
    amp?.Vq;
    amp?.Vg;
    amp?.Rp;
    amp?.Rk;
    amp?.cathodeBypass;
    amp?.biasMethod;
    amp?.loadType;
    amp?.Znext;
    amp?.Vg2;
    amp?.mode;
    amp?.ultralinearTap;
    amp?.inputHeadroom;

    if (tubeParams.value) {
        datasets = datasets.concat(amp.graphVgVpIp().map((gridCurve: { Vg: string; VpIp: any; }) => ({
            label: 'Vg=' + gridCurve.Vg + 'V',
            showLine: true,
            pointStyle: false,
            pointHitRadius: 2,
            borderColor: 'rgb(170,170,170)',
            backgroundColor: 'rgb(170,170,170)',
            borderWidth: 1.5,
            fill: false,
            data: gridCurve.VpIp,
        })));

        datasets.push({
            label: 'Max Dissipation: ' + tubeParams.value.limits.maxPp + 'W',
            showLine: true,
            pointStyle: false,
            pointHitRadius: 2,
            borderColor: 'rgb(255,0,0)',
            backgroundColor: 'rgb(255,0,0)',
            borderWidth: 1.5,
            borderDash: [10, 10],
            fill: false,
            data: amp.graphPp(),
        });

        const R = amp.R();
        let Rtext = '';
        try {
            Rtext = R.toFixed() + 'Ω';
        } catch (err) {
            Rtext = R[0].toFixed()  + 'Ω Class B / ' + R[1].toFixed() + 'Ω Class A';
        }

        datasets.push({
            label: amp.loadType[0].toUpperCase() + amp.loadType.slice(1) + ' DC Load: ' + Rtext,
            showLine: true,
            pointStyle: false,
            pointHitRadius: 5,
            borderColor: 'rgb(255,0,0)',
            backgroundColor: 'rgb(255,0,0)',
            borderWidth: 1.5,
            fill: false,
            //lineTension: 0,
            data: amp.graphDCLoadLine()
        });

        datasets.push({
            label: 'AC Load: ' + amp.Z().toFixed() + 'Ω',
            showLine: true,
            pointStyle: false,
            pointHitRadius: 5,
            borderColor: 'rgb(255,255,0)',
            backgroundColor: 'rgb(255,255,0)',
            borderWidth: 2.5,
            fill: false,
            //lineTension: 0,
            data: amp.graphACLoadLine()
        });

        //    datasets.push({
        //      label: 'Cathode Load: ' + amp.Rk?.toFixed() + 'Ω',
        //      showLine: true,
        //      pointStyle: false,
        //      pointHitRadius: 5,
        //      borderColor: 'rgb(255,0,255)',
        //      backgroundColor: 'rgb(255,0,255)',
        //      borderWidth: 2.5,
        //      fill: false,
        //      lineTension: 0,
        //      data: 
        //        amp.graphCathodeLoadLine(),
        //    });

        datasets.push({
            label: 'Operating Point',
            showLine: true,
            pointRadius: 5,
            borderColor: 'rgb(255,0,0)',
            backgroundColor: 'rgb(255,0,0)',
            fill: false,
            data: amp.graphOperatingPoint()
        });

        datasets.push({
            label: 'Vg=' + amp.Vg?.toFixed(1) + 'V',
            showLine: true,
            pointStyle: false,
            pointHitRadius: 2,
            borderColor: 'rgb(0,0,255)',
            backgroundColor: 'rgb(0,0,255)',
            borderWidth: 1.5,
            fill: false,
            data: amp.graphVpIp(amp.Vg),
        });

        const minVg = amp.Vg - amp.inputHeadroom;

        datasets.push({
            label: 'Vg=' + minVg?.toFixed(1) + 'V',
            showLine: true,
            pointStyle: false,
            pointHitRadius: 2,
            borderColor: 'rgb(0,255,0)',
            backgroundColor: 'rgb(0,255,0)',
            borderWidth: 1.5,
            fill: false,
            data: amp.graphVpIp(minVg)
        });

        datasets.push({
            label: 'Headroom',
            showLine: true,
            pointRadius: 5,
            borderColor: 'rgb(0,255,0)',
            backgroundColor: 'rgb(0,255,0)',
            fill: true,
            data: amp.graphHeadroom()
        });

        const maxVg = amp.Vg + amp.inputHeadroom;

        datasets.push({
            label: 'Vg=' + maxVg?.toFixed(1) + 'V',
            showLine: true,
            pointStyle: false,
            pointHitRadius: 2,
            borderColor: 'rgb(0,255,0)',
            backgroundColor: 'rgb(0,255,0)',
            borderWidth: 1.5,
            fill: false,
            data: amp.graphVpIp(maxVg)
        });

    }

    return { datasets: datasets };
});

const chartOptions = computed(() : ChartOptions<'scatter'> => {
    tubeParams.value;

    if (tubeParams.value !== null) {
        return {
            animation: false,
            responsive: true,
            hover: { mode: 'index' },
            plugins: {
                title: {
                    display: true,
                    text: tubeParams.value?.name + ' Average Plate Characteristics'
                },
                legend: {
                    display: false,
                },
                tooltip: {
                    intersect: false,
                    callbacks: {
                        label: (item: TooltipItem<'scatter'>) => {
                            const itemLabel = item.dataset.label || '';
                            const Vp = item.parsed.x.toFixed(2);
                            const Ip = (item.parsed.y * 1000).toFixed(2);
                            const Vg = (item.raw as Point).Vg?.toFixed(2);
                            return itemLabel + ' (Vp: ' + Vp + 'V, Ip: ' + Ip + 'mA' + (Vg !== undefined ? (', Vg: ' + Vg + 'V') : '') + ')';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        stepSize: 50
                    },
                    min: 0,
                    max: tubeParams.value?.limits.maxVp,
                    title: { display: true, text: 'Vp (V)' }
                },
                y: {
                    ticks: {
                        callback: (value: number | string, index: number, ticks: Tick[]) => {
                            // convert from A to mA
                            return ((value as number) * 1000).toFixed(1);
                        },
                        stepSize: tubeParams.value?.limits.maxIp / 10,
                    },
                    max: tubeParams.value?.limits.maxIp,
                    min: 0,
                    title: { display: true, text: 'Ip (mA)' }
                }
            },
        };
    } else {
        return {};
    }
});

</script>

<template>
    <div class="grid align-items-center">
        <div class="col-12 py-2">
            <Scatter id="tube-chart" :options="chartOptions" :data="chartData" />
        </div>

        <div class="grid col-12 align-items-center">
            <div class="col-4 py-2">
                <div class="text-left">
                    <div class="text-left">
                        Tube
                        <Dropdown v-model="selectedTube" :options="tubes" optionLabel="name" optionValue="id"
                            placeholder="Select a Tube" class='w-full md:w-14rem' />

                    </div>
                </div>
            </div>
            <div class="col-4 py-2">
                <div class="text-left">
                    Model
                    <Dropdown v-model="selectedModel" :options="models" optionLabel="name" optionValue="id"
                        placeholder="Select a Model" class="w-full md:w-14rem"/>
                </div>
            </div>
            <div class="col-4 py-2">
                <div class="text-left">
                    <template v-if="selectedTube !== null && selectedModel !== null">
                        <a :href="tubeDatabase[selectedTube].models[selectedModel].source">Source</a>
                    </template>
                </div>
            </div>
        </div>

        <template v-if="tubeParams !== null">
            <template v-if="amp.model">
                <div class="grid surface-ground col-12 align-items-center">
                    <div class="col-3 py-2">
                        <label v-tooltip="'A single-ended amplifier uses a single tube operating in class A, while a push-pull amplifier uses two tubes operating in class A, class B, or class AB'">
                            Topology
                        </label>
                    </div>
                    <div class="col-3 py-2">
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.topology" inputId="single-ended" name="topology" value="se" :disabled="tubeParams === null || amp.loadType !== 'reactive'" />
                            <label for="single-ended" class="ml-2">Single-Ended</label>
                        </div>
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.topology" inputId="push-pull" name="topology" value="pp" :disabled="tubeParams === null || amp.loadType !== 'reactive'" />
                            <label for="push-pull" class="ml-2">Push-Pull</label>
                        </div>
                    </div>
                    <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'" class="col-3 py-2">
                        <div>
                            <label>Operating Mode</label>
                        </div>
                    </div>
                    <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'" class="col-3 py-2">
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.mode" inputId="pentode" name="mode" value="pentode" />
                            <label for="pentode" class="ml-2" v-tooltip="'The screen-grid is connected to a stable DC voltage (i.e. no signal appears on the screen-grid)'">
                                Pentode
                            </label>
                        </div>
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.mode" inputId="triode" name="mode" value="triode" />
                            <label for="triode" class="ml-2" v-tooltip="'The screen-grid is connected to the plate (i.e. 100% of the signal appears on the screen-grid)'">
                                Triode
                            </label>
                        </div>
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.mode" inputId="ultralinear" name="mode" value="ultralinear" />
                            <label for="ultralinear" class="ml-2" v-tooltip="'The screen-grid is connected to an appropriate tap on the primary winding of the output transformer (i.e. some percentage of the signal appears on the screen-grid)'">
                                Ultralinear
                            </label>
                        </div>
                    </div>
                </div>
            </template>

            <div class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <label v-tooltip="'The DC voltage of the power supply at the plate load'">B+ (V)</label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Bplus" :min=0 :max=tubeParams?.limits.maxVp :maxFractionDigits=2 showButtons
                        :step="proportionalStep(amp.Bplus)" :disabled="tubeParams === null" />
                </div>
                <div class="col-3 py-2">
                    <label>Output Power (W):</label>
                </div>
                <div class="col-3 py-2">
                    <div class="flex flex-column">
                        At max g1: 0.82<br>
                        At g1=0: 0.82<br>
                        At headroom: [Set output headroom]
                    </div>
                </div>
            </div>

            <div class="grid surface-ground col-12 align-items-center border-y-1 border-400">
                <div class="col-3 py-2">
                    <label v-tooltip="'The stable, steady-state condition at which the amplifier operates when no input signal is present.'">
                        Quiescent Operating Point
                    </label>
                </div>
                <div class="col-3 py-2">
                    <label for="Vq" class="flex align-items-left">
                        Vq (V)
                    </label>
                    <div class="flex align-items-left">
                        <InputNumber v-model="amp.Vq" inputId="Vq" :min=0 :max=tubeParams?.limits.maxVp :maxFractionDigits=1 
                            :step="proportionalStep(amp.Vq)" showButtons :disabled="tubeParams === null || amp.loadType === 'reactive'"/>
                    </div>
                    <label for="Iq" class="flex align-items-left">
                        Iq (ma)
                    </label>
                    <div class="flex align-items-left">
                        <InputNumber v-model="Iq_ma" inputId="Iq" :min=0.001 :max="tubeParams.limits.maxIp * 1000" :maxFractionDigits=2
                            :step="proportionalStep(Iq_ma)" showButtons :disabled="tubeParams === null" />
                    </div>
                </div>
                <template v-if="amp.model">
                    <div class="col-2 py-2">
                        <label v-tooltip="'The DC voltage applied to the control grid'">Grid Bias (V)</label>
                    </div>
                    <div class="col-1 py-2">
                        <div class="flex flex-column align-items-left">
                            <div>
                                <RadioButton v-model="amp.biasMethod" inputId="cathodeBias" value="cathode"
                                    :disabled="tubeParams === null || amp.model === null" /> 
                                <label for="cathodeBias" v-tooltip="'The bias voltage is developed across a resistor connected between the cathode and ground (or a negative voltage supply)'">
                                    Cathode
                                </label>
                            </div>
                            <div>
                                <RadioButton v-model="amp.biasMethod" inputId="fixedBias" value="fixed"
                                    :disabled="tubeParams === null || amp.model === null" /> 
                                <label for="fixedBias" v-tooltip="'The bias voltage is set by a separate bias supply and resistor network, independent of the cathode current'">
                                    Fixed
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="col-3 py-2">
                        <InputNumber v-model="amp.Vg" :min=tubeParams?.limits.minVg :max=tubeParams?.limits.maxVg 
                            :step="proportionalStep(amp.Vg)" :maxFractionDigits=2 showButtons :disabled="tubeParams === null || amp.model === null" />
                    </div>
                </template>                    
            </div>

            <div class="grid col-12 align-items-center">
                <div class="col-1 py-2">
                    <label v-tooltip="'The resistance or impedence of the load connected to the plate'">Plate Load (Ω)</label>
                </div>
                <div class="col-2 py-2">
                    <div class="flex flex-column align-items-center">
                        <div>
                            <RadioButton v-model="amp.loadType" inputId="resistiveLoad" value="resistive" :disabled="tubeParams === null" />
                            <label for="resistiveLoad" v-tooltip="'The plate is connected to a resistor or other non-reactive load'">
                                Resistive
                            </label>
                        </div>
                        <div>
                            <RadioButton v-model="amp.loadType" inputId="reactiveLoad" value="reactive" :disabled="tubeParams === null" />
                            <label for="reactiveLoad" v-tooltip="'The plate is connected to an output transformer or other reactive load'">
                                Reactive
                            </label>
                        </div>
                    </div>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Rp" :min=0 :step="proportionalStep(amp.Rp)" showButtons :disabled="tubeParams === null" />
                </div>
                <template v-if="amp.model">
                    <div class="col-2 py-2">
                        <label v-tooltip="'The value of the cathode bias resistor'">
                            Cathode Load (Ω)
                        </label>
                    </div>
                    <div class="col-1 py-2">
                        <Checkbox v-model="amp.cathodeBypass" inputId="cathodeBypass" :binary="true" />
                        <label for="cathodeByypass" v-tooltip="'A capacitor is connected in parallel with the cathode resistor to allow AC signal to pass unimpeded'">
                            AC Bypass
                        </label>
                    </div>
                    <div class="col-3 py-2">
                        <InputNumber v-model="amp.Rk" :min=0 :step="proportionalStep(amp.Rk)" :maxFractionDigits=0 showButtons
                            :disabled="tubeParams === null || amp.model === null || amp.biasMethod !== 'cathode'" />
                    </div>
                </template>
            </div>

            <div class="grid surface-ground col-12 align-items-center border-y-1 border-400">
                <div class="col-3 py-2">
                    <label v-tooltip="'The input impedance of the following amplifier stage'">
                        Next Stage Impedance (Ω)
                    </label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Znext" :min=0 :step=1000 showButtons
                        :disabled="tubeParams === null || amp.loadType === 'reactive'" />
                </div>
            </div>

            <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'" class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <label v-tooltip="'The voltage at the screen or suppressor grid'">
                        Screen Voltage (V)
                    </label>
                </div>
                <div class="col-9 py-2">
                    <InputNumber v-model="amp.Vg2" :min=0 :max="tubeParams.limits.maxVg2" :maxFractionDigits=0 :step=1 showButtons />
                </div>
            </div>

            <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'"
                class="grid surface-ground col-12 align-items-center border-y-1 border-400">
                <div class="col-3 py-2">
                    <label v-tooltip="'The percentage of the signal which appears on the screen-grid'">
                        Ultra-linear tap (%)
                    </label>
                </div>
                <div class="col-9 py-2">
                    <InputNumber v-model="amp.ultralinearTap" :min=10 :max=90 :step=10 showButtons
                        :disabled="amp.mode !== 'ultralinear'" />
                </div>
            </div>

            <div class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <label v-tooltip="'The maximum amplitude of the input signal'">
                        Input Headroom (±V)
                    </label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.inputHeadroom" :maxFractionDigits=4 :min=0 :step=0.01 showButtons
                        :disabled="tubeParams === null" />
                </div>
                <div class="col-3 py-2">
                    <label>Output Headroom (±V):</label>
                </div>
                <div v-if="amp.inputHeadroom" class="col-3 py-2">
                    {{  amp.outputHeadroom()[0].toFixed() }} / {{  amp.outputHeadroom()[1].toFixed() }}, {{ (amp.outputHeadroom()[1] - amp.outputHeadroom()[0]).toFixed() }} peak-to-peak
                </div>
            </div>

        </template>

    </div>
</template>
