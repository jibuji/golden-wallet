// make sure a sidecar is running, if it is not running, start it

import { Child, Command } from "@tauri-apps/api/shell";
import { join, appDataDir } from '@tauri-apps/api/path';
import { fs, shell } from '@tauri-apps/api';
import { platform } from '@tauri-apps/api/os';
import { getBlockchainInfo, getDefaultMinerAddr } from "./wallet-utils";


export async function ensureBitbidIsRunning() {
    try {
        const appDataDirPath = await appDataDir();
        console.log("appDataDirPath:", appDataDirPath);
        const nodeDataDirPath = await join(appDataDirPath, 'bitbid');
        const pid = await getPid(`${nodeDataDirPath}/bitbid.pid`);
        if (pid) {
            if (await isProcessRunning(pid)) {
                console.log('bitbid is running')
                return;
            }
        }
        const child = await runBitbi(nodeDataDirPath);
        //write pid into bitbid.pid
        await fs.writeFile(`${nodeDataDirPath}/bitbid.pid`, child.pid.toString());
        return;
    } catch (e) {
        console.log("ensureBitbidIsRunning error:", e);
    }
}


export async function ensureMinerdIsRunning(threads: number, addr: string) {
    try {
        const appDataDirPath = await appDataDir();
        console.log("appDataDirPath:", appDataDirPath);
        const minerDir = await join(appDataDirPath, 'minerd');
        const pid = await getPid(`${minerDir}/minerd.pid`);
        if (pid) {
            if (await isProcessRunning(pid)) {
                console.log('minerd is running')
                return;
            }
        }
        const child = await runMinerd(minerDir, threads, addr);
        //write pid into minerd.pid
        await fs.writeFile(`${minerDir}/minerd.pid`, child.pid.toString());
        return;
    } catch (e) {
        console.log("ensureMinerdIsRunning error:", e);
    }
}

async function killPid(pid: number) {
    const isWindows = (await platform()) === 'win32';
    if (isWindows) {
        //kill windows process
        const command = new Command("taskkill", ['/F', '/PID', pid.toString()], { encoding: "utf-8" });
        await command.execute();
    } else {
        const command = new Command("kill", ['-9', pid.toString()], { encoding: "utf-8" });
        await command.execute();
    }
}
export async function stopSidecar(name: string) {
    if (name === "bitbid") {
        const appDataDirPath = await appDataDir();
        const nodeDataDirPath = await join(appDataDirPath, 'bitbid');
        const pid = await getPid(`${nodeDataDirPath}/bitbid.pid`);
        if (pid) {
            while (await isProcessRunning(pid)) {
                await killPid(pid);
                await sleep(1 * 1000);
            }
            console.log('bitbid stopped');
        }
        return;
    }
    if (name === 'minerd') {
        const appDataDirPath = await appDataDir();
        const minerDir = await join(appDataDirPath, 'minerd');
        const pid = await getPid(`${minerDir}/minerd.pid`);
        if (pid) {
            while (await isProcessRunning(pid)) {
                await killPid(pid);
                await sleep(1 * 1000);
            }
            console.log('minerd stopped');
        }
        return;
    }
}

export async function isSidecarRunning(name: string) {
    if (name === "bitbid") {
        const appDataDirPath = await appDataDir();
        const nodeDataDirPath = await join(appDataDirPath, 'bitbid');
        const pid = await getPid(`${nodeDataDirPath}/bitbid.pid`);
        if (pid) {
            return await isProcessRunning(pid);
        }
        return false;
    }
    if (name === 'minerd') {
        const appDataDirPath = await appDataDir();
        const minerDir = await join(appDataDirPath, 'minerd');
        const pid = await getPid(`${minerDir}/minerd.pid`);
        if (pid) {
            return await isProcessRunning(pid);
        }
        return false;
    }
    return false;
}

