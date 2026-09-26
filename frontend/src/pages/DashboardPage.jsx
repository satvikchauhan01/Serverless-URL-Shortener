import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { deleteLink, listLinks } from '../api/endpoints.js';
import { Button } from '../components/Button.jsx';
import { EditLinkDialog } from '../components/EditLinkDialog.jsx';
import { SearchIcon } from '../components/Icons.jsx';
import { LinkRow } from '../components/LinkRow.jsx';
import { QrDialog } from '../components/QrDialog.jsx';
import { StatTile } from '../components/StatTile.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useSession } from '../hooks/useSession.js';
import { useToast } from '../hooks/useToast.js';
import { formatCount } from '../lib/format.js';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const session = useSession();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [reloads, setReloads] = useState(0);
  // The page as last loaded; `search` records which query it answers.
  const [result, setResult] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Links deleted here whose Undo toast is still up, by code.
  const [pending, setPending] = useState(() => new Map());
  const [qrLink, setQrLink] = useState(null);
  const [editing, setEditing] = useState(null);
  const { refresh } = session;

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let current = true;
    listLinks({ search }).then(
      (page) => current && setResult({ search, ...page }),
      (error) => current && setResult({ search, error }),
    );
    return () => {
      current = false;
    };
  }, [search, reloads]);

  const loading = !result || result.search !== search;
  const links = result?.links?.filter((link) => !pending.has(link.code)) ?? [];

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await listLinks({ search, cursor: result.nextCursor });
      setResult((previous) => ({ ...page, search, links: [...previous.links, ...page.links] }));
    } catch (err) {
      showToast({ message: `Couldn't load more links. ${err.message}` });
    } finally {
      setLoadingMore(false);
    }
  }

  function replaceLink(updated) {
    setResult((previous) => ({
      ...previous,
      links: previous.links.map((link) => (link.code === updated.code ? updated : link)),
    }));
  }

  // The row disappears at once, but the delete is only sent once the Undo toast has
  // run out, so undoing never needs to recreate anything.
  function remove(link) {
    const setDeleting = (deleting) =>
      setPending((current) => {
        const next = new Map(current);
        if (deleting) next.set(link.code, link);
        else next.delete(link.code);
        return next;
      });

    setDeleting(true);
    showToast({
      message: `Deleted ${link.code}.`,
      actionLabel: 'Undo',
      onAction: () => setDeleting(false),
      onExpire: () =>
        deleteLink(link.code)
          // The link only leaves `pending` once the new totals are in, so the tiles
          // never count it again in between.
          .then(refresh)
          .then(
            () => {
              setResult((previous) => ({
                ...previous,
                links: previous.links?.filter((item) => item.code !== link.code),
              }));
              setDeleting(false);
            },
            (err) => {
              setDeleting(false);
              showToast({ message: `Couldn't delete ${link.code}. ${err.message}` });
            },
          ),
    });
  }

  let listSection;
  if (result?.error && !loading) {
    listSection = (
      <div className={styles.state} role="alert">
        <p>Your links couldn't be loaded. {result.error.message}</p>
        <Button onClick={() => setReloads((count) => count + 1)}>Try again</Button>
      </div>
    );
  } else if (!result) {
    listSection = (
      <ul className={styles.list} aria-busy="true" aria-label="Loading your links">
        {[0, 1, 2].map((key) => (
          <li key={key} className={styles.skeleton} />
        ))}
      </ul>
    );
  } else if (links.length === 0 && !loading) {
    listSection = (
      <div className={styles.state}>
        {search ? (
          <p>Nothing matches “{search}”.</p>
        ) : (
          <>
            <p>No links yet. Your first one is a paste away.</p>
            <Button as={Link} to="/" variant="primary">
              Shorten a link
            </Button>
          </>
        )}
      </div>
    );
  } else {
    // A new search keeps the old list on screen, dimmed, until the answer arrives.
    listSection = (
      <>
        <ul className={styles.list} data-stale={loading || undefined} aria-busy={loading}>
          {links.map((link) => (
            <LinkRow
              key={link.code}
              link={link}
              onShowQr={setQrLink}
              onEdit={setEditing}
              onDelete={remove}
            />
          ))}
        </ul>
        {result.nextCursor && !loading && (
          <Button
            className={styles.more}
            onClick={loadMore}
            busy={loadingMore}
            disabled={loadingMore}
          >
            Load more
          </Button>
        )}
      </>
    );
  }

  // Links waiting on their Undo toast are already off the list, so they are left out of
  // the totals as well.
  const totals = session.user?.totals;
  let pendingClicks = 0;
  for (const link of pending.values()) pendingClicks += link.clickCount;

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Your links</h1>
        <Button as={Link} to="/" variant="primary">
          New short link
        </Button>
      </div>

      <div className={styles.tiles}>
        <StatTile label="Links" value={totals ? formatCount(totals.links - pending.size) : '–'} />
        <StatTile
          label="Clicks, all time"
          value={totals ? formatCount(totals.clicks - pendingClicks) : '–'}
        />
      </div>

      <div className={styles.search}>
        <SearchIcon />
        <label htmlFor="link-search" className="visually-hidden">
          Search your links
        </label>
        <input
          id="link-search"
          type="search"
          placeholder="Search by code or destination"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {listSection}

      {qrLink && <QrDialog link={qrLink} onClose={() => setQrLink(null)} />}
      {editing && (
        <EditLinkDialog
          link={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replaceLink(updated);
            setEditing(null);
            showToast({ message: `Saved ${updated.code}.` });
          }}
        />
      )}
    </div>
  );
}
