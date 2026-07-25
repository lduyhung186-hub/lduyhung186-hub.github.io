Exit code: 0
Wall time: 0.8 seconds
Output:
(() => {
  const target = window.__TEA_SITE_ENTRY__ || 'index.html';
  const cacheKey = 'tea-qinghe-site-v2';
  const zipKey = 'tea-qinghe-site.zip';
  const partCount = 25;
  const decoder = new TextDecoder('utf-8');
  const assetMap = {};

  const normalise = value => value.replace(/\\/g, '/').replace(/^\.\//, '');
  const mimeType = path => ({
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif'
  })[(path.match(/\.[^.]+$/) || [''])[0].toLowerCase()] || 'application/octet-stream';

  async function readArchive() {
    const cache = await caches.open(cacheKey);
    const cached = await cache.match(zipKey);
    if (cached) return cached.arrayBuffer();
    const parts = await Promise.all(Array.from({ length: partCount }, async (_, index) => {
      const suffix = String(index + 1).padStart(3, '0');
      const response = await fetch('.upload-parts/site.zip.part-' + suffix, { cache: 'force-cache' });
      if (!response.ok) throw new Error('缃戠珯璧勬枡鍖呭姞杞藉け璐ワ紙绗?' + (index + 1) + ' 閮ㄥ垎锛夈€?);
      return response.arrayBuffer();
    }));
    const archive = new Blob(parts, { type: 'application/zip' });
    await cache.put(zipKey, new Response(archive));
    return archive.arrayBuffer();
  }

  function parseZip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let end = -1;
    for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index--) {
      if (view.getUint32(index, true) === 0x06054b50) { end = index; break; }
    }
    if (end < 0) throw new Error('缃戠珯璧勬枡鍖呮牸寮忓紓甯搞€?);
    const count = view.getUint16(end + 10, true);
    let cursor = view.getUint32(end + 16, true);
    const entries = new Map();
    for (let index = 0; index < count; index++) {
      if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('缃戠珯璧勬枡鍖呯洰褰曞紓甯搞€?);
      const method = view.getUint16(cursor + 10, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const name = normalise(decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength)));
      entries.set(name, { method, compressedSize, localOffset });
      cursor += 46 + nameLength + extraLength + commentLength;
    }
    return { bytes, view, entries };
  }

  async function unpack(zip, path) {
    const entry = zip.entries.get(normalise(path));
    if (!entry) throw new Error('缂哄皯椤甸潰鏂囦欢锛? + path);
    const start = entry.localOffset;
    if (zip.view.getUint32(start, true) !== 0x04034b50) throw new Error('缃戠珯璧勬枡鍖呭唴瀹瑰紓甯搞€?);
    const nameLength = zip.view.getUint16(start + 26, true);
    const extraLength = zip.view.getUint16(start + 28, true);
    const packed = zip.bytes.slice(start + 30 + nameLength + extraLength, start + 30 + nameLength + extraLength + entry.compressedSize);
    if (entry.method === 0) return packed;
    if (entry.method !== 8 || !window.DecompressionStream) throw new Error('褰撳墠娴忚鍣ㄧ増鏈棤娉曞睍寮€缃戠珯璧勬枡鍖咃紝璇蜂娇鐢?Chrome 鎴?Edge 鎵撳紑銆?);
    const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function resolveAsset(value) { return assetMap[normalise(value)] || value; }

  async function boot() {
    const zip = parseZip(await readArchive());
    await Promise.all(Array.from(zip.entries.keys()).map(async path => {
      if (/\.(html|css|js|ya?ml|md)$/i.test(path) || path.endsWith('/')) return;
      const data = await unpack(zip, path);
      assetMap[path] = URL.createObjectURL(new Blob([data], { type: mimeType(path) }));
    }));
    let css = decoder.decode(await unpack(zip, 'styles.css'));
    css = css.replace(/url\((["']?)([^\)"']+)\1\)/g, (_, quote, path) => 'url("' + resolveAsset(path) + '")');
    let html = decoder.decode(await unpack(zip, target));
    html = html.replace(/<link[^>]*href=(["'])styles\.css\1[^>]*>/i, '');
    html = html.replace(/<script[^>]*src=(["'])script\.js\1[^>]*><\/script>/i, '');
    html = html.replace(/(src|href)=(["'])((?:\.\/)?assets\/[^"']+)\2/g, (_, attr, quote, path) => attr + '=' + quote + resolveAsset(path) + quote);
    const appScript = decoder.decode(await unpack(zip, 'script.js'));
    html = html.replace(/<\/head>/i, '<style id="tea-qinghe-inline-style">' + css + '</style></head>');
    html = html.replace(/<\/body>/i, '<script>' + appScript.replace(/<\/script/gi, '<\\/script') + '</script></body>');
    document.open();
    document.write(html);
    document.close();
  }

  boot().catch(error => {
    document.body.innerHTML = '<main style="font-family:system-ui,sans-serif;max-width:36rem;margin:18vh auto;padding:2rem;color:#214229"><h1>鑼跺彊闈掔</h1><p>椤甸潰鏆傛椂娌℃湁鍔犺浇瀹屾垚锛岃鍒锋柊鍚庨噸璇曘€?/p><p style="color:#6b746d;font-size:.9rem">' + error.message + '</p></main>';
  });
})();

