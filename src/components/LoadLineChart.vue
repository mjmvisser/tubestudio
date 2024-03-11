<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import type { Ref } from 'vue';
import PrimeVue from 'primevue/config';
import { Scatter } from 'vue-chartjs'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import type { ChartType, ChartData, ChartDataset, ChartOptions, Tick, TooltipItem } from 'chart.js';
import { tubeDatabase } from '@/tubeDatabase';
import type { TubeInfo } from '@/tubeDatabase';
import { tubeFactory } from '@/tubeModels';
import { loadLineFactory, intersectLoadLines, intersectCharacteristicWithLoadLineV } from '@/loadLines'
import { clamp } from '@/utils';
import { Amp } from '@/amp';
import type { AmpState } from '@/amp';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import RadioButton from 'primevue/radiobutton';
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

const modes = [
    { id: 'triode', name: 'Triode' },
    { id: 'pentode', name: 'Pentode' },
    { id: 'ultralinear', name: 'Ultralinear' }
];

const topologies = [
    { id: 'se', name: 'Single-Ended' },
    { id: 'pp', name: 'Push-Pull' }
];

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

const Iq_ma : Ref<number | null> = ref(null);

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
        console.log("model changed, recalculating Vg=" + amp.Vg);
    }
});

watch(Iq_ma, (value) => {
    if (amp && value !== null) {
        amp.Iq = value / 1000;
    }
});

