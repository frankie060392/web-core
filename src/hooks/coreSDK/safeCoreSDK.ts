import chains from '@/config/chains'
import { getWeb3 } from '@/hooks/wallets/web3'
import { getSafeSingletonDeployment, getSafeL2SingletonDeployment } from '@safe-global/safe-deployments'
import ExternalStore from '@/services/ExternalStore'
import { Gnosis_safe__factory } from '@/types/contracts'
import { invariant } from '@/utils/helpers'
import type { JsonRpcProvider } from '@ethersproject/providers'
import Safe from '@safe-global/safe-core-sdk'
import type { SafeVersion } from '@safe-global/safe-core-sdk-types'
import EthersAdapter from '@safe-global/safe-ethers-lib'
import type { SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { ethers } from 'ethers'
import semverSatisfies from 'semver/functions/satisfies'
import { isValidMasterCopy } from '@/services/contracts/safeContracts'

export const isLegacyVersion = (safeVersion: string): boolean => {
  const LEGACY_VERSION = '<1.3.0'
  return semverSatisfies(safeVersion, LEGACY_VERSION)
}

export const isValidSafeVersion = (safeVersion?: SafeInfo['version']): safeVersion is SafeVersion => {
  const SAFE_VERSIONS: SafeVersion[] = ['1.3.0', '1.2.0', '1.1.1', '1.0.0']
  return !!safeVersion && SAFE_VERSIONS.some((version) => semverSatisfies(safeVersion, version))
}

// `assert` does not work with arrow functions
export function assertValidSafeVersion<T extends SafeInfo['version']>(safeVersion?: T): asserts safeVersion {
  return invariant(isValidSafeVersion(safeVersion), `${safeVersion} is not a valid Safe version`)
}

export const createEthersAdapter = (provider = getWeb3()) => {
  if (!provider) {
    throw new Error('Unable to create `EthersAdapter` without a provider')
  }

  const signer = provider.getSigner(0)
  console.log(signer, 'signer')
  return new EthersAdapter({
    ethers,
    signerOrProvider: signer,
  })
}

const createReadOnlyEthersAdapter = (provider: JsonRpcProvider) => {
  if (!provider) {
    throw new Error('Unable to create `EthersAdapter` without a provider')
  }

  const etherAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: provider,
  })
  return etherAdapter
}

// Safe Core SDK
export const initSafeSDK = async (provider: JsonRpcProvider, safe: SafeInfo): Promise<Safe | undefined> => {
  console.log('init safe sdk')
  const chainId = safe.chainId
  const safeAddress = safe.address.value
  const safeVersion = '1.3.0' || (safe.version ?? (await Gnosis_safe__factory.connect(safeAddress, provider).VERSION()))
  console.log(chainId)
  console.log(safeAddress)
  console.log(safeVersion)
  let isL1SafeMasterCopy = chainId === chains.eth
  console.log(isL1SafeMasterCopy)
  console.log(!isValidMasterCopy(safe))
  // If it is an official deployment we should still initiate the safeSDK
  // if (!isValidMasterCopy(safe)) {
  const masterCopy = safe.implementation.value
  console.log(masterCopy)
  const safeL1Deployment = getSafeSingletonDeployment({ network: chainId, version: safeVersion })
  console.log('🚀 ~ file: safeCoreSDK.ts:73 ~ initSafeSDK ~ safeL1Deployment:', safeL1Deployment)
  const safeL2Deployment = getSafeL2SingletonDeployment({ network: chainId, version: safeVersion })
  console.log('🚀 ~ file: safeCoreSDK.ts:75 ~ initSafeSDK ~ safeL2Deployment:', safeL2Deployment)

  console.log({ network: chainId, version: safeVersion })
  console.log(safeL2Deployment)
  isL1SafeMasterCopy = masterCopy === safeL1Deployment?.defaultAddress
  const isL2SafeMasterCopy = masterCopy === safeL2Deployment?.networkAddresses[chainId]
  console.log(isL1SafeMasterCopy, isL2SafeMasterCopy)
  // Unknown deployment, which we do not want to support
  if (!isL1SafeMasterCopy && !isL2SafeMasterCopy) {
    return Promise.resolve(undefined)
  }
  // }

  // Legacy Safe contracts
  if (isLegacyVersion(safeVersion)) {
    isL1SafeMasterCopy = true
  }
  console.log(provider)
  console.log('create safe')
  const adapter = createReadOnlyEthersAdapter(provider)
  console.log(adapter, 'adapter')
  const chainId1 = await adapter.getChainId()
  console.log(chainId1)
  const result = {
    ethAdapter: createReadOnlyEthersAdapter(provider),
    safeAddress,
    isL1SafeMasterCopy,
  }
  const test = Safe.create({
    ethAdapter: adapter,
    safeAddress,
    isL1SafeMasterCopy,
  })
  console.log('🚀 ~ file: safeCoreSDK.ts:105 ~ initSafeSDK ~ test:', test)
  return test
}

export const {
  getStore: getSafeSDK,
  setStore: setSafeSDK,
  useStore: useSafeSDK,
} = new ExternalStore<Safe | undefined>()
