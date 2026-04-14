
async function listMirror() {
  try {
    const res = await fetch("https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/");
    const html = await res.text();
    console.log(html.substring(0, 500));
    
    const matches = html.match(/href="([^"]+)\/"/g);
    if (matches) {
      const folders = matches.map(m => m.match(/href="([^"]+)\/"/)![1]);
      console.log(`Total folders: ${folders.length}`);
      
      const targets = ["Gharbi", "Karkani", "Ghar", "Kark"];
      for (const target of targets) {
        const found = folders.filter(f => f.toLowerCase().includes(target.toLowerCase()));
        console.log(`\nMatches for ${target}:`);
        console.log(found.join(", "));
      }
    }
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
  }
}

listMirror();
