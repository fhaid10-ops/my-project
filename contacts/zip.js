(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.HotmailZip = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function readU16(view, offset) {
    return view.getUint16(offset, true);
  }

  function readU32(view, offset) {
    return view.getUint32(offset, true);
  }

  function decodeName(bytes) {
    if (typeof TextDecoder === "function") return new TextDecoder("utf-8").decode(bytes);
    return Buffer.from(bytes).toString("utf8");
  }

  function inflateRaw(bytes) {
    if (typeof Buffer !== "undefined") {
      return Promise.resolve(require("zlib").inflateRawSync(Buffer.from(bytes)));
    }
    if (typeof DecompressionStream === "function") {
      const stream = new DecompressionStream("deflate-raw");
      const blob = new Blob([bytes]);
      return new Response(blob.stream().pipeThrough(stream)).arrayBuffer().then(function (buf) {
        return new Uint8Array(buf);
      });
    }
    return Promise.reject(new Error("deflate-raw is not supported"));
  }

  function extractZip(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const files = [];
    let offset = 0;

    function nextFile() {
      if (offset + 30 > bytes.length) return Promise.resolve(files);
      if (readU32(view, offset) !== 0x04034b50) return Promise.resolve(files);

      const method = readU16(view, offset + 8);
      const compressedSize = readU32(view, offset + 18);
      const nameLen = readU16(view, offset + 26);
      const extraLen = readU16(view, offset + 28);
      const nameStart = offset + 30;
      const dataStart = nameStart + nameLen + extraLen;
      const name = decodeName(bytes.subarray(nameStart, nameStart + nameLen));
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      offset = dataStart + compressedSize;

      const done = function (content) {
        files.push({ name: name, content: content });
        return nextFile();
      };

      if (method === 0) return Promise.resolve(done(data));
      if (method === 8) return inflateRaw(data).then(done);
      return Promise.reject(new Error("unsupported zip method " + method + " for " + name));
    }

    return nextFile();
  }

  function decodeText(bytes) {
    if (typeof TextDecoder === "function") {
      return new TextDecoder("utf-8").decode(bytes);
    }
    return Buffer.from(bytes).toString("utf8");
  }

  function extractVcfText(buffer, filename) {
    const name = String(filename || "").toLowerCase();
    if (name.slice(-4) === ".vcf" || name.slice(-6) === ".vcard") {
      return Promise.resolve(decodeText(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)));
    }
    return extractZip(buffer).then(function (files) {
      const vcf = files.filter(function (file) {
        const n = file.name.toLowerCase();
        return n.slice(-4) === ".vcf" || n.slice(-6) === ".vcard";
      });
      if (!vcf.length) throw new Error("no vcf in zip");
      return vcf.map(function (file) { return decodeText(file.content); }).join("\n");
    });
  }

  return {
    extractZip: extractZip,
    extractVcfText: extractVcfText,
    decodeText: decodeText,
  };
});
