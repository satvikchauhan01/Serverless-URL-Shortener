import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';
import { saveFile } from '../lib/download.js';
import { Button } from './Button.jsx';
import { DownloadIcon } from './Icons.jsx';
import styles from './QrCode.module.css';

const PNG_SIZE = 1024;

// Always dark modules on white, whatever the theme: scanners are most reliable that way.
export function QrCode({ value, code, size = 168 }) {
  const holder = useRef(null);

  function svgMarkup() {
    const svg = holder.current.querySelector('svg').cloneNode(true);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(svg);
  }

  function downloadSvg() {
    saveFile(new Blob([svgMarkup()], { type: 'image/svg+xml' }), `hop-${code}.svg`);
  }

  // The SVG is drawn onto a large canvas so the PNG stays sharp when printed.
  function downloadPng() {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = PNG_SIZE;
      canvas.height = PNG_SIZE;
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0, PNG_SIZE, PNG_SIZE);
      canvas.toBlob((blob) => saveFile(blob, `hop-${code}.png`), 'image/png');
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup())}`;
  }

  return (
    <figure className={styles.figure}>
      <div className={styles.tile} ref={holder}>
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#1d1c1a"
          title={`QR code for ${value}`}
        />
      </div>
      <figcaption className={styles.actions}>
        <Button size="sm" onClick={downloadPng}>
          <DownloadIcon size={16} />
          PNG
        </Button>
        <Button size="sm" onClick={downloadSvg}>
          <DownloadIcon size={16} />
          SVG
        </Button>
      </figcaption>
    </figure>
  );
}
