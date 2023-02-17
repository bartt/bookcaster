class Api {
  static fetch(path: string): Promise<object> {
    const result: string[] = [];

    return fetch(`/api/v1/${path}`, {
      headers: Api.headers,
    })
      .then((response) => response.body)
      .then((body) => body?.getReader())
      .then(async (reader) => {
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
        return result;
      })
      .then((result) => {
        return JSON.parse(result.join(''));
      });
  }

  private static headers = {
    Authorization: 'Basic Ym9vazpyZWFkZXI=',
  };
}

export { Api };
