import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';

export async function toast(message: string, title: string = 'Golden Wallet') {
    try {
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
        }
        if (permissionGranted) {
            sendNotification({ title, body: message });
        }
    } catch (e) {
        console.error("toast error", e);
    }
}