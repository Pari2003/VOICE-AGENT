console.log("JavaScript is connected!");

async function generateAudio() {
  const text = document.getElementById("textInput").value;

  if (!text) {
    alert("Please enter some text!");
    return;
  }

  try {
    const response = await fetch("http://localhost:8000/generate-audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
      throw new Error("Failed to generate audio");
    }

    const data = await response.json();
    const audioPlayer = document.getElementById("audioPlayer");
    audioPlayer.src = data.audio_url;
    audioPlayer.style.display = "block";
    audioPlayer.play();
  } catch (error) {
    console.error("Error:", error);
    alert("Error generating audio. Check the console.");
  }
}
