![ChainCred Banner](./frontend/assets/banner.png)

- ChainCred is a decentralized platform for issuing, verifying, and managing academic and professional credentials on the Ethereum blockchain. It eliminates the friction and fraud associated with traditional paper certificates by creating an immutable, cryptographic record of achievement.
- Users interact with ChainCred through a sleek, modern React frontend. Institutions can connect their Web3 wallets to mint tamper-proof digital certificates directly on-chain.  Once issued, students and employers can instantly verify the authenticity of a credential using a simple QR code or transaction hash without relying on any centralized verification authority.
- The platform handles everything from certificate issuance to on-chain revocation and features a unified dashboard for issuers to manage their entire history. The project is fully open-source, deployed on the Ethereum Sepolia Testnet.

---

## Tech Stack

### Core & Blockchain
- **Solidity**: Custom smart contracts (`CertificateVerifier.sol`) handling the core logic for issuing, verifying, and revoking certificates.
- **Ethereum (Sepolia Testnet)**: The base layer network for immutable data storage and decentralized consensus.
- **Ethers.js / Wagmi**: Handles all RPC communication, contract interactions, and event listening from the frontend.

### Frontend & UI
- **React**: Lightning-fast build tooling and component-based UI architecture.
- **Tailwind CSS v4**: Utility-first CSS framework combined with custom semantic classes for a premium, dark-mode-first aesthetic.
- **RainbowKit**: Seamless, out-of-the-box Web3 wallet connection providing a frictionless UX for both desktop and mobile users.

---

## Screenshots

| Home Page | Issue Certificate |
| :---: | :---: |
| <img src="./frontend/assets/ChainCred_1.png" width="400" alt="Home Page"> | <img src="./frontend/assets/ChainCred_2.png" width="400" alt="Issue Certificate"> |
| **Verify Certificate Form** | **Certificate Verified Success** |
| <img src="./frontend/assets/ChainCred_3.png" width="400" alt="Verify Certificate Form"> | <img src="./frontend/assets/ChainCred_4.png" width="400" alt="Certificate Verified Success"> |
| **My Certificates Dashboard** | |
| <img src="./frontend/assets/ChainCred_5.png" width="400" alt="My Certificates Dashboard"> | |

---

## Architecture

```mermaid
flowchart TD
    %% Custom Styling
    classDef frontend fill:#1E293B,stroke:#38BDF8,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef wallet fill:#334155,stroke:#A78BFA,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef blockchain fill:#0F172A,stroke:#10B981,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef external fill:#1E293B,stroke:#94A3B8,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    %% User Interfaces
    subgraph FrontendLayer ["React UI"]
        UI_Issue["Issuer Dashboard<br/>(Issue & Revoke)"]:::frontend
        UI_Verify["Public Verification<br/>(Scan QR / Enter Hash)"]:::frontend
        UI_MyCerts["My Certificates<br/>(History Dashboard)"]:::frontend
    end

    %% Web3 Connection Layer
    subgraph ConnectionLayer ["Web3 Bridge"]
        Rainbow["RainbowKit<br/>(Wallet Auth)"]:::wallet
        Wagmi["Wagmi / Ethers.js<br/>(RPC Client)"]:::wallet
    end

    %% Blockchain Network
    subgraph BlockchainLayer ["Ethereum Sepolia Testnet"]
        RPC["RPC Node<br/>(Alchemy/Infura)"]:::blockchain
        subgraph SmartContract ["CertificateVerifier.sol"]
            SC_Issue["issueCertificate()"]:::blockchain
            SC_Revoke["revokeCertificate()"]:::blockchain
            SC_Verify["verifyCertificate()"]:::blockchain
            SC_Events[/"emit CertificateStored"/]:::blockchain
        end
    end

    %% External Services
    Etherscan["Sepolia Etherscan"]:::external

    %% Flow: Issuance & Revocation
    UI_Issue -- "1. Sign Transaction" --> Rainbow
    Rainbow -- "2. Construct Tx" --> Wagmi
    Wagmi -- "3. JSON-RPC" --> RPC
    RPC -- "4. Execute" --> SC_Issue
    RPC -- "4. Execute" --> SC_Revoke
    SC_Issue -- "5. Store Data" --> SC_Events
    SC_Revoke -- "5. Update Status" --> SC_Events
    
    %% Flow: Verification
    UI_Verify -- "Query Hash" --> Wagmi
    Wagmi -- "Read State" --> RPC
    RPC -- "Call Contract" --> SC_Verify
    SC_Verify -- "Return Validity" --> UI_Verify

    %% Flow: My Certificates History
    UI_MyCerts -- "Fetch History" --> Wagmi
    Wagmi -- "Filter Logs" --> SC_Events
    SC_Events -. "Event Stream" .-> UI_MyCerts

    %% External Links
    SC_Issue -. "View Receipt" .-> Etherscan
    SC_Revoke -. "View Receipt" .-> Etherscan
```

- **Issuer Application**: The institution connects via RainbowKit to sign transactions. Data entered is securely hashed on the client-side before submission.
- **Smart Contract Execution**: The Solidity contract on the Sepolia Testnet receives the hash. Instead of storing bulky strings, it uses highly gas-efficient `emit CertificateStored` event logs.
- **Verification Portal**: A public user scans a QR code or enters a hash. The React frontend queries the Ethereum RPC node, reading the contract's state to instantly return the cryptographic validity and active/revoked status.
- **State Management**: The frontend listens and syncs in real-time with blockchain events, mapping raw hexadecimal logs into a human-readable dashboard.

---

## Key Features

- **Tamper-Proof Issuance**: Institutions can issue certificates that are permanently anchored to the Ethereum blockchain. Data is immutable and cannot be altered once confirmed.
- **Instant Cryptographic Verification**: Anyone can verify a credential in seconds using the certificate's unique hash or by scanning its auto-generated QR code.
- **On-Chain Revocation**: If a certificate is issued in error or compromised, the issuing address has the exclusive authority to permanently mark the hash as revoked on-chain.
- **My Certificates Dashboard**: A dashboard where issuers can view all their issued credentials, check live validity status (Active/Revoked), and monitor block confirmations.
- **Zero Friction Wallet Connect**: Powered by RainbowKit, users can connect via MetaMask, Coinbase Wallet, WalletConnect, and more with a single click.
- **Etherscan Integration**: 1-click links to view raw transaction data and block history directly on the Sepolia Etherscan block explorer.
- **Decentralized Storage Approach**: Instead of bloating state, ChainCred utilizes Ethereum event logs (`emit CertificateStored`) for highly gas-efficient data indexing and retrieval.

---

## Why I built this

- Whether it’s university degrees or corporate certifications, the system is fundamentally broken: it’s either heavily reliant on vulnerable, easily forged paper documents or locked behind slow, centralized institutional databases that require manual phone calls and emails to verify.
- The moment I began diving into Ethereum and smart contracts, I realized that blockchain was the perfect infrastructure for this exact problem. By anchoring credentials on-chain, I could build a system where trust is decentralized and verification is instantaneous.
