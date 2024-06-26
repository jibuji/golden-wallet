// AN Error has a code and message, and can be thrown
export class CodeError extends globalThis.Error {
    code: string;
    constructor(code: string, message: string = '') {
        super(message);
        this.code = code;
    }
}

// define common Error Codes
export const ErrorCode = {
    UNKNOWN: 'UNKNOWN',
    PORT_ALREADY_IN_USE: 'PORT_ALREADY_IN_USE',
    GET_MINER_ADDRESSES_FAILED: 'GET_MINER_ADDRESSES_FAILED',
    BACKUP_WALLET_FAILED: 'BACKUP_WALLET_FAILED',
    RESTORE_WALLET_FAILED: 'RESTORE_WALLET_FAILED',
    MINER_SWITCH_WALLET_FAILED: 'MINER_SWITCH_WALLET_FAILED',
};