async function runBitbi(nodeDataDirPath: string) {
    console.log("runBitbi 1...")
    await fs.createDir(`${nodeDataDirPath}/data`, { recursive: true });
    console.log("runBitbi created folder:", `${nodeDataDirPath}/data`);
    //let's read a file contains the last time the node was started, 
    // if current time - last time < 5 minutes, then we need to delete the blocks and chainstates
    // and restart the node
    const now = Date.now();
    if (await fs.exists(`${nodeDataDirPath}/data/lastStartTime.txt`)) {
        const lastStartTime = parseInt(await fs.readTextFile(`${nodeDataDirPath}/data/lastStartTime.txt`)) || 1;
        if (now - lastStartTime < 5 * 60 * 1000) {
            console.log("runBitbi delete blocks and chainstate");
            if (await fs.exists(`${nodeDataDirPath}/data/blocks`)) {
                await fs.removeDir(`${nodeDataDirPath}/data/blocks`, { recursive: true });
            }
            if (await fs.exists(`${nodeDataDirPath}/data/chainstate`)) {
                await fs.removeDir(`${nodeDataDirPath}/data/chainstate`, { recursive: true });
            }
            //remove log
            if (await fs.exists(`${nodeDataDirPath}/data/debug.log`)) {
                await fs.removeFile(`${nodeDataDirPath}/data/debug.log`);
            }
        }
    }

    //write current time to lastStartTime.txt
    await fs.writeTextFile(`${nodeDataDirPath}/data/lastStartTime.txt`, now.toString());

    const command = Command.sidecar("sidecar/bitbid", [
        '-rpcuser=golden',
        `-rpcpassword=wallet`,
        `-datadir=${nodeDataDirPath}/data`,
        `-rpcworkqueue=32`
    ], { encoding: "utf-8" });
    console.log("runBitbi begin spawn command");
    return await command.spawn();
}

async function runMinerd(minerDir: string, threads: number, addr: string) {
    await fs.createDir(minerDir, { recursive: true });
    // const addr = await getDefaultMinerAddr();
    if (!addr) {
        console.error('miner address not found');
        throw new Error('miner address not found');
    }
    // const errLogFile = `${minerDir}/minerd.err.log`;
    const outLogFile = `${minerDir}/minerd.out.log`;
    const now = Date.now();
    const command = Command.sidecar("sidecar/minerd", [
        '--url=http://golden:wallet@127.0.0.1:9800',
        `--coinbase-sig=golden-${shortenNumbers(now)}`,
        `--coinbase-addr=${addr}`,
        `--threads=${threads}`,
    ], { env: { "PATH": "%PATH%;.\\resources" }, encoding: "utf-8" });
    const miner = await command.spawn();
    command.stdout.on('data', data => {
        console.log('stdout:', data);
        //write data to outLogFile
        fs.writeTextFile(outLogFile, data, { append: true });
    });

    command.stderr.on('data', data => {
        console.log('stderr:', data);
        //write data to errLogFile
        fs.writeTextFile(outLogFile, data, { append: true });
    });
    return miner;
}

async function getPid(path: string) {
    try {
        const pid = await fs.readTextFile(path);
        console.log("getPid:", pid);
        return parseInt(pid);
    } catch (e) {
        return null;
    }
}

// check if a process is running, 
async function isProcessRunning(pid: number) {
    const platformName = await platform();
    const isWindows = platformName === 'win32';
    console.log("isProcessRunning plaformName:", platformName, "; isWindows:", isWindows, "; pid:", pid);
    const command = isWindows ? ["tasklist", "/FI", `PID eq ${pid}`] : ['ps', '-p', `${pid}`];

    //exec command
    const output = await new Command(command[0], command.slice(1), { encoding: "utf-8" }).execute();
    console.log('isProcessRunning output:', output.stdout, output.stderr);
    return output.stdout.includes(pid.toString());
}

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function shortenNumbers(n: number) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let str = '';
    do {
        str = chars[n % chars.length] + str;
        n = Math.floor(n / chars.length);
    } while (n > 0);
    return str;
}

export async function checkIfNodeCaughtUp() {
    try {
    //check if the node is caught up
    const info = await getBlockchainInfo();
    return info.blocks === info.headers;
    }catch(e) {
        console.error('checkIfNodeCaughtUp error:', e);
        return false;
    }
}
