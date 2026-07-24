(() => {
  const target = window.__TEA_SITE_ENTRY__ || 'index.html';
  const cacheKey = 'tea-qinghe-site-v1';
  const zipKey = 'tea-qinghe-site.zip';
  const partCount = 25;
  const normalise = value => value.replace(/\\/g, '/').replace(/^\.\//, '');
  const assetMap = {};

  async function loadLibrary() {
    if (window.JSZip) return window.JSZip;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('无法加载页面解压组件，请检查网络后刷新。'));
      document.head.appendChild(script);
    });
    return window.JSZip;
  }

  async function readArchive() {
    const cache = await caches.open(cacheKey);
    const cached = await cache.match(zipKey);
    if (cached) return cached.blob();
    const parts = await Promise.all(Array.from({ length: partCount }, async (_, index) => {
      const suffix = String(index + 1).padStart(3, '0');
      const response = await fetch('.upload-parts/site.zip.part-' + suffix, { cache: 'force-cache' });
      if (!response.ok) throw new Error('网站资料包加载失败（第 ' + (index + 1) + ' 部分）。');
      return response.blob();
    }));
    const archive = new Blob(parts, { type: 'application/zip' });
    await cache.put(zipKey, new Response(archive));
    return archive;
  }

  function resolveAsset(value) {
    return assetMap[normalise(value)] || value;
  }

  async function boot() {
    const JSZip = await loadLibrary();
    const zip = await JSZip.loadAsync(await readArchive());
    const names = Object.keys(zip.files).filter(name => !zip.files[name].dir);
    await Promise.all(names.map(async name => {
      const path = normalise(name);
      if (/\.(html|css|js|ya?ml|md)$/i.test(path)) return;
      assetMap[path] = URL.createObjectURL(await zip.file(name).async('blob'));
    }));

    let css = await zip.file('styles.css').async('string');
    css = css.replace(/url\((["']?)([^\)"']+)\1\)/g, (_, quote, path) => 'url("' + resolveAsset(path) + '")');
    let html = await zip.file(target).async('string');
    html = html.replace(/<link[^>]*href=(["'])styles\.css\1[^>]*>/i, '');
    html = html.replace(/<script[^>]*src=(["'])script\.js\1[^>]*><\/script>/i, '');
    html = html.replace(/(src|href)=(["'])((?:\.\/)?assets\/[^"']+)\2/g, (_, attr, quote, path) => attr + '=' + quote + resolveAsset(path) + quote);
    const appScript = await zip.file('script.js').async('string');
    html = html.replace(/<\/head>/i, '<style id="tea-qinghe-inline-style">' + css + '</style></head>');
    html = html.replace(/<\/body>/i, '<script>' + appScript.replace(/<\/script/gi, '<\\/script') + '</script></body>');
    document.open();
    document.write(html);
    document.close();
  }

  boot().catch(error => {
    document.body.innerHTML = '<main style="font-family:system-ui,sans-serif;max-width:36rem;margin:18vh auto;padding:2rem;color:#214229"><h1>茶叙青禾</h1><p>页面暂时没有加载完成，请刷新后重试。</p><p style="color:#6b746d;font-size:.9rem">' + error.message + '</p></main>';
  });
})();