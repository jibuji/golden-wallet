# Golden Wallet v1.0.x Release Notes

## Major Release Highlights

We're excited to announce the release of Golden Wallet v1.0.x, marking a significant milestone in our commitment to providing a secure and user-friendly cryptocurrency wallet solution.

### 🔐 Hierarchical Deterministic (HD) Wallet Implementation
- Introduced HD wallet functionality allowing all wallet addresses and keys to be derived from a single seed phrase
- Simplified backup and recovery process - users only need to securely store one seed phrase
- Enhanced wallet recovery capabilities across different devices

### 🛡️ Enhanced Security Features

#### New Unlock Password System
- Added mandatory unlock password protection for wallet access
- Implemented password hardening using Oblivious Pseudorandom Function (OPRF) technology
- Protects wallet access even if an attacker gains physical access to your computer

#### Advanced Password Hardening
- Integrated OPRF-based password hardening system
- Enhances password security without exposing sensitive data
- Requires network access for password hardening, but maintains complete client-side security
- No sensitive information is ever transmitted to backend servers

### 🔄 Recovery Options
- Primary recovery through seed phrase backup
- Ability to recover full wallet access if unlock password is lost
- All assets can be restored using only the seed phrase

## Security Notes

- The wallet requires internet access for the OPRF password hardening process
- All cryptographic operations are performed client-side
- No sensitive data (passwords, private keys, or seed phrases) is ever transmitted to servers
- For technical details about the OPRF implementation, you can refer to:
  - [OPRF Wikipedia Article](https://en.wikipedia.org/wiki/Oblivious_pseudorandom_function#Password-based_key_derivation)
  - Golden Wallet's open-source code

## Migration from v0.x.x

Users upgrading from previous versions will need to:
1. Back up their existing wallet data
2. Create a new HD wallet in v1.0.x
3. Transfer their assets to the new wallet:
   - For BTB assets: Transfer to your new wallet addresses
   - **For ETH and WBTB assets**: 
     - Important: The wrapped BTB contract on Ethereum has changed:
       - New contract address: `0x8DeFE5b69c162Cd9bB5e4d2b61Cf67602D442Eb1`
       - Token name changed from `WBTB` to `eBTB`
     - Migration steps:
       1. In v0.3.2 wallet:
          - First unwrap any existing WBTB back to BTB
          - Send ETH out to your external account
       2. In new v1.0.x wallet:
          - After setup, create a new receive address
          - Send all your BTB from v0.3.2 wallet to this new address
       3. Optional: You can now wrap your BTB to eBTB on Ethereum using the new contract(This is what the bridge section in the wallet doing)

4. Securely store your new seed phrase
5. Set up your unlock password

⚠️ **Important**: Do not delete your old wallet until you have successfully transferred all assets to your new v1.0.x wallet. Double-check both ETH and BTB balances to ensure all assets have been moved successfully.

## Important Reminders

- **ALWAYS** backup your seed phrase in a secure location
- Your seed phrase is the ONLY way to recover your assets if you lose access to your wallet
- Keep your unlock password secure but remember it can be reset using your seed phrase
- Never share your seed phrase or unlock password with anyone

## Technical Documentation

For developers and technical users interested in the implementation details:
- Full source code is available in our repository
- Detailed technical documentation about the OPRF implementation
- API specifications for the password hardening service

---

For any questions or support, please visit our GitHub repository or contact our support team.

*Note: This is a major release with significant security improvements. We recommend all users upgrade to v1.0.x as soon as possible.* 