onmessage = async (e: MessageEvent<File>) => {
  postMessage(
    [...new Uint8Array(await e.data.arrayBuffer())]
      .map((x) => x.toString(16).toUpperCase().padStart(2, "0"))
      .join("")
  );
};