watch(() => amp?.Iq.toFixed(5), () => {
    if (amp) {
        Iq_ma.value = amp.Iq * 1000;
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

//watch(
//  () => amp.inputHeadroom,
//  () => {
//    if (tubeModel.value !== null) {
//      const minVg = amp.Vg - amp.inputHeadroom;
//      const maxVg = amp.Vg + amp.inputHeadroom;
//      const minVp = intersectCharacteristicWithLoadLineV(model.value, minVg, this.dcLoadLine);
//
//        }
//        maxVp: intersectCharacteristicWithLoadLineV(this.model, maxVg, this.dcLoadLine),
//        
//      };
//    }
//  }
//)

const chartData = computed(() : ChartData<'scatter'> => {
    let datasets : ChartDataset<'scatter'>[] = [];

    console.log("chartData recomputed");

    amp?.Iq;
    amp?.Vq;
    amp?.Vg;
    amp?.Rp;
    amp?.Rk;
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

        datasets.push({
            label: amp.loadType[0].toUpperCase() + amp.loadType.slice(1) + ' DC Load: ' + amp.Rp + 'Ω',
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
            label: 'AC Load: ' + amp.Z.toFixed() + 'Ω',
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
                        label: (context: TooltipItem<'scatter'>) => {
                            const itemLabel = context.dataset.label || '';
                            const Vp = context.parsed.x.toFixed(2);
                            const Ip = (context.parsed.y * 1000).toFixed(2);
                            return itemLabel + ' (Vp: ' + Vp + 'V, Ip: ' + Ip + 'mA)';
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
                            return ((value as number) * 1000).toFixed();
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
            <div class="col-3 py-2">
                <div class="text-left font-bold">
                    <div class="text-left px-2">Tube:&nbsp;
                        <Dropdown v-model="selectedTube" :options="tubes" optionLabel="name" optionValue="id"
                            placeholder="Select a Tube" class='w-full md:w-14rem' />
                    </div>
                </div>
            </div>
            <div class="col-3 py-2">
                <div class="text-left font-bold">
                    <label>Model:</label>&nbsp;
                    <Dropdown v-model="selectedModel" :options="models" optionLabel="name" optionValue="id"
                        placeholder="Select a Model" class="w-full md:w-14rem" />
                </div>
            </div>
            <div class="col-6 py-2">
                <div class="text-left">
                    <label v-if="selectedTube !== null && selectedModel !== null"><a
                            :href="tubeDatabase[selectedTube].models[selectedModel].source">Source</a></label>
                </div>
            </div>
        </div>

        <template v-if="tubeParams !== null">
            <template v-if="amp.model">
                <div class="grid surface-ground col-12 align-items-center border-y-1 border-400">
                    <div class="col-3 py-2">
                        <label>Topology:</label>
                    </div>
                    <div class="col-3 py-2">
                        <div v-for="topology in topologies" :key="topology.id" class="flex align-items-center">
                            <RadioButton v-model="amp.topology" :name="topology.id" :value="topology.id"
                                :disabled="tubeParams === null || amp.loadType !== 'reactive'" />
                            <label :for="topology.id" class="ml-2">{{ topology.name }}</label>
                        </div>
                    </div>
                    <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'" class="col-3 py-2">
                        <div class="">Operating Mode:</div>
                    </div>
                    <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'" class="col-3 py-2">
                        <div v-for="mode in modes" :key="mode.id" class="flex align-items-center">
                            <RadioButton v-model="amp.mode" :name="mode.id" :value="mode.id" />
                            <label :for="mode.id" class="ml-2">{{ mode.name }}</label>
                        </div>
                    </div>
                </div>
            </template>

            <div class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <label>B+ (V):</label>
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
                    <label>Quiescent Operating Point:</label>
                </div>
                <div class="col-3 py-2">
                    <div class="grid">
                        <div class="col-12 py-0">Vq (V):</div>
                        <div class="col-12 py-0">
                            <InputNumber v-model="amp.Vq" :min=0 :max=tubeParams?.limits.maxVp :maxFractionDigits=1 
                                :step="proportionalStep(amp.Vq)" showButtons :disabled="tubeParams === null || amp.loadType === 'reactive'" />
                        </div>
                        <div class="col-12 py-0">Iq (ma):</div>
                        <div class="col-12 py-0">
                            <InputNumber v-model="Iq_ma" :min=0.001 :max="tubeParams.limits.maxIp * 1000" :maxFractionDigits=2
                                :step="proportionalStep(Iq_ma)" showButtons :disabled="tubeParams === null" />
                        </div>
                    </div>
                </div>
                <template v-if="amp.model">
                    <div class="col-2 py-2">
                        <label>Grid Bias (V):</label>
                    </div>
                    <div class="col-1 py-2">
                        <div class="flex flex-column align-items-left">
                            <div>
                                <RadioButton v-model="amp.biasMethod" value="cathode"
                                    :disabled="tubeParams === null || amp.model === null" /> <label>Cathode</label>
                            </div>
                            <div>
                                <RadioButton v-model="amp.biasMethod" value="fixed"
                                    :disabled="tubeParams === null || amp.model === null" /> <label>Fixed</label>
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
                    <label>Plate Load (Ω):</label>
                </div>
                <div class="col-2 py-2">
                    <div class="flex flex-column align-items-center">
                        <div>
                            <RadioButton v-model="amp.loadType" value="resistive" :disabled="tubeParams === null" />
                            <label>Resistive</label>
                        </div>
                        <div>
                            <RadioButton v-model="amp.loadType" value="reactive" :disabled="tubeParams === null" />
                            <label>Reactive</label>
                        </div>
                    </div>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Rp" :min=0 :step="proportionalStep(amp.Rp)" showButtons :disabled="tubeParams === null" />
                </div>
                <template v-if="amp.model">
                    <div class="col-3 py-2">
                        <label>Cathode Load (Ω):</label>
                    </div>
                    <div class="col-3 py-2">
                        <InputNumber v-model="amp.Rk" :min=0 :step="proportionalStep(amp.Rk)" :maxFractionDigits=0 showButtons
                            :disabled="tubeParams === null || amp.model === null || amp.biasMethod !== 'cathode'" />
                    </div>
                </template>
            </div>

            <div class="grid surface-ground col-12 align-items-center border-y-1 border-400">
                <div class="col-3 py-2">
                    <label>Next Stage Impedance (Ω):</label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Znext" :min=0 :step=1000 showButtons
                        :disabled="tubeParams === null || amp.loadType === 'reactive'" />
                </div>
            </div>

            <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'" class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <label>Screen Voltage (V):</label>
                </div>
                <div class="col-9 py-2">
                    <InputNumber v-model="amp.Vg2" :min=0 :max="tubeParams.limits.maxVg2" :maxFractionDigits=0 :step=1 showButtons />
                </div>
            </div>

            <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'"
                class="grid surface-ground col-12 align-items-center border-y-1 border-400">
                <div class="col-3 py-2">
                    <label>Ultra-linear tap (%):</label>
                </div>
                <div class="col-9 py-2">
                    <InputNumber v-model="amp.ultralinearTap" :min=10 :max=90 :step=10 showButtons
                        :disabled="amp.mode !== 'ultralinear'" />
                </div>
            </div>

            <div class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <label>Input Headroom (±V):</label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.inputHeadroom" :maxFractionDigits=4 :min=0 :step=0.01 showButtons
                        :disabled="tubeParams === null" />
                </div>
                <div class="col-3 py-2">
                    <label>Output Headroom (±V):</label>
                </div>
                <div class="col-3 py-2">
                    [Set input headroom]
                </div>
            </div>

        </template>

    </div>
</template>
