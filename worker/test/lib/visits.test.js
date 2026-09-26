import { describe, expect, it } from 'vitest';
import { describeVisit } from '../../src/lib/visits.js';

const BROWSERS = {
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

function visit(headers, cf) {
  return describeVisit(new Request('https://short.test/abc1234', { headers, cf }));
}

describe('describeVisit', () => {
  it('keeps the country, the referrer host and the device type', () => {
    const headers = {
      'User-Agent': BROWSERS.desktop,
      Referer: 'https://www.news.ycombinator.com/item?id=1',
    };

    expect(visit(headers, { country: 'IN' })).toEqual({
      country: 'IN',
      referrer: 'news.ycombinator.com',
      device: 'desktop',
    });
  });

  it.each([
    [BROWSERS.iphone, 'mobile'],
    [BROWSERS.androidPhone, 'mobile'],
    [BROWSERS.ipad, 'tablet'],
    [BROWSERS.androidTablet, 'tablet'],
  ])('tells the device type from %s', (userAgent, device) => {
    expect(visit({ 'User-Agent': userAgent }).device).toBe(device);
  });

  it('leaves out what the request does not say', () => {
    expect(visit({ 'User-Agent': BROWSERS.desktop })).toEqual({
      country: null,
      referrer: null,
      device: 'desktop',
    });
  });

  it('ignores a referrer that is not a URL', () => {
    expect(visit({ 'User-Agent': BROWSERS.desktop, Referer: 'not a url' }).referrer).toBeNull();
  });

  it.each([
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'WhatsApp/2.24.20.80 A',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'TelegramBot (like TwitterBot)',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36',
    'curl/8.9.1',
    'python-requests/2.32.3',
    '',
  ])('does not count %j as a visitor', (userAgent) => {
    expect(visit({ 'User-Agent': userAgent })).toBeNull();
  });

  it('does not count a request without a user agent', () => {
    expect(visit({})).toBeNull();
  });
});
