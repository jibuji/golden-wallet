


import { invoke } from '@tauri-apps/api/tauri'
import { Body, fetch, ResponseType } from '@tauri-apps/api/http'

export async function makeRpcRequest() {
  const rpcUser = "golden"
  const rpcPassword = "wallet"
  const rpcUrl = "http://localhost:9800"

  const body = {
    jsonrpc: "1.0",
    id: "js-app",
    method: "getblockchaininfo",
    params: []
  }

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(rpcUser + ':' + rpcPassword)
      },
      body: Body.json(body),
      responseType: ResponseType.JSON
    })

    console.log(response.data)
  } catch (error) {
    console.error("An error occurred:", error)
  }
}

