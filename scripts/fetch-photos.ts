import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'public', 'photos');
fs.mkdirSync(dir, { recursive: true });

const PHOTO_URLS: Record<string, string> = {
  'pothole-1.jpg': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=700&q=80',
  'pothole-2.jpg': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=700&q=80',
  'pothole-3.jpg': 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=700&q=80',
  'pothole-4.jpg': 'https://images.unsplash.com/photo-1541888946425-d09bb18086f6?auto=format&fit=crop&w=700&q=80',
  'waste-1.jpg': 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=700&q=80',
  'waste-2.jpg': 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=700&q=80',
  'waste-3.jpg': 'https://images.unsplash.com/photo-1526951521990-620dc14c214b?auto=format&fit=crop&w=700&q=80',
  'lighting-1.jpg': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=700&q=80',
  'lighting-2.jpg': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=700&q=80',
  'lighting-3.jpg': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=700&q=80',
  'sidewalk-1.jpg': 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=700&q=80',
  'sidewalk-2.jpg': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=80',
  'sidewalk-3.jpg': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=700&q=80',
};

async function main() {
  for (const [name, url] of Object.entries(PHOTO_URLS)) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(path.join(dir, name), buf);
        console.log(`Downloaded ${name} (${buf.length} bytes)`);
      } else {
        console.log(`HTTP ${res.status} for ${name}`);
      }
    } catch (err) {
      console.error(`Failed ${name}:`, err);
    }
  }
}

main();
