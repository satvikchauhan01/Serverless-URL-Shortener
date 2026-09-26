// Link-preview fetchers, crawlers, uptime monitors and scripts. They follow short links
// all the time, and counting them would make every link look busier than it is.
const AUTOMATED_AGENT = new RegExp(
  [
    'bot',
    'crawl',
    'spider',
    'slurp',
    'preview',
    'facebookexternalhit',
    'whatsapp',
    'embedly',
    'iframely',
    'mastodon',
    'cardyb',
    'headless',
    'lighthouse',
    'curl',
    'wget',
    'python',
    'go-http-client',
    'okhttp',
    'axios',
    'node-fetch',
  ].join('|'),
  'i',
);

// Android tablets leave "Mobile" out of their user agent; Android phones include it.
const TABLET_AGENT = /ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/i;
const MOBILE_AGENT = /mobi|iphone|ipod|android|windows phone|blackberry|opera mini/i;

// The few coarse facts stored for a visit, or null when the visitor is not a person.
// Neither the IP address nor the user-agent string is kept.
export function describeVisit(request) {
  const userAgent = request.headers.get('User-Agent') ?? '';
  if (userAgent === '' || AUTOMATED_AGENT.test(userAgent)) return null;

  return {
    country: request.cf?.country ?? null,
    referrer: referrerHost(request.headers.get('Referer')),
    device: deviceType(userAgent),
  };
}

function deviceType(userAgent) {
  if (TABLET_AGENT.test(userAgent)) return 'tablet';
  if (MOBILE_AGENT.test(userAgent)) return 'mobile';
  return 'desktop';
}

// Only the host is kept, and "www." is dropped so www.example.com and example.com count
// as one source.
function referrerHost(referer) {
  const host = referer ? URL.parse(referer)?.hostname : null;
  return host ? host.replace(/^www\./, '') : null;
}
