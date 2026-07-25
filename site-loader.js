(() => {
  const target = window.__TEA_SITE_ENTRY__ || 'index.html';
  const cacheKey = 'tea-qinghe-site-v3';
  const zipKey = 'tea-qinghe-site.zip';
  const partCount = 25;
  const decoder = new TextDecoder('utf-8');
  const assetMap = {};
  const rawBase = 'https://raw.githubusercontent.com/lduyhung186-hub/lduyhung186-hub.github.io/main/.upload-parts/';

  const normalise = value => value.replace(/\\/g, '/').replace(/^\.\//, '');
  const mimeType = path => ({ '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.gif':'image/gif' })[(path.match(/\.[^.]+$/)||[''])[0].toLowerCase()] || 'application/octet-stream';

  async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(url, { cache: 'force-cache', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.arrayBuffer();
    } finally { clearTimeout(timer); }
  }

  async function readPart(suffix) {
    const file = 'site.zip.part-' + suffix;
    const sources = ['.upload-parts/' + file, rawBase + file];
    let error;
    for (const source of sources) {
      try { return await fetchWithTimeout(source); } catch (caught) { error = caught; }
    }
    throw new Error('第 ' + Number(suffix) + ' 个资料文件未能加载，请检查网络后重试。');
  }

  async function readArchive() {
    const cache = await caches.open(cacheKey);
    const cached = await cache.match(zipKey);
    if (cached) return cached.arrayBuffer();
    const parts = await Promise.all(Array.from({ length: partCount }, (_, index) => readPart(String(index + 1).padStart(3, '0'))));
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
    if (end < 0) throw new Error('网站资料包格式异常。');
    const count = view.getUint16(end + 10, true);
    let cursor = view.getUint32(end + 16, true);
    const entries = new Map();
    for (let index = 0; index < count; index++) {
      if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('网站资料包目录异常。');
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
    if (!entry) throw new Error('缺少页面文件：' + path);
    const start = entry.localOffset;
    if (zip.view.getUint32(start, true) !== 0x04034b50) throw new Error('网站资料包内容异常。');
    const nameLength = zip.view.getUint16(start + 26, true);
    const extraLength = zip.view.getUint16(start + 28, true);
    const dataStart = start + 30 + nameLength + extraLength;
    const packed = zip.bytes.slice(dataStart, dataStart + entry.compressedSize);
    if (entry.method === 0) return packed;
    if (entry.method !== 8 || !window.DecompressionStream) throw new Error('当前浏览器不支持展开资料包，请使用最新版 Chrome 或 Edge 打开。');
    const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  const resolveAsset = value => assetMap[normalise(value)] || value;

  async function boot() {
    const zip = parseZip(await readArchive());
    await Promise.all(Array.from(zip.entries.keys()).map(async path => {
      if (/\.(html|css|js|ya?ml|md)$/i.test(path) || path.endsWith('/')) return;
      assetMap[path] = URL.createObjectURL(new Blob([await unpack(zip, path)], { type: mimeType(path) }));
    }));
    let css = decoder.decode(await unpack(zip, 'styles.css'));
    css = css.replace(/url\((["']?)([^\)"']+)\1\)/g, (_, quote, path) => 'url("' + resolveAsset(path) + '")');
    let html = decoder.decode(await unpack(zip, target));
    html = html.replace(/<link[^>]*href=(["'])styles\.css\1[^>]*>/i, '');
    html = html.replace(/<script[^>]*src=(["'])script\.js\1[^>]*><\/script>/i, '');
    html = html.replace(/(src|href)=(["'])((?:\.\/)?assets\/[^"']+)\2/g, (_, attr, quote, path) => attr + '=' + quote + resolveAsset(path) + quote);
    const appScript = decoder.decode(await unpack(zip, 'script.js'));
    html = html.replace(/<\/head>/i, '<style>' + css + '</style></head>');
    html = html.replace(/<\/body>/i, '<script>' + appScript.replace(/<\/script/gi, '<\\/script') + '</script></body>');
    document.open(); document.write(html); document.close();
  }

  boot().catch(error => {
    document.body.innerHTML = '<main style="font-family:system-ui,sans-serif;max-width:36rem;margin:18vh auto;padding:2rem;color:#214229"><h1>茶叙青禾</h1><p>页面没有加载完成，请刷新后重试。</p><p style="color:#6b746d;font-size:.9rem">' + error.message + '</p></main>';
  });
})();