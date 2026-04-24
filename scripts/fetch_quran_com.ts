
async function fetchQuranCom() {
  try {
    const res = await fetch("https://api.quran.com/api/v4/resources/recitations");
    const data = await res.json();
    const recitations = data.recitations;
    
    console.log("All reciter names from quran.com:");
    console.log(recitations.map((r: any) => r.reciter_name).join(", "));
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
  }
}

fetchQuranCom();
