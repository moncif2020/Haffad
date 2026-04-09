import fs from 'fs';
import https from 'https';

https.get('https://api.alquran.cloud/v1/quran/quran-uthmani', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const json = JSON.parse(data);
    const surahs = json.data.surahs.map((s: any) => ({
      number: s.number,
      name: s.name,
      numberOfAyahs: s.ayahs.length,
      ayahPages: s.ayahs.map((a: any) => a.page)
    }));
    fs.mkdirSync('src/data', { recursive: true });
    fs.writeFileSync('src/data/quran-metadata.json', JSON.stringify(surahs));
    console.log('Metadata saved successfully.');
  });
});
