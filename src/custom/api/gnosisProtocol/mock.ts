import deterministicHash from 'utils/deterministicHash'
import { UploadMetadataParams } from 'api/gnosisProtocol/api'

export async function uploadAppDataDoc(params: UploadMetadataParams): Promise<string> {
  console.log('[utils:operatorMock] Post AppData doc', params)

  return deterministicHash(params.metadata)
}
