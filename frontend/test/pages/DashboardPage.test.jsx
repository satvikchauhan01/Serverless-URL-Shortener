import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../src/components/ToastProvider.jsx';
import { SessionContext } from '../../src/hooks/useSession.js';
import { DashboardPage } from '../../src/pages/DashboardPage.jsx';
import { apiError, mockApi } from '../helpers.js';

function link(code, clickCount = 0) {
  return {
    code,
    shortUrl: `https://short.test/${code}`,
    longUrl: `https://example.com/${code}`,
    expiresAt: null,
    expired: false,
    clickCount,
    createdAt: new Date().toISOString(),
  };
}

const session = {
  status: 'signed-in',
  user: { login: 'octocat', totals: { links: 2, clicks: 7 } },
  refresh: vi.fn(),
};

function renderDashboard() {
  render(
    <SessionContext.Provider value={session}>
      <ToastProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ToastProvider>
    </SessionContext.Provider>,
  );
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DashboardPage', () => {
  it('lists the links with their totals', async () => {
    mockApi({
      'GET /api/links': () => ({
        body: { links: [link('resume', 7), link('talk')], nextCursor: null },
      }),
    });

    renderDashboard();

    expect(await screen.findByRole('link', { name: 'resume' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'talk' })).toBeVisible();
    expect(screen.getByText('Clicks, all time').nextSibling).toHaveTextContent('7');
  });

  it('shows an empty state with a way to make the first link', async () => {
    mockApi({ 'GET /api/links': () => ({ body: { links: [], nextCursor: null } }) });

    renderDashboard();

    expect(await screen.findByText(/No links yet/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Shorten a link' })).toHaveAttribute('href', '/');
  });

  it('offers a retry when the list fails to load', async () => {
    let calls = 0;
    mockApi({
      'GET /api/links': () =>
        ++calls === 1
          ? apiError(500, 'internal', 'Something went wrong on our side.')
          : { body: { links: [link('resume')], nextCursor: null } },
    });
    const user = renderDashboard();

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'resume' })).toBeVisible();
  });

  describe('delete with undo', () => {
    function setup() {
      const deletes = [];
      mockApi({
        'GET /api/links': () => ({
          body: { links: [link('resume', 4), link('talk', 3)], nextCursor: null },
        }),
        'DELETE /api/links/talk': () => {
          deletes.push('talk');
          return { status: 204 };
        },
      });
      return { user: renderDashboard(), deletes };
    }

    it('hides the row at once and deletes nothing if Undo is pressed', async () => {
      const { user, deletes } = setup();

      await user.click(await screen.findByRole('button', { name: 'Delete talk' }));
      expect(screen.queryByRole('link', { name: 'talk' })).not.toBeInTheDocument();

      const toast = screen.getByText('Deleted talk.').parentElement;
      await user.click(within(toast).getByRole('button', { name: 'Undo' }));
      await act(() => vi.advanceTimersByTimeAsync(6000));

      expect(screen.getByRole('link', { name: 'talk' })).toBeVisible();
      expect(deletes).toEqual([]);
    });

    it('sends the delete only after the 5 seconds run out', async () => {
      const { user, deletes } = setup();

      await user.click(await screen.findByRole('button', { name: 'Delete talk' }));
      await act(() => vi.advanceTimersByTimeAsync(4900));
      expect(deletes).toEqual([]);

      await act(() => vi.advanceTimersByTimeAsync(200));
      expect(deletes).toEqual(['talk']);
      expect(screen.queryByText('Deleted talk.')).not.toBeInTheDocument();
      expect(session.refresh).toHaveBeenCalled();
      expect(screen.queryByRole('link', { name: 'talk' })).not.toBeInTheDocument();
    });

    it('takes the link out of the totals until Undo is pressed', async () => {
      const { user } = setup();
      const tile = (label) => screen.getByText(label).nextSibling;

      await user.click(await screen.findByRole('button', { name: 'Delete talk' }));
      expect(tile('Links')).toHaveTextContent('1');
      expect(tile('Clicks, all time')).toHaveTextContent('4');

      const toast = screen.getByText('Deleted talk.').parentElement;
      await user.click(within(toast).getByRole('button', { name: 'Undo' }));
      expect(tile('Links')).toHaveTextContent('2');
      expect(tile('Clicks, all time')).toHaveTextContent('7');
    });
  });
});
