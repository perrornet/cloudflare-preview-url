import core from '@actions/core'
import axios from 'axios'

export default async function getDeploymentUrl(
  token,
  accountId,
  accountEmail,
  projectId,
  repo,
  branch,
  environment,
  commitHash
) {
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectId}/deployments`

  if (commitHash) {
    core.info(`Fetching ${commitHash} from: ${apiUrl}`)
  } else {
    core.info(`Fetching from: ${apiUrl}`)
  }

  const headers = accountEmail
    ? {
        'X-Auth-Key': token,
        'X-Auth-Email': accountEmail
      }
    : {
        Authorization: `Bearer ${token}`
      }

  const { data } = await axios.get(apiUrl, {
    headers,
    responseType: 'json',
    responseEncoding: 'utf8'
  })

  if (!data || !data.result || data.result.length <= 0) {
    core.error(JSON.stringify(data))
    throw new Error('no deployments found')
  }

  core.info(`Found ${data.result.length} deployments`)
  core.debug(`Looking for matching deployments ${repo}/${branch}`)

  // 循环过滤
  for (let i = 0; i < data.result.length; i++) {
    const d = data.result[i]
    if (!d || !d.source || !d.source.config || d.source.config.repo_name !== repo) {
      continue
    }
    if (!d || !d.deployment_trigger || !d.deployment_trigger.metadata || d.deployment_trigger.metadata.branch !== branch) {
      continue
    }
    if (environment && environment.length > 0 && d.environment !== environment) {
      continue
    }
    if (commitHash !== null && (!d.deployment_trigger.metadata || d.deployment_trigger.metadata.commit_hash !== commitHash)) {
      continue
    }
    core.info(`Preview URL: ${d.url} (${d.latest_stage.name} - ${d.latest_stage.status})`)
    return d
  }
  core.info(`No matching deployments found`)
  return []
}
