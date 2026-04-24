
async function searchReciters() {
  try {
    const response = await fetch('https://mp3quran.net/api/v3/reciters?language=ar');
    const data: any = await response.json();
    const reciters = data.reciters;
    
    const keywords = ['younes', 'aswilis', 'afrad', 'ifrad', 'rashid'];
    
    const results = reciters.filter((r: any) => {
      return r.name.includes('يونس') || r.name.includes('رشيد') || r.moshaf.some((m: any) => keywords.some(k => m.server.includes(k)));
    });
    
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(error);
  }
}

searchReciters();
