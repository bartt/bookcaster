class Api {
  static fetch(path: string): Promise<object> {
    return fetch(`/api/v1/${path}`, {
      headers: Api.headers,
    }).then(parseResponse);
  }

  static update(path: string, data: object): Promise<object> {
    return fetch(`/api/v1/${path}`, {
      headers: {
        ...Api.headers,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(data),
    }).then(parseResponse);
  }

  static delete(path: string, data: object): Promise<object> {
    return fetch(`/api/v1/${path}`, {
      headers: {
        ...Api.headers,
        'Content-Type': 'application/json',
      },
      method: 'DELETE',
      body: JSON.stringify(data),
    }).then(parseResponse);
  }

  private static headers = {
    Authorization: 'Basic Ym9vazpyZWFkZXI=',
  };
}

async function parseResponse(response: Response) {
  const result: string[] = [];

  const reader = response.body?.getReader();
  await reader
    ?.read()
    .then(async function processResponse({
      done,
      value,
    }): Promise<(() => undefined) | undefined> {
      if (done) {
        return;
      }

      // Convert the Uint8Array into text.
      result.push(new TextDecoder().decode(value));

      // Read some more, and call this function again
      return reader.read().then(processResponse);
    });
  return JSON.parse(result.join(''));
}

export { Api };
