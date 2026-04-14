
async function fetchEditions() {
  try {
    const res = await fetch("https://api.alquran.cloud/v1/edition?format=audio&language=ar&type=versebyverse");
    const data = await res.json();
    const editions = data.data;
    
    console.log("All identifiers from islamic.network:");
    editions.forEach((e: any) => console.log(e.identifier));
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
  }
}

fetchEditions();
