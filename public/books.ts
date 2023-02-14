let result: string[] = [];
fetch('/api/v1/books', {
  headers: {
    Authorization: 'Basic Ym9vazpyZWFkZXI='
  }
}).then((response) => response.body)
  .then((body) => body?.getReader())
  .then(async (reader) => {
    await reader?.read().then(async function processResponse({ done, value }): Promise<Function|void> {
      if (done) {
        console.log("Response complete")
        return
      }

      // Convert the Uint8Array into text.
      result.push(new TextDecoder().decode(value));

      // Read some more, and call this function again
      return reader.read().then(processResponse);
    })
    return result
  })
  .then((result) => {
    const json = JSON.parse(result.join(''))
    const pre = document.createElement('pre')
    pre.textContent = JSON.stringify(json, null, 2)
    document.body.append(pre)
  })
