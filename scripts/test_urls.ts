
async function checkUrl(name: string, url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`${name}: ${res.status} ${res.statusText}`);
  } catch (e: any) {
    console.log(`${name}: ERROR ${e.message}`);
  }
}

async function run() {
  console.log("Checking everyayah mirror...");
  await checkUrl("Husary 64kbps", "https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/001001.mp3");
  await checkUrl("Alafasy 128kbps", "https://mirrors.quranicaudio.com/everyayah/Alafasy_128kbps/001001.mp3");
  await checkUrl("Abdul Basit Murattal 64kbps", "https://mirrors.quranicaudio.com/everyayah/Abdul_Basit_Murattal_64kbps/001001.mp3");
  await checkUrl("Ghamadi 40kbps", "https://mirrors.quranicaudio.com/everyayah/Ghamadi_40kbps/001001.mp3");
  await checkUrl("Maher 64kbps", "https://mirrors.quranicaudio.com/everyayah/Maher_AlMuaiqly_64kbps/001001.mp3");

  console.log("\nChecking everyayah mirror for Gharbi/Karkani...");
  await checkUrl("Mustafa Al-Gharbi 128kbps", "https://mirrors.quranicaudio.com/everyayah/Mustafa_Al_Gharbi_128kbps/001001.mp3");
  await checkUrl("Gharbi 128kbps", "https://mirrors.quranicaudio.com/everyayah/Gharbi_128kbps/001001.mp3");
  await checkUrl("Abdelaziz Al-Karkani 128kbps", "https://mirrors.quranicaudio.com/everyayah/Abdelaziz_Al_Karkani_128kbps/001001.mp3");
  await checkUrl("Karkani 128kbps", "https://mirrors.quranicaudio.com/everyayah/Karkani_128kbps/001001.mp3");
}

run();
