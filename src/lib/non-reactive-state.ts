import { checkIfNodeCaughtUp, sleep } from "./utils";

let IsNodeCaughtUp = false;

let loopChecking = false;

export async function ensureCheckingNodeLoopStarted() {
    if (loopChecking) return;
    loopChecking = true;
    while (true) {
        await sleep(10000);
        IsNodeCaughtUp = await checkIfNodeCaughtUp();
    }
}

export function getIsNodeCaughtUp() {
    return IsNodeCaughtUp;
}