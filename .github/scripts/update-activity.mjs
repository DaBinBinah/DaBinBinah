import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const USERNAME = 'DaBinBinah'
const MAX_EVENTS = 5

function formatEvent(event) {
  const repoName = event.repo?.name || 'repo'
  const repoUrl = `https://github.com/${repoName}`
  
  switch (event.type) {
    case 'PushEvent': {
      const commitsCount = event.payload?.commits?.length || 1
      const commitMsg = event.payload?.commits?.[0]?.message?.split('\n')[0] || 'code update'
      return `- 🔨 Pushed ${commitsCount} commit(s) to [${repoName}](${repoUrl}): \`${commitMsg.slice(0, 50)}\``
    }
    case 'CreateEvent': {
      const refType = event.payload?.ref_type || 'repository'
      return `- 🌱 Created ${refType} [${repoName}](${repoUrl})`
    }
    case 'WatchEvent':
    case 'StarEvent': {
      return `- ⭐ Starred repository [${repoName}](${repoUrl})`
    }
    case 'ForkEvent': {
      return `- 🍴 Forked repository [${repoName}](${repoUrl})`
    }
    case 'IssuesEvent': {
      const action = event.payload?.action || 'interacted with'
      return `- 📌 ${action} issue in [${repoName}](${repoUrl})`
    }
    case 'PullRequestEvent': {
      const action = event.payload?.action || 'worked on'
      return `- 🔀 ${action} pull request in [${repoName}](${repoUrl})`
    }
    default:
      return `- ⚡ Updated activity on [${repoName}](${repoUrl})`
  }
}

async function fetchEvents(token) {
  const headers = {
    'User-Agent': 'DaBinBinah-Activity-Updater',
    'Accept': 'application/vnd.github.v3+json'
  }
  if (token) {
    headers['Authorization'] = `token ${token}`
  }
  
  const res = await fetch(`https://api.github.com/users/${USERNAME}/events/public?per_page=15`, { headers })
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.status} ${res.statusText}`)
  }
  const events = await res.json()
  return events
}

async function main() {
  const workspace = process.env.GITHUB_WORKSPACE || path.resolve(process.cwd())
  const readmePath = path.join(workspace, 'README.md')
  
  let content = ''
  try {
    content = await readFile(readmePath, 'utf8')
  } catch (err) {
    console.error('Failed to read README.md:', err.message)
    return
  }

  const startMarker = '<!--RECENT_ACTIVITY:start-->'
  const endMarker = '<!--RECENT_ACTIVITY:end-->'
  
  if (!content.includes(startMarker) || !content.includes(endMarker)) {
    console.log('Markers for recent activity not found in README.md. Skipping update.')
    return
  }

  let activityLines = []
  try {
    const events = await fetchEvents(process.env.GITHUB_TOKEN)
    activityLines = events
      .filter(e => e.type !== 'DeleteEvent')
      .slice(0, MAX_EVENTS)
      .map(formatEvent)
  } catch (err) {
    console.warn('Could not fetch latest events from GitHub API:', err.message)
  }

  if (activityLines.length === 0) {
    activityLines = [
      `- 🚀 持续迭代 [DaBinBinah/dingjia](https://github.com/DaBinBinah/dingjia): 优化投资监控与多市场行情追踪`,
      `- 🧩 推进「同行有约」微信小程序业务模块与 CloudBase 后台架构`,
      `- 🛠️ 探索 Claude / Codex / DeepSeek 等 AI 编程工具与自动化脚本实践`,
      `- 🏢 持续沉淀企业数字化、ERP 业务流程梳理与系统落地经验`
    ]
  }

  const replacement = `${startMarker}\n${activityLines.join('\n')}\n${endMarker}`
  const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`)
  const updatedContent = content.replace(regex, replacement)

  await writeFile(readmePath, updatedContent, 'utf8')
  console.log('Successfully updated recent activity in README.md!')
}

await main()
