export const digestMessage = async (message: string): Promise<string> => {
  const messageUint8 = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-1", messageUint8);
  const hashArray = Array.from(new Uint8Array(hash));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex;
};
