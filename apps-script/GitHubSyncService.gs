function triggerGitHubContentSync() {
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty('GITHUB_TOKEN');

  if (!token) {
    throw new Error('GITHUB_TOKEN_NOT_CONFIGURED');
  }

  const owner = 'Akaineko23';
  const repository = 'Game';
  const workflow = 'sync-local-content.yml';

  const url =
    'https://api.github.com/repos/' +
    encodeURIComponent(owner) +
    '/' +
    encodeURIComponent(repository) +
    '/actions/workflows/' +
    encodeURIComponent(workflow) +
    '/dispatches';

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    contentType: 'application/json',
    payload: JSON.stringify({
      ref: 'main',
    }),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status !== 204) {
    console.error('GitHub response: ' + status + ' ' + body);
    throw new Error('GITHUB_WORKFLOW_DISPATCH_FAILED');
  }

  console.log('GitHub content sync workflow started successfully.');
}
