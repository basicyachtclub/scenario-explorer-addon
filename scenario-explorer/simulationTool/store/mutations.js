import {generateSimpleMutations} from "../../../src/shared/js/utils/generators";
import state from "./state";

const simpleMutations = generateSimpleMutations(state);

const mutations = {
    ...simpleMutations,
    setJobResultData (state, payload) {
        state.jobResultData = {
            ...state.jobResultData,
            ...payload
        };
    },
    clearJobResultData (state, jobId) {
        if (!jobId) {
            return;
        }
        const next = {
            ...state.jobResultData
        };

        delete next[jobId];
        state.jobResultData = next;
    }
};

export default mutations;
