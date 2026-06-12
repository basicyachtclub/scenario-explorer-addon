<script>
export default {
    name: "JobExecutionInput",
    props: {
        "inputKey": {
            type: [String, Number],
            required: true
        },
        "data": {
            type: Object,
            required: true
        },
        "modelValue": {
            type: [String, Number, Boolean, Array, null],
            default: undefined
        }
    },
    emits: ["update:modelValue"],
    methods: {
        parseNumberInput (event) {
            const parsed = Number(event.target.value);
            this.$emit(
                "update:modelValue",
                Number.isFinite(parsed) ? parsed : null
            );
        },
        handleArrayValueChange (index, valueAtIndex) {
            const newValue = [...(this.modelValue || [])];

            newValue[index] = valueAtIndex;
            this.$emit("update:modelValue", newValue);
        },
        handleArrayValueDeletion (index) {
            const newValue = [...(this.modelValue || [])];

            newValue.splice(index, 1);
            this.$emit("update:modelValue", newValue);
        }
    }
};
</script>

<template>
    <input
        v-if="data.schema.type === 'string'"
        :id="`input_${inputKey}`"
        :key="`input_${inputKey}_string`"
        class="form-control"
        :name="`input_${inputKey}`"
        type="text"
        :minLength="data.schema.minLength"
        :maxLength="data.schema.maxLength"
        :pattern="data.schema.pattern"
        :placeholder="data.schema.default"
        :value="modelValue"
        :required="data.schema.required || data.required || data.minOccurs > 0"
        @input="$emit('update:modelValue', $event.target.value)"
    >
    <input
        v-else-if="data.schema.type === 'number'"
        :id="`input_${inputKey}`"
        :key="`input_${inputKey}_number`"
        class="form-control"
        :name="`input_${inputKey}`"
        type="number"
        :min="data.schema.minimum"
        :max="data.schema.maximum"
        :placeholder="data.schema.default"
        :value="modelValue"
        step="any"
        :required="data.schema.required || data.required || data.minOccurs > 0"
        @input="parseNumberInput"
        @change="parseNumberInput"
    >
    <input
        v-else-if="data.schema.type === 'boolean'"
        :id="`input_${inputKey}`"
        :key="`input_${inputKey}_boolean`"
        class="form-check-input"
        :name="`input_${inputKey}`"
        type="checkbox"
        :placeholder="data.schema.default"
        :checked="!!modelValue"
        @change="$emit('update:modelValue', $event.target.checked)"
    >
    <div
        v-else-if="data.schema.type === 'array'"
        :key="`input_${inputKey}_${modelValue?.length}`"
        class="d-flex flex-column gap-1"
    >
        <div
            v-for="(_, index) in modelValue"
            :key="`input_${inputKey}_${index}`"
            class="d-flex align-items-center gap-2"
        >
            <JobExecutionInput
                :input-key="index"
                :data="{
                    schema: {
                        ...data.schema.items,
                        required: index < data.schema.minItems,
                    },
                }"
                :model-value="modelValue[index]"
                @update:modelValue="handleArrayValueChange(index, $event)"
            />
            <button
                v-if="modelValue.length > 1"
                class="bootstrap-icon"
                @click="handleArrayValueDeletion(index)"
            >
                <i class="bi-x-lg" ></i>
            </button>
        </div>
        <button
            v-if="!data.schema.maxItems || modelValue?.length < data.schema.maxItems"
            :key="`input_${inputKey}_array_add_button`"
            type="button"
            class="btn btn-sm btn-secondary"
            @click="$emit('update:modelValue', [...(modelValue || []), ''])"
        >
            <i class="bi-plus-circle" ></i>
            {{ $t("additional:modules.tools.simulationTool.inputArrayAddButton", { title: data.title }) }}
        </button>
    </div>
</template>
