
async function fetchReciters() {
  try {
    const res = await fetch("https://mp3quran.net/api/v3/reciters?language=ar");
    const data = await res.json();
    const reciters = data.reciters;
    
    console.log(`Total reciters: ${reciters.length}`);
    
    const targets = ["Ghar", "Kark"];
    
    for (const target of targets) {
      const found = reciters.filter((r: any) => 
        r.name.includes(target) || 
        r.moshaf.some((m: any) => m.server.toLowerCase().includes(target.toLowerCase()))
      );
      console.log(`\nResults for ${target}:`);
      found.forEach((r: any) => {
        console.log(`Name: ${r.name}`);
        r.moshaf.forEach((m: any) => {
          console.log(`  Moshaf: ${m.name}`);
          console.log(`  Server: ${m.server}`);
        });
      });
    }
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
  }
}

fetchReciters();
