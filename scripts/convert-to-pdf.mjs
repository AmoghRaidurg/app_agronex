import { mdToPdf } from 'md-to-pdf';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const pdf = await mdToPdf(
  { path: join(root, 'AGROELEVATE_VIVA_COMPLETE_GUIDE.md') },
  {
    dest: join(root, 'AGROELEVATE_VIVA_COMPLETE_GUIDE.pdf'),
    css: join(__dirname, 'pdf-style.css'),
    pdf_options: {
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
    },
    launch_options: { args: ['--no-sandbox'] },
  }
);

if (pdf) {
  console.log('PDF created:', join(root, 'AGROELEVATE_VIVA_COMPLETE_GUIDE.pdf'));
  console.log('Pages:', pdf.content?.length ? 'generated' : 'ok');
} else {
  console.error('PDF generation failed');
  process.exit(1);
}
