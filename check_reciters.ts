
async function checkReciters() {
  const url = `https://mirrors.quranicaudio.com/everyayah/Alafasy_128kbps/001007.mp3`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`Alafasy_128kbps (1:7): ${res.status}`);
  } catch (e) {
    console.log(`Alafasy_128kbps (1:7): ERROR`);
  }
}

checkReciters();
