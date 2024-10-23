## Welcome to Golden Wallet! 🎉

Your one-stop, secure, and user-friendly digital wallet for all things BTB coins (also known as BiTBi or 'bit bean'). With Golden Wallet, you can easily manage, mine, and even chat using your BTB coins right from your device. 

Our mission? To make cryptocurrency simple and fun! 🚀

### With Golden Wallet, you can:
- Create and manage multiple wallets with ease
- Keep track of your balances in real-time
- View your transaction history at a glance
- Send and receive BTB coins with just a few clicks
- Swap one cryptocurrency for another without breaking a sweat

And the best part? Golden Wallet is designed to work seamlessly on both desktop and mobile devices(will be available soon). Plus, we've baked in top-notch encryption and authentication measures to keep your funds safe and secure. 

So why wait? Dive in and start exploring the world of BTB coins with Golden Wallet today! 🌟 

Go to check the release page to download the latest version of Golden Wallet here: [Releases](https://github.com/bitbi-core/golden-wallet/releases)

### Building from Source

If you encounter issues running the release binaries on Windows or macOS due to app signature requirements, you can build Golden Wallet from source. Follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/bitbi-core/golden-wallet.git
   cd golden-wallet
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the app:
   ```
   npm run tauri build
   ```

This will create an executable for your operating system in the `src-tauri/target/release` directory.

For more detailed instructions on building Tauri apps, please refer to the [Tauri documentation](https://tauri.app/v1/guides/building/).
