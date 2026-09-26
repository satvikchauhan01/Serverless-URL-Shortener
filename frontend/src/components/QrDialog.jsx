import { Dialog } from './Dialog.jsx';
import { QrCode } from './QrCode.jsx';
import styles from './QrDialog.module.css';
import { ShortUrl } from './ShortUrl.jsx';

export function QrDialog({ link, onClose }) {
  return (
    <Dialog title="QR code" onClose={onClose}>
      <p className={styles.url}>
        <ShortUrl link={link} />
      </p>
      <QrCode value={link.shortUrl} code={link.code} size={240} />
    </Dialog>
  );
}
