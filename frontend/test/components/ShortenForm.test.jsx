import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShortenForm } from '../../src/components/ShortenForm.jsx';
import { apiError, mockApi } from '../helpers.js';

const CREATED = {
  code: 'x7Kp2Qa',
  shortUrl: 'https://short.test/x7Kp2Qa',
  longUrl: 'https://example.com/a/long/path',
  expiresAt: null,
  expired: false,
  clickCount: 0,
  createdAt: '2026-09-25T12:00:00.000Z',
};

function setup(props) {
  const onCreated = vi.fn();
  render(<ShortenForm signedIn={false} onCreated={onCreated} {...props} />);
  return { user: userEvent.setup(), onCreated, urlField: screen.getByLabelText('Long URL') };
}

describe('ShortenForm as a guest', () => {
  it('sends the cleaned-up URL and reports the new link', async () => {
    const api = mockApi({ 'POST /api/links': () => ({ status: 201, body: CREATED }) });
    const { user, onCreated, urlField } = setup();

    await user.type(urlField, 'example.com/a/long/path{Enter}');

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED));
    expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({
      url: 'https://example.com/a/long/path',
    });
  });

  it('explains what is wrong with a URL without calling the API', async () => {
    const api = mockApi({});
    const { user, urlField } = setup();

    await user.type(urlField, 'ftp://files.example.com');
    await user.tab();

    expect(await screen.findByText('Only http and https links can be shortened.')).toBeVisible();
    expect(urlField).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('button', { name: 'Shorten' }));
    expect(api).not.toHaveBeenCalled();
  });

  it('shows where a valid link will go while typing', async () => {
    const { user, urlField } = setup();

    await user.type(urlField, 'example.com/docs');

    expect(await screen.findByText('Will send people to example.com/docs')).toBeVisible();
  });

  it('puts an API error on the field it is about', async () => {
    mockApi({
      'POST /api/links': () => apiError(400, 'invalid_url', 'That is already a short link.'),
    });
    const { user, urlField } = setup();

    await user.type(urlField, 'example.com{Enter}');

    expect(await screen.findByText('That is already a short link.')).toBeVisible();
    expect(urlField).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows other failures above the button', async () => {
    mockApi({
      'POST /api/links': () =>
        apiError(429, 'rate_limited', 'Too many requests. Try again in a minute.'),
    });
    const { user, urlField } = setup();

    await user.type(urlField, 'example.com{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests.');
  });

  it('offers sign-in instead of the alias and expiry options', () => {
    setup();

    expect(screen.queryByLabelText(/Alias/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in with GitHub' })).toBeVisible();
  });
});

describe('ShortenForm when signed in', () => {
  it('checks the alias while typing and says when it is taken', async () => {
    const checks = [];
    mockApi({
      'GET /api/links/availability': ({ url }) => {
        checks.push(url.searchParams.get('alias'));
        return { body: { alias: 'launch', available: false, reason: 'taken' } };
      },
    });
    const { user } = setup({ signedIn: true });

    await user.type(screen.getByLabelText(/Alias/), 'launch');

    expect(await screen.findByText('Someone already uses this one.')).toBeVisible();
    // Debounced: one request for the finished word, not one per keystroke.
    expect(checks).toEqual(['launch']);
  });

  it('sends the alias and the chosen expiry', async () => {
    const api = mockApi({
      'GET /api/links/availability': () => ({
        body: { alias: 'launch', available: true, reason: null },
      }),
      'POST /api/links': () => ({ status: 201, body: { ...CREATED, code: 'launch' } }),
    });
    const { user, onCreated, urlField } = setup({ signedIn: true });

    await user.type(urlField, 'example.com');
    await user.type(screen.getByLabelText(/Alias/), 'launch');
    await user.click(screen.getByRole('radio', { name: '7 days' }));
    await user.click(screen.getByRole('button', { name: 'Shorten' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const post = api.mock.calls.find(([, init]) => init?.method === 'POST');
    const body = JSON.parse(post[1].body);
    expect(body).toMatchObject({ url: 'https://example.com/', alias: 'launch' });
    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(Date.parse(body.expiresAt) - weekFromNow)).toBeLessThan(60_000);
  });

  it('asks for a date when "Pick a date" is chosen without one', async () => {
    const api = mockApi({});
    const { user, urlField } = setup({ signedIn: true });

    await user.type(urlField, 'example.com');
    await user.click(screen.getByRole('radio', { name: 'Pick a date' }));
    await user.click(screen.getByRole('button', { name: 'Shorten' }));

    expect(await screen.findByText('Pick the last day the link should work.')).toBeVisible();
    expect(api).not.toHaveBeenCalled();
  });
});
