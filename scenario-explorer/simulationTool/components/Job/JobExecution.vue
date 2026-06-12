<script>
import { mapMutations, mapGetters, mapActions } from "vuex";
import SectionHeader from "../SectionHeader.vue";
import JobExecutionInput from "./JobExecutionInput.vue";
import AsyncWrapper from "../AsyncWrapper.vue";
import ProcessSelect from "../Process/ProcessSelect.vue";

export default {
    name: "JobExecution",
    components: {
        AsyncWrapper,
        SectionHeader,
        ProcessSelect,
        JobExecutionInput
    },
    data() {
        return {
            process: null,
            executionValues: {},
            requestState: {
                loading: false,
                error: null
            },
            executionRequestState: {
                loading: false,
                error: null
            }
        };
    },
    computed: {
        ...mapGetters("Modules/SimulationTool", [
            "selectedProcessId"
        ]),
        ...mapGetters("Modules/Login", [
            "accessToken",
            "loggedIn"
        ])
    },
    mounted: function () {
        if (this.selectedProcessId) {
            this.fetchProcess(this.selectedProcessId);
        }
    },
    watch: {
        selectedProcessId: function(newProcessId) {
            if (newProcessId === null) {
                this.process = null;
                return;
            }
            this.fetchProcess(newProcessId);
        }
    },
    methods: {
        ...mapMutations("Modules/SimulationTool", [
            "setSelectedJobId",
            "setSelectedProcessId",
            "setMode",
            "clearJobResultData"
        ]),
        ...mapActions("Modules/SimulationTool", [
            "fetchJobs"
        ]),
        /**
         * Fetches a process from the simulation backend
         * @param {String} processId
         */
        async fetchProcess (processId) {
            let additionalHeaders = {};
            if (this.loggedIn) {
                additionalHeaders = {
                    Authorization: `Bearer ${this.accessToken}`
                };
            }

            try {
                this.requestState.loading = true;
                const response = await fetch(`/api/processes/${processId}`,{
                    headers: {
                        "Content-Type": "application/json",
                        ...additionalHeaders
                    }
                });
                const result = await response.json();
                if (!response.ok) {
                    this.requestState.error = result.error_message || response.status + ': unknown errror';
                } else {
                    this.process = result;
                    this.setDefaultExecutionValues(result);
                }
            } catch (error) {
                this.requestState.error = error;
            } finally {
                this.requestState.loading = false;
            }
        },
        setDefaultExecutionValues (result) {
            const job_name = this.executionValues.job_name;
            const values = job_name !== undefined && job_name !== "" ? { job_name } : {};

            Object.entries(result.inputs).forEach(([key, input]) => {
                let defaultValue;
                if (input.schema.default !== undefined) {
                    defaultValue = input.schema.default;
                } else if (input.schema.type === "boolean") {
                    const required = input.schema.required || input.required || input.minOccurs > 0;
                    if (required) {
                        defaultValue = false;
                    }
                } else if (
                    result.example?.inputs?.[key] !== undefined
                ) {
                    defaultValue = result.example.inputs[key];
                }
                if (defaultValue !== undefined) {
                    values[key] = defaultValue;
                }
            });
            this.executionValues = values;
        },
        buildExecutionInputsFromForm () {
            const form = this.$refs.form;
            const inputs = {};

            if (!form || !this.process?.inputs) {
                return this.buildExecutionInputs();
            }

            for (const [key, inputDef] of Object.entries(this.process.inputs)) {
                const el = form.querySelector(`[name="input_${key}"]`);

                if (!el) {
                    continue;
                }

                if (inputDef.schema.type === "number") {
                    const parsed = Number(el.value);
                    if (!Number.isFinite(parsed)) {
                        throw new Error(`Invalid number for ${key}`);
                    }
                    inputs[key] = parsed;
                } else if (inputDef.schema.type === "boolean") {
                    inputs[key] = el.checked;
                } else if (inputDef.schema.type === "string") {
                    inputs[key] = el.value;
                }
            }

            const stateInputs = this.buildExecutionInputs();
            for (const [key, inputDef] of Object.entries(this.process.inputs)) {
                if (inputs[key] === undefined) {
                    if (inputDef.schema.type === "array" && stateInputs[key] !== undefined) {
                        inputs[key] = stateInputs[key];
                    } else if (stateInputs[key] !== undefined) {
                        inputs[key] = stateInputs[key];
                    }
                }
            }

            return inputs;
        },
        buildExecutionInputs () {
            const inputs = {};
            if (!this.process?.inputs) {
                return inputs;
            }
            for (const [key, inputDef] of Object.entries(this.process.inputs)) {
                const rawValue = this.executionValues[key];
                if (inputDef.schema.type === "number") {
                    const parsed = Number(rawValue);
                    if (!Number.isFinite(parsed)) {
                        throw new Error(`Invalid number for ${key}`);
                    }
                    inputs[key] = parsed;
                } else {
                    inputs[key] = rawValue;
                }
            }
            return inputs;
        },
        updateExecutionValue (key, value) {
            this.executionValues = {
                ...this.executionValues,
                [key]: value
            };
        },
        resetExecutionValues (newInputsConfig = this.process.inputs) {
            this.executionValues = {};
            Object.entries(newInputsConfig).forEach(([key, input]) => {
                if (input.schema.type === "array") {
                    this.executionValues[key] = [""];
                }
            });
        },
        async execute (event) {
            event.preventDefault();

            const formIsValid = this.$refs.form.reportValidity();

            if (formIsValid) {
                const job_name = this.executionValues.job_name;
                let inputs;

                try {
                    inputs = this.buildExecutionInputsFromForm();
                } catch (error) {
                    this.executionRequestState.error = error.message || String(error);
                    return;
                }

                let additionalHeaders = {};
                if (this.loggedIn) {
                    additionalHeaders = {
                        Authorization: `Bearer ${this.accessToken}`
                    };
                }

                try {
                    this.executionRequestState.loading = true;
                    const response = await fetch(`/api/processes/${this.selectedProcessId}/execution`, {
                        method: "POST",
                        body: JSON.stringify({
                            job_name,
                            inputs
                        }),
                        headers: {
                            "Content-Type": "application/json",
                            ...additionalHeaders
                        }
                    });
                    const result = await response.json();
                    if (!response.ok) {
                        this.executionRequestState.error = result.error_message || response.status + ': unknown error';
                    } else {
                        this.resetExecutionValues();
                        this.clearJobResultData(result.jobID);

                        this.setMode("job-details");
                        this.setSelectedJobId(result.jobID);
                        if (!this.loggedIn) {
                            if (!localStorage.getItem('jobs')) {
                                localStorage.setItem('jobs', result.jobID);
                            } else {
                                localStorage.setItem('jobs', `${localStorage.getItem('jobs')},${result.jobID}`);
                            }
                        }

                        this.fetchJobs();
                    }

                } catch (error) {
                    this.executionRequestState.error = error;
                } finally {
                    this.executionRequestState.loading = false;
                }

            }
        }
    }
};
</script>

<template>
    <div class="job-execution">
        <SectionHeader
            :title="$t('additional:modules.tools.simulationTool.newScenario')"
            icon="bi-box-fill"
        />
        <h3>{{ $t('additional:modules.tools.simulationTool.model') }}: {{ process?.title }}</h3>
        <ProcessSelect
            v-if="!process"
            @update:modelValue="(selectedProcessess) => {
                this.setSelectedProcessId(selectedProcessess[0]?.id);
            }"
        />
        <AsyncWrapper :asyncState="requestState" >
            <form
                ref="form"
                class="execution-form"
            >
                <label for="name_input">{{ $t('additional:modules.tools.simulationTool.scenarioName') }}:</label>
                <input
                    id="name_input"
                    class="form-control"
                    type="text"
                    v-model="executionValues.job_name"
                    required
                />
                <h4>{{ $t('additional:modules.tools.simulationTool.inputParameters') }}</h4>
                <div v-if="process" class="inputs">
                    <template
                        v-for="(input, key) in process.inputs"
                        :key="`label_${key}`"
                    >
                        <label
                            :title="input.description"
                            :for="`input_${key}`"
                        >
                            {{ input.title }}:
                        </label>
                        <JobExecutionInput
                            :input-key="key"
                            :data="input"
                            v-model="executionValues[key]"
                        />
                    </template>
                </div>

                <AsyncWrapper :asyncState="executionRequestState" />
                    <button
                        class="btn btn-primary btn-lg"
                        type="submit"
                        @click="execute"
                    >
                        <i class="bi bi-box-fill">&nbsp;</i>
                        {{ $t('additional:modules.tools.simulationTool.executeScenario') }}
                    </button>
            </form>
        </AsyncWrapper>
    </div>
</template>

<style lang="scss" scoped>
    .job-execution {
        max-height: 100%;
        display: flex;
        flex-direction: column;
        padding: 1rem;

        .execution-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            overflow: hidden;

            .inputs {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                overflow: auto;
            }

            button {
                align-self: flex-end;
            }
        }
    }
</style>